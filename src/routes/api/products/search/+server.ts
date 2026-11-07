import { json } from '@sveltejs/kit';
import { searchProducts } from '#lib/server/products';
import { getLocationContext } from '#lib/server/location';
import type { RequestHandler } from './$types';

export const GET: RequestHandler = async ({ url, locals }) => {
	if (!locals.user) return json({ error: 'Unauthorized' }, { status: 401 });

	const q = url.searchParams.get('q')?.trim() ?? '';
	const limit = Math.min(30, Math.max(1, Number(url.searchParams.get('limit') ?? 12)));
	const category = url.searchParams.get('category');
	const { shopIds } = await getLocationContext(locals.user.id);
	const products = await searchProducts(q, limit, shopIds);

	return json({
		products: category ? products.filter((product) => product.category === category) : products
	});
};
