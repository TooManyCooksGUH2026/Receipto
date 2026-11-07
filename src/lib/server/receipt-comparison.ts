import { and, eq, inArray } from 'drizzle-orm';
import { db } from './db';
import {
	itemPrices,
	itemPurchases,
	productClasses,
	products,
	receipts,
	shops
} from './schema';
import { haversineMiles } from '#lib/utils/geo';
import { shopDisplayName } from '#lib/utils/shop-name';

function money(value: unknown) {
	const number = Number(value ?? 0);
	return Number.isFinite(number) ? number : 0;
}

export type BasketItem = {
	id: number;
	nameInReceipt: string;
	itemName: string | null;
	brand: string | null;
	size: string | null;
	productId: number | null;
	classId: number | null;
	className: string | null;
	icon: string | null;
	isOwnBrand: boolean;
	price: number;
	quantity: number;
};

export type BasketComparisonRow = {
	chain: string;
	storeId: number | null;
	storeName: string;
	distanceMiles: number;
	total: number;
	missingCount: number;
	difference: number;
	differencePct: number | null;
	isActual: boolean;
	isCheapest: boolean;
	isMostExpensive: boolean;
};

export type ReceiptComparison = {
	receipt: {
		id: string;
		purchasedAt: string;
		subtotal: number;
		discountTotal: number;
		total: number;
		itemCount: number;
		shopId: number;
		shopName: string;
		supermarket: string;
		city: string;
		area: string | null;
		lat: number;
		lng: number;
	};
	items: BasketItem[];
	comparison: BasketComparisonRow[];
};

