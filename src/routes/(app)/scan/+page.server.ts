import { asc } from 'drizzle-orm';
import { db } from '#lib/server/db';
import { shops } from '#lib/server/schema';
import { getRecentStoreVisits } from '#lib/server/queries';
import type { PageServerLoad } from './$types';

export const load: PageServerLoad = async ({ locals }) => {
	const [stores, recentStores] = await Promise.all([
		db
			.select({
				id: shops.id,
				shopName: shops.shopName,
				supermarketName: shops.supermarketName,
				area: shops.area,
				city: shops.city,
				region: shops.region,
				address: shops.address
			})
			.from(shops)
			.orderBy(asc(shops.city), asc(shops.shopName)),
		getRecentStoreVisits(locals.user!.id, 5)
	]);

	return { stores, recentStores };
};
