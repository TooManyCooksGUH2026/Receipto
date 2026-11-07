import { error } from '@sveltejs/kit';
import { getProductDetails } from '#lib/server/queries';
import { getLocationContext } from '#lib/server/location';
import type { PageServerLoad } from './$types';

export const load: PageServerLoad = async ({ params, locals }) => {
	const id = Number(params.id);
	if (!Number.isInteger(id) || id <= 0) error(404, 'Product not found');
	const { shopIds } = await getLocationContext(locals.user!.id);
	const data = await getProductDetails(id, locals.user!.id, shopIds);
	if (!data) error(404, 'Product not found');
	return data;
};
