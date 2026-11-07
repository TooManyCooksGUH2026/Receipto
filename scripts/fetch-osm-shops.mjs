/**
 * Fetch real UK supermarket locations from OpenStreetMap via Overpass.
 *
 * Usage: node scripts/fetch-osm-shops.mjs
 * Writes src/lib/data/osm-shops.json. If Overpass is unreachable, the seed
 * script falls back to the curated list in src/lib/data/fallback-shops.ts.
 */
import { writeFile, mkdir } from 'node:fs/promises';
import { dirname, resolve } from 'node:path';
import { fileURLToPath } from 'node:url';
import 'dotenv/config';
import { areaFromTags } from './osm-area.mjs';

const __dirname = dirname(fileURLToPath(import.meta.url));

const CITIES = [
	{ city: 'London', region: 'Greater London', lat: 51.5074, lng: -0.1278, radius: 6500 },
	{ city: 'Manchester', region: 'North West', lat: 53.4808, lng: -2.2426, radius: 6000 },
	{ city: 'Birmingham', region: 'West Midlands', lat: 52.4862, lng: -1.8904, radius: 6000 },
	{ city: 'Leeds', region: 'Yorkshire and the Humber', lat: 53.8008, lng: -1.5491, radius: 6000 },
	{ city: 'Bristol', region: 'South West', lat: 51.4545, lng: -2.5879, radius: 6000 },
	{ city: 'Liverpool', region: 'North West', lat: 53.4084, lng: -2.9916, radius: 6000 },
	{ city: 'Sheffield', region: 'Yorkshire and the Humber', lat: 53.3811, lng: -1.4701, radius: 5500 },
	{ city: 'Newcastle upon Tyne', region: 'North East', lat: 54.9783, lng: -1.6178, radius: 5500 },
	{ city: 'Edinburgh', region: 'Scotland', lat: 55.9533, lng: -3.1883, radius: 5500 },
	{ city: 'Glasgow', region: 'Scotland', lat: 55.8642, lng: -4.2518, radius: 5500 },
	{ city: 'Cardiff', region: 'Wales', lat: 51.4816, lng: -3.1791, radius: 5500 },
	{ city: 'Brighton', region: 'South East', lat: 50.8225, lng: -0.1372, radius: 5000 },
	{ city: 'Oxford', region: 'South East', lat: 51.752, lng: -1.2577, radius: 5000 },
	{ city: 'Cambridge', region: 'East of England', lat: 52.2053, lng: 0.1218, radius: 5000 },
	{ city: 'Nottingham', region: 'East Midlands', lat: 52.9548, lng: -1.1581, radius: 5500 },
	{ city: 'Southampton', region: 'South East', lat: 50.9097, lng: -1.4044, radius: 5000 }
];

const CHAINS = [
	{ match: /tesco/i, name: 'Tesco' },
	{ match: /sainsbury/i, name: "Sainsbury's" },
	{ match: /asda/i, name: 'Asda' },
	{ match: /morrison/i, name: 'Morrisons' },
	{ match: /aldi/i, name: 'Aldi' },
	{ match: /lidl/i, name: 'Lidl' },
	{ match: /waitrose/i, name: 'Waitrose' },
	{ match: /co-?op|cooperative/i, name: 'Co-op' },
	{ match: /marks\s*&?\s*spencer|m&s/i, name: 'M&S' },
	{ match: /iceland/i, name: 'Iceland' }
];

function normaliseChain(tags) {
	const haystack = [tags.brand, tags.operator, tags.name, tags.brand_wikidata].filter(Boolean).join(' ');
	for (const chain of CHAINS) {
		if (chain.match.test(haystack)) return chain.name;
	}
	return null;
}

function addressFromTags(tags) {
	const parts = [
		[tags['addr:housenumber'], tags['addr:street']].filter(Boolean).join(' '),
		tags['addr:city'] || tags['addr:town'] || tags['addr:suburb'],
		tags['addr:postcode']
	].filter(Boolean);
	return parts.length ? parts.join(', ') : null;
}

