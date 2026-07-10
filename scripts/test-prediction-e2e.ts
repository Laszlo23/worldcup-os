#!/usr/bin/env tsx
/**
 * End-to-end prediction flow test (auth → build-tx → sign → send → place).
 * Usage: API_BASE=http://127.0.0.1:3018 node --import tsx scripts/test-prediction-e2e.ts [marketExternalId] [amount]
 */
import { Keypair, Connection, Transaction, LAMPORTS_PER_SOL, SystemProgram, sendAndConfirmTransaction } from "@solana/web3.js";
import bs58 from "bs58";
import nacl from "tweetnacl";
import { verifyPlacePredictionTx } from "../src/server/blockchain/verify";
import { transferDevnetUsdcDirect } from "../src/server/blockchain/faucet";
import { loadSettlementAuthority } from "../src/server/blockchain/settlement";

const API_BASE = process.env.API_BASE ?? "http://127.0.0.1:3018";
const MARKET = process.argv[2] ?? "fx-18209181-winner";
const AMOUNT = Number(process.argv[3] ?? 1);

function defaultOptionForMarket(marketId: string): string {
  if (marketId.endsWith("-cs")) return "2-1";
  if (marketId.endsWith("-ou")) return "over";
  if (marketId.endsWith("-btts")) return "yes";
  if (marketId.endsWith("-fs")) return "p1";
  return "h";
}

const OPTION = process.argv[4] ?? defaultOptionForMarket(MARKET);

async function api<T>(path: string, opts: RequestInit = {}, cookie?: string): Promise<{ data: T; cookie?: string }> {
  const headers = new Headers(opts.headers);
  headers.set("content-type", "application/json");
  if (cookie) headers.set("cookie", cookie);

  const res = await fetch(`${API_BASE}${path}`, { ...optionsWithCredentials(opts), headers });
  const setCookie = res.headers.get("set-cookie") ?? cookie;
  const data = (await res.json().catch(() => ({}))) as T & { error?: string };
  if (!res.ok) throw new Error(data.error ?? `${res.status} ${path}`);
  return { data, cookie: setCookie ?? undefined };
}

function optionsWithCredentials(opts: RequestInit): RequestInit {
  return { ...opts, credentials: "include" as RequestCredentials };
}

function signMessage(keypair: Keypair, message: string): string {
  const bytes = new TextEncoder().encode(message);
  const sig = nacl.sign.detached(bytes, keypair.secretKey);
  return bs58.encode(sig);
}

async function authenticate(keypair: Keypair): Promise<string> {
  const pubkey = keypair.publicKey.toBase58();
  const nonceRes = await api<{ nonce: string; message: string }>(`/api/auth/nonce?pubkey=${encodeURIComponent(pubkey)}`);
  const signature = signMessage(keypair, nonceRes.data.message);
  const verified = await api<{ balance: number }>(
    "/api/auth/verify",
    {
      method: "POST",
      body: JSON.stringify({ pubkey, signature, message: nonceRes.data.message }),
    },
    nonceRes.cookie,
  );
  console.log("Auth OK — balance:", verified.data.balance, "USDC");
  return verified.cookie ?? "";
}

async function main() {
  const authority = loadSettlementAuthority();
  if (!authority) {
    console.error("Missing SETTLEMENT_AUTHORITY_SECRET / SOLANA_DEPLOYER_SECRET");
    process.exit(1);
  }

  const testWallet = Keypair.generate();
  const pubkey = testWallet.publicKey.toBase58();
  console.log("Test wallet:", pubkey);
  console.log("Market:", MARKET, "Option:", OPTION, "Amount:", AMOUNT, "USDC");
  console.log("API:", API_BASE);

  // Fund test wallet (SOL for fees + USDC for stake)
  const rpc = process.env.SOLANA_RPC_URL ?? "https://api.devnet.solana.com";
  const connection = new Connection(rpc, "confirmed");
  const depBal = await connection.getBalance(authority.publicKey);
  if (depBal >= 0.01 * LAMPORTS_PER_SOL) {
    const tx = new Transaction().add(
      SystemProgram.transfer({
        fromPubkey: authority.publicKey,
        toPubkey: testWallet.publicKey,
        lamports: Math.floor(0.05 * LAMPORTS_PER_SOL),
      }),
    );
    await sendAndConfirmTransaction(connection, tx, [authority]);
    console.log("Sent 0.05 SOL from settlement authority");
  } else {
    console.warn("Settlement authority low on SOL — prediction may fail if wallet cannot pay fees");
  }

  const funded = await transferDevnetUsdcDirect({ recipientPubkey: pubkey, amount: 50 });
  console.log("Funded USDC — balance:", funded.balance);

  const cookie = await authenticate(testWallet);

  const built = await api<{ transaction: string; escrowPda: string }>(
    "/api/predictions/build-tx",
    { method: "POST", body: JSON.stringify({ marketExternalId: MARKET, amount: AMOUNT }) },
    cookie,
  );
  console.log("build-tx OK — escrow PDA:", built.data.escrowPda);

  const tx = Transaction.from(Buffer.from(built.data.transaction, "base64"));
  tx.partialSign(testWallet);
  const signature = await connection.sendRawTransaction(tx.serialize(), { skipPreflight: false });
  await connection.confirmTransaction(signature, "confirmed");
  console.log("On-chain tx:", signature);

  const verification = await verifyPlacePredictionTx({
    txSignature: signature,
    userPubkey: pubkey,
    marketExternalId: MARKET,
    expectedAmount: AMOUNT,
  });
  console.log("Verification:", verification);

  const placed = await api<{ prediction: { id: string } }>(
    "/api/predictions/place",
    {
      method: "POST",
      body: JSON.stringify({
        marketExternalId: MARKET,
        optionExternalId: OPTION,
        amount: AMOUNT,
        txSignature: signature,
        escrowPda: built.data.escrowPda,
      }),
    },
    cookie,
  );
  console.log("place OK — prediction id:", placed.data.prediction.id);
  console.log("E2E prediction flow succeeded");
}

main().catch((err) => {
  console.error("E2E failed:", err instanceof Error ? err.message : err);
  process.exit(1);
});
