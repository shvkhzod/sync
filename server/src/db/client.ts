import 'dotenv/config';
import postgres from 'postgres';
import { drizzle } from 'drizzle-orm/postgres-js';
import * as schema from './schema.js';

const url = process.env.DATABASE_URL;
if (!url) {
  throw new Error('DATABASE_URL not set. Copy .env.example to .env and fill it in.');
}

// `max: 10` is plenty for a single-user API. Tune up if connection volume grows.
const sql = postgres(url, { max: 10 });

export const db = drizzle(sql, { schema });
export { schema };

// Exposed for graceful shutdown.
export async function closeDb(): Promise<void> {
  await sql.end({ timeout: 5 });
}
