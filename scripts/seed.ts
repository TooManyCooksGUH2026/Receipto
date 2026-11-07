import 'dotenv/config';
import { readFile } from 'node:fs/promises';
import { resolve } from 'node:path';
import pg from 'pg';
import { sql } from 'drizzle-orm';
import { drizzle } from 'drizzle-orm/node-postgres';
import { hashPassword } from 'better-auth/crypto';
import * as schema from '../src/lib/server/schema';
import {
	ALL_SUPERMARKETS,
	SUPERMARKET_META,
	buildCatalog,
	receiptAlias,
	type CatalogProduct,
	type Supermarket
} from '../src/lib/data/catalog';
import { FALLBACK_SHOPS, type ShopSeed } from '../src/lib/data/fallback-shops';

const connectionString = process.env.DATABASE_URL ?? 'postgres://localhost:5432/receipto';
const pool = new pg.Pool({ connectionString, max: 4 });
const db = drizzle(pool, { schema });

const RESET = process.argv.includes('--reset');

const REGION_MULTIPLIER: Record<string, number> = {
	'Greater London': 1.08,
	'South East': 1.04,
	'South West': 1,
	'East of England': 1,
	'East Midlands': 0.97,
	'West Midlands': 0.98,
	'North West': 0.97,
	'Yorkshire and the Humber': 0.96,
	'North East': 0.95,
	Scotland: 0.98,
	Wales: 0.97
};

const STAPLES = [
	'semi-skimmed-milk',
	'white-bread',
	'free-range-eggs',
	'bananas',
	'chicken-breast',
	'pasta',
	'baked-beans',
	'cheddar',
	'tomatoes',
	'potatoes',
	'coffee',
	'toilet-roll'
];

function hash(seed: string) {
	let h = 2166136261;
	for (let i = 0; i < seed.length; i++) {
		h ^= seed.charCodeAt(i);
		h = Math.imul(h, 16777619);
	}
	return Math.abs(h);
}

function rand(seed: string, min: number, max: number) {
	const value = (hash(seed) % 10_000) / 10_000;
	return min + value * (max - min);
}

function roundPrice(value: number) {
	return Math.round(value * 100) / 100;
}

function chunk<T>(values: T[], size: number) {
	const out: T[][] = [];
	for (let i = 0; i < values.length; i += size) out.push(values.slice(i, i + size));
	return out;
}

function inferArea(shop: ShopSeed) {
	if (shop.area) return shop.area;
	const address = (shop.address ?? '').split(',')[0];
	const words = address
		.replace(/\b\d+[-\d]*\b/g, ' ')
		.replace(
			/\b(?:retail|park|shopping|centre|center|superstore|express|local|foodhall|food|hall|simply|store|road|rd|street|st|lane|ln|avenue|ave|drive|dr|close|way|place|square|unit|the)\b/gi,
			' '
		)
		.split(/\s+/)
		.map((word) => word.trim())
		.filter(Boolean);
	const deduped = words.filter((word, index) => word !== words[index - 1]);
	if (deduped.length) {
		return deduped
			.slice(0, 2)
			.map((word) => word[0].toUpperCase() + word.slice(1).toLowerCase())
			.join(' ');
	}
	return shop.city;
}

async function loadShops(): Promise<ShopSeed[]> {
	try {
		const raw = await readFile(resolve(process.cwd(), 'src/lib/data/osm-shops.json'), 'utf8');
		const parsed = JSON.parse(raw) as { shops?: ShopSeed[] };
		if (parsed.shops && parsed.shops.length >= 20) {
			console.log(`Using ${parsed.shops.length} OpenStreetMap shops from osm-shops.json`);
			return parsed.shops;
		}
	} catch {
		// fall through
	}
	console.log(`Using ${FALLBACK_SHOPS.length} curated fallback shops (run the OSM import for real coords)`);
	return FALLBACK_SHOPS;
}

async function resetTables() {
	console.log('Resetting tables…');
	await db.execute(
		sql`
			TRUNCATE TABLE
				item_purchases,
				item_prices,
				receipts,
				receipt_to_product,
				products,
				product_classes,
				shops,
				session,
				account,
				verification,
				"user"
			RESTART IDENTITY CASCADE
		`
	);
}

