import { and, eq, ilike, inArray, or, sql } from 'drizzle-orm';
import { db } from './db';
import { itemPrices, productClasses, products, receiptToProduct, shops } from './schema';
import { matchScore } from '#lib/utils/normalise';
import type { Supermarket } from '#lib/data/catalog';

export type ProductSearchRow = {
	id: number;
	itemName: string;
	brand: string | null;
	size: string | null;
	supermarket: string | null;
	isOwnBrand: boolean;
	basePrice: string;
	classId: number;
	className: string;
	category: string;
	icon: string | null;
};

export type PriceStats = {
	minPrice: number | null;
	maxPrice: number | null;
	avgPrice: number | null;
	storeCount: number;
	cheapestShopId: number | null;
	cheapestShopName: string | null;
	cheapestSupermarket: string | null;
};

type IndexEntry = {
	id: number;
	itemName: string;
	brand: string | null;
	supermarket: string | null;
	className: string;
	aliases: string[];
};

let indexCache: { at: number; entries: IndexEntry[] } | null = null;
const INDEX_TTL = 60_000;

export async function getProductIndex(): Promise<IndexEntry[]> {
	if (indexCache && Date.now() - indexCache.at < INDEX_TTL) return indexCache.entries;

	const rows = await db
		.select({
			id: products.id,
			itemName: products.itemName,
			brand: products.brand,
			supermarket: products.supermarket,
			className: productClasses.name
		})
		.from(products)
		.innerJoin(productClasses, eq(products.classId, productClasses.id));

	const aliases = await db
		.select({
			productId: receiptToProduct.productId,
			nameInReceipt: receiptToProduct.nameInReceipt
		})
		.from(receiptToProduct);

	const aliasMap = new Map<number, string[]>();
	for (const alias of aliases) {
		const list = aliasMap.get(alias.productId) ?? [];
		list.push(alias.nameInReceipt);
		aliasMap.set(alias.productId, list);
	}

	const entries = rows.map((row) => ({
		...row,
		aliases: aliasMap.get(row.id) ?? []
	}));

	indexCache = { at: Date.now(), entries };
	return entries;
}

export function clearProductIndex() {
	indexCache = null;
}

export type ProductMatch = {
	id: number;
	itemName: string;
	brand: string | null;
	supermarket: string | null;
	className: string;
	score: number;
	matchedOn?: string;
};

export async function matchProduct(
	name: string,
	supermarket: Supermarket | string | null,
	limit = 5
): Promise<ProductMatch[]> {
	const entries = await getProductIndex();
	const query = name.trim();
	if (!query) return [];

	const scored = entries
		.filter((entry) => !entry.supermarket || !supermarket || entry.supermarket === supermarket)
		.map((entry) => {
			let best = matchScore(query, entry.itemName);
			let matchedOn = entry.itemName;
			for (const alias of entry.aliases) {
				const score = matchScore(query, alias);
				if (score > best) {
					best = score;
					matchedOn = alias;
				}
			}
			// A matching class name is a useful signal for own-brand goods.
			if (entry.className && query.toLowerCase().includes(entry.className.toLowerCase())) {
				best = Math.max(best, 0.72);
			}
			return {
				id: entry.id,
				itemName: entry.itemName,
				brand: entry.brand,
				supermarket: entry.supermarket,
				className: entry.className,
				score: Math.round(best * 1000) / 1000,
				matchedOn
			};
		})
		.filter((entry) => entry.score >= 0.3)
		.sort((a, b) => b.score - a.score)
		.slice(0, limit);

	return scored;
}

export async function findExactAlias(name: string, supermarket: string) {
	const rows = await db
		.select({ productId: receiptToProduct.productId })
		.from(receiptToProduct)
		.where(
			and(
				eq(receiptToProduct.supermarketName, supermarket),
				sql`lower(${receiptToProduct.nameInReceipt}) = lower(${name})`
			)
		)
		.limit(1);
	return rows[0]?.productId ?? null;
}

