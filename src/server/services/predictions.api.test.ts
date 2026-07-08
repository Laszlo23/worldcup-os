import { describe, it, expect } from "vitest";
import { placePredictionSchema } from "@/lib/validators/api";

describe("predictions API schema", () => {
  it("requires tx signature fields for on-chain place", () => {
    const parsed = placePredictionSchema.safeParse({
      marketExternalId: "mkt_1",
      optionExternalId: "opt_1",
      amount: 50,
      txSignature: "5xSig",
      escrowPda: "EscrowPda",
    });
    expect(parsed.success).toBe(true);
    expect(parsed.data?.txSignature).toBe("5xSig");
  });
});