async function seedShops(shopSeeds: ShopSeed[]) {
	const inserted = await db
		.insert(schema.shops)
		.values(
			shopSeeds.map((shop) => ({
				shopName: shop.shopName,
				supermarketName: shop.supermarketName,
				brand: shop.brand,
				lat: shop.lat,
				lng: shop.lng,
				address: shop.address,
				area: inferArea(shop),
				city: shop.city,
				region: shop.region,
				postcode: shop.postcode,
				osmId: shop.osmId,
				osmType: shop.osmType
			}))
		)
		.returning({ id: schema.shops.id, supermarketName: schema.shops.supermarketName, city: schema.shops.city, region: schema.shops.region });

	console.log(`Inserted ${inserted.length} shops`);
	return inserted;
}

async function seedCatalog() {
	const classRows = await db
		.insert(schema.productClasses)
		.values([
			...buildCatalog()
				.map((product) => ({
					name: product.className,
					category: product.category,
					icon: product.icon
				}))
				.filter(
					(value, index, array) => array.findIndex((item) => item.name === value.name) === index
				),
			{ name: 'Other / Unmatched', category: 'Other', icon: '🛒' }
		])
		.returning({ id: schema.productClasses.id, name: schema.productClasses.name });

	const classIds = new Map(classRows.map((row) => [row.name, row.id]));
	const catalog = buildCatalog();

	const productRows = await db
		.insert(schema.products)
		.values(
			catalog.map((product) => ({
				classId: classIds.get(product.className)!,
				itemName: product.itemName,
				brand: product.brand,
				size: product.size,
				unit: product.unit,
				supermarket: product.supermarket,
				isOwnBrand: product.isOwnBrand,
				basePrice: product.basePrice.toFixed(2)
			}))
		)
		.returning({
			id: schema.products.id,
			itemName: schema.products.itemName,
			supermarket: schema.products.supermarket
		});

	const productByKey = new Map<string, (typeof productRows)[number]>();
	catalog.forEach((product, index) => {
		productByKey.set(product.key, productRows[index]);
	});

	console.log(`Inserted ${classRows.length} product classes and ${productRows.length} products`);

	const aliasValues: {
		productId: number;
		nameInReceipt: string;
		supermarketName: string;
	}[] = [];

	for (const product of catalog) {
		const row = productByKey.get(product.key);
		if (!row) continue;
		for (const supermarket of ALL_SUPERMARKETS) {
			if (product.supermarket && product.supermarket !== supermarket) continue;
			aliasValues.push({
				productId: row.id,
				nameInReceipt: receiptAlias(product, supermarket),
				supermarketName: supermarket
			});
		}
	}

	for (const batch of chunk(aliasValues, 1000)) {
		await db.insert(schema.receiptToProduct).values(batch).onConflictDoNothing();
	}
	console.log(`Inserted ${aliasValues.length} receipt aliases`);

	return { catalog, productByKey };
}

type ShopRow = Awaited<ReturnType<typeof seedShops>>[number];

async function seedPrices(
	shops: ShopRow[],
	catalog: ReturnType<typeof buildCatalog>,
	productByKey: Map<string, { id: number; itemName: string; supermarket: string | null }>
) {
	const rows: {
		shopId: number;
		productId: number;
		price: string;
		updatedAt: Date;
	}[] = [];

	const priceMap = new Map<string, number>();
	const availableByShop = new Map<number, { product: (typeof catalog)[number]; price: number; alias: string }[]>();

	for (const shop of shops) {
		const available: { product: (typeof catalog)[number]; price: number; alias: string }[] = [];
		const regionMultiplier = REGION_MULTIPLIER[shop.region] ?? 1;

		for (const product of catalog) {
			const row = productByKey.get(product.key);
			if (!row) continue;
			if (product.supermarket && product.supermarket !== shop.supermarketName) continue;

			const seed = `${shop.id}:${row.id}`;
			const availability = hash(seed) % 100;
			const isDiscountChain = shop.supermarketName === 'Aldi' || shop.supermarketName === 'Lidl';
			if (!product.isOwnBrand && availability > (isDiscountChain ? 72 : 90)) continue;
			if (product.isOwnBrand && availability > 96) continue;

			const chainFactor = product.isOwnBrand
				? 1
				: SUPERMARKET_META[shop.supermarketName as Supermarket].priceIndex;
			const storeFactor = rand(`${seed}:store`, 0.94, 1.06);
			const promo = hash(`${seed}:promo`) % 100 < 12;
			const promoFactor = promo ? rand(`${seed}:promo-value`, 0.7, 0.86) : 1;
			const price = roundPrice(
				Math.max(0.25, product.basePrice * regionMultiplier * chainFactor * storeFactor * promoFactor)
			);

			const alias = receiptAlias(product, shop.supermarketName as Supermarket);
			rows.push({
				shopId: shop.id,
				productId: row.id,
				price: price.toFixed(2),
				updatedAt: new Date()
			});
			priceMap.set(`${shop.id}:${row.id}`, price);
			available.push({ product, price, alias });
		}

		availableByShop.set(shop.id, available);
	}

	for (const batch of chunk(rows, 1000)) {
		await db
			.insert(schema.itemPrices)
			.values(batch)
			.onConflictDoUpdate({
				target: [schema.itemPrices.shopId, schema.itemPrices.productId],
				set: {
					price: sql`excluded.price`,
					updatedAt: sql`excluded.updated_at`
				}
			});
	}

	console.log(`Inserted ${rows.length} current price rows`);
	return { priceMap, availableByShop };
}

