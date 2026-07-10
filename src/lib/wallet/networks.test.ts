import { describe, it, expect } from "vitest";
import { SOLANA_GENESIS_HASH, getAppGenesisHash } from "./networks";

describe("solana networks", () => {
  it("uses devnet genesis hash by default in tests", () => {
    expect(getAppGenesisHash()).toBe(SOLANA_GENESIS_HASH.devnet);
  });
});
