import { drizzle } from 'drizzle-orm/node-postgres';
import pg from 'pg';
import { DATABASE_URL } from '$app/env/private';
import * as schema from './schema';

const connectionString = DATABASE_URL || process.env.DATABASE_URL || 'postgres://localhost:5432/receipto';

const globalForDb = globalThis as unknown as {
	pool?: pg.Pool;
};

const pool =
	globalForDb.pool ??
	new pg.Pool({
		connectionString,
		max: 10
	});

if (process.env.NODE_ENV !== 'production') globalForDb.pool = pool;

export const db = drizzle(pool, { schema });
export { pool, schema };
