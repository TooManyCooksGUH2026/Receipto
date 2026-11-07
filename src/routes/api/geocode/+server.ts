import { json } from '@sveltejs/kit';
import type { RequestHandler } from './$types';

type GeocodeResult = {
	label: string;
	lat: number;
	lng: number;
	type: string | null;
	postcode: string | null;
};

type CacheEntry = { at: number; results: GeocodeResult[] };

function typeRank(type: string | null) {
	switch (type) {
		case 'postcode':
		case 'house':
		case 'building':
			return 0;
		case 'city':
		case 'town':
			return 1;
		case 'village':
		case 'suburb':
		case 'neighbourhood':
		case 'quarter':
			return 2;
		case 'administrative':
			return 4;
		case 'county':
		case 'state':
		case 'region':
			return 6;
		case 'country':
			return 8;
		default:
			return 3;
	}
}
const cache = new Map<string, CacheEntry>();
const CACHE_TTL = 10 * 60_000;
const NOMINATIM = 'https://nominatim.openstreetmap.org';

async function nominatim(path: string) {
	const response = await fetch(`${NOMINATIM}${path}`, {
		headers: {
			'User-Agent': 'Receipto/1.0 (UK food price tracker prototype)',
			'Accept-Language': 'en-GB'
		},
		signal: AbortSignal.timeout(12_000)
	});
	if (!response.ok) throw new Error(`Geocoder returned HTTP ${response.status}`);
	return response.json();
}

export const GET: RequestHandler = async ({ url, locals }) => {
	if (!locals.user) return json({ error: 'Unauthorized' }, { status: 401 });

	const q = url.searchParams.get('q')?.trim() ?? '';
	const lat = url.searchParams.get('lat');
	const lng = url.searchParams.get('lng');

	if (lat && lng) {
		const latNumber = Number(lat);
		const lngNumber = Number(lng);
		if (!Number.isFinite(latNumber) || !Number.isFinite(lngNumber)) {
			return json({ error: 'Invalid coordinates' }, { status: 400 });
		}
		const key = `reverse:${latNumber.toFixed(4)}:${lngNumber.toFixed(4)}`;
		const cached = cache.get(key);
		if (cached && Date.now() - cached.at < CACHE_TTL) {
			return json({ results: cached.results });
		}
		try {
			const result = await nominatim(
				`/reverse?format=jsonv2&lat=${latNumber}&lon=${lngNumber}&zoom=14&addressdetails=1`
			);
			const results: GeocodeResult[] = result?.display_name
				? [
						{
							label: result.display_name,
							lat: Number(result.lat),
							lng: Number(result.lon),
							type: result.addresstype ?? result.type ?? null,
							postcode: result.address?.postcode ?? null
						}
					]
				: [];
			cache.set(key, { at: Date.now(), results });
			return json({ results });
		} catch (error) {
			console.error('Reverse geocode failed', error);
			return json({ error: 'Could not look up that location' }, { status: 502 });
		}
	}

	if (q.length < 2) return json({ results: [] });
	const key = `search:${q.toLowerCase()}`;
	const cached = cache.get(key);
	if (cached && Date.now() - cached.at < CACHE_TTL) {
		return json({ results: cached.results });
	}

	try {
		const params = new URLSearchParams({
			format: 'jsonv2',
			q,
			countrycodes: 'gb',
			limit: '6',
			addressdetails: '1'
		});
		const body = await nominatim(`/search?${params.toString()}`);
		const results: GeocodeResult[] = (Array.isArray(body) ? body : [])
			.map((result) => ({
				label: String(result.display_name ?? ''),
				lat: Number(result.lat),
				lng: Number(result.lon),
				type: result.addresstype ?? result.type ?? null,
				postcode: result.address?.postcode ?? null
			}))
			.filter(
				(result) => result.label && Number.isFinite(result.lat) && Number.isFinite(result.lng)
			)
			.sort((a, b) => typeRank(a.type) - typeRank(b.type));
		cache.set(key, { at: Date.now(), results });
		return json({ results });
	} catch (error) {
		console.error('Geocode failed', error);
		return json({ error: 'Could not search for that location' }, { status: 502 });
	}
};