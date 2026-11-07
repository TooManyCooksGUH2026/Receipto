/**
 * Apply OSM localities and backfill receipt subtotal/discount columns without
 * wiping user accounts or receipts.
 */
import 'dotenv/config';
import { readFile } from 'node:fs/promises';
import { resolve } from 'node:path';
import pg from 'pg';

const connectionString = process.env.DATABASE_URL ?? 'postgres://localhost:5432/receipto';
const pool = new pg.Pool({ connectionString, max: 2 });
const data = JSON.parse(await readFile(resolve('src/lib/data/osm-shops.json'), 'utf8'));
const client = await pool.connect();

try {
	await client.query('begin');
	let updated = 0;
	for (const shop of data.shops) {
		if (!shop.osmId) continue;
		const result = await client.query('update shops set area = $1 where osm_id = $2', [
			shop.area ?? null,
			shop.osmId
		]);
		updated += result.rowCount ?? 0;
	}
	await client.query('update receipts set subtotal = total where subtotal = 0');
	await client.query('commit');
	console.log(`Updated area for ${updated} shops and backfilled receipt subtotals.`);
} catch (error) {
	await client.query('rollback');
	throw error;
} finally {
	client.release();
	await pool.end();
}
