import time
from solders.keypair import Keypair
from solders.pubkey import Pubkey
from solders.transaction import Transaction
from solders.message import Message
from solana.rpc.async_api import AsyncClient

from app.config import settings
from app.auth.nonce_store import FAUCET_COOLDOWN
from app.blockchain.keypair_loader import load_keypair_from_secret
from app.blockchain.spl_helpers import (
    get_associated_token_address,
    create_associated_token_account_ix,
    transfer_ix,
    find_token_transfer_in_tx,
)

FAUCET_AMOUNT = 100.0
COOLDOWN_SEC = 24 * 3600


def _authority() -> Keypair | None:
    secret = settings.settlement_authority_secret or settings.anchor_authority_secret
    if not secret:
        return None
    return load_keypair_from_secret(secret)


async def get_usdc_balance(pubkey: str) -> float:
    mint = Pubkey.from_string(settings.usdc_mint)
    user = Pubkey.from_string(pubkey)
    client = AsyncClient(settings.solana_rpc_url)
    try:
        ata = get_associated_token_address(user, mint)
        resp = await client.get_token_account_balance(ata)
        if resp.value:
            return float(resp.value.ui_amount or 0)
    except Exception:
        pass
    finally:
        await client.close()
    return 0.0


async def transfer_usdc(from_kp: Keypair, to_pubkey: str, amount: float) -> str:
    mint = Pubkey.from_string(settings.usdc_mint)
    to_user = Pubkey.from_string(to_pubkey)
    amount_lamports = int(amount * 1_000_000)
    client = AsyncClient(settings.solana_rpc_url)
    try:
        from_ata = get_associated_token_address(from_kp.pubkey(), mint)
        to_ata = get_associated_token_address(to_user, mint)
        ixs = []
        to_info = await client.get_account_info(to_ata)
        if not to_info.value:
            ixs.append(create_associated_token_account_ix(from_kp.pubkey(), to_user, mint))
        ixs.append(transfer_ix(from_ata, to_ata, from_kp.pubkey(), amount_lamports))
        bh = await client.get_latest_blockhash()
        msg = Message.new_with_blockhash(ixs, from_kp.pubkey(), bh.value.blockhash)
        tx = Transaction([from_kp], msg, bh.value.blockhash)
        result = await client.send_transaction(tx)
        await client.confirm_transaction(result.value, commitment="confirmed")
        return str(result.value)
    finally:
        await client.close()


async def drip_faucet(user_pubkey: str) -> dict:
    if settings.solana_network != "devnet":
        raise ValueError("Faucet only on devnet")
    last = FAUCET_COOLDOWN.get(user_pubkey, 0)
    if time.time() - last < COOLDOWN_SEC:
        hours = int((COOLDOWN_SEC - (time.time() - last)) / 3600) + 1
        raise ValueError(f"Faucet cooldown — try again in ~{hours}h")
    authority = _authority()
    if not authority:
        raise ValueError("Settlement authority not configured")
    sig = await transfer_usdc(authority, user_pubkey, FAUCET_AMOUNT)
    FAUCET_COOLDOWN[user_pubkey] = time.time()
    balance = await get_usdc_balance(user_pubkey)
    cluster = settings.solana_network
    return {
        "signature": sig,
        "explorerUrl": f"https://explorer.solana.com/tx/{sig}?cluster={cluster}",
        "balance": balance,
        "amount": FAUCET_AMOUNT,
    }


async def build_fund_agent_tx(user_pubkey: str, agent_name: str, amount: float) -> dict:
    from app.blockchain.treasury import get_treasury_keypair
    import base64

    if amount < 10 or amount > 200:
        raise ValueError("Amount must be between 10 and 200 USDC")

    user = Pubkey.from_string(user_pubkey)
    treasury = get_treasury_keypair(agent_name)
    mint = Pubkey.from_string(settings.usdc_mint)
    amount_lamports = int(amount * 1_000_000)
    client = AsyncClient(settings.solana_rpc_url)
    try:
        user_ata = get_associated_token_address(user, mint)
        treasury_ata = get_associated_token_address(treasury.pubkey(), mint)
        ixs = []
        t_info = await client.get_account_info(treasury_ata)
        if not t_info.value:
            ixs.append(create_associated_token_account_ix(user, treasury.pubkey(), mint))
        u_info = await client.get_account_info(user_ata)
        if not u_info.value:
            raise ValueError("You need USDC — use the faucet first")
        balance_resp = await client.get_token_account_balance(user_ata)
        user_balance = float(balance_resp.value.ui_amount or 0) if balance_resp.value else 0.0
        if user_balance < amount:
            raise ValueError(f"Insufficient USDC (have {user_balance:.2f}, need {amount:.2f})")
        ixs.append(transfer_ix(user_ata, treasury_ata, user, amount_lamports))
        bh = await client.get_latest_blockhash()
        msg = Message.new_with_blockhash(ixs, user, bh.value.blockhash)
        tx = Transaction.new_unsigned(msg)
        return {
            "transaction": base64.b64encode(bytes(tx)).decode(),
            "treasuryPubkey": str(treasury.pubkey()),
            "amount": amount,
        }
    finally:
        await client.close()


async def verify_fund_agent_tx(
    tx_signature: str,
    user_pubkey: str,
    agent_name: str,
    expected_amount: float,
) -> dict:
    from app.blockchain.treasury import get_treasury_keypair

    user = Pubkey.from_string(user_pubkey)
    treasury = get_treasury_keypair(agent_name)
    mint = Pubkey.from_string(settings.usdc_mint)
    user_ata = get_associated_token_address(user, mint)
    treasury_ata = get_associated_token_address(treasury.pubkey(), mint)
    expected_lamports = int(expected_amount * 1_000_000)

    client = AsyncClient(settings.solana_rpc_url)
    try:
        from app.blockchain.spl_helpers import fetch_parsed_transaction

        tx = await fetch_parsed_transaction(client, tx_signature)
        if not tx:
            return {"ok": False, "reason": "transaction_not_found_or_failed"}
        amount = find_token_transfer_in_tx(tx, str(user_ata), str(treasury_ata))
        if amount is None:
            return {"ok": False, "reason": "treasury_transfer_not_found"}
        if amount < expected_lamports:
            return {"ok": False, "reason": "insufficient_transfer_amount"}
        return {"ok": True, "amount": amount / 1_000_000}
    except Exception as exc:
        return {"ok": False, "reason": str(exc)}
    finally:
        await client.close()
