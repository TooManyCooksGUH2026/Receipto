import { and, desc, eq, gte, inArray, sql } from 'drizzle-orm';
import { db } from './db';
import {
	itemPrices,
	itemPurchases,
	productClasses,
	products,
	receipts,
	shops
} from './schema';
import { getPriceStats } from './products';
import { shopDisplayName } from '#lib/utils/shop-name';

function money(value: unknown): number {
	const n = Number(value ?? 0);
	return Number.isFinite(n) ? n : 0;
}

export type DashboardReceipt = {
	id: string;
	purchasedAt: string;
	total: number;
	itemCount: number;
	source: string;
	shop: {
		id: number;
		name: string;
		supermarket: string;
		city: string;
		region: string;
		lat: number;
		lng: number;
	};
	previousTotal: number | null;
	previousShopName: string | null;
	diff: number | null;
	diffPct: number | null;
};

export async function getDashboardData(userId: string, shopIds?: number[] | null) {
	const recentRows = await db
		.select({
			id: receipts.id,
			purchasedAt: receipts.purchasedAt,
			total: receipts.total,
			itemCount: receipts.itemCount,
			source: receipts.source,
			shopId: shops.id,
			shopName: shops.shopName,
			supermarket: shops.supermarketName,
			city: shops.city,
			region: shops.region,
			lat: shops.lat,
			lng: shops.lng
		})
		.from(receipts)
		.innerJoin(shops, eq(receipts.shopId, shops.id))
		.where(eq(receipts.userId, userId))
		.orderBy(desc(receipts.purchasedAt))
		.limit(12);

	const recent: DashboardReceipt[] = recentRows.map((row, index) => {
		const previous = recentRows[index + 1] ?? null;
		const total = money(row.total);
		const previousTotal = previous ? money(previous.total) : null;
		const diff = previousTotal === null ? null : Math.round((total - previousTotal) * 100) / 100;
		const diffPct =
			previousTotal && previousTotal > 0
				? Math.round(((total - previousTotal) / previousTotal) * 1000) / 10
				: null;
		return {
			id: row.id,
			purchasedAt: row.purchasedAt.toISOString(),
			total,
			itemCount: row.itemCount,
			source: row.source,
			shop: {
				id: row.shopId,
				name: row.shopName,
				supermarket: row.supermarket,
				city: row.city,
				region: row.region,
				lat: row.lat,
				lng: row.lng
			},
			previousTotal,
			previousShopName: previous?.shopName ?? null,
			diff,
			diffPct
		};
	});

	const thirtyDaysAgo = new Date(Date.now() - 30 * 86_400_000);
	const [spendRow] = await db
		.select({
			spend: sql<string>`coalesce(sum(${receipts.total}), 0)`,
			avg: sql<string>`coalesce(avg(${receipts.total}), 0)`,
			count: sql<number>`count(*)::int`
		})
		.from(receipts)
		.where(and(eq(receipts.userId, userId), gte(receipts.purchasedAt, thirtyDaysAgo)));

	const [allTime] = await db
		.select({
			count: sql<number>`count(distinct ${receipts.id})::int`,
			items: sql<number>`count(distinct ${itemPurchases.productId})::int`
		})
		.from(receipts)
		.leftJoin(itemPurchases, eq(itemPurchases.receiptId, receipts.id))
		.where(eq(receipts.userId, userId));

	const favouriteRows = await db
		.select({
			shopId: shops.id,
			name: shops.shopName,
			supermarket: shops.supermarketName,
			city: shops.city,
			visits: sql<number>`count(*)::int`
		})
		.from(receipts)
		.innerJoin(shops, eq(receipts.shopId, shops.id))
		.where(eq(receipts.userId, userId))
		.groupBy(shops.id, shops.shopName, shops.supermarketName, shops.city)
		.orderBy(desc(sql`count(*)`))
		.limit(1);

	const topRows = await db
		.select({
			productId: itemPurchases.productId,
			times: sql<number>`count(*)::int`,
			avgPrice: sql<string>`avg(${itemPurchases.price})`,
			totalSpent: sql<string>`sum(${itemPurchases.price})`,
			itemName: products.itemName,
			brand: products.brand,
			size: products.size,
			className: productClasses.name,
			category: productClasses.category,
			icon: productClasses.icon
		})
		.from(itemPurchases)
		.innerJoin(receipts, eq(itemPurchases.receiptId, receipts.id))
		.innerJoin(products, eq(itemPurchases.productId, products.id))
		.innerJoin(productClasses, eq(products.classId, productClasses.id))
		.where(eq(receipts.userId, userId))
		.groupBy(
			itemPurchases.productId,
			products.itemName,
			products.brand,
			products.size,
			productClasses.name,
			productClasses.category,
			productClasses.icon
		)
		.orderBy(desc(sql`count(*)`))
		.limit(6);

	const topIds = topRows.map((row) => row.productId).filter((id): id is number => id !== null);
	const latestPrices = new Map<number, number>();
	if (topIds.length) {
		const priceRows = await db
			.select({
				productId: itemPurchases.productId,
				price: itemPurchases.price,
				purchasedAt: receipts.purchasedAt
			})
			.from(itemPurchases)
			.innerJoin(receipts, eq(itemPurchases.receiptId, receipts.id))
			.where(and(eq(receipts.userId, userId), inArray(itemPurchases.productId, topIds)))
			.orderBy(desc(receipts.purchasedAt));
		for (const row of priceRows) {
			if (row.productId && !latestPrices.has(row.productId)) {
				latestPrices.set(row.productId, money(row.price));
			}
		}
	}

	const topStats = await getPriceStats(topIds, shopIds);

	const topProducts = topRows.map((row) => ({
		id: row.productId ?? 0,
		itemName: row.itemName,
		brand: row.brand,
		size: row.size,
		className: row.className,
		category: row.category,
		icon: row.icon,
		times: Number(row.times),
		avgPrice: money(row.avgPrice),
		lastPrice: row.productId ? (latestPrices.get(row.productId) ?? money(row.avgPrice)) : money(row.avgPrice),
		totalSpent: money(row.totalSpent),
		stats: row.productId ? (topStats.get(row.productId) ?? null) : null
	}));

	const lastReceiptIds = recent.slice(0, 2).map((receipt) => receipt.id);
	let recentItems: {
		id: number;
		name: string;
		price: number;
		quantity: number;
		productId: number | null;
		shopName: string;
		supermarket: string;
		purchasedAt: string;
	}[] = [];
	if (lastReceiptIds.length) {
		const itemRows = await db
			.select({
				id: itemPurchases.id,
				name: itemPurchases.nameInReceipt,
				price: itemPurchases.price,
				quantity: itemPurchases.quantity,
				productId: itemPurchases.productId,
				itemName: products.itemName,
				shopName: shops.shopName,
				supermarket: shops.supermarketName,
				purchasedAt: receipts.purchasedAt
			})
			.from(itemPurchases)
			.innerJoin(receipts, eq(itemPurchases.receiptId, receipts.id))
			.innerJoin(shops, eq(receipts.shopId, shops.id))
			.leftJoin(products, eq(itemPurchases.productId, products.id))
			.where(inArray(itemPurchases.receiptId, lastReceiptIds))
			.orderBy(desc(receipts.purchasedAt), itemPurchases.id)
			.limit(14);
		recentItems = itemRows.map((row) => ({
			id: row.id,
			name: row.itemName ?? row.name,
			price: money(row.price),
			quantity: money(row.quantity),
			productId: row.productId,
			shopName: row.shopName,
			supermarket: row.supermarket,
			purchasedAt: row.purchasedAt.toISOString()
		}));
	}

	const spendSeries = [...recent]
		.slice(0, 10)
		.reverse()
		.map((receipt) => ({
			label: new Intl.DateTimeFormat('en-GB', { day: 'numeric', month: 'short' }).format(
				new Date(receipt.purchasedAt)
			),
			total: receipt.total,
			id: receipt.id
		}));

	const last = recent[0] ?? null;

	return {
		recent,
		recentItems,
		topProducts,
		spendSeries,
		stats: {
			spend30: money(spendRow?.spend),
			avgBasket: money(spendRow?.avg),
			receipts30: Number(spendRow?.count ?? 0),
			receiptCount: Number(allTime?.count ?? 0),
			itemsTracked: Number(allTime?.items ?? 0),
			favouriteShop: favouriteRows[0] ?? null,
			lastShopTotal: last?.total ?? null,
			lastShopDiff: last?.diff ?? null,
			lastShopDiffPct: last?.diffPct ?? null,
			lastShopName: last?.shop.name ?? null,
			previousShopName: last?.previousShopName ?? null
		}
	};
}

