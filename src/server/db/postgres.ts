import { Pool, type PoolClient, type QueryResultRow } from "pg";
import { env, hasDatabase } from "../config/env";

let pool: Pool | null = null;

export function getPostgresPool(): Pool {
  if (!hasDatabase()) {
    throw new Error("Postgres is not configured. Set DATABASE_URL.");
  }

  if (!pool) {
    pool = new Pool({
      connectionString: env.databaseUrl,
      ssl: env.databaseSsl ? { rejectUnauthorized: false } : undefined,
    });
  }

  return pool;
}

export async function query<T extends QueryResultRow = QueryResultRow>(
  text: string,
  params: unknown[] = [],
  client?: PoolClient,
): Promise<T[]> {
  const executor = client ?? getPostgresPool();
  const result = await executor.query<T>(text, params);
  return result.rows;
}

export async function one<T extends QueryResultRow = QueryResultRow>(
  text: string,
  params: unknown[] = [],
  client?: PoolClient,
): Promise<T> {
  const rows = await query<T>(text, params, client);
  if (!rows[0]) {
    throw new Error("Expected one row but found none.");
  }
  return rows[0];
}

export async function maybeOne<T extends QueryResultRow = QueryResultRow>(
  text: string,
  params: unknown[] = [],
  client?: PoolClient,
): Promise<T | null> {
  const rows = await query<T>(text, params, client);
  return rows[0] ?? null;
}

export async function withTransaction<T>(fn: (client: PoolClient) => Promise<T>): Promise<T> {
  const client = await getPostgresPool().connect();
  try {
    await client.query("BEGIN");
    const result = await fn(client);
    await client.query("COMMIT");
    return result;
  } catch (error) {
    await client.query("ROLLBACK");
    throw error;
  } finally {
    client.release();
  }
}
