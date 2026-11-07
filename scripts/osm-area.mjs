/**
 * Shared locality extraction for OpenStreetMap shop imports.
 * Produces labels such as "Lidl Withington" instead of several plain "Lidl"
 * entries, while rejecting generic store-finder words, regions and postcodes.
 */

export function titleCase(value) {
	return value
		.toLowerCase()
		.replace(/\b\w/g, (character) => character.toUpperCase())
		.replace(/\bAnd\b/g, 'and');
}

const BAD_AREAS =
	/^(?:store|stores|storefinder|store-finder|locator|locations?|find-a-store|supermarket|supermarkets|shopping|food|groceries|retail|park|england|scotland|wales|northern ireland|greater london|london|west midlands|east midlands|south east|south west|east of england|north west|north east|north|south|east|west|yorkshire(?: and the humber)?|east sussex|west sussex|kent|surrey|hampshire|berkshire|buckinghamshire|oxfordshire|cambridgeshire|norfolk|suffolk|essex|hertfordshire|bedfordshire|northamptonshire|warwickshire|worcestershire|staffordshire|shropshire|cheshire|derbyshire|nottinghamshire|leicestershire|lincolnshire|durham|cumbria|lancashire|merseyside|greater manchester|south yorkshire|west yorkshire|north yorkshire|east riding of yorkshire)$/i;

const GENERIC_SEGMENTS =
	/^(?:en(?:-gb)?|gb|uk|stores?|store-finder|storefinder|supermarkets?|shops?|shopping|food|groceries|locations?|locate|find-a-store|store-locator|storefinder)$/i;

function cleanLocality(value) {
	if (!value) return null;
	const words = value
		.toLowerCase()
		.replace(/[-_]+/g, ' ')
		.replace(/\b\d+\b/g, ' ')
		.replace(
			/\b(?:retail|park|shopping|centre|center|superstore|express|local|foodhall|food|hall|simply|store|road|rd|street|st|lane|ln|avenue|ave|drive|dr|close|way|place|square|unit|the)\b/g,
			' '
		)
		.split(/\s+/)
		.map((word) => word.trim())
		.filter(Boolean);

	const deduped = words.filter((word, index) => word !== words[index - 1]);
	if (!deduped.length) return null;
	return titleCase(deduped.slice(0, 2).join(' '));
}

function isGoodArea(area, nearest) {
	if (!area) return false;
	if (area.length < 2 || area.length > 40) return false;
	if (/\d/.test(area)) return false;
	if (BAD_AREAS.test(area)) return false;
	const lower = area.toLowerCase();
	const city = (nearest.city ?? '').toLowerCase();
	if (city && (lower === city || city.startsWith(lower))) return false;
	if (nearest.region && lower === nearest.region.toLowerCase()) return false;
	if (/&\s*$/.test(area)) return false;
	if (/shire$|yorkshire|sussex|midlands/i.test(area)) return false;
	if (/(?:^|\s)(?:north|south|east|west)$/i.test(area)) return false;
	return true;
}

function outcode(postcode) {
	return postcode?.toUpperCase().match(/^[A-Z]{1,2}\d[A-Z\d]?/)?.[0] ?? null;
}

export function areaFromTags(tags, nearest) {
	const direct =
		tags['addr:suburb'] ||
		tags['addr:quarter'] ||
		tags['addr:neighbourhood'] ||
		tags['addr:town'] ||
		tags['addr:village'] ||
		tags['addr:place'];
	if (direct) {
		const cleaned = cleanLocality(direct);
		if (isGoodArea(cleaned, nearest)) return cleaned;
	}

	const addrCity = tags['addr:city'];
	if (addrCity && addrCity.toLowerCase() !== nearest.city.toLowerCase()) {
		const cleaned = cleanLocality(addrCity);
		if (isGoodArea(cleaned, nearest)) return cleaned;
	}

	const website = tags.website || tags['contact:website'];
	if (website) {
		try {
			const citySlug = nearest.city.toLowerCase().replace(/\s+/g, '-');
			const segments = new URL(website).pathname
				.split('/')
				.filter(Boolean)
				.filter(
					(segment) =>
						!GENERIC_SEGMENTS.test(segment) &&
						!/^\d+$/.test(segment) &&
						segment.toLowerCase() !== citySlug
				);
			for (const segment of segments) {
				const cleaned = cleanLocality(segment);
				if (isGoodArea(cleaned, nearest)) return cleaned;
			}
		} catch {
			/* not a URL */
		}
	}

	const street = tags['addr:street'] || tags['addr:housename'] || tags['addr:place'] || '';
	const streetLocality = cleanLocality(street);
	if (isGoodArea(streetLocality, nearest)) return streetLocality;

	const postcodeArea = outcode(tags['addr:postcode']);
	if (postcodeArea) return postcodeArea;

	return tags['addr:city'] || nearest.city;
}