export async function getSidebarData(userId: string) {
	const recentReceipts = await db
		.select({ id: receipts.id, purchasedAt: receipts.purchasedAt })
		.from(receipts)
		.where(eq(receipts.userId, userId))
		.orderBy(desc(receipts.purchasedAt))
		.limit(2);

	const ids = recentReceipts.map((row) => row.id);
	let recentItems: {
		id: number;
		name: string;
		price: number;
		productId: number | null;
		shopName: string;
		purchasedAt: string;
	}[] = [];
	if (ids.length) {
		const rows = await db
			.select({
				id: itemPurchases.id,
				name: itemPurchases.nameInReceipt,
				itemName: products.itemName,
				price: itemPurchases.price,
				productId: itemPurchases.productId,
				shopName: shops.shopName,
				shopArea: shops.area,
				purchasedAt: receipts.purchasedAt
			})
			.from(itemPurchases)
			.innerJoin(receipts, eq(itemPurchases.receiptId, receipts.id))
			.innerJoin(shops, eq(receipts.shopId, shops.id))
			.leftJoin(products, eq(itemPurchases.productId, products.id))
			.where(inArray(itemPurchases.receiptId, ids))
			.orderBy(desc(receipts.purchasedAt), itemPurchases.id)
			.limit(10);
		recentItems = rows.map((row) => ({
			id: row.id,
			name: row.itemName ?? row.name,
			price: money(row.price),
			productId: row.productId,
			shopName: shopDisplayName(row.shopName, row.shopArea),
			purchasedAt: row.purchasedAt.toISOString()
		}));
	}

	const commonRows = await db
		.select({
			productId: itemPurchases.productId,
			itemName: products.itemName,
			size: products.size,
			icon: productClasses.icon,
			times: sql<number>`count(*)::int`,
			avgPrice: sql<string>`avg(${itemPurchases.price})`
		})
		.from(itemPurchases)
		.innerJoin(receipts, eq(itemPurchases.receiptId, receipts.id))
		.innerJoin(products, eq(itemPurchases.productId, products.id))
		.innerJoin(productClasses, eq(products.classId, productClasses.id))
		.where(eq(receipts.userId, userId))
		.groupBy(itemPurchases.productId, products.itemName, products.size, productClasses.icon)
		.orderBy(desc(sql`count(*)`))
		.limit(5);

	const common = commonRows.map((row) => ({
		id: row.productId ?? 0,
		itemName: row.itemName,
		size: row.size,
		icon: row.icon,
		times: Number(row.times),
		avgPrice: money(row.avgPrice)
	}));

	return { recentItems, common };
}

