import { describe, expect, it, beforeAll } from "vitest";
import { getEscrowPdaForExternalMarket, getWorldcupProgramId } from "../escrow";

describe("escrow PDA", () => {
  beforeAll(() => {
    process.env.WORLDCUP_PROGRAM_ID = "Dr4SiPac8YoQbn6TgAeigEegCegjGTFtnEm3tjyiGqJ6";
  });

  it("uses configured program id", () => {
    expect(getWorldcupProgramId().toBase58()).toBe("Dr4SiPac8YoQbn6TgAeigEegCegjGTFtnEm3tjyiGqJ6");
  });

  it("derives deterministic escrow vault for market + user", () => {
    const user = "11111111111111111111111111111112";
    const a = getEscrowPdaForExternalMarket("mkt_fra_ger", user);
    const b = getEscrowPdaForExternalMarket("mkt_fra_ger", user);
    expect(a.toBase58()).toBe(b.toBase58());
  });
});
