import secrets
import time
from typing import Dict
from urllib.parse import urlparse

from app.config import settings

_nonces: Dict[str, tuple[str, float]] = {}
_sessions: Dict[str, str] = {}
FAUCET_COOLDOWN: Dict[str, float] = {}
NONCE_TTL = 300


def _auth_domain() -> str:
    try:
        host = urlparse(settings.app_url).hostname
        return host or "agentx.buildingcultureid.space"
    except Exception:
        return "agentx.buildingcultureid.space"


def create_nonce(pubkey: str) -> tuple[str, str]:
    nonce = secrets.token_hex(16)
    domain = _auth_domain()
    message = (
        f"TxLINE AI Trader wants you to sign in with your Solana account:\n"
        f"{pubkey}\n\n"
        f"URI: https://{domain}\n"
        f"Version: 1\n"
        f"Chain ID: solana:devnet\n"
        f"Nonce: {nonce}\n"
        f"Issued At: {int(time.time())}"
    )
    _nonces[pubkey] = (nonce, time.time())
    return nonce, message


def consume_nonce(pubkey: str, nonce: str) -> bool:
    entry = _nonces.get(pubkey)
    if not entry:
        return False
    stored, created = entry
    if time.time() - created > NONCE_TTL:
        del _nonces[pubkey]
        return False
    if stored != nonce:
        return False
    del _nonces[pubkey]
    return True


def extract_nonce(message: str) -> str | None:
    for line in message.split("\n"):
        if line.startswith("Nonce: "):
            return line.replace("Nonce: ", "").strip()
    return None
