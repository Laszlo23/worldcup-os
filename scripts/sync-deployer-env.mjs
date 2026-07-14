#!/usr/bin/env node
import { readFileSync, writeFileSync } from "node:fs";
import { spawnSync } from "node:child_process";
import path from "node:path";
import { fileURLToPath } from "node:url";

const root = path.resolve(path.dirname(fileURLToPath(import.meta.url)), "..");
const env = readFileSync(path.join(root, ".env"), "utf8");

function pick(key) {
  const m = env.match(new RegExp(`^${key}=(.*)$`, "m"));
  return m ? m[1].trim() : "";
}

const patch = {
  SETTLEMENT_AUTHORITY_SECRET: pick("SETTLEMENT_AUTHORITY_SECRET"),
  ADMIN_WALLET_ALLOWLIST: pick("ADMIN_WALLET_ALLOWLIST"),
  SOLANA_DEPLOYER_SECRET: pick("SOLANA_DEPLOYER_SECRET"),
  WEBACY_API_KEY: pick("WEBACY_API_KEY") || pick("WEBACCEL_API_KEY"),
  WEBACY_ENABLED: pick("WEBACY_ENABLED") || "true",
};

const patchPath = "/tmp/wmos-env-patch.json";
writeFileSync(patchPath, JSON.stringify(patch));

const sshKey = `${process.env.HOME}/.ssh/id_ed25519_wgsdex`;
const host = "root@187.124.18.204";

const envPaths = [
  "/var/www/wmos-buildingculture/.env",
  "/var/www/match-buildingculture/enagement/.env",
  "/var/www/agentx-buildingculture/.env",
];

spawnSync("scp", ["-i", sshKey, patchPath, `${host}:/tmp/wmos-env-patch.json`], { stdio: "inherit" });

const remoteScript = `const fs=require('fs');const patch=JSON.parse(fs.readFileSync('/tmp/wmos-env-patch.json','utf8'));const paths=${JSON.stringify(envPaths)};for(const p of paths){try{let e=fs.readFileSync(p,'utf8');for(const[k,v]of Object.entries(patch)){if(!v)continue;const re=new RegExp('^'+k+'=.*$','m');e=re.test(e)?e.replace(re,k+'='+v):e+'\\n'+k+'='+v;}fs.writeFileSync(p,e);console.log('patched',p);}catch(err){console.warn('skip',p,err.message);}}`;

const r = spawnSync("ssh", ["-i", sshKey, host, `node -e ${JSON.stringify(remoteScript)}`], { stdio: "inherit" });
process.exit(r.status ?? 1);
