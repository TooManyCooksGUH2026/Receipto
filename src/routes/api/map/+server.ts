import { json } from '@sveltejs/kit';
import { getMapData } from '#lib/server/queries';
import { getLocationContext } from '#lib/server/location';
import type { RequestHandler } from './$types';

export const GET: RequestHandler = async ({ url, locals }) => {
	if (!locals.user) return json({ error: 'Unauthorized' }, { status: 401 });

	const raw = url.searchParams.get('productId');
	const productId = raw ? Number(raw) : null;
	if (raw && (!Number.isInteger(productId) || Number(productId) <= 0)) {
		return json({ error: 'Invalid productId' }, { status: 400 });
	}

	const { shopIds } = await getLocationContext(locals.user.id);
	const data = await getMapData(locals.user.id, productId, shopIds);
	return json(data);
};
