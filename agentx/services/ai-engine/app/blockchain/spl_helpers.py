"""Minimal SPL token helpers using solders (no spl-token package)."""
import json
from typing import Any

from solders.pubkey import Pubkey
from solders.signature import Signature
from solders.instruction import Instruction, AccountMeta
from solders.hash import Hash
import struct

TOKEN_PROGRAM_ID = Pubkey.from_string("TokenkegQfeZyiNwAJbNbGKPFXCWuBvf9Ss623VQ5DA")
ASSOCIATED_TOKEN_PROGRAM_ID = Pubkey.from_string("ATokenGPvbdGVxr1b2hvZbsiqW5xWH25efTNsLJA8knL")


def parse_tx_signature(tx_signature: str) -> Signature:
    return Signature.from_string(tx_signature.strip())


def parsed_tx_to_dict(tx: Any) -> dict[str, Any]:
    if tx is None:
        return {}
    if isinstance(tx, dict):
        return tx
    if hasattr(tx, "to_json"):
        return json.loads(tx.to_json())
    return {}


async def fetch_parsed_transaction(client: Any, tx_signature: str, *, retries: int = 8, delay_sec: float = 1.5):
    import asyncio

    sig = parse_tx_signature(tx_signature)
    for attempt in range(retries):
        resp = await client.get_transaction(
            sig,
            encoding="jsonParsed",
            max_supported_transaction_version=0,
        )
        tx = resp.value
        if tx:
            return parsed_tx_to_dict(tx)
        if attempt < retries - 1:
            await asyncio.sleep(delay_sec)
    return None


def get_associated_token_address(owner: Pubkey, mint: Pubkey, allow_owner_off_curve: bool = False) -> Pubkey:
    seeds = [bytes(owner), bytes(TOKEN_PROGRAM_ID), bytes(mint)]
    ata, _ = Pubkey.find_program_address(seeds, ASSOCIATED_TOKEN_PROGRAM_ID)
    if allow_owner_off_curve:
        return ata
    return ata


def create_associated_token_account_ix(
    payer: Pubkey,
    owner: Pubkey,
    mint: Pubkey,
    allow_owner_off_curve: bool = False,
) -> Instruction:
    ata = get_associated_token_address(owner, mint, allow_owner_off_curve)
    return Instruction(
        program_id=ASSOCIATED_TOKEN_PROGRAM_ID,
        accounts=[
            AccountMeta(pubkey=payer, is_signer=True, is_writable=True),
            AccountMeta(pubkey=ata, is_signer=False, is_writable=True),
            AccountMeta(pubkey=owner, is_signer=False, is_writable=False),
            AccountMeta(pubkey=mint, is_signer=False, is_writable=False),
            AccountMeta(pubkey=Pubkey.from_string("11111111111111111111111111111111"), is_signer=False, is_writable=False),
            AccountMeta(pubkey=TOKEN_PROGRAM_ID, is_signer=False, is_writable=False),
        ],
        data=bytes(),
    )


def transfer_ix(source: Pubkey, dest: Pubkey, owner: Pubkey, amount: int) -> Instruction:
    data = struct.pack("<BQ", 3, amount)
    return Instruction(
        program_id=TOKEN_PROGRAM_ID,
        accounts=[
            AccountMeta(pubkey=source, is_signer=False, is_writable=True),
            AccountMeta(pubkey=dest, is_signer=False, is_writable=True),
            AccountMeta(pubkey=owner, is_signer=True, is_writable=False),
        ],
        data=data,
    )


def find_token_transfer_in_tx(tx: dict[str, Any], source: str, destination: str) -> int | None:
    meta = tx.get("meta") or {}
    if meta.get("err"):
        return None
    instructions = list(tx.get("transaction", {}).get("message", {}).get("instructions", []))
    for inner in meta.get("innerInstructions") or []:
        instructions.extend(inner.get("instructions") or [])
    for ix in instructions:
        parsed = ix.get("parsed") if isinstance(ix, dict) else None
        if not parsed:
            continue
        info = parsed.get("info") or {}
        if parsed.get("type") not in ("transfer", "transferChecked"):
            continue
        if info.get("source") == source and info.get("destination") == destination:
            amount = info.get("amount")
            if amount is None and isinstance(info.get("tokenAmount"), dict):
                amount = info["tokenAmount"].get("amount")
            if amount is not None:
                return int(amount)
    return None
