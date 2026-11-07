import { error } from '@sveltejs/kit';
import { getShopDetails } from '#lib/server/queries';
import type { PageServerLoad } from './$types';

export const load: PageServerLoad = async ({ params }) => {
	const id = Number(params.id);
	if (!Number.isInteger(id) || id <= 0) error(404, 'Shop not found');
	const data = await getShopDetails(id);
	if (!data) error(404, 'Shop not found');
	return data;
};