export async function getMapData(
	userId: string,
	productId?: number | null,
	shopIds?: number[] | null
) {
	let activeProduct:
		| {
				id: number;
				itemName: string;
				brand: string | null;
				size: string | null;
				className: string;
				category: string;
				icon: string | null;
		  }
		| null = null;

	if (productId) {
		const rows = await db
			.select({
				id: products.id,
				itemName: products.itemName,
				brand: products.brand,
				size: products.size,
				className: productClasses.name,
				category: productClasses.category,
				icon: productClasses.icon
			})
			.from(products)
			.innerJoin(productClasses, eq(products.classId, productClasses.id))
			.where(eq(products.id, productId))
			.limit(1);
		activeProduct = rows[0] ?? null;
	}

	const hasNoNearbyShops = shopIds !== undefined && shopIds !== null && shopIds.length === 0;

	if (!activeProduct && !hasNoNearbyShops) {
		// Default to the user's newest purchased item that is actually stocked
		// at a shop inside their radius.
		const recentRows = await db
			.select({
				id: products.id,
				itemName: products.itemName,
				brand: products.brand,
				size: products.size,
				className: productClasses.name,
				category: productClasses.category,
				icon: productClasses.icon
			})
			.from(itemPurchases)
			.innerJoin(receipts, eq(itemPurchases.receiptId, receipts.id))
			.innerJoin(products, eq(itemPurchases.productId, products.id))
			.innerJoin(productClasses, eq(products.classId, productClasses.id))
			.innerJoin(itemPrices, eq(itemPrices.productId, products.id))
			.innerJoin(shops, eq(itemPrices.shopId, shops.id))
			.where(
				and(
					eq(receipts.userId, userId),
					shopIds ? inArray(shops.id, shopIds) : undefined
				)
			)
			.groupBy(
				products.id,
				products.itemName,
				products.brand,
				products.size,
				productClasses.name,
				productClasses.category,
				productClasses.icon
			)
			.orderBy(desc(sql`max(${receipts.purchasedAt})`))
			.limit(1);
		activeProduct = recentRows[0] ?? null;
	}

	if (!activeProduct && !hasNoNearbyShops) {
		const popular = await db
			.select({
				id: products.id,
				itemName: products.itemName,
				brand: products.brand,
				size: products.size,
				className: productClasses.name,
				category: productClasses.category,
				icon: productClasses.icon,
				count: sql<number>`count(*)::int`
			})
			.from(itemPrices)
			.innerJoin(products, eq(itemPrices.productId, products.id))
			.innerJoin(productClasses, eq(products.classId, productClasses.id))
			.where(shopIds ? inArray(itemPrices.shopId, shopIds) : undefined)
			.groupBy(
				products.id,
				products.itemName,
				products.brand,
				products.size,
				productClasses.name,
				productClasses.category,
				productClasses.icon
			)
			.orderBy(desc(sql`count(*)`))
			.limit(1);
		activeProduct = popular[0] ?? null;
	}

	const shopRows = await db
		.select({
			id: shops.id,
			name: shops.shopName,
			supermarket: shops.supermarketName,
			brand: shops.brand,
			lat: shops.lat,
			lng: shops.lng,
			address: shops.address,
			area: shops.area,
			city: shops.city,
			region: shops.region,
			postcode: shops.postcode
		})
		.from(shops)
		.orderBy(shops.city, shops.shopName);

	const priceMap = new Map<number, number>();
	if (activeProduct) {
		const priceRows = await db
			.select({ shopId: itemPrices.shopId, price: itemPrices.price })
			.from(itemPrices)
			.where(eq(itemPrices.productId, activeProduct.id));
		for (const row of priceRows) priceMap.set(row.shopId, money(row.price));
	}

	const allowedShopIds = shopIds ? new Set(shopIds) : null;
	const visibleShopRows = allowedShopIds
		? shopRows.filter((shop) => allowedShopIds.has(shop.id))
		: shopRows;

	const priced = visibleShopRows
		.filter((shop) => priceMap.has(shop.id))
		.map((shop) => priceMap.get(shop.id) as number);
	const minPrice = priced.length ? Math.min(...priced) : null;
	const maxPrice = priced.length ? Math.max(...priced) : null;

	const stores = visibleShopRows.map((shop) => {
		const price = priceMap.get(shop.id) ?? null;
		return {
			...shop,
			name: shopDisplayName(shop.name, shop.area),
			price,
			isCheapest: price !== null && minPrice !== null && Math.abs(price - minPrice) < 0.001,
			isMostExpensive:
				price !== null &&
				maxPrice !== null &&
				maxPrice > (minPrice ?? 0) &&
				Math.abs(price - maxPrice) < 0.001
		};
	});

	const recentSearches = await db
		.select({
			id: products.id,
			itemName: products.itemName,
			icon: productClasses.icon,
			purchasedAt: receipts.purchasedAt
		})
		.from(itemPurchases)
		.innerJoin(receipts, eq(itemPurchases.receiptId, receipts.id))
		.innerJoin(products, eq(itemPurchases.productId, products.id))
		.innerJoin(productClasses, eq(products.classId, productClasses.id))
		.where(eq(receipts.userId, userId))
		.orderBy(desc(receipts.purchasedAt))
		.limit(40);

	const suggestions = recentSearches
		.filter((row, index, array) => array.findIndex((other) => other.id === row.id) === index)
		.slice(0, 6)
		.map((row) => ({ id: row.id, itemName: row.itemName, icon: row.icon }));

	return {
		activeProduct,
		stores,
		minPrice,
		maxPrice,
		pricedCount: priced.length,
		suggestions
	};
}

