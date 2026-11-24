import { drizzle } from "drizzle-orm/node-postgres";
import { Pool } from "pg";
import * as schema from "./schema";

const globalForDb = globalThis as unknown as { pgPool?: Pool };

// reuse the pool across hot reloads / warm lambdas
const pool =
  globalForDb.pgPool ??
  new Pool({
    connectionString: process.env.DATABASE_URL,
    max: 5,
  });
globalForDb.pgPool = pool;

export const db = drizzle(pool, { schema });
export { schema };
