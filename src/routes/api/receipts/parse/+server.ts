import { json } from '@sveltejs/kit';
import { matchProduct } from '#lib/server/products';
import { gemmaModel, isGemmaConfigured, parseReceiptWithGemma } from '#lib/server/gemma';
import type { RequestHandler } from './$types';

type ParseBody = {
	text?: string;
	image?: string | null;
};

const MAX_IMAGE_DATA_URL = 8_000_000;

export const POST: RequestHandler = async ({ request, locals }) => {
	if (!locals.user) return json({ error: 'Unauthorized' }, { status: 401 });

	const body = (await request.json().catch(() => null)) as ParseBody | null;
	if (!body) return json({ error: 'Invalid JSON body' }, { status: 400 });

	if (!isGemmaConfigured()) {
		return json(
			{
				error: 'Gemma 4 is not configured. Add GEMMA_API_KEY to .env and restart the server.'
			},
			{ status: 503 }
		);
	}

	const text = typeof body.text === 'string' ? body.text.trim() : '';
	const image =
		typeof body.image === 'string' && body.image.startsWith('data:image/')
			? body.image
			: null;

	if (!text && !image) {
		return json({ error: 'Send receipt text or a compressed receipt image' }, { status: 400 });
	}
	if (image && image.length > MAX_IMAGE_DATA_URL) {
		return json({ error: 'Receipt image is too large' }, { status: 413 });
	}

	try {
		const parsed = await parseReceiptWithGemma(text, image);
		if (!parsed || !parsed.items.length) {
			return json(
				{ error: 'Gemma 4 could not read any line items from this receipt.' },
				{ status: 502 }
			);
		}

		const matches = await Promise.all(
			parsed.items.slice(0, 100).map(async (item) => ({
				name: item.name,
				price: item.price,
				quantity: item.quantity,
				matches: await matchProduct(item.name, parsed.supermarket, 4)
			}))
		);

		return json({
			receipt: parsed,
			items: matches,
			parser: 'gemma',
			model: gemmaModel()
		});
	} catch (error) {
		console.error('Gemma 4 receipt parsing failed.', error);
		return json(
			{ error: 'Gemma 4 parsing failed. Check the API key, model name and OpenRouter balance.' },
			{ status: 502 }
		);
	}
};