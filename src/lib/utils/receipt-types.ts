import type { Supermarket } from '#lib/data/catalog';

export type ParsedItem = {
	name: string;
	price: number;
	quantity: number;
};

export type ParsedDiscount = {
	name: string;
	amount: number;
};

export type ParsedReceipt = {
	supermarket: Supermarket | null;
	purchasedAt: string;
	subtotal: number | null;
	discountTotal: number;
	discounts: ParsedDiscount[];
	expectedTotal: number | null;
	total: number | null;
	items: ParsedItem[];
	rawText: string;
	warnings: string[];
};