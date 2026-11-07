/**
 * Add a locality ("area") to each shop in src/lib/data/osm-shops.json.
 *
 * The Overpass import can be slow/flaky, so this script uses the OSM API's
 * batch node/way endpoints. It keeps the existing shop rows and only adds
 * `area`, which is used to render names such as "Lidl Withington".
 */
import { readFile, writeFile } from 'node:fs/promises';
import { resolve } from 'node:path';
import { areaFromTags } from './osm-area.mjs';

const file = resolve('src/lib/data/osm-shops.json');
const data = JSON.parse(await readFile(file, 'utf8'));

async function fetchBatch(type, ids) {
	const response = await fetch(`https://api.openstreetmap.org/api/0.6/${type}s.json?${type}s=${ids.join(',')}`, {
		headers: { 'User-Agent': 'Receipto/1.0 (local prototype; OSM area enrichment)' },
		signal: AbortSignal.timeout(60_000)
	});
	if (!response.ok) throw new Error(`OSM ${type} batch failed: HTTP ${response.status}`);
	const body = await response.json();
	const map = new Map();
	for (const element of body.elements ?? []) {
		if (!element.tags) continue;
		map.set(`${type}/${element.id}`, element.tags);
	}
	return map;
}

const nodeIds = data.shops
	.filter((shop) => (shop.osmType || shop.osmId?.split('/')[0]) === 'node')
	.map((shop) => Number(shop.osmId.split('/')[1]))
	.filter(Number.isInteger);
const wayIds = data.shops
	.filter((shop) => (shop.osmType || shop.osmId?.split('/')[0]) === 'way')
	.map((shop) => Number(shop.osmId.split('/')[1]))
	.filter(Number.isInteger);

const tagsById = new Map();
for (const [type, ids] of [
	['node', nodeIds],
	['way', wayIds]
]) {
	for (let index = 0; index < ids.length; index += 120) {
		const batch = ids.slice(index, index + 120);
		const result = await fetchBatch(type, batch);
		for (const [key, value] of result) tagsById.set(key, value);
		console.log(`Fetched ${result.size}/${batch.length} ${type} tags`);
	}
}

let updated = 0;
for (const shop of data.shops) {
	const type = shop.osmType || shop.osmId?.split('/')[0] || 'node';
	const id = shop.osmId?.split('/')[1];
	const tags = tagsById.get(`${type}/${id}`);
	if (!tags) continue;
	shop.area = areaFromTags(tags, { city: shop.city, region: shop.region });
	updated++;
}

await writeFile(file, JSON.stringify({ ...data, areaEnrichedAt: new Date().toISOString() }, null, 2));
console.log(`Updated area for ${updated}/${data.shops.length} shops`);
console.log(
	JSON.stringify(
		data.shops
			.filter((shop) => shop.supermarketName === 'Lidl' && shop.city === 'Manchester')
			.map((shop) => ({ shopName: shop.shopName, area: shop.area, address: shop.address })),
		null,
		2
	)
);
