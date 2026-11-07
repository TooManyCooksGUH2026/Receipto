import { getMapData } from '#lib/server/queries';
import { getLocationContext } from '#lib/server/location';
import type { PageServerLoad } from './$types';

export const load: PageServerLoad = async ({ locals, url }) => {
	const raw = url.searchParams.get('product');
	const productId = raw ? Number(raw) : null;
	const { shopIds } = await getLocationContext(locals.user!.id);
	const data = await getMapData(
		locals.user!.id,
		productId && Number.isInteger(productId) ? productId : null,
		shopIds
	);
	return data;
};
