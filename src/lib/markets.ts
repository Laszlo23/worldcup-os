import type { Market, Match } from "./mock/types";
import { isMatchBettableByClock } from "./match-phase";

export function findWinnerMarket(markets: Market[]): Market | undefined {
  return markets.find((m) => m.type === "winner" && !m.closed);
}

export function isMatchBettable(match: Match | undefined): boolean {
  if (!match) return false;
  return isMatchBettableByClock(match);
}

export function isMarketBettable(match: Match | undefined, market: Market): boolean {
  return isMatchBettable(match) && !market.closed;
}

export function getExplorerTxUrl(signature: string): string {
  const cluster = import.meta.env.VITE_SOLANA_NETWORK ?? "devnet";
  return `https://explorer.solana.com/tx/${signature}?cluster=${cluster}`;
}
