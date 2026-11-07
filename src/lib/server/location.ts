import { eq } from 'drizzle-orm';
import { db } from './db';
import { shops, userSettings } from './schema';
import { haversineMiles } from '#lib/utils/geo';

export type UserLocation = {
	lat: number;
	lng: number;
	label: string | null;
	radiusMiles: number;
};

export async function getUserLocation(userId: string): Promise<UserLocation | null> {
	const [row] = await db
		.select({
			lat: userSettings.lat,
			lng: userSettings.lng,
			label: userSettings.label,
			radiusMiles: userSettings.radiusMiles
		})
		.from(userSettings)
		.where(eq(userSettings.userId, userId))
		.limit(1);

	if (!row || row.lat === null || row.lng === null) return null;
	return {
		lat: row.lat,
		lng: row.lng,
		label: row.label,
		radiusMiles: Number(row.radiusMiles) || 5
	};
}

export async function saveUserLocation(
	userId: string,
	input: { lat: number; lng: number; label?: string | null; radiusMiles?: number | null }
) {
	const lat = Number(input.lat);
	const lng = Number(input.lng);
	const radiusMiles = Math.min(100, Math.max(0.5, Number(input.radiusMiles) || 5));
	if (!Number.isFinite(lat) || lat < -90 || lat > 90) throw new Error('Invalid latitude');
	if (!Number.isFinite(lng) || lng < -180 || lng > 180) throw new Error('Invalid longitude');

	await db
		.insert(userSettings)
		.values({
			userId,
			lat,
			lng,
			label: input.label?.trim() || null,
			radiusMiles,
			updatedAt: new Date()
		})
		.onConflictDoUpdate({
			target: userSettings.userId,
			set: {
				lat,
				lng,
				label: input.label?.trim() || null,
				radiusMiles,
				updatedAt: new Date()
			}
		});

	return getUserLocation(userId);
}

export async function clearUserLocation(userId: string) {
	await db.delete(userSettings).where(eq(userSettings.userId, userId));
}

/**
 * Returns the user's saved location and the set of shops within the chosen
 * radius. `shopIds` is null when no location is set, meaning "all UK".
 */
export async function getLocationContext(userId: string) {
	const location = await getUserLocation(userId);
	if (!location) return { location: null, shopIds: null as number[] | null };

	const rows = await db
		.select({ id: shops.id, lat: shops.lat, lng: shops.lng })
		.from(shops);

	const shopIds = rows
		.filter(
			(shop) =>
				haversineMiles(location.lat, location.lng, shop.lat, shop.lng) <=
				location.radiusMiles
		)
		.map((shop) => shop.id);

	return { location, shopIds };
}