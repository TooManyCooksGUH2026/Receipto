import { error } from '@sveltejs/kit';
import { getProductClassDetails } from '#lib/server/queries';
import { getLocationContext } from '#lib/server/location';
import type { PageServerLoad } from './$types';

export const load: PageServerLoad = async ({ params, locals }) => {
	const id = Number(params.id);
	if (!Number.isInteger(id) || id <= 0) error(404, 'Category not found');
	const { shopIds } = await getLocationContext(locals.user!.id);
	const data = await getProductClassDetails(id, shopIds);
	if (!data) error(404, 'Category not found');
	return data;
};