export async function getShopDetails(shopId: number) {
	const [shop] = await db.select().from(shops).where(eq(shops.id, shopId)).limit(1);
	if (!shop) return null;

	const priceRows = await db
		.select({
			productId: products.id,
			itemName: products.itemName,
			brand: products.brand,
			size: products.size,
			className: productClasses.name,
			category: productClasses.category,
			icon: productClasses.icon,
			price: itemPrices.price,
			updatedAt: itemPrices.updatedAt
		})
		.from(itemPrices)
		.innerJoin(products, eq(itemPrices.productId, products.id))
		.innerJoin(productClasses, eq(products.classId, productClasses.id))
		.where(eq(itemPrices.shopId, shopId))
		.orderBy(itemPrices.price)
		.limit(80);

	const [stats] = await db
		.select({
			productCount: sql<number>`count(*)::int`,
			avgPrice: sql<string>`avg(${itemPrices.price})`,
			updatedAt: sql<string>`max(${itemPrices.updatedAt})`
		})
		.from(itemPrices)
		.where(eq(itemPrices.shopId, shopId));

	return {
		shop: {
			...shop,
			osmId: shop.osmId
		},
		prices: priceRows.map((row) => ({
			...row,
			price: money(row.price),
			updatedAt: row.updatedAt.toISOString()
		})),
		stats: {
			productCount: Number(stats?.productCount ?? 0),
			avgPrice: money(stats?.avgPrice),
			updatedAt: stats?.updatedAt ? new Date(stats.updatedAt).toISOString() : null
		}
	};
}

