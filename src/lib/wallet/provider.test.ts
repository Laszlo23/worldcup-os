import { describe, it, expect, vi, afterEach } from "vitest";
import { createWalletAdapters } from "./provider";

describe("createWalletAdapters", () => {
  afterEach(() => {
    vi.unstubAllGlobals();
  });

  it("returns empty array when window is undefined", () => {
    vi.stubGlobal("window", undefined);
    expect(createWalletAdapters()).toEqual([]);
  });

  it("returns adapters when window is defined", () => {
    vi.stubGlobal("window", {});
    const adapters = createWalletAdapters();
    expect(adapters.length).toBe(3);
    expect(adapters.map((a) => a.name)).toEqual(["Phantom", "OKX Wallet", "Solflare"]);
  });
});
