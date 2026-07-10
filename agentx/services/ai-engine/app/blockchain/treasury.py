import base58
from solders.keypair import Keypair
from solders.pubkey import Pubkey
from solana.rpc.async_api import AsyncClient

from app.config import settings
from app.blockchain.spl_helpers import get_associated_token_address

TREASURY_MIN_USDC = 10.0
PREFUND_AMOUNT = 500.0
_treasuries: dict[str, Keypair] = {}


def _load_keypair(secret: str) -> Keypair | None:
    if not secret:
        return None
    try:
        raw = base58.b58decode(secret)
        return Keypair.from_bytes(raw)
    except Exception:
        return None


def get_treasury_keypair(agent_name: str) -> Keypair:
    name = agent_name.lower()
    if name in _treasuries:
        return _treasuries[name]
    if name == "alpha":
        kp = _load_keypair(settings.agent_alpha_treasury_secret)
    elif name == "beta":
        kp = _load_keypair(settings.agent_beta_treasury_secret)
    else:
        kp = None
    if not kp:
        seed = f"txline-agent-treasury-{name}".encode()[:32].ljust(32, b"0")
        kp = Keypair.from_seed(seed[:32])
    _treasuries[name] = kp
    return kp


def get_usdc_mint() -> Pubkey:
    return Pubkey.from_string(settings.usdc_mint)


def get_settlement_authority() -> Keypair | None:
    secret = settings.settlement_authority_secret or settings.anchor_authority_secret
    return _load_keypair(secret) if secret else None


async def get_treasury_balance(agent_name: str) -> float:
    kp = get_treasury_keypair(agent_name)
    mint = get_usdc_mint()
    client = AsyncClient(settings.solana_rpc_url)
    try:
        ata = get_associated_token_address(kp.pubkey(), mint)
        resp = await client.get_token_account_balance(ata)
        if resp.value:
            return float(resp.value.ui_amount or 0)
    except Exception:
        pass
    finally:
        await client.close()
    return 0.0


async def init_treasuries() -> None:
    """Ensure treasury pubkeys are registered on agents and prefund if low."""
    from app import repository as db
    for name in ("Alpha", "Beta"):
        kp = get_treasury_keypair(name)
        balance = await get_treasury_balance(name)
        await db.update_agent_treasury(name, str(kp.pubkey()), balance)
        if balance < TREASURY_MIN_USDC:
            await prefund_treasury(name, PREFUND_AMOUNT)


async def prefund_treasury(agent_name: str, amount: float) -> str | None:
    authority = get_settlement_authority()
    if not authority or settings.solana_network != "devnet":
        return None
    from app.blockchain.faucet import transfer_usdc

    kp = get_treasury_keypair(agent_name)
    try:
        sig = await transfer_usdc(authority, str(kp.pubkey()), amount)
        return sig
    except Exception as e:
        print(f"[treasury] prefund {agent_name} failed: {e}")
        return None


def explorer_url(signature: str) -> str:
    cluster = settings.solana_network
    return f"https://explorer.solana.com/tx/{signature}?cluster={cluster}"


def address_explorer(pubkey: str) -> str:
    return f"https://explorer.solana.com/address/{pubkey}?cluster={settings.solana_network}"
