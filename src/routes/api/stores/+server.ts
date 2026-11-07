import { json } from '@sveltejs/kit';
import { and, eq, ilike, or } from 'drizzle-orm';
import { db } from '#lib/server/db';
import { shops } from '#lib/server/schema';
import type { RequestHandler } from './$types';

export const GET: RequestHandler = async ({ url, locals }) => {
	if (!locals.user) return json({ error: 'Unauthorized' }, { status: 401 });

	const q = url.searchParams.get('q')?.trim() ?? '';
	const chain = url.searchParams.get('chain')?.trim() ?? '';
	const limit = Math.min(120, Math.max(1, Number(url.searchParams.get('limit') ?? 100)));

	const conditions = [];
	if (q) {
		conditions.push(
			or(
				ilike(shops.shopName, `%${q}%`),
				ilike(shops.city, `%${q}%`),
				ilike(shops.supermarketName, `%${q}%`),
				ilike(shops.postcode, `%${q}%`)
			)
		);
	}
	if (chain) conditions.push(eq(shops.supermarketName, chain));

	const rows = await db
		.select({
			id: shops.id,
			shopName: shops.shopName,
			supermarketName: shops.supermarketName,
			area: shops.area,
			city: shops.city,
			region: shops.region,
			lat: shops.lat,
			lng: shops.lng,
			address: shops.address,
			postcode: shops.postcode
		})
		.from(shops)
		.where(conditions.length ? and(...conditions) : undefined)
		.orderBy(shops.city, shops.shopName)
		.limit(limit);

	return json({ stores: rows });
};