type SeededUser = {
	id: string;
	name: string;
	email: string;
	cities: string[];
	chains: Supermarket[];
	receipts: number;
	days: number;
};

const USERS: SeededUser[] = [
	{
		id: crypto.randomUUID(),
		name: 'Jamie Carter',
		email: 'demo@receipto.app',
		cities: ['London'],
		chains: ['Tesco', "Sainsbury's", 'Waitrose', 'Aldi', 'Co-op'],
		receipts: 18,
		days: 150
	},
	{
		id: crypto.randomUUID(),
		name: 'Alex Morgan',
		email: 'alex@receipto.app',
		cities: ['Manchester'],
		chains: ['Tesco', 'Asda', 'Aldi', 'Lidl', 'Morrisons'],
		receipts: 9,
		days: 120
	},
	{
		id: crypto.randomUUID(),
		name: 'Priya Shah',
		email: 'priya@receipto.app',
		cities: ['Bristol'],
		chains: ["Sainsbury's", 'Waitrose', 'Co-op', 'Tesco'],
		receipts: 8,
		days: 110
	},
	{
		id: crypto.randomUUID(),
		name: 'Sam Patel',
		email: 'sam@receipto.app',
		cities: ['Edinburgh'],
		chains: ['Tesco', 'Asda', 'Aldi', 'Lidl'],
		receipts: 7,
		days: 90
	}
];

async function seedUsers() {
	for (const user of USERS) {
		const password = user.email.startsWith('demo') ? 'demo1234' : `${user.email.split('@')[0]}1234`;
		const hashed = await hashPassword(password);
		await db.insert(schema.user).values({
			id: user.id,
			name: user.name,
			email: user.email,
			emailVerified: true
		});
		await db.insert(schema.account).values({
			id: crypto.randomUUID(),
			accountId: user.id,
			providerId: 'credential',
			userId: user.id,
			password: hashed
		});
	}
	console.log(`Inserted ${USERS.length} accounts (demo@receipto.app / demo1234)`);
}

