# On-Chain Demo Guide — Predict → Settle → Claim

End-to-end judge demo on **Solana devnet** with USDC test mint.

## Prerequisites

| Item | Value |
|------|-------|
| Network | devnet (`SOLANA_NETWORK=devnet`) |
| Program | `Dr4SiPac8YoQbn6TgAeigEegCegjGTFtnEm3tjyiGqJ6` |
| USDC mint (devnet) | `ELWTKspHKCnCfCiCiqYw1EDH77k8VCP74dK9qytG2Ujh` |
| Phantom | Switch wallet to **Devnet** |

## 1. Get test USDC (judges & testers)

Predictions use **devnet USDC**, not SOL. That matches the hackathon escrow story and is **not** against the rules — devnet test tokens are expected.

**In the app (easiest):**

1. Connect Phantom on **devnet**
2. Wallet menu → **Get test USDC (devnet)** — or use the link under “Insufficient USDC” on a match
3. Receive **100 USDC** once per 24h (rate-limited faucet from the settlement authority pool)

**CLI (team / refill any wallet):**

```bash
npm run fund:usdc -- <wallet-pubkey> [amount]
# Example: npm run fund:usdc -- 7xKX... 500
```

Requires `SETTLEMENT_AUTHORITY_SECRET` or `SOLANA_DEPLOYER_SECRET` in `.env`.

Stake presets on devnet are **1 / 5 / 10 / 25 USDC** (mainnet-style presets stay higher).

## 2. Fund settlement authority (server-side payouts)

The claim flow pays winners from the **settlement authority pool** (custodial pool for hackathon demo).

```bash
# On server or locally with SETTLEMENT_AUTHORITY_SECRET in .env
solana config set --url devnet
# Airdrop SOL to authority pubkey, then mint/transfer devnet USDC to authority ATA
```

Set in production `.env`:

```
SETTLEMENT_AUTHORITY_SECRET=[64-byte JSON array or base58 secret]
SETTLEMENT_TX_SIGNATURE=<optional pre-baked settle tx for proof explorer link>
```

## 3. Judge flow (live)

1. Open https://wmos.buildingcultureid.space
2. **Connect Phantom** (devnet) → sign auth message
3. Go to **Matches** → pick an **upcoming** fixture
4. **Quick Predict** → stake **1–10 USDC** (use faucet if needed) → approve wallet tx
5. Copy **Solana Explorer** link from success toast
6. After match settles (replay or worker): **Portfolio** → **Claim** → approve payout tx
7. Open **Proof Explorer** (`/proofs`) → verify Merkle root + explorer link

## 4. Verify on explorer

- Predict tx: USDC transfer user ATA → escrow PDA
- Claim tx: USDC transfer settlement authority → user ATA
- Optional settle tx: `settle_market` on World Cup OS program (when `on_chain_market_pda` is set)

## 5. Smoke checks

```bash
curl -s https://wmos.buildingcultureid.space/api/health | jq '.solana'
curl -s https://wmos.buildingcultureid.space/api/proofs | jq '.proofs | length'
npm run smoke
```

## Architecture note (honest)

| Step | Mechanism |
|------|-----------|
| Predict | SPL USDC → escrow PDA (verified server-side) |
| Winner resolution | Postgres + TxLINE stat-validation |
| Claim | Settlement authority pool transfer |
| Stretch | `initialize_market` + `settle_market` CPI when authority configured |

Data-source badges in UI label **On-chain**, **TxLINE**, and **Indexed** flows separately.
