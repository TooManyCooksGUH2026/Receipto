import { json } from '@sveltejs/kit';
import { matchProduct } from '#lib/server/products';
import { parseReceiptText, type ParsedItem } from '#lib/utils/receipt-parser';
import type { RequestHandler } from './$types';

type ParseBody = {
	text?: string;
	items?: ParsedItem[];
	supermarket?: string | null;
};

export const POST: RequestHandler = async ({ request, locals }) => {
	if (!locals.user) return json({ error: 'Unauthorized' }, { status: 401 });

	const body = (await request.json().catch(() => null)) as ParseBody | null;
	if (!body) return json({ error: 'Invalid JSON body' }, { status: 400 });

	const parsed = body.text
		? parseReceiptText(body.text)
		: {
				supermarket: null,
				purchasedAt: new Date().toISOString(),
				total: null,
				items: body.items ?? [],
				rawText: '',
				warnings: [] as string[]
			};

	const supermarket = body.supermarket ?? parsed.supermarket;

	const matches = await Promise.all(
		parsed.items.slice(0, 60).map(async (item) => ({
			name: item.name,
			price: item.price,
			quantity: item.quantity,
			matches: await matchProduct(item.name, supermarket, 4)
		}))
	);

	return json({
		receipt: {
			...parsed,
			supermarket
		},
		items: matches
	});
};
