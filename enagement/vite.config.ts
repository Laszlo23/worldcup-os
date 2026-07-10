import { fileURLToPath } from "node:url";
import { defineConfig } from "@lovable.dev/vite-tanstack-config";
import { matchmindAliasPlugin } from "./vite-alias-plugin";

const engagementSrc = fileURLToPath(new URL("./src", import.meta.url));
const sharedSrc = fileURLToPath(new URL("../src", import.meta.url));

export default defineConfig({
  plugins: [matchmindAliasPlugin(engagementSrc, sharedSrc)],
  vite: {
    server: {
      port: Number(process.env.VITE_PORT ?? 3019),
      strictPort: true,
      allowedHosts: ["localhost", "127.0.0.1", "match.buildingcultureid.space", "187.124.18.204"],
      proxy: {
        "/api": {
          target: process.env.VITE_API_PROXY_TARGET ?? "http://127.0.0.1:3031",
          changeOrigin: true,
          configure: (proxy) => {
            proxy.on("proxyReq", (proxyReq, req) => {
              const host = req.headers.host;
              if (host) proxyReq.setHeader("X-Forwarded-Host", host);
            });
          },
        },
      },
    },
    preview: {
      port: Number(process.env.VITE_PORT ?? 3019),
      strictPort: true,
      host: "0.0.0.0",
      allowedHosts: ["localhost", "127.0.0.1", "match.buildingcultureid.space", "187.124.18.204"],
      proxy: {
        "/api": {
          target: process.env.VITE_API_PROXY_TARGET ?? "http://127.0.0.1:3031",
          changeOrigin: true,
        },
      },
    },
  },
  tanstackStart: {
    server: { entry: "server" },
  },
  nitro: {
    preset: process.env.NITRO_PRESET === "vercel" ? "vercel" : "node-server",
    externals: {
      inline: [],
    },
  },
});