export async function getProductDetails(
	productId: number,
	userId?: string,
	shopIds?: number[] | null
) {
	const [product] = await db
		.select({
			id: products.id,
			itemName: products.itemName,
			brand: products.brand,
			size: products.size,
			unit: products.unit,
			supermarket: products.supermarket,
			isOwnBrand: products.isOwnBrand,
			basePrice: products.basePrice,
			classId: products.classId,
			className: productClasses.name,
			category: productClasses.category,
			icon: productClasses.icon
		})
		.from(products)
		.innerJoin(productClasses, eq(products.classId, productClasses.id))
		.where(eq(products.id, productId))
		.limit(1);

	if (!product) return null;

	const stats = (await getPriceStats([productId], shopIds)).get(productId) ?? null;

	const storeRows = await db
		.select({
			shopId: shops.id,
			shopName: shops.shopName,
			supermarket: shops.supermarketName,
			city: shops.city,
			region: shops.region,
			area: shops.area,
			lat: shops.lat,
			lng: shops.lng,
			price: itemPrices.price,
			updatedAt: itemPrices.updatedAt
		})
		.from(itemPrices)
		.innerJoin(shops, eq(itemPrices.shopId, shops.id))
		.where(eq(itemPrices.productId, productId))
		.orderBy(itemPrices.price);

	const historyRows = await db
		.select({
			price: itemPurchases.price,
			quantity: itemPurchases.quantity,
			purchasedAt: receipts.purchasedAt,
			shopId: shops.id,
			shopName: shops.shopName,
			shopArea: shops.area,
			supermarket: shops.supermarketName,
			userId: receipts.userId
		})
		.from(itemPurchases)
		.innerJoin(receipts, eq(itemPurchases.receiptId, receipts.id))
		.innerJoin(shops, eq(receipts.shopId, shops.id))
		.where(eq(itemPurchases.productId, productId))
		.orderBy(desc(receipts.purchasedAt))
		.limit(40);

	const allowedShopIds = shopIds ? new Set(shopIds) : null;
	const visibleStoreRows = allowedShopIds
		? storeRows.filter((row) => allowedShopIds.has(row.shopId))
		: storeRows;
	const visibleHistoryRows = allowedShopIds
		? historyRows.filter((row) => allowedShopIds.has(row.shopId))
		: historyRows;

	const lastUserPurchase = userId
		? visibleHistoryRows.find((row) => row.userId === userId) ?? null
		: null;

	const equivalentRows = await db
		.select({
			id: products.id,
			itemName: products.itemName,
			brand: products.brand,
			size: products.size,
			supermarket: products.supermarket,
			isOwnBrand: products.isOwnBrand
		})
		.from(products)
		.where(eq(products.classId, product.classId));

	const equivalentStats = await getPriceStats(
		equivalentRows.map((row) => row.id),
		shopIds
	);
	const equivalents = equivalentRows
		.map((row) => ({
			...row,
			stats: equivalentStats.get(row.id) ?? null
		}))
		.sort(
			(a, b) =>
				(a.stats?.minPrice ?? Number.POSITIVE_INFINITY) -
				(b.stats?.minPrice ?? Number.POSITIVE_INFINITY)
		);

	return {
		product: { ...product, basePrice: money(product.basePrice) },
		stats,
		equivalents,
		stores: visibleStoreRows.map((row) => ({
			...row,
			shopName: shopDisplayName(row.shopName, row.area),
			price: money(row.price),
			updatedAt: row.updatedAt.toISOString()
		})),
		history: visibleHistoryRows.map((row) => ({
			price: money(row.price),
			quantity: money(row.quantity),
			purchasedAt: row.purchasedAt.toISOString(),
			shopName: shopDisplayName(row.shopName, row.shopArea),
			supermarket: row.supermarket,
			isMine: row.userId === userId
		})),
		lastUserPurchase: lastUserPurchase
			? {
					...lastUserPurchase,
					price: money(lastUserPurchase.price),
					purchasedAt: lastUserPurchase.purchasedAt.toISOString()
				}
			: null
	};
}

