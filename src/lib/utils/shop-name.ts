/**
 * OSM often names a shop just "Lidl" or "Tesco Extra". Combine the shop name
 * with its locality so store pickers show "Lidl Withington", "Lidl Didsbury".
 */
export function shopDisplayName(
	shopName: string | null | undefined,
	area: string | null | undefined
): string {
	const name = (shopName ?? 'Store').trim();
	const locality = (area ?? '').trim();
	if (!locality) return name;
	if (name.toLowerCase().includes(locality.toLowerCase())) return name;
	return `${name} ${locality}`;
}
