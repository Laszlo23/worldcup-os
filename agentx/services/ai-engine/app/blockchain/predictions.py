"""USDC prediction escrow — mirrors src/server/blockchain/escrow.ts."""
from __future__ import annotations

import base64
import struct
from typing import Any

from solders.pubkey import Pubkey
from solders.transaction import Transaction
from solders.message import Message
from solana.rpc.async_api import AsyncClient

from app.config import settings
from app.blockchain.spl_helpers import (
    get_associated_token_address,
    create_associated_token_account_ix,
    transfer_ix,
    find_token_transfer_in_tx,
)

PLACEHOLDER_PROGRAM_ID = "Wcup111111111111111111111111111111111111111"


def get_escrow_pda_for_external_market(market_external_id: str, user_pubkey: str) -> Pubkey:
    program_id = Pubkey.from_string(PLACEHOLDER_PROGRAM_ID)
    user = Pubkey.from_string(user_pubkey)
    seeds = [b"escrow", market_external_id.encode(), bytes(user)]
    pda, _ = Pubkey.find_program_address(seeds, program_id)
    return pda


async def build_place_prediction_tx(user_pubkey: str, amount: float, market_external_id: str) -> dict | None:
    user = Pubkey.from_string(user_pubkey)
    mint = Pubkey.from_string(settings.usdc_mint)
    user_ata = get_associated_token_address(user, mint)
    escrow_pda = get_escrow_pda_for_external_market(market_external_id, user_pubkey)
    escrow_ata = get_associated_token_address(escrow_pda, mint, allow_owner_off_curve=True)
    amount_lamports = int(amount * 1_000_000)

    client = AsyncClient(settings.solana_rpc_url)
    try:
        ixs = []
        user_info = await client.get_account_info(user_ata)
        if not user_info.value:
            ixs.append(create_associated_token_account_ix(user, user, mint))
        escrow_info = await client.get_account_info(escrow_ata)
        if not escrow_info.value:
            ixs.append(
                create_associated_token_account_ix(user, escrow_pda, mint, allow_owner_off_curve=True)
            )
        ixs.append(transfer_ix(user_ata, escrow_ata, user, amount_lamports))
        bh = await client.get_latest_blockhash()
        msg = Message.new_with_blockhash(ixs, user, bh.value.blockhash)
        tx = Transaction.new_unsigned(msg)
        return {
            "transaction": base64.b64encode(bytes(tx)).decode(),
            "escrowPda": str(escrow_pda),
        }
    except Exception:
        return None
    finally:
        await client.close()


def _find_token_transfer(tx: dict[str, Any], source: str, destination: str) -> int | None:
    return find_token_transfer_in_tx(tx, source, destination)


async def verify_place_prediction_tx(
    tx_signature: str,
    user_pubkey: str,
    market_external_id: str,
    expected_amount: float,
) -> dict:
    user = Pubkey.from_string(user_pubkey)
    mint = Pubkey.from_string(settings.usdc_mint)
    user_ata = get_associated_token_address(user, mint)
    escrow_pda = get_escrow_pda_for_external_market(market_external_id, user_pubkey)
    escrow_ata = get_associated_token_address(escrow_pda, mint, allow_owner_off_curve=True)
    expected_lamports = int(expected_amount * 1_000_000)

    client = AsyncClient(settings.solana_rpc_url)
    try:
        from app.blockchain.spl_helpers import fetch_parsed_transaction

        tx = await fetch_parsed_transaction(client, tx_signature)
        if not tx:
            return {"ok": False, "reason": "transaction_not_found_or_failed"}
        amount = _find_token_transfer(tx, str(user_ata), str(escrow_ata))
        if amount is None:
            return {"ok": False, "reason": "escrow_transfer_not_found"}
        if amount < expected_lamports:
            return {"ok": False, "reason": "insufficient_escrow_amount"}
        return {
            "ok": True,
            "amount": amount / 1_000_000,
            "escrowPda": str(escrow_pda),
        }
    except Exception as exc:
        return {"ok": False, "reason": str(exc)}
    finally:
        await client.close()
