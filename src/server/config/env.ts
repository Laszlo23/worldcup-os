function optional(name: string, fallback = ""): string {
  return process.env[name] ?? fallback;
}

function isProduction(): boolean {
  return process.env.NODE_ENV === "production";
}

function solanaNetwork(): "devnet" | "mainnet" {
  const raw = optional("SOLANA_NETWORK", optional("VITE_SOLANA_NETWORK", "devnet"));
  return raw === "mainnet" ? "mainnet" : "devnet";
}

const network = solanaNetwork();

const NETWORK_DEFAULTS = {
  devnet: {
    rpcUrl: "https://api.devnet.solana.com",
    txlineOrigin: "https://txline-dev.txodds.com",
    usdcMint: "ELWTKspHKCnCfCiCiqYw1EDH77k8VCP74dK9qytG2Ujh",
    txoracleProgramId: "6pW64gN1s2uqjHkn1unFeEjAwJkPGHoppGvS715wyP2J",
    txlTokenMint: "4Zao8ocPhmMgq7PdsYWyxvqySMGx7xb9cMftPMkEokRG",
  },
  mainnet: {
    rpcUrl: "https://api.mainnet-beta.solana.com",
    txlineOrigin: "https://txline.txodds.com",
    usdcMint: "Es9vMFrzaCERmJfrF4H2FYD4KCoNkY11McCe8BenwNYB",
    txoracleProgramId: "9ExbZjAapQww1vfcisDmrngPinHTEfpjYRWMunJgcKaA",
    txlTokenMint: "Zhw9TVKp68a1QrftncMSd6ELXKDtpVMNuMGr1jNwdeL",
  },
} as const;

const defaults = NETWORK_DEFAULTS[network];

export const env = {
  databaseUrl: optional("DATABASE_URL"),
  databaseSsl: optional("DATABASE_SSL", "false") === "true",
  txlineApiOrigin: optional("TXLINE_API_ORIGIN", defaults.txlineOrigin),
  txlineServiceLevel: Number(optional("TXLINE_SERVICE_LEVEL", "12")),
  txlineGuestJwt: optional("TXLINE_GUEST_JWT"),
  txlineApiToken: optional("TXLINE_API_TOKEN"),
  requireLiveData: optional("REQUIRE_LIVE_DATA", "false") === "true",
  solanaRpcUrl: optional("SOLANA_RPC_URL", optional("VITE_SOLANA_RPC_URL", defaults.rpcUrl)),
  solanaNetwork: network,
  worldcupProgramId: optional("WORLDCUP_PROGRAM_ID", optional("VITE_WORLDCUP_PROGRAM_ID")),
  usdcMint: optional("USDC_MINT", optional("USDC_MINT_DEVNET", optional("VITE_USDC_MINT", defaults.usdcMint))),
  txoracleProgramId: optional("TXORACLE_PROGRAM_ID", defaults.txoracleProgramId),
  txlTokenMint: optional("TXL_TOKEN_MINT", defaults.txlTokenMint),
  adminWalletAllowlist: optional("ADMIN_WALLET_ALLOWLIST")
    .split(",")
    .map((s) => s.trim())
    .filter(Boolean),
  workerSecret: optional("WORKER_SECRET", "dev-worker-secret"),
  sessionSecret: optional("SESSION_SECRET", "dev-session-secret"),
  appUrl: optional("VITE_APP_URL", "http://localhost:5173"),
  allowedOrigins: optional("APP_ALLOWED_ORIGINS")
    .split(",")
    .map((s) => s.trim())
    .filter(Boolean),
  neynarApiKey: optional("NEYNAR_API_KEY"),
  farcasterDomain: optional("FARCASTER_DOMAIN", optional("VITE_FARCASTER_DOMAIN", "localhost")),
  superteamEarnBaseUrl: optional("SUPERTEAM_EARN_BASE_URL", "https://superteam.fun"),
  superteamEarnApiKey: optional("SUPERTEAM_EARN_API_KEY"),
  superteamEarnClaimCode: optional("SUPERTEAM_EARN_CLAIM_CODE"),
  superteamEarnAgentId: optional("SUPERTEAM_EARN_AGENT_ID"),
  agentxApiKey: optional("AGENTX_API_KEY"),
  agentxUrl: optional("AGENTX_URL", "https://agentx.buildingcultureid.space"),
  wmosUrl: optional("WMOS_URL", "https://wmos.buildingcultureid.space"),
  matchmindUrl: optional("MATCHMIND_URL", "https://match.buildingcultureid.space"),
  webacyApiKey: optional("WEBACY_API_KEY") || optional("WEBACCEL_API_KEY"),
  webacyEnabled: optional("WEBACY_ENABLED", "true") === "true",
};

export function hasWebacy(): boolean {
  return env.webacyEnabled && Boolean(env.webacyApiKey);
}

export function hasDatabase(): boolean {
  const url = env.databaseUrl;
  if (!url) return false;
  if (url.includes("<") || url.includes("your-") || url.includes("postgres://user:pass@host:5432/db")) return false;
  return true;
}

export function hasTxlineCredentials(): boolean {
  return Boolean(env.txlineApiToken);
}

export function useMockFallback(): boolean {
  if (isProduction()) return false;
  if (env.requireLiveData) return false;
  return !hasDatabase();
}

export function assertProductionSecrets(): void {
  if (!isProduction()) return;
  if (env.workerSecret === "dev-worker-secret") {
    throw new Error("WORKER_SECRET must be set in production");
  }
  if (env.sessionSecret === "dev-session-secret") {
    throw new Error("SESSION_SECRET must be set in production");
  }
  if (process.env.ALLOW_SIMULATED_SETTLE === "true") {
    throw new Error("ALLOW_SIMULATED_SETTLE must not be enabled in production");
  }
  if (!hasDatabase() && env.requireLiveData) {
    throw new Error("Database connection required in production when REQUIRE_LIVE_DATA=true");
  }
}

export class LiveDataRequiredError extends Error {
  constructor(message = "Live data unavailable. Configure Postgres and TxLINE credentials.") {
    super(message);
    this.name = "LiveDataRequiredError";
  }
}
