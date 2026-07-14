"""Load Solana keypairs from env secrets (JSON byte array or base58)."""
from __future__ import annotations

import json

import base58
from solders.keypair import Keypair


def load_keypair_from_secret(secret: str) -> Keypair | None:
    trimmed = secret.strip()
    if not trimmed:
        return None
    if trimmed.startswith("["):
        try:
            raw = json.loads(trimmed)
            if isinstance(raw, list) and len(raw) == 64:
                return Keypair.from_bytes(bytes(raw))
        except (json.JSONDecodeError, ValueError, TypeError):
            pass
    try:
        return Keypair.from_bytes(base58.b58decode(trimmed))
    except Exception:
        return None
