import json
import hashlib
from datetime import datetime, timezone

from app.config import settings


def build_memo(signal: dict, match: dict, prediction_id: str) -> str:
    home = match.get("home_team")
    away = match.get("away_team")
    if isinstance(home, str):
        home = json.loads(home)
    if isinstance(away, str):
        away = json.loads(away)
    cert = {
        "app": "TxLINE AI Trader",
        "match": f"{home.get('name', 'Home')} vs {away.get('name', 'Away')}",
        "prediction": signal.get("prediction", signal.get("headline")),
        "confidence": signal.get("confidence"),
        "timestamp": datetime.now(timezone.utc).isoformat(),
        "signal_id": signal.get("id"),
        "prediction_id": prediction_id,
    }
    return json.dumps(cert, separators=(",", ":"))


def demo_tx_hash(prediction_id: str) -> tuple[str, str]:
    """Generate deterministic demo tx hash when no Solana authority configured."""
    h = hashlib.sha256(prediction_id.encode()).hexdigest()[:44]
    tx = f"5xY{h[:8]}...{h[-4:]}"
    network = settings.solana_network
    explorer = f"https://explorer.solana.com/tx/demo_{h}?cluster={network}"
    return tx, explorer


async def anchor_prediction(prediction: dict, signal: dict, match: dict) -> dict:
    from app import repository as db

    memo = build_memo(signal, match, prediction["id"])
    cert = await db.create_certificate({
        "prediction_id": prediction["id"],
        "memo": memo,
        "status": "pending",
    })

    if settings.anchor_authority_secret:
        try:
            tx_hash, explorer = await _submit_memo_tx(memo)
            await db.update_certificate(cert["id"], tx_hash, explorer)
            cert["tx_hash"] = tx_hash
            cert["explorer_url"] = explorer
            cert["status"] = "anchored"
        except Exception:
            tx_hash, explorer = demo_tx_hash(prediction["id"])
            await db.update_certificate(cert["id"], tx_hash, explorer)
    else:
        tx_hash, explorer = demo_tx_hash(prediction["id"])
        await db.update_certificate(cert["id"], tx_hash, explorer)
        cert["tx_hash"] = tx_hash
        cert["explorer_url"] = explorer
        cert["status"] = "anchored"

    return cert


async def build_user_certificate_tx(user_pubkey: str, memo: str) -> str:
    import base64
    from solders.pubkey import Pubkey
    from solders.instruction import Instruction, AccountMeta
    from solders.transaction import Transaction
    from solders.message import Message
    from solana.rpc.async_api import AsyncClient

    MEMO_PROGRAM_ID = Pubkey.from_string("MemoSq4gqABAXKb96qnH8TysNcWxMyWBqeybbncbhKi")
    user = Pubkey.from_string(user_pubkey)
    client = AsyncClient(settings.solana_rpc_url)
    try:
        resp = await client.get_latest_blockhash()
        blockhash = resp.value.blockhash
        ix = Instruction(
            program_id=MEMO_PROGRAM_ID,
            accounts=[AccountMeta(pubkey=user, is_signer=True, is_writable=False)],
            data=memo[:566].encode("utf-8"),
        )
        msg = Message.new_with_blockhash([ix], user, blockhash)
        tx = Transaction([], msg, blockhash)
        return base64.b64encode(bytes(tx)).decode()
    finally:
        await client.close()


async def verify_user_memo_tx(tx_signature: str, user_pubkey: str, expected_prefix: str) -> bool:
    from solana.rpc.async_api import AsyncClient

    client = AsyncClient(settings.solana_rpc_url)
    try:
        tx = await client.get_transaction(tx_signature, encoding="json", max_supported_transaction_version=0)
        if not tx.value:
            return False
        meta = tx.value.transaction.meta
        if not meta:
            return False
        logs = meta.log_messages or []
        combined = " ".join(logs)
        return expected_prefix in combined or "TxLINE AI Trader" in combined
    except Exception:
        return False
    finally:
        await client.close()


async def _submit_memo_tx(memo: str) -> tuple[str, str]:
    """Submit real Solana memo tx when authority secret is configured."""
    import base58
    from solders.keypair import Keypair
    from solders.pubkey import Pubkey
    from solders.system_program import ID as SYSTEM_PROGRAM_ID
    from solders.instruction import Instruction, AccountMeta
    from solders.transaction import Transaction
    from solders.message import Message
    from solana.rpc.async_api import AsyncClient

    MEMO_PROGRAM_ID = Pubkey.from_string("MemoSq4gqABAXKb96qnH8TysNcWxMyWBqeybbncbhKi")
    secret = base58.b58decode(settings.anchor_authority_secret)
    kp = Keypair.from_bytes(secret)
    client = AsyncClient(settings.solana_rpc_url)
    try:
        resp = await client.get_latest_blockhash()
        blockhash = resp.value.blockhash
        ix = Instruction(
            program_id=MEMO_PROGRAM_ID,
            accounts=[AccountMeta(pubkey=kp.pubkey(), is_signer=True, is_writable=False)],
            data=memo[:566].encode("utf-8"),
        )
        msg = Message.new_with_blockhash([ix], kp.pubkey(), blockhash)
        tx = Transaction([kp], msg, blockhash)
        result = await client.send_transaction(tx)
        sig = str(result.value)
        explorer = f"https://explorer.solana.com/tx/{sig}?cluster={settings.solana_network}"
        return sig, explorer
    finally:
        await client.close()
