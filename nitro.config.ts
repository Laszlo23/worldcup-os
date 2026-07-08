import { defineConfig } from "nitro";
import { fileURLToPath } from "node:url";

export default defineConfig({
  serverDir: "./server",
  alias: {
    "@": fileURLToPath(new URL("./src", import.meta.url)),
  },
  preset: process.env.NITRO_PRESET || "node-server",
  unenv: {
    alias: {
      "@solana/web3.js": "@solana/web3.js",
    },
  },
  rollupConfig: {
    external: ["@solana/web3.js", "@solana/spl-token", "@coral-xyz/anchor"],
  },
});
