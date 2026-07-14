#!/usr/bin/env python3
"""Fund AgentX devnet wallets (SOL for treasuries + optional USDC pool check)."""
from __future__ import annotations

import asyncio
import os
import sys
import time
from pathlib import Path

_AGENTX_ROOT = Path(__file__).resolve().parents[1]
_ENGINE = _AGENTX_ROOT / "services" / "ai-engine"
sys.path.insert(0, str(_ENGINE))

from solders.keypair import Keypair  # noqa: E402
from solders.pubkey import Pubkey  # noqa: E402
from solders.transaction import Transaction  # noqa: E402
from solders.message import Message  # noqa: E402
from solders.system_program import TransferParams, transfer  # noqa: E402
from solana.rpc.async_api import AsyncClient  # noqa: E402

from app.blockchain.keypair_loader import load_keypair_from_secret  # noqa: E402
from app.blockchain.treasury import get_treasury_keypair, get_settlement_authority  # noqa: E402
from app.blockchain.faucet import get_usdc_balance  # noqa: E402

SOL_PER_WALLET = float(os.getenv("BOOTSTRAP_SOL_AMOUNT", "0.12"))
MIN_SOL_LAMPORTS = int(SOL_PER_WALLET * 1_000_000_000)


def _load_deployer() -> Keypair | None:
    for key in ("SOLANA_DEPLOYER_SECRET", "SETTLEMENT_AUTHORITY_SECRET"):
        kp = load_keypair_from_secret(os.getenv(key, ""))
        if kp:
            return kp
    return None


async def _fund_sol(client: AsyncClient, deployer: Keypair, target: Pubkey, label: str) -> None:
    before = (await client.get_balance(target)).value
    print(f"  {label}: {before / 1e9:.4f} SOL", end="")
    if before >= MIN_SOL_LAMPORTS:
        print(" (ok)")
        return
    need = max(MIN_SOL_LAMPORTS - before, MIN_SOL_LAMPORTS)
    bh = await client.get_latest_blockhash()
    msg = Message.new_with_blockhash(
        [transfer(TransferParams(from_pubkey=deployer.pubkey(), to_pubkey=target, lamports=need))],
        deployer.pubkey(),
        bh.value.blockhash,
    )
    tx = Transaction([deployer], msg, bh.value.blockhash)
    res = await client.send_transaction(tx)
    await client.confirm_transaction(res.value, commitment="confirmed")
    after = (await client.get_balance(target)).value
    print(f" -> {after / 1e9:.4f} SOL ({res.value})")
    time.sleep(2)


async def main() -> None:
    rpc = os.getenv("SOLANA_RPC_URL", "https://api.devnet.solana.com")
    deployer = _load_deployer()
    if not deployer:
        raise SystemExit("SOLANA_DEPLOYER_SECRET or SETTLEMENT_AUTHORITY_SECRET required")

    settlement = get_settlement_authority()
    targets: list[tuple[str, Pubkey]] = []
    if settlement:
        targets.append(("settlement_authority", settlement.pubkey()))
    for name in ("Alpha", "Beta"):
        targets.append((f"treasury_{name.lower()}", get_treasury_keypair(name).pubkey()))

    # User-deployed agents with treasury in DB
    try:
        from app import db as pgdb  # noqa: E402

        if await pgdb.fetch_one("select 1 as ok limit 1"):
            rows = await pgdb.fetch_all(
                "select name, treasury_pubkey from agents where treasury_pubkey is not null and owner_wallet is not null",
            )
            for row in rows:
                if row.get("treasury_pubkey"):
                    targets.append((f"treasury_{row['name']}", Pubkey.from_string(row["treasury_pubkey"])))
    except Exception as exc:
        print(f"[warn] could not load user agents: {exc}")

    client = AsyncClient(rpc)
    try:
        dep = (await client.get_balance(deployer.pubkey())).value
        print(f"Deployer {deployer.pubkey()} — {dep / 1e9:.4f} SOL")
        print(f"Funding {len(targets)} wallets with ~{SOL_PER_WALLET} SOL each...")
        for label, pk in targets:
            await _fund_sol(client, deployer, pk, label)

        if settlement:
            pool_usdc = await get_usdc_balance(str(settlement.pubkey()))
            print(f"Settlement USDC pool: {pool_usdc:.2f} (run npm run refill:usdc-pool on WMOS if low)")
    finally:
        await client.close()


if __name__ == "__main__":
    asyncio.run(main())
