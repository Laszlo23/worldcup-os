import { defineConfig } from "nitro";
import { fileURLToPath } from "node:url";

const engagementRoot = fileURLToPath(new URL(".", import.meta.url));
const sharedSrc = fileURLToPath(new URL("../src", import.meta.url));

export default defineConfig({
  rootDir: engagementRoot,
  serverDir: "./server",
  alias: {
    "@shared": sharedSrc,
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