export async function findOrCreateProduct(
	name: string,
	supermarket: string,
	price: number
): Promise<number> {
	const exact = await findExactAlias(name, supermarket);
	if (exact) return exact;

	const matches = await matchProduct(name, supermarket, 1);
	if (matches.length && matches[0].score >= 0.55) return matches[0].id;

	// Unknown item: create a product in the catch-all class so every line on a
	// receipt is still tracked and can be renamed later.
	let otherClass = await db
		.select({ id: productClasses.id })
		.from(productClasses)
		.where(eq(productClasses.name, 'Other / Unmatched'))
		.limit(1);

	if (!otherClass.length) {
		otherClass = await db
			.insert(productClasses)
			.values({ name: 'Other / Unmatched', category: 'Other', icon: '🛒' })
			.returning({ id: productClasses.id });
	}

	const inserted = await db
		.insert(products)
		.values({
			classId: otherClass[0].id,
			itemName: name.trim(),
			brand: null,
			size: null,
			supermarket: null,
			isOwnBrand: false,
			basePrice: price.toFixed(2)
		})
		.returning({ id: products.id });

	clearProductIndex();
	return inserted[0].id;
}

export async function addAlias(productId: number, name: string, supermarket: string) {
	await db
		.insert(receiptToProduct)
		.values({ productId, nameInReceipt: name.trim(), supermarketName: supermarket })
		.onConflictDoNothing();
	clearProductIndex();
}

export async function getPriceStats(productIds: number[], shopIds?: number[] | null) {
	const map = new Map<number, PriceStats>();
	if (!productIds.length || (shopIds && shopIds.length === 0)) return map;

	const conditions = [inArray(itemPrices.productId, productIds)];
	if (shopIds) conditions.push(inArray(itemPrices.shopId, shopIds));

	const rows = await db
		.select({
			productId: itemPrices.productId,
			minPrice: sql<string>`min(${itemPrices.price})`,
			maxPrice: sql<string>`max(${itemPrices.price})`,
			avgPrice: sql<string>`avg(${itemPrices.price})`,
			storeCount: sql<number>`count(distinct ${itemPrices.shopId})::int`
		})
		.from(itemPrices)
		.where(and(...conditions))
		.groupBy(itemPrices.productId);

	for (const row of rows) {
		map.set(row.productId, {
			minPrice: Number(row.minPrice),
			maxPrice: Number(row.maxPrice),
			avgPrice: Number(row.avgPrice),
			storeCount: Number(row.storeCount),
			cheapestShopId: null,
			cheapestShopName: null,
			cheapestSupermarket: null
		});
	}

	const cheapest = await db
		.select({
			productId: itemPrices.productId,
			shopId: itemPrices.shopId,
			price: itemPrices.price,
			shopName: shops.shopName,
			supermarket: shops.supermarketName
		})
		.from(itemPrices)
		.innerJoin(shops, eq(itemPrices.shopId, shops.id))
		.where(and(...conditions))
		.orderBy(itemPrices.productId, itemPrices.price);

	for (const row of cheapest) {
		const stats = map.get(row.productId);
		if (stats && stats.cheapestShopId === null) {
			stats.cheapestShopId = row.shopId;
			stats.cheapestShopName = row.shopName;
			stats.cheapestSupermarket = row.supermarket;
		}
	}

	return map;
}

export type ProductSearchOption =
	| {
			kind: 'product';
			key: string;
			id: number;
			itemName: string;
			brand: string | null;
			size: string | null;
			supermarket: string | null;
			className: string;
			category: string;
			icon: string | null;
			stats: PriceStats | null;
	  }
	| {
			kind: 'class';
			key: string;
			classId: number;
			itemName: string;
			className: string;
			category: string;
			icon: string | null;
			size: string | null;
			supermarkets: string[];
			variantCount: number;
			stats: PriceStats | null;
	  };

/**
 * Search options for the global search box. Own-brand products are grouped by
 * product class; branded products stay individual.
 */
