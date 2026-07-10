import base58
import jwt
from datetime import datetime, timedelta, timezone
from nacl.signing import VerifyKey
from nacl.exceptions import BadSignatureError

from app.config import settings
from app.auth.nonce_store import consume_nonce, extract_nonce

SESSION_COOKIE = "txline_session"
SESSION_DAYS = 7


def verify_wallet_signature(pubkey: str, message: str, signature: str) -> bool:
    try:
        vk = VerifyKey(base58.b58decode(pubkey))
        vk.verify(message.encode("utf-8"), base58.b58decode(signature))
        return True
    except (BadSignatureError, Exception):
        return False


def create_session_token(pubkey: str) -> str:
    payload = {
        "sub": pubkey,
        "exp": datetime.now(timezone.utc) + timedelta(days=SESSION_DAYS),
    }
    return jwt.encode(payload, settings.session_secret, algorithm="HS256")


def decode_session_token(token: str) -> str | None:
    try:
        data = jwt.decode(token, settings.session_secret, algorithms=["HS256"])
        return str(data.get("sub", ""))
    except Exception:
        return None


def verify_auth(pubkey: str, message: str, signature: str) -> bool:
    if pubkey not in message:
        return False
    if not verify_wallet_signature(pubkey, message, signature):
        return False
    nonce = extract_nonce(message)
    if not nonce or not consume_nonce(pubkey, nonce):
        return False
    return True
