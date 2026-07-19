import {
  buildRegistrationFileJson,
  DEVNET_AGENT_REGISTRY_PROGRAM_ID,
  MAINNET_AGENT_REGISTRY_PROGRAM_ID,
  ServiceType,
} from "8004-solana";

/** Solana devnet genesis hash used in 8004 registration URIs. */
export const SOLANA_DEVNET_GENESIS = "EtWTRABZaYq6iMfeYKouRu166VU2xqa1";

/** Solana mainnet genesis hash used in 8004 registration URIs. */
export const SOLANA_MAINNET_GENESIS = "5eykt4UsFv8P8NJdTREpY1vzqKqZKvdp";

export type Agent8004Network = "devnet" | "mainnet";

export type BuildAgent8004MetadataInput = {
  name: string;
  description: string;
  image: string;
  wmosUrl: string;
  agentxUrl: string;
  walletPubkey: string;
  assetPubkey?: string;
  network?: Agent8004Network;
  active?: boolean;
};

function agentRegistryUri(network: Agent8004Network): string {
  const genesis = network === "mainnet" ? SOLANA_MAINNET_GENESIS : SOLANA_DEVNET_GENESIS;
  const program =
    network === "mainnet"
      ? MAINNET_AGENT_REGISTRY_PROGRAM_ID.toBase58()
      : DEVNET_AGENT_REGISTRY_PROGRAM_ID.toBase58();
  return `solana:${genesis}:${program}`;
}

export function buildAgent8004RegistrationMetadata(input: BuildAgent8004MetadataInput): Record<string, unknown> {
  const base = buildRegistrationFileJson({
    name: input.name,
    description: input.description,
    image: input.image,
    services: [
      { type: ServiceType.MCP, value: `${input.agentxUrl}/api/health`, meta: { version: "2025-06-18" } },
      { type: ServiceType.A2A, value: `${input.wmosUrl}/api/earn/listings`, meta: { version: "0.3.0" } },
      { type: ServiceType.WALLET, value: input.walletPubkey },
    ],
    skills: ["advanced_reasoning_planning/strategic_planning"],
    domains: ["finance_and_business/finance"],
    trustModels: ["reputation", "crypto-economic"],
    active: input.active ?? true,
    x402Support: false,
  });

  if (!input.assetPubkey) return base;

  const network = input.network ?? "devnet";
  return {
    ...base,
    registrations: [
      {
        agentId: input.assetPubkey,
        agentRegistry: agentRegistryUri(network),
      },
    ],
    supportedTrust: ["reputation", "crypto-economic"],
  };
}

export const AGENT_IDENTITY_LABEL = "MPL Core identity · ERC-8004 metadata";
