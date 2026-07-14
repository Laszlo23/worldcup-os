#!/usr/bin/env tsx
/**
 * Register Superform agent on 8004 Trustless Registry (devnet) using SOLANA_DEPLOYER_SECRET.
 * Writes AGENT_8004_ASSET to .env when registration succeeds.
 *
 * Usage: npm run trust8004:register
 */
import { readFileSync, writeFileSync } from "node:fs";
import path from "node:path";
import { fileURLToPath } from "node:url";
import bs58 from "bs58";
import { Keypair } from "@solana/web3.js";
import { SolanaSDK, buildRegistrationFileJson, ServiceType, IPFSClient } from "8004-solana";
import { loadEnv } from "./load-env.mjs";

const root = path.resolve(path.dirname(fileURLToPath(import.meta.url)), "..");
loadEnv();

const AGENT_NAME = process.env.SUPERTEAM_EARN_AGENT_NAME ?? "superform-worldcup-agent";
const WMOS_URL = (process.env.WMOS_URL ?? "https://wmos.buildingcultureid.space").replace(/\/$/, "");
const AGENTX_URL = (process.env.AGENTX_URL ?? "https://agentx.buildingcultureid.space").replace(/\/$/, "");

function loadDeployer(): Keypair {
  const secret = process.env.SOLANA_DEPLOYER_SECRET;
  if (!secret) throw new Error("SOLANA_DEPLOYER_SECRET missing in .env");
  const trimmed = secret.trim().replace(/^"|"$/g, "");
  try {
    const parsed = JSON.parse(trimmed) as number[];
    if (Array.isArray(parsed)) return Keypair.fromSecretKey(Uint8Array.from(parsed));
  } catch {
    // base58
  }
  return Keypair.fromSecretKey(bs58.decode(trimmed));
}

async function pinMetadata(metadata: Record<string, unknown>): Promise<string> {
  const jwt = process.env.PINATA_JWT?.trim();
  if (jwt) {
    const ipfs = new IPFSClient({ pinataEnabled: true, pinataJwt: jwt });
    const cid = await ipfs.addJson(metadata);
    await ipfs.close();
    return `ipfs://${cid}`;
  }

  const apiKey = process.env.PINATA_API_KEY?.trim();
  const apiSecret = process.env.PINATA_SECRET_API_KEY?.trim();
  if (apiKey && apiSecret) {
    const res = await fetch("https://api.pinata.cloud/pinning/pinJSONToIPFS", {
      method: "POST",
      headers: {
        pinata_api_key: apiKey,
        pinata_secret_api_key: apiSecret,
        "Content-Type": "application/json",
      },
      body: JSON.stringify({
        pinataContent: metadata,
        pinataMetadata: { name: `${AGENT_NAME}-8004.json` },
      }),
    });
    if (!res.ok) throw new Error(`Pinata pin failed: ${res.status} ${await res.text()}`);
    const body = (await res.json()) as { IpfsHash: string };
    return `ipfs://${body.IpfsHash}`;
  }

  const publicPath = path.join(root, "public", "agent-8004-registration.json");
  writeFileSync(publicPath, `${JSON.stringify(metadata, null, 2)}\n`);
  return `${WMOS_URL}/agent-8004-registration.json`;
}

function upsertEnvVar(filePath: string, key: string, value: string): void {
  const line = `${key}=${value}`;
  let content = readFileSync(filePath, "utf8");
  const pattern = new RegExp(`^${key}=.*$`, "m");
  if (pattern.test(content)) {
    content = content.replace(pattern, line);
  } else {
    content = `${content.trimEnd()}\n${line}\n`;
  }
  writeFileSync(filePath, content);
}

async function main() {
  const existing = process.env.AGENT_8004_ASSET?.trim();
  if (existing && !process.argv.includes("--force")) {
    console.log(JSON.stringify({ skipped: true, asset: existing, hint: "Use --force to register again" }, null, 2));
    return;
  }

  const deployer = loadDeployer();
  console.log("Deployer:", deployer.publicKey.toBase58());

  const connection = new (await import("@solana/web3.js")).Connection(
    process.env.SOLANA_RPC_URL ?? "https://api.devnet.solana.com",
    "confirmed",
  );
  const balance = await connection.getBalance(deployer.publicKey);
  const sol = balance / 1e9;
  console.log("Balance:", sol.toFixed(4), "SOL");
  if (sol < 0.008) {
    console.error(
      JSON.stringify(
        {
          error: "insufficient_lamports",
          need: "~0.01 SOL",
          deployer: deployer.publicKey.toBase58(),
          balance: sol,
          fund: [
            "npm run trust8004:airdrop",
            "https://faucet.solana.com (paste deployer pubkey)",
            "npm run fund:sol -- <pubkey> 1 (from another funded wallet)",
          ],
        },
        null,
        2,
      ),
    );
    process.exit(1);
  }

  const metadata = buildRegistrationFileJson({
    name: AGENT_NAME,
    description:
      "TxLINE sports intelligence stack — World Cup OS predictions, MatchMind fan engagement, AgentX autonomous arena.",
    image: `${WMOS_URL}/partners/txline.svg`,
    services: [
      { type: ServiceType.MCP, value: `${AGENTX_URL}/api/health` },
      { type: ServiceType.A2A, value: `${WMOS_URL}/api/earn/listings` },
      { type: ServiceType.WALLET, value: deployer.publicKey.toBase58() },
    ],
    skills: ["advanced_reasoning_planning/strategic_planning"],
    domains: ["finance_and_business/finance"],
    x402Support: false,
  });

  const tokenUri = await pinMetadata(metadata);
  console.log("Metadata URI:", tokenUri);

  const sdk = new SolanaSDK({
    cluster: "devnet",
    rpcUrl: process.env.SOLANA_RPC_URL ?? "https://api.devnet.solana.com",
    signer: deployer,
  });

  const result = await sdk.registerAgent(tokenUri);
  const asset =
    result && typeof result === "object" && "asset" in result && result.asset
      ? result.asset.toBase58()
      : null;
  const signature =
    result && typeof result === "object" && "signature" in result ? String(result.signature ?? "") : undefined;

  if (!asset) throw new Error("registerAgent did not return asset pubkey");

  const envPath = path.join(root, ".env");
  upsertEnvVar(envPath, "AGENT_8004_ASSET", asset);
  upsertEnvVar(envPath, "WMOS_URL", WMOS_URL);
  upsertEnvVar(envPath, "AGENTX_URL", AGENTX_URL);
  upsertEnvVar(envPath, "MATCHMIND_URL", process.env.MATCHMIND_URL ?? "https://match.buildingcultureid.space");

  const agentxEnv = path.join(root, "agentx", ".env");
  try {
    upsertEnvVar(agentxEnv, "NEXT_PUBLIC_AGENT_8004_ASSET", asset);
    upsertEnvVar(agentxEnv, "NEXT_PUBLIC_WMOS_URL", WMOS_URL);
  } catch {
    // agentx .env optional locally
  }

  console.log(
    JSON.stringify(
      {
        ok: true,
        asset,
        signature,
        tokenUri,
        deployer: deployer.publicKey.toBase58(),
        explorer: `https://explorer.solana.com/address/${asset}?cluster=devnet`,
        feedbackSigner: "SOLANA_DEPLOYER_SECRET (default)",
      },
      null,
      2,
    ),
  );
}

main().catch((err) => {
  console.error(err instanceof Error ? err.message : err);
  process.exit(1);
});
