import { and, eq } from 'drizzle-orm';
import { db } from './db';
import { itemPrices, itemPurchases, receipts, shops } from './schema';
import { addAlias, findOrCreateProduct } from './products';

export type ReceiptItemInput = {
	name: string;
	price: number;
	quantity?: number;
	productId?: number | null;
};

export type ReceiptDiscountInput = {
	name: string;
	amount: number;
};

export type SaveReceiptInput = {
	userId: string;
	shopId: number;
	purchasedAt: string | Date;
	subtotal?: number | null;
	discountTotal?: number | null;
	total?: number | null;
	items: ReceiptItemInput[];
	discounts?: ReceiptDiscountInput[];
	source?: string;
	ocrText?: string | null;
};

export async function saveReceipt(input: SaveReceiptInput) {
	const [shop] = await db.select().from(shops).where(eq(shops.id, input.shopId)).limit(1);
	if (!shop) throw new Error('Shop not found');

	const items = input.items
		.map((item) => ({
			name: String(item.name ?? '').trim(),
			price: Number(item.price),
			quantity: Number(item.quantity ?? 1),
			productId: item.productId ?? null
		}))
		.filter((item) => item.name.length > 0 && Number.isFinite(item.price) && item.price >= 0);

	if (!items.length) throw new Error('A receipt needs at least one line item');

	const resolved: {
		name: string;
		price: number;
		quantity: number;
		productId: number;
	}[] = [];

	for (const item of items) {
		let productId = item.productId;
		if (!productId || !Number.isInteger(productId)) {
			productId = await findOrCreateProduct(item.name, shop.supermarketName, item.price);
		}
		resolved.push({
			name: item.name,
			price: Math.round(item.price * 100) / 100,
			quantity: Number.isFinite(item.quantity) && item.quantity > 0 ? item.quantity : 1,
			productId
		});
	}

	const discounts = (input.discounts ?? [])
		.map((discount) => ({
			name: String(discount.name ?? '').trim() || 'Discount',
			amount: Math.abs(Number(discount.amount))
		}))
		.filter((discount) => Number.isFinite(discount.amount) && discount.amount > 0 && discount.amount < 300);

	const itemSubtotal = Math.round(resolved.reduce((sum, item) => sum + item.price, 0) * 100) / 100;
	const discountTotal =
		Math.round(discounts.reduce((sum, discount) => sum + discount.amount, 0) * 100) / 100;
	const computedTotal = Math.round((itemSubtotal - discountTotal) * 100) / 100;
	const total =
		input.total !== undefined && input.total !== null && Number.isFinite(Number(input.total))
			? Math.round(Number(input.total) * 100) / 100
			: computedTotal;

	const purchasedAt = input.purchasedAt instanceof Date ? input.purchasedAt : new Date(input.purchasedAt);
	if (Number.isNaN(purchasedAt.getTime())) throw new Error('Invalid purchase date');

	const receiptId = crypto.randomUUID();

	await db.transaction(async (tx) => {
		await tx.insert(receipts).values({
			id: receiptId,
			userId: input.userId,
			shopId: input.shopId,
			purchasedAt,
			subtotal: itemSubtotal.toFixed(2),
			discountTotal: discountTotal.toFixed(2),
			total: total.toFixed(2),
			itemCount: resolved.length,
			source: input.source ?? 'manual',
			ocrText: input.ocrText ?? null
		});

		for (const item of resolved) {
			await tx.insert(itemPurchases).values({
				receiptId,
				productId: item.productId,
				nameInReceipt: item.name,
				price: item.price.toFixed(2),
				quantity: item.quantity.toFixed(3),
				unitPrice: (item.price / item.quantity).toFixed(2)
			});

			await tx
				.insert(itemPrices)
				.values({
					shopId: input.shopId,
					productId: item.productId,
					price: item.price.toFixed(2),
					updatedAt: new Date(),
					receiptId
				})
				.onConflictDoUpdate({
					target: [itemPrices.shopId, itemPrices.productId],
					set: {
						price: item.price.toFixed(2),
						updatedAt: new Date(),
						receiptId
					}
				});
		}
	});

	for (const item of resolved) {
		await addAlias(item.productId, item.name, shop.supermarketName);
	}

	return {
		id: receiptId,
		subtotal: itemSubtotal,
		discountTotal,
		total,
		itemCount: resolved.length,
		shop
	};
}

export async function deleteReceipt(userId: string, receiptId: string) {
	const [receipt] = await db
		.select({ id: receipts.id })
		.from(receipts)
		.where(and(eq(receipts.id, receiptId), eq(receipts.userId, userId)))
		.limit(1);
	if (!receipt) return false;
	await db.delete(receipts).where(eq(receipts.id, receiptId));
	return true;
}
