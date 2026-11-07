const EARTH_RADIUS_MILES = 3958.7613;

export function haversineMiles(
	lat1: number,
	lng1: number,
	lat2: number,
	lng2: number
): number {
	const toRadians = (value: number) => (value * Math.PI) / 180;
	const dLat = toRadians(lat2 - lat1);
	const dLng = toRadians(lng2 - lng1);
	const a =
		Math.sin(dLat / 2) ** 2 +
		Math.cos(toRadians(lat1)) * Math.cos(toRadians(lat2)) * Math.sin(dLng / 2) ** 2;
	return 2 * EARTH_RADIUS_MILES * Math.asin(Math.sqrt(a));
}