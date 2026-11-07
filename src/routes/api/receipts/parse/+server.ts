import { json } from '@sveltejs/kit';
import { matchProduct } from '#lib/server/products';
import { gemmaModel, isGemmaConfigured, parseReceiptWithGemma } from '#lib/server/gemma';
import { parseReceiptText, type ParsedItem, type ParsedReceipt } from '#lib/utils/receipt-parser';
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

	let parsed: ParsedReceipt;
	let parser: 'gemma' | 'rules' = 'rules';
	let model: string | null = null;
	let aiError: string | null = null;

	if (body.text) {
		const fallback = parseReceiptText(body.text);
		if (isGemmaConfigured()) {
			try {
				const gemma = await parseReceiptWithGemma(body.text);
				if (gemma) {
					parsed = gemma;
					parser = 'gemma';
					model = gemmaModel();
				} else {
					aiError = 'Gemma returned no usable line items';
					parsed = fallback;
				}
			} catch (error) {
				aiError = error instanceof Error ? error.message : 'Gemma parsing failed';
				console.error('Gemma receipt parsing failed; using local parser.', error);
				parsed = fallback;
			}
		} else {
			parsed = fallback;
		}
	} else if (body.items) {
		parsed = {
			supermarket: null,
			purchasedAt: new Date().toISOString(),
			subtotal: null,
			discountTotal: 0,
			discounts: [],
			expectedTotal: null,
			total: null,
			items: body.items,
			rawText: '',
			warnings: []
		};
	} else {
		return json({ error: 'Send receipt text or parsed items' }, { status: 400 });
	}

	const supermarket = parsed.supermarket ?? body.supermarket ?? null;

	const matches = await Promise.all(
		parsed.items.slice(0, 100).map(async (item) => ({
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
		items: matches,
		parser,
		model,
		aiError
	});
};