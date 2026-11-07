import { json } from '@sveltejs/kit';
import {
	saveReceipt,
	type ReceiptDiscountInput,
	type ReceiptItemInput
} from '#lib/server/receipts';
import type { RequestHandler } from './$types';

type ReceiptBody = {
	shopId?: number;
	purchasedAt?: string;
	subtotal?: number | null;
	discountTotal?: number | null;
	total?: number | null;
	items?: ReceiptItemInput[];
	discounts?: ReceiptDiscountInput[];
	source?: string;
	ocrText?: string | null;
};

export const POST: RequestHandler = async ({ request, locals }) => {
	if (!locals.user) return json({ error: 'Unauthorized' }, { status: 401 });

	const body = (await request.json().catch(() => null)) as ReceiptBody | null;
	if (!body) return json({ error: 'Invalid JSON body' }, { status: 400 });

	const shopId = Number(body.shopId);
	if (!Number.isInteger(shopId) || shopId <= 0) {
		return json({ error: 'Choose a store for this receipt' }, { status: 400 });
	}
	if (!Array.isArray(body.items) || !body.items.length) {
		return json({ error: 'Add at least one item to the receipt' }, { status: 400 });
	}
	if (body.items.length > 100) {
		return json({ error: 'Too many line items (maximum 100)' }, { status: 400 });
	}

	try {
		const receipt = await saveReceipt({
			userId: locals.user.id,
			shopId,
			purchasedAt: body.purchasedAt ?? new Date().toISOString(),
			subtotal: body.subtotal ?? null,
			discountTotal: body.discountTotal ?? null,
			total: body.total ?? null,
			items: body.items,
			discounts: body.discounts ?? [],
			source: body.source ?? 'scan',
			ocrText: body.ocrText ?? null
		});
		return json({ receipt }, { status: 201 });
	} catch (error) {
		console.error('Failed to save receipt', error);
		return json(
			{ error: error instanceof Error ? error.message : 'Could not save receipt' },
			{ status: 400 }
		);
	}
};
