"""Place live-market bets from agent treasury keypairs (server-signed, devnet)."""
from __future__ import annotations

import logging
import uuid
from typing import Any

from solders.keypair import Keypair
from solders.pubkey import Pubkey
from solders.transaction import Transaction
from solders.message import Message
from solders.system_program import TransferParams, transfer
from solana.rpc.async_api import AsyncClient

from app.config import settings
from app import repository as db
from app.market_betting import is_market_bettable
from app.blockchain.treasury import get_treasury_keypair, get_treasury_balance
from app.blockchain.spl_helpers import (
    get_associated_token_address,
    create_associated_token_account_ix,
    transfer_ix,
)
from app.blockchain.predictions import (
    get_escrow_pda_for_external_market,
    verify_place_prediction_tx,
)

logger = logging.getLogger(__name__)

MIN_TREASURY_SOL_LAMPORTS = 5_000_000
TOKEN_ACCOUNT_RENT_LAMPORTS = 2_039_280


def _settlement_authority() -> Keypair | None:
    from app.blockchain.treasury import get_settlement_authority

    return get_settlement_authority()


def _option_for_action(action: str) -> str:
    """Map agent decision to live window outcome."""
    if action in ("buy_away", "fade_home"):
        return "no"
    return "yes"


async def _ensure_treasury_sol(treasury_kp: Keypair, client: AsyncClient) -> None:
    authority = _settlement_authority()
    if not authority:
        return
    balance = await client.get_balance(treasury_kp.pubkey())
    if balance.value >= MIN_TREASURY_SOL_LAMPORTS:
        return
    lamports = MIN_TREASURY_SOL_LAMPORTS - balance.value + 500_000
    bh = await client.get_latest_blockhash()
    msg = Message.new_with_blockhash(
        [transfer(TransferParams(from_pubkey=authority.pubkey(), to_pubkey=treasury_kp.pubkey(), lamports=lamports))],
        authority.pubkey(),
        bh.value.blockhash,
    )
    tx = Transaction([authority], msg, bh.value.blockhash)
    result = await client.send_transaction(tx)
    await client.confirm_transaction(result.value, commitment="confirmed")


async def _ensure_escrow_ata(
    market_external_id: str,
    treasury_pubkey: str,
    client: AsyncClient,
) -> bool:
    authority = _settlement_authority()
    if not authority:
        return False
    mint = Pubkey.from_string(settings.usdc_mint)
    escrow_pda = get_escrow_pda_for_external_market(market_external_id, treasury_pubkey)
    escrow_ata = get_associated_token_address(escrow_pda, mint, allow_owner_off_curve=True)
    info = await client.get_account_info(escrow_ata)
    if info.value:
        return True
    ixs = [create_associated_token_account_ix(authority.pubkey(), escrow_pda, mint, allow_owner_off_curve=True)]
    bh = await client.get_latest_blockhash()
    msg = Message.new_with_blockhash(ixs, authority.pubkey(), bh.value.blockhash)
    tx = Transaction([authority], msg, bh.value.blockhash)
    result = await client.send_transaction(tx)
    await client.confirm_transaction(result.value, commitment="confirmed")
    return True


async def _find_bettable_market(match_id: str) -> dict[str, Any] | None:
    markets = await db.list_live_markets_for_match(match_id)
    for market in markets:
        if not is_market_bettable(
            market.get("type", ""),
            market.get("match_status", ""),
            market.get("closed", False),
            market.get("closes_at"),
            market.get("kickoff_at"),
        ):
            continue
        if str(market.get("type", "")).startswith("live_"):
            return market
    return None