export type ClassVariant = {
	id: number;
	itemName: string;
	brand: string | null;
	size: string | null;
	supermarket: string | null;
	isOwnBrand: boolean;
	stats: {
		minPrice: number | null;
		maxPrice: number | null;
		avgPrice: number | null;
		storeCount: number;
		cheapestShopId: number | null;
		cheapestShopName: string | null;
		cheapestSupermarket: string | null;
	} | null;
};

export async function getProductClasses(
	query: string,
	category: string | null,
	shopIds?: number[] | null
) {
	const [classes, productRows] = await Promise.all([
		db.select().from(productClasses).orderBy(productClasses.category, productClasses.name),
		db
			.select({
				id: products.id,
				classId: products.classId,
				itemName: products.itemName,
				brand: products.brand,
				size: products.size,
				supermarket: products.supermarket,
				isOwnBrand: products.isOwnBrand
			})
			.from(products)
			.innerJoin(productClasses, eq(products.classId, productClasses.id))
	]);

	const stats = await getPriceStats(
		productRows.map((row) => row.id),
		shopIds
	);
	const byClass = new Map<number, ClassVariant[]>();
	for (const row of productRows) {
		const list = byClass.get(row.classId) ?? [];
		list.push({ ...row, stats: stats.get(row.id) ?? null });
		byClass.set(row.classId, list);
	}

	const q = query.trim().toLowerCase();
	const results = classes
		.map((cls) => {
			const variants = (byClass.get(cls.id) ?? []).sort((a, b) => {
				const aPrice = a.stats?.minPrice ?? Number.POSITIVE_INFINITY;
				const bPrice = b.stats?.minPrice ?? Number.POSITIVE_INFINITY;
				return aPrice - bPrice;
			});
			const prices = variants
				.map((variant) => variant.stats?.minPrice)
				.filter((price): price is number => typeof price === 'number');
			const cheapest = prices.length ? Math.min(...prices) : null;
			return {
				id: cls.id,
				name: cls.name,
				category: cls.category,
				icon: cls.icon,
				variants,
				ownBrand: variants.filter((variant) => variant.isOwnBrand),
				branded: variants.filter((variant) => !variant.isOwnBrand),
				cheapest,
				storeCount: Math.max(0, ...variants.map((variant) => variant.stats?.storeCount ?? 0))
			};
		})
		.filter((cls) => {
			if (category && cls.category !== category) return false;
			if (!q) return true;
			return (
				cls.name.toLowerCase().includes(q) ||
				cls.category.toLowerCase().includes(q) ||
				cls.variants.some(
					(variant) =>
						variant.itemName.toLowerCase().includes(q) ||
						(variant.brand ?? '').toLowerCase().includes(q)
				)
			);
		});

	return { classes: results };
}

