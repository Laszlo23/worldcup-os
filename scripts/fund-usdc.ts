#!/usr/bin/env tsx
/**
 * Send devnet test USDC from settlement authority to a wallet (no cooldown).
 * Usage: node --import tsx scripts/fund-usdc.ts <pubkey> [amount]
 */
import { transferDevnetUsdcDirect, getFaucetPoolBalance } from "../src/server/blockchain/faucet";
import { loadSettlementAuthority } from "../src/server/blockchain/settlement";

const recipient = process.argv[2];
const amount = Number(process.argv[3] ?? 100);

if (!recipient) {
  console.error("Usage: npm run fund:usdc -- <wallet-pubkey> [amount]");
  process.exit(1);
}

if (!Number.isFinite(amount) || amount <= 0) {
  console.error("Amount must be a positive number");
  process.exit(1);
}

const authority = loadSettlementAuthority();
if (!authority) {
  console.error("SETTLEMENT_AUTHORITY_SECRET or SOLANA_DEPLOYER_SECRET required in env");
  process.exit(1);
}

console.log("Settlement authority:", authority.publicKey.toBase58());
console.log("Pool balance (USDC):", await getFaucetPoolBalance());

const result = await transferDevnetUsdcDirect({ recipientPubkey: recipient, amount });
console.log("Sent", amount, "USDC to", recipient);
console.log("New balance:", result.balance);
console.log("Explorer:", result.explorerUrl);
