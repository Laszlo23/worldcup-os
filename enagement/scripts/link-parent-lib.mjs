#!/usr/bin/env node
/** Symlink parent shared lib modules so Nitro can resolve `@/lib/*` from bundled ../src/server code. */
import fs from "node:fs";
import path from "node:path";
import { fileURLToPath } from "node:url";

const root = path.resolve(path.dirname(fileURLToPath(import.meta.url)), "..");
const libDir = path.join(root, "src", "lib");
const parentLib = path.join(root, "..", "src", "lib");

const links = ["txoracle", "match-utils.ts", "data-truth.ts", "mock", "validators"];

fs.mkdirSync(libDir, { recursive: true });

for (const name of links) {
  const target = path.join(libDir, name);
  const source = path.join(parentLib, name);
  if (!fs.existsSync(source)) {
    console.warn(`[link-parent-lib] skip missing parent module: ${name}`);
    continue;
  }
  if (fs.existsSync(target)) {
    try {
      const stat = fs.lstatSync(target);
      if (stat.isSymbolicLink()) continue;
    } catch {
      // fall through
    }
    console.warn(`[link-parent-lib] skip existing file: ${name}`);
    continue;
  }
  const rel = path.relative(path.dirname(target), source);
  fs.symlinkSync(rel, target);
  console.log(`[link-parent-lib] ${name} -> ${rel}`);
}
