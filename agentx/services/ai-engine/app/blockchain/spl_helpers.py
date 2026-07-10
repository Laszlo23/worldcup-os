"""Minimal SPL token helpers using solders (no spl-token package)."""
from solders.pubkey import Pubkey
from solders.instruction import Instruction, AccountMeta
from solders.hash import Hash
import struct

TOKEN_PROGRAM_ID = Pubkey.from_string("TokenkegQfeZyiNwAJbNbGKPFXCWuBvf9Ss623VQ5DA")
ASSOCIATED_TOKEN_PROGRAM_ID = Pubkey.from_string("ATokenGPvbdGVxr1b2hvZbsiqW5xWH25efTNsLJA8knL")


def get_associated_token_address(owner: Pubkey, mint: Pubkey) -> Pubkey:
    seeds = [bytes(owner), bytes(TOKEN_PROGRAM_ID), bytes(mint)]
    ata, _ = Pubkey.find_program_address(seeds, ASSOCIATED_TOKEN_PROGRAM_ID)
    return ata


def create_associated_token_account_ix(payer: Pubkey, owner: Pubkey, mint: Pubkey) -> Instruction:
    ata = get_associated_token_address(owner, mint)
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
