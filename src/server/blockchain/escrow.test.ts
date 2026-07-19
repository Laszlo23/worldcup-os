import { describe, expect, it, beforeAll, vi } from "vitest";
import { Connection, Transaction } from "@solana/web3.js";
import { buildPlacePredictionTx, getEscrowPdaForExternalMarket, getWorldcupProgramId } from "./escrow";

function mockConnection(accountExists: boolean): Connection {
  return {
    getAccountInfo: vi.fn().mockResolvedValue(accountExists ? { lamports: 1 } : null),
    getBalance: vi.fn().mockResolvedValue(0),
    getLatestBlockhash: vi.fn().mockResolvedValue({
      blockhash: "11111111111111111111111111111111",
      lastValidBlockHeight: 1,
    }),
  } as unknown as Connection;
}

describe("escrow PDA", () => {
  beforeAll(() => {
    process.env.WORLDCUP_PROGRAM_ID = "Dr4SiPac8YoQbn6TgAeigEegCegjGTFtnEm3tjyiGqJ6";
    process.env.USDC_MINT = "4zMMC9srt5Ri5X14GAgXhaHii3GnPAEERYPJgZJDncDU";
    process.env.SOLANA_RPC_URL = "https://api.devnet.solana.com";
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

describe("buildPlacePredictionTx", () => {
  const user = "Ebg5SZicANi5w1sABmQ8RrYcYtFtULVY4skeC6e5LYWY";

  beforeAll(() => {
    process.env.WORLDCUP_PROGRAM_ID = "Dr4SiPac8YoQbn6TgAeigEegCegjGTFtnEm3tjyiGqJ6";
    process.env.USDC_MINT = "4zMMC9srt5Ri5X14GAgXhaHii3GnPAEERYPJgZJDncDU";
    process.env.SOLANA_RPC_URL = "https://api.devnet.solana.com";
  });

  it("includes user USDC ATA, escrow ATA, and transfer when accounts are missing", async () => {
    const built = await buildPlacePredictionTx(
      {
        userPubkey: user,
        amount: 5,
        marketExternalId: "fx-18218149-cs",
      },
      mockConnection(false),
    );

    expect(built).not.toBeNull();
    expect(built?.escrowPda).toBe(
      getEscrowPdaForExternalMarket("fx-18218149-cs", user).toBase58(),
    );

    const tx = Transaction.from(Buffer.from(built!.transaction, "base64"));
    expect(tx.instructions.length).toBe(3);
  });

  it("includes only transfer when both ATAs already exist", async () => {
    const built = await buildPlacePredictionTx(
      {
        userPubkey: user,
        amount: 1,
        marketExternalId: "fx-18209181-winner",
      },
      mockConnection(true),
    );

    expect(built).not.toBeNull();
    const tx = Transaction.from(Buffer.from(built!.transaction, "base64"));
    expect(tx.instructions.length).toBe(1);
  });
});
