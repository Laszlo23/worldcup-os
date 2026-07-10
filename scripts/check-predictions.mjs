#!/usr/bin/env node
import pg from "pg";
import { readFileSync } from "node:fs";
import { join, dirname } from "node:path";
import { fileURLToPath } from "node:url";

const root = join(dirname(fileURLToPath(import.meta.url)), "..");
const env = Object.fromEntries(
  readFileSync(join(root, ".env"), "utf8")
    .split("\n")
    .filter((l) => l && !l.startsWith("#"))
    .map((l) => {
      const i = l.indexOf("=");
      return [l.slice(0, i), l.slice(i + 1)];
    }),
);

const pool = new pg.Pool({
  connectionString: process.env.DATABASE_URL ?? env.DATABASE_URL,
  ssl: (process.env.DATABASE_SSL ?? env.DATABASE_SSL) === "true" ? { rejectUnauthorized: false } : undefined,
});

const preds = await pool.query(`
  select p.external_id, p.amount, p.status, p.placed_at, u.wallet_pubkey, m.external_id as match_id
  from predictions p
  join users u on u.id = p.user_id
  join matches m on m.id = p.match_id
  order by p.placed_at desc
  limit 25
`);
console.log("RECENT PREDICTIONS", JSON.stringify(preds.rows, null, 2));

const today = await pool.query(`
  select count(*)::int as cnt, coalesce(sum(amount), 0)::float as vol
  from predictions
  where placed_at::date = current_date
`);
console.log("TODAY", today.rows[0]);

await pool.end();
