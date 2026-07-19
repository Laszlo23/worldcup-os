import { defineEventHandler } from "h3";
import { buildAgent8004RegistrationMetadata } from "@/lib/agent-8004-metadata";
import { getTrust8004Asset } from "@/server/services/trust8004/client";

export default defineEventHandler(() => {
  const asset = getTrust8004Asset();
  const wmosUrl = (process.env.WMOS_URL ?? "https://wmos.buildingcultureid.space").replace(/\/$/, "");
  const agentxUrl = (process.env.AGENTX_URL ?? "https://agentx.buildingcultureid.space").replace(/\/$/, "");
  const name = process.env.SUPERTEAM_EARN_AGENT_NAME ?? "superform-worldcup-agent";

  const registration = buildAgent8004RegistrationMetadata({
    name,
    description:
      "TxLINE sports intelligence stack — World Cup OS predictions, MatchMind fan engagement, AgentX autonomous arena.",
    image: `${wmosUrl}/partners/txline.svg`,
    wmosUrl,
    agentxUrl,
    walletPubkey: process.env.SOLANA_DEPLOYER_PUBLIC_KEY?.trim() ?? "",
    assetPubkey: asset ?? undefined,
    network: process.env.SOLANA_NETWORK === "mainnet" ? "mainnet" : "devnet",
    active: Boolean(asset),
  });

  return {
    identity: "MPL Core identity · ERC-8004 metadata",
    configured: Boolean(asset),
    asset: asset ?? null,
    registration,
  };
});