const sleep = (ms) => new Promise((r) => setTimeout(r, ms));

async function queryCity(endpoint, city) {
	const query = `[out:json][timeout:45];nwr["shop"="supermarket"](around:${city.radius},${city.lat},${city.lng});out center tags;`;
	let lastError;
	for (let attempt = 0; attempt < 4; attempt++) {
		try {
			const response = await fetch(endpoint, {
				method: 'POST',
				headers: {
					'Content-Type': 'application/x-www-form-urlencoded',
					'User-Agent': 'Receipto/1.0 (local prototype; OSM supermarket import)'
				},
				body: new URLSearchParams({ data: query }),
				signal: AbortSignal.timeout(90_000)
			});
			if (!response.ok) throw new Error(`HTTP ${response.status}`);
			return await response.json();
		} catch (error) {
			lastError = error;
			const wait = 3000 * 2 ** attempt;
			console.warn(`  ${city.city}: ${error.message}; retrying in ${wait / 1000}s…`);
			await sleep(wait);
		}
	}
	console.warn(`  ${city.city}: skipped (${lastError?.message})`);
	return null;
}

async function main() {
	const endpoint = process.env.OVERPASS_URL || 'https://overpass-api.de/api/interpreter';
	console.log(`Querying ${endpoint} for ${CITIES.length} UK cities…`);

	const seen = new Set();
	const perCityChain = new Map();
	const shops = [];

	for (const city of CITIES) {
		const data = await queryCity(endpoint, city);
		if (!data) continue;
		let added = 0;
		for (const element of data.elements ?? []) {
			const tags = element.tags ?? {};
			const supermarket = normaliseChain(tags);
			if (!supermarket) continue;
			const lat = element.lat ?? element.center?.lat;
			const lng = element.lon ?? element.center?.lon;
			if (typeof lat !== 'number' || typeof lng !== 'number') continue;

			const osmId = `${element.type}/${element.id}`;
			if (seen.has(osmId)) continue;
			seen.add(osmId);

			// Assign to the nearest city centre.
			let nearest = CITIES[0];
			let best = Infinity;
			for (const candidate of CITIES) {
				const d = (candidate.lat - lat) ** 2 + (candidate.lng - lng) ** 2;
				if (d < best) {
					best = d;
					nearest = candidate;
				}
			}

			const key = `${nearest.city}|${supermarket}`;
			const count = perCityChain.get(key) ?? 0;
			if (count >= 3) continue; // keep the map readable
			perCityChain.set(key, count + 1);
			added++;

			shops.push({
				shopName: tags.name || `${supermarket} ${nearest.city}${count ? ` ${count + 1}` : ''}`,
				supermarketName: supermarket,
				area: areaFromTags(tags, nearest),
				brand: tags.brand || supermarket,
				lat: Number(lat.toFixed(6)),
				lng: Number(lng.toFixed(6)),
				address: addressFromTags(tags),
				city: nearest.city,
				region: nearest.region,
				postcode: tags['addr:postcode'] || null,
				osmId,
				osmType: element.type
			});
		}
		console.log(`  ${city.city}: ${added} shops`);
		await sleep(1500);
	}

	shops.sort((a, b) => a.city.localeCompare(b.city) || a.supermarketName.localeCompare(b.supermarketName));
	await mkdir(resolve(__dirname, '../src/lib/data'), { recursive: true });
	await writeFile(
		resolve(__dirname, '../src/lib/data/osm-shops.json'),
		JSON.stringify({ fetchedAt: new Date().toISOString(), source: endpoint, shops }, null, 2)
	);
	console.log(`Wrote ${shops.length} shops to src/lib/data/osm-shops.json`);
	const byChain = shops.reduce((acc, s) => {
		acc[s.supermarketName] = (acc[s.supermarketName] ?? 0) + 1;
		return acc;
	}, {});
	console.log(byChain);
}

main().catch((error) => {
	console.error(error);
	process.exitCode = 1;
});