export async function searchProductOptions(
	query: string,
	limit = 7,
	shopIds?: number[] | null
): Promise<ProductSearchOption[]> {
	const q = query.trim();
	const base = db
		.select({
			id: products.id,
			itemName: products.itemName,
			brand: products.brand,
			size: products.size,
			supermarket: products.supermarket,
			isOwnBrand: products.isOwnBrand,
			classId: products.classId,
			className: productClasses.name,
			category: productClasses.category,
			icon: productClasses.icon
		})
		.from(products)
		.innerJoin(productClasses, eq(products.classId, productClasses.id));

	const rows = q
		? await base
				.where(
					or(
						ilike(products.itemName, `%${q}%`),
						ilike(productClasses.name, `%${q}%`),
						ilike(productClasses.category, `%${q}%`),
						ilike(products.brand, `%${q}%`)
					)
				)
				.limit(200)
		: await base.limit(200);

	const stats = await getPriceStats(
		rows.map((row) => row.id),
		shopIds
	);

	type Group = {
		classId: number;
		className: string;
		category: string;
		icon: string | null;
		size: string | null;
		variants: {
			supermarket: string | null;
			stats: PriceStats | null;
		}[];
	};

	const groups = new Map<number, Group>();
	const branded: ProductSearchOption[] = [];

	for (const row of rows) {
		const rowStats = stats.get(row.id) ?? null;
		if (row.isOwnBrand) {
			const group = groups.get(row.classId) ?? {
				classId: row.classId,
				className: row.className,
				category: row.category,
				icon: row.icon,
				size: row.size,
				variants: []
			};
			if (!group.size) group.size = row.size;
			group.variants.push({ supermarket: row.supermarket, stats: rowStats });
			groups.set(row.classId, group);
		} else {
			branded.push({
				kind: 'product',
				key: `product-${row.id}`,
				id: row.id,
				itemName: row.itemName,
				brand: row.brand,
				size: row.size,
				supermarket: row.supermarket,
				className: row.className,
				category: row.category,
				icon: row.icon,
				stats: rowStats
			});
		}
	}

	const grouped: ProductSearchOption[] = [...groups.values()].map((group) => {
		const pricedVariants = group.variants.filter(
			(variant) => variant.stats && variant.stats.minPrice !== null
		);
		const cheapest = pricedVariants.sort(
			(a, b) => (a.stats?.minPrice ?? Infinity) - (b.stats?.minPrice ?? Infinity)
		)[0];
		const prices = pricedVariants
			.map((variant) => variant.stats?.minPrice)
			.filter((price): price is number => typeof price === 'number');
		const storeCount = group.variants.reduce(
			(sum, variant) => sum + (variant.stats?.storeCount ?? 0),
			0
		);
		const aggregateStats: PriceStats | null = prices.length
			? {
					minPrice: Math.min(...prices),
					maxPrice: Math.max(...prices),
					avgPrice: prices.reduce((sum, price) => sum + price, 0) / prices.length,
					storeCount,
					cheapestShopId: cheapest?.stats?.cheapestShopId ?? null,
					cheapestShopName: cheapest?.stats?.cheapestShopName ?? null,
					cheapestSupermarket: cheapest?.stats?.cheapestSupermarket ?? null
				}
			: null;

		return {
			kind: 'class',
			key: `class-${group.classId}`,
			classId: group.classId,
			itemName: `Own brand ${group.className}`,
			className: group.className,
			category: group.category,
			icon: group.icon,
			size: group.size,
			supermarkets: [
				...new Set(
					group.variants
						.map((variant) => variant.supermarket)
						.filter((supermarket): supermarket is string => Boolean(supermarket))
				)
			],
			variantCount: group.variants.length,
			stats: aggregateStats
		};
	});

	const sortByPrice = (a: ProductSearchOption, b: ProductSearchOption) =>
		(a.stats?.minPrice ?? Infinity) - (b.stats?.minPrice ?? Infinity);

	grouped.sort(sortByPrice);
	branded.sort(sortByPrice);

	return [...grouped, ...branded].slice(0, limit);
}

export async function searchProducts(query: string, limit = 20, shopIds?: number[] | null) {
	const q = query.trim();
	const base = db
		.select({
			id: products.id,
			itemName: products.itemName,
			brand: products.brand,
			size: products.size,
			supermarket: products.supermarket,
			isOwnBrand: products.isOwnBrand,
			basePrice: products.basePrice,
			classId: products.classId,
			className: productClasses.name,
			category: productClasses.category,
			icon: productClasses.icon
		})
		.from(products)
		.innerJoin(productClasses, eq(products.classId, productClasses.id));

	const rows = q
		? await base
				.where(
					or(
						ilike(products.itemName, `%${q}%`),
						ilike(productClasses.name, `%${q}%`),
						ilike(productClasses.category, `%${q}%`),
						ilike(products.brand, `%${q}%`)
					)
				)
				.limit(limit)
		: await base.limit(limit);

	const stats = await getPriceStats(rows.map((row) => row.id), shopIds);
	return rows.map((row) => ({
		...row,
		basePrice: Number(row.basePrice),
		stats: stats.get(row.id) ?? null
	}));
}