async def place_agent_live_bet(
    agent_name: str,
    match_id: str,
    stake: float,
    action: str,
) -> dict[str, Any] | None:
    """Lock stake USDC from agent treasury into live market escrow."""
    if settings.solana_network != "devnet":
        return None
    if stake < 1:
        return None

    market = await _find_bettable_market(match_id)
    if not market:
        logger.info("agent_bet_skipped no_market agent=%s match=%s", agent_name, match_id)
        return None

    option_id = _option_for_action(action)
    option = await db.get_market_option(str(market["id"]), option_id)
    if not option:
        logger.info("agent_bet_skipped no_option agent=%s market=%s", agent_name, market.get("external_id"))
        return None

    treasury_kp = get_treasury_keypair(agent_name)
    treasury_pubkey = str(treasury_kp.pubkey())
    market_external_id = str(market["external_id"])
    mint = Pubkey.from_string(settings.usdc_mint)
    amount_lamports = int(stake * 1_000_000)

    client = AsyncClient(settings.solana_rpc_url)
    try:
        await _ensure_treasury_sol(treasury_kp, client)
        if not await _ensure_escrow_ata(market_external_id, treasury_pubkey, client):
            logger.warning("agent_bet_skipped escrow_ata agent=%s", agent_name)
            return None

        treasury_ata = get_associated_token_address(treasury_kp.pubkey(), mint)
        escrow_pda = get_escrow_pda_for_external_market(market_external_id, treasury_pubkey)
        escrow_ata = get_associated_token_address(escrow_pda, mint, allow_owner_off_curve=True)

        balance_resp = await client.get_token_account_balance(treasury_ata)
        treasury_usdc = float(balance_resp.value.ui_amount or 0) if balance_resp.value else 0.0
        if treasury_usdc < stake:
            logger.info("agent_bet_skipped low_usdc agent=%s have=%.2f need=%.2f", agent_name, treasury_usdc, stake)
            return None

        ixs = [transfer_ix(treasury_ata, escrow_ata, treasury_kp.pubkey(), amount_lamports)]
        bh = await client.get_latest_blockhash()
        msg = Message.new_with_blockhash(ixs, treasury_kp.pubkey(), bh.value.blockhash)
        tx = Transaction([treasury_kp], msg, bh.value.blockhash)
        result = await client.send_transaction(tx)
        tx_sig = str(result.value)
        await client.confirm_transaction(result.value, commitment="confirmed")

        verification = await verify_place_prediction_tx(tx_sig, treasury_pubkey, market_external_id, stake)
        if not verification.get("ok"):
            logger.warning("agent_bet_verify_failed agent=%s reason=%s", agent_name, verification.get("reason"))
            return None

        user = await db.ensure_user(treasury_pubkey)
        if not user.get("id"):
            return None
        if await db.prediction_tx_exists(tx_sig):
            return {"txSignature": tx_sig, "duplicate": True}

        external_id = f"agent_{uuid.uuid4().hex[:10]}"
        created = await db.insert_usdc_prediction(
            {
                "external_id": external_id,
                "user_id": user["id"],
                "market_id": market["id"],
                "match_id": match_id,
                "option_id": option["id"],
                "outcome_label": option.get("label", option_id),
                "amount": stake,
                "price": float(option.get("price", 1.85)),
                "escrow_pda": verification.get("escrowPda", str(escrow_pda)),
                "tx_signature": tx_sig,
            },
        )
        balance = await get_treasury_balance(agent_name)
        await db.update_agent_treasury(agent_name, treasury_pubkey, balance)
        logger.info(
            "agent_bet_placed agent=%s stake=%.2f market=%s option=%s tx=%s",
            agent_name,
            stake,
            market_external_id,
            option_id,
            tx_sig,
        )
        return {
            "txSignature": tx_sig,
            "predictionExternalId": created.get("external_id", external_id),
            "marketExternalId": market_external_id,
            "treasuryBalance": balance,
        }
    except Exception as exc:
        logger.warning("agent_bet_error agent=%s err=%s", agent_name, exc)
        return None
    finally:
        await client.close()


async def payout_from_settlement_pool(treasury_pubkey: str, amount: float) -> str | None:
    """Send won USDC from settlement authority pool back to agent treasury."""
    authority = _settlement_authority()
    if not authority or amount <= 0:
        return None
    mint = Pubkey.from_string(settings.usdc_mint)
    treasury = Pubkey.from_string(treasury_pubkey)
    amount_lamports = int(amount * 1_000_000)

    client = AsyncClient(settings.solana_rpc_url)
    try:
        authority_ata = get_associated_token_address(authority.pubkey(), mint)
        treasury_ata = get_associated_token_address(treasury, mint)
        pool = await client.get_token_account_balance(authority_ata)
        pool_amount = int(float(pool.value.amount) if pool.value else 0)
        if pool_amount < amount_lamports:
            logger.warning("settlement_pool_low need=%s have=%s", amount_lamports, pool_amount)
            return None

        ixs = []
        t_info = await client.get_account_info(treasury_ata)
        if not t_info.value:
            ixs.append(create_associated_token_account_ix(authority.pubkey(), treasury, mint))
        ixs.append(transfer_ix(authority_ata, treasury_ata, authority.pubkey(), amount_lamports))
        bh = await client.get_latest_blockhash()
        msg = Message.new_with_blockhash(ixs, authority.pubkey(), bh.value.blockhash)
        tx = Transaction([authority], msg, bh.value.blockhash)
        result = await client.send_transaction(tx)
        await client.confirm_transaction(result.value, commitment="confirmed")
        return str(result.value)
    except Exception as exc:
        logger.warning("agent_payout_error treasury=%s err=%s", treasury_pubkey, exc)
        return None
    finally:
        await client.close()


async def auto_claim_agent_winnings() -> int:
    """Claim won agent predictions back to treasury ATAs."""
    if not await db.check_db():
        return 0
    from app import db as pgdb

    rows = await pgdb.fetch_all(
        """
        SELECT p.id, p.external_id, p.payout, p.amount, u.wallet_pubkey AS treasury_pubkey, a.name AS agent_name
        FROM predictions p
        JOIN users u ON u.id = p.user_id
        JOIN agents a ON a.treasury_pubkey = u.wallet_pubkey
        WHERE p.status = 'won' AND p.claimed = false AND p.payout > 0
        ORDER BY p.updated_at ASC
        LIMIT 20
        """,
    )
    claimed = 0
    for row in rows:
        payout = float(row.get("payout") or 0)
        treasury_pubkey = str(row["treasury_pubkey"])
        tx_sig = await payout_from_settlement_pool(treasury_pubkey, payout)
        if not tx_sig:
            continue
        await pgdb.execute(
            "UPDATE predictions SET claimed = true, status = 'settled', updated_at = NOW() WHERE id = $1",
            row["id"],
        )
        await pgdb.execute(
            "UPDATE escrows SET status = 'claimed', updated_at = NOW() WHERE prediction_id = $1",
            row["id"],
        )
        agent_name = str(row.get("agent_name", ""))
        if agent_name:
            balance = await get_treasury_balance(agent_name)
            await db.update_agent_treasury(agent_name, treasury_pubkey, balance)
        claimed += 1
    return claimed