export async function getProductClassDetails(
	classId: number,
	shopIds?: number[] | null
) {
	const [cls] = await db
		.select()
		.from(productClasses)
		.where(eq(productClasses.id, classId))
		.limit(1);
	if (!cls) return null;

	const rows = await db
		.select({
			id: products.id,
			itemName: products.itemName,
			brand: products.brand,
			size: products.size,
			supermarket: products.supermarket,
			isOwnBrand: products.isOwnBrand
		})
		.from(products)
		.where(eq(products.classId, classId));

	const stats = await getPriceStats(
		rows.map((row) => row.id),
		shopIds
	);
	const variants = rows
		.map((row) => ({ ...row, stats: stats.get(row.id) ?? null }))
		.sort(
			(a, b) =>
				(a.stats?.minPrice ?? Number.POSITIVE_INFINITY) -
				(b.stats?.minPrice ?? Number.POSITIVE_INFINITY)
		);

	return {
		class: cls,
		ownBrand: variants.filter((variant) => variant.isOwnBrand),
		branded: variants.filter((variant) => !variant.isOwnBrand),
		variants
	};
}

export async function listProducts(
	query: string,
	category: string | null,
	limit = 60,
	shopIds?: number[] | null
) {
	const q = query.trim();
	const conditions = [];
	if (q) {
		conditions.push(
			sql`(${products.itemName} ilike ${`%${q}%`} or ${productClasses.name} ilike ${`%${q}%`} or ${productClasses.category} ilike ${`%${q}%`} or ${products.brand} ilike ${`%${q}%`})`
		);
	}
	if (category) conditions.push(eq(productClasses.category, category));

	const rows = await db
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
		.innerJoin(productClasses, eq(products.classId, productClasses.id))
		.where(conditions.length ? and(...conditions) : undefined)
		.orderBy(productClasses.category, productClasses.name, products.itemName)
		.limit(limit);

	const stats = await getPriceStats(
		rows.map((row) => row.id),
		shopIds
	);

	return rows.map((row) => ({
		...row,
		basePrice: money(row.basePrice),
		stats: stats.get(row.id) ?? null
	}));
}

export async function getCategoryCounts() {
	const rows = await db
		.select({
			category: productClasses.category,
			count: sql<number>`count(*)::int`
		})
		.from(productClasses)
		.groupBy(productClasses.category)
		.orderBy(productClasses.category);
	return rows;
}

export async function getLandingStats() {
	const [shopCount] = await db.select({ count: sql<number>`count(*)::int` }).from(shops);
	const [productCount] = await db.select({ count: sql<number>`count(*)::int` }).from(products);
	const [priceCount] = await db.select({ count: sql<number>`count(*)::int` }).from(itemPrices);
	const [receiptCount] = await db.select({ count: sql<number>`count(*)::int` }).from(receipts);
	const [chainCount] = await db
		.select({ count: sql<number>`count(distinct ${shops.supermarketName})::int` })
		.from(shops);

	return {
		shops: Number(shopCount?.count ?? 0),
		products: Number(productCount?.count ?? 0),
		prices: Number(priceCount?.count ?? 0),
		receipts: Number(receiptCount?.count ?? 0),
		chains: Number(chainCount?.count ?? 0)
	};
}

export async function getRecentStoreVisits(userId: string, limit = 5) {
	return db
		.select({
			shopId: shops.id,
			shopName: shops.shopName,
			area: shops.area,
			supermarket: shops.supermarketName,
			city: shops.city,
			lastVisit: sql<string>`max(${receipts.purchasedAt})`,
			visits: sql<number>`count(*)::int`
		})
		.from(receipts)
		.innerJoin(shops, eq(receipts.shopId, shops.id))
		.where(eq(receipts.userId, userId))
		.groupBy(shops.id, shops.shopName, shops.area, shops.supermarketName, shops.city)
		.orderBy(desc(sql`max(${receipts.purchasedAt})`))
		.limit(limit);
}