export async function getReceiptComparison(
	receiptId: string,
	userId: string
): Promise<ReceiptComparison | null> {
	const [receipt] = await db
		.select({
			id: receipts.id,
			purchasedAt: receipts.purchasedAt,
			subtotal: receipts.subtotal,
			discountTotal: receipts.discountTotal,
			total: receipts.total,
			itemCount: receipts.itemCount,
			shopId: shops.id,
			shopName: shops.shopName,
			supermarket: shops.supermarketName,
			city: shops.city,
			area: shops.area,
			lat: shops.lat,
			lng: shops.lng
		})
		.from(receipts)
		.innerJoin(shops, eq(receipts.shopId, shops.id))
		.where(and(eq(receipts.id, receiptId), eq(receipts.userId, userId)))
		.limit(1);

	if (!receipt) return null;

	const itemRows = await db
		.select({
			id: itemPurchases.id,
			nameInReceipt: itemPurchases.nameInReceipt,
			price: itemPurchases.price,
			quantity: itemPurchases.quantity,
			productId: itemPurchases.productId,
			itemName: products.itemName,
			brand: products.brand,
			size: products.size,
			classId: products.classId,
			className: productClasses.name,
			icon: productClasses.icon,
			isOwnBrand: products.isOwnBrand
		})
		.from(itemPurchases)
		.leftJoin(products, eq(itemPurchases.productId, products.id))
		.leftJoin(productClasses, eq(products.classId, productClasses.id))
		.where(eq(itemPurchases.receiptId, receiptId))
		.orderBy(itemPurchases.id);

	const items: BasketItem[] = itemRows.map((row) => ({
		id: row.id,
		nameInReceipt: row.nameInReceipt,
		itemName: row.itemName,
		brand: row.brand,
		size: row.size,
		productId: row.productId,
		classId: row.classId,
		className: row.className,
		icon: row.icon,
		isOwnBrand: row.isOwnBrand ?? false,
		price: money(row.price),
		quantity: Math.max(1, money(row.quantity))
	}));

	const subtotal = money(receipt.subtotal) || money(receipt.total);
	const total = money(receipt.total);
	const discountTotal = money(receipt.discountTotal);

	const classIds = [
		...new Set(items.map((item) => item.classId).filter((id): id is number => id !== null))
	];

	const classProducts = classIds.length
		? await db
				.select({
					id: products.id,
					classId: products.classId,
					isOwnBrand: products.isOwnBrand,
					supermarket: products.supermarket,
					itemName: products.itemName
				})
				.from(products)
				.where(inArray(products.classId, classIds))
		: [];

	const allStores = await db
		.select({
			id: shops.id,
			shopName: shops.shopName,
			area: shops.area,
			supermarket: shops.supermarketName,
			lat: shops.lat,
			lng: shops.lng
		})
		.from(shops);

	const nearestByChain = new Map<string, (typeof allStores)[number] & { distanceMiles: number }>();
	for (const store of allStores) {
		const distance = haversineMiles(receipt.lat, receipt.lng, store.lat, store.lng);
		const existing = nearestByChain.get(store.supermarket);
		if (!existing || distance < existing.distanceMiles) {
			nearestByChain.set(store.supermarket, { ...store, distanceMiles: distance });
		}
	}

	const targetStores = [...nearestByChain.values()].filter(
		(store) => store.supermarket !== receipt.supermarket
	);
	const targetStoreIds = targetStores.map((store) => store.id);

	const relevantProductIds = [
		...new Set([
			...items.map((item) => item.productId).filter((id): id is number => id !== null),
			...classProducts.filter((product) => product.isOwnBrand).map((product) => product.id)
		])
	];

	const priceRows =
		targetStoreIds.length && relevantProductIds.length
			? await db
					.select({
						shopId: itemPrices.shopId,
						productId: itemPrices.productId,
						price: itemPrices.price
					})
					.from(itemPrices)
					.where(
						and(
							inArray(itemPrices.shopId, targetStoreIds),
							inArray(itemPrices.productId, relevantProductIds)
						)
					)
			: [];

	const priceByStoreProduct = new Map<string, number>();
	for (const row of priceRows) {
		priceByStoreProduct.set(`${row.shopId}:${row.productId}`, money(row.price));
	}

	const ownBrandByChainClass = new Map<string, number>();
	for (const product of classProducts) {
		if (!product.isOwnBrand || !product.supermarket) continue;
		ownBrandByChainClass.set(`${product.supermarket}:${product.classId}`, product.id);
	}

	const rows: BasketComparisonRow[] = [];

	const actualRow: BasketComparisonRow = {
		chain: receipt.supermarket,
		storeId: receipt.shopId,
		storeName: shopDisplayName(receipt.shopName, receipt.area),
		distanceMiles: 0,
		total: subtotal,
		missingCount: 0,
		difference: 0,
		differencePct: 0,
		isActual: true,
		isCheapest: false,
		isMostExpensive: false
	};
	rows.push(actualRow);

	for (const store of targetStores) {
		let basketTotal = 0;
		let missingCount = 0;

		for (const item of items) {
			if (!item.productId) {
				missingCount++;
				continue;
			}

			let candidateProductId: number | null = null;
			if (item.isOwnBrand && item.classId !== null) {
				candidateProductId =
					ownBrandByChainClass.get(`${store.supermarket}:${item.classId}`) ?? null;
			} else {
				candidateProductId = item.productId;
			}

			if (!candidateProductId) {
				missingCount++;
				continue;
			}

			const price = priceByStoreProduct.get(`${store.id}:${candidateProductId}`);
			if (price === undefined) {
				missingCount++;
				continue;
			}

			basketTotal += price * item.quantity;
		}

		basketTotal = Math.round(basketTotal * 100) / 100;
		const difference = Math.round((basketTotal - subtotal) * 100) / 100;
		rows.push({
			chain: store.supermarket,
			storeId: store.id,
			storeName: shopDisplayName(store.shopName, store.area),
			distanceMiles: Math.round(store.distanceMiles * 10) / 10,
			total: basketTotal,
			missingCount,
			difference,
			differencePct: subtotal > 0 ? Math.round((difference / subtotal) * 1000) / 10 : null,
			isActual: false,
			isCheapest: false,
			isMostExpensive: false
		});
	}

	const complete = rows.filter((row) => row.missingCount === 0);
	if (complete.length) {
		const cheapest = Math.min(...complete.map((row) => row.total));
		const highest = Math.max(...complete.map((row) => row.total));
		for (const row of complete) {
			row.isCheapest = Math.abs(row.total - cheapest) < 0.005;
			row.isMostExpensive = highest > cheapest && Math.abs(row.total - highest) < 0.005;
		}
	}

	rows.sort((a, b) => {
		if (a.missingCount !== b.missingCount) return a.missingCount - b.missingCount;
		return a.total - b.total;
	});

	return {
		receipt: {
			id: receipt.id,
			purchasedAt: receipt.purchasedAt.toISOString(),
			subtotal,
			discountTotal,
			total,
			itemCount: receipt.itemCount,
			shopId: receipt.shopId,
			shopName: shopDisplayName(receipt.shopName, receipt.area),
			supermarket: receipt.supermarket,
			city: receipt.city,
			area: receipt.area,
			lat: receipt.lat,
			lng: receipt.lng
		},
		items,
		comparison: rows
	};
}