import { neon } from '@neondatabase/serverless';
import { drizzle, NeonHttpDatabase } from 'drizzle-orm/neon-http';
import * as schema from './schema/index.js';

export type Database = NeonHttpDatabase<typeof schema>;

let _db: Database | null = null;

/**
 * Creates a new database client instance connected to the specified URL.
 * Does not cache — each call produces a fresh client.
 */
export function createDb(databaseUrl: string): Database {
  const sql = neon(databaseUrl);
  return drizzle(sql, { schema });
}

/**
 * Returns a singleton database client using DATABASE_URL from the environment.
 * Throws if DATABASE_URL is not set.
 */
export function getDb(): Database {
  if (_db) return _db;

  const url = process.env.DATABASE_URL;
  if (!url) {
    throw new Error(
      'DATABASE_URL environment variable is not set. ' +
        'Please set it before accessing the database.',
    );
  }

  _db = createDb(url);
  return _db;
}

export { schema };