async function seedReceipts(
	shops: ShopRow[],
	availableByShop: Map<number, { product: CatalogProduct; price: number; alias: string }[]>
) {
	let receiptCount = 0;
	let purchaseCount = 0;

	for (const user of USERS) {
		const userShops = shops.filter(
			(shop) => user.cities.includes(shop.city) && user.chains.includes(shop.supermarketName as Supermarket)
		);
		const fallbackShops = shops.filter((shop) => user.cities.includes(shop.city));
		const candidateShops = userShops.length ? userShops : fallbackShops.length ? fallbackShops : shops;

		const generated: {
			shop: ShopRow;
			purchasedAt: Date;
			items: { productId: number; name: string; price: number; quantity: number }[];
			total: number;
		}[] = [];

		for (let i = 0; i < user.receipts; i++) {
			const shop = candidateShops[hash(`${user.id}:shop:${i}`) % candidateShops.length];
			// Keep the demo dashboard lively: the two newest shops are always
			// within the last fortnight.
			const daysAgo =
				i === 0
					? Math.floor(rand(`${user.id}:days:${i}`, 0, 4))
					: i === 1
						? Math.floor(rand(`${user.id}:days:${i}`, 5, 12))
						: Math.floor(rand(`${user.id}:days:${i}`, 13, user.days));
			const purchasedAt = new Date(
				Date.now() - daysAgo * 86_400_000 - (hash(`${user.id}:hour:${i}`) % 12) * 3_600_000
			);
			const available = availableByShop.get(shop.id) ?? [];
			if (!available.length) continue;

			const chosen = new Map<string, { productId: number; name: string; price: number; quantity: number }>();
			const targetCount = 8 + (hash(`${user.id}:count:${i}`) % 9);

			// Staple items are bought most weeks.
			for (const staple of STAPLES) {
				if (chosen.size >= targetCount) break;
				if (hash(`${user.id}:${i}:staple:${staple}`) % 100 > 48) continue;
				const match = available.find((item) => item.product.classKey === staple);
				if (!match) continue;
				const productRow = available.find((item) => item.product.classKey === staple);
				if (!productRow) continue;
				const id = (await getProductId(productRow.product.key));
				if (!id) continue;
				const quantity = staple === 'semi-skimmed-milk' || staple === 'bananas' ? (hash(`${user.id}:${i}:qty:${staple}`) % 3 === 0 ? 2 : 1) : 1;
				chosen.set(productRow.product.key, {
					productId: id,
					name: productRow.alias,
					price: roundPrice(productRow.price * (1 + (daysAgo / 365) * 0.04)),
					quantity
				});
			}

			let attempts = 0;
			while (chosen.size < targetCount && attempts < 80) {
				attempts++;
				const item = available[hash(`${user.id}:${i}:random:${attempts}`) % available.length];
				if (chosen.has(item.product.key)) continue;
				const id = await getProductId(item.product.key);
				if (!id) continue;
				chosen.set(item.product.key, {
					productId: id,
					name: item.alias,
					price: roundPrice(item.price * (1 + (daysAgo / 365) * 0.04)),
					quantity: 1
				});
			}

			const items = [...chosen.values()];
			const total = roundPrice(items.reduce((sum, item) => sum + item.price, 0));
			generated.push({ shop, purchasedAt, items, total });
		}

		generated.sort((a, b) => b.purchasedAt.getTime() - a.purchasedAt.getTime());

		for (const receipt of generated) {
			const receiptId = crypto.randomUUID();
			await db.insert(schema.receipts).values({
				id: receiptId,
				userId: user.id,
				shopId: receipt.shop.id,
				purchasedAt: receipt.purchasedAt,
				subtotal: receipt.total.toFixed(2),
				discountTotal: '0.00',
				total: receipt.total.toFixed(2),
				itemCount: receipt.items.length,
				source: 'seed'
			});
			await db.insert(schema.itemPurchases).values(
				receipt.items.map((item) => ({
					receiptId,
					productId: item.productId,
					nameInReceipt: item.name,
					price: item.price.toFixed(2),
					quantity: item.quantity.toFixed(3),
					unitPrice: (item.price / item.quantity).toFixed(2)
				}))
			);
			receiptCount++;
			purchaseCount += receipt.items.length;
		}
	}

	console.log(`Inserted ${receiptCount} receipts and ${purchaseCount} item purchases`);
}

// Filled by seedCatalog so receipt generation can resolve catalog keys.
let productKeyToId = new Map<string, number>();
async function getProductId(key: string) {
	return productKeyToId.get(key) ?? null;
}

async function main() {
	console.log(`Seeding ${connectionString}`);
	if (RESET) await resetTables();
	else {
		const existing = await db.select({ id: schema.shops.id }).from(schema.shops).limit(1);
		if (existing.length) {
			console.log('Database already contains shops. Re-run with --reset to wipe and reseed.');
			await pool.end();
			return;
		}
	}

	const shopSeeds = await loadShops();
	const shops = await seedShops(shopSeeds);
	const { catalog, productByKey } = await seedCatalog();
	productKeyToId = new Map([...productByKey.entries()].map(([key, row]) => [key, row.id]));
	const { availableByShop } = await seedPrices(shops, catalog, productByKey);
	await seedUsers();
	await seedReceipts(shops, availableByShop);

	await pool.end();
	console.log('\nSeed complete.');
	console.log('Demo login: demo@receipto.app / demo1234');
}

main().catch(async (error) => {
	console.error(error);
	await pool.end();
	process.exitCode = 1;
});
