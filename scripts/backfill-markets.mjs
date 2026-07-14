#!/usr/bin/env tsx
/**
 * Backfill markets for scheduled matches missing any market rows.
 * Usage: npm run backfill:markets [-- matchExternalId]
 */
import pg from "pg";
import { backfillMissingMarkets } from "../src/server/services/market-engine";

const matchFilter = process.argv[2] ?? undefined;
const pool = new pg.Pool({ connectionString: process.env.DATABASE_URL });

async function main() {
  if (!process.env.DATABASE_URL) {
    console.error("DATABASE_URL required");
    process.exit(1);
  }

  const count = await backfillMissingMarkets(matchFilter);
  console.log(count ? `Backfilled markets for ${count} match(es).` : "No scheduled matches missing markets.");
}

main()
  .catch((err) => {
    console.error(err);
    process.exit(1);
  })
  .finally(() => pool.end());
