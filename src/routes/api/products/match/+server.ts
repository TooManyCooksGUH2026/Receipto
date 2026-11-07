import { json } from '@sveltejs/kit';
import { matchProduct } from '#lib/server/products';
import type { RequestHandler } from './$types';

type MatchRequest = {
	name?: string;
	supermarket?: string | null;
	items?: { name: string; supermarket?: string | null }[];
};

export const POST: RequestHandler = async ({ request, locals }) => {
	if (!locals.user) return json({ error: 'Unauthorized' }, { status: 401 });

	const body = (await request.json().catch(() => null)) as MatchRequest | null;
	if (!body) return json({ error: 'Invalid JSON body' }, { status: 400 });

	if (Array.isArray(body.items)) {
		const matches = await Promise.all(
			body.items.slice(0, 60).map(async (item) => ({
				name: item.name,
				matches: await matchProduct(item.name, item.supermarket ?? body.supermarket ?? null, 4)
			}))
		);
		return json({ items: matches });
	}

	if (!body.name || typeof body.name !== 'string') {
		return json({ error: 'A product name is required' }, { status: 400 });
	}

	const matches = await matchProduct(body.name, body.supermarket ?? null, 5);
	return json({ matches });
};
