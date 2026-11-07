import { getCategoryCounts, getProductClasses } from '#lib/server/queries';
import { getLocationContext } from '#lib/server/location';
import type { PageServerLoad } from './$types';

export const load: PageServerLoad = async ({ url, locals }) => {
	const q = url.searchParams.get('q')?.trim() ?? '';
	const category = url.searchParams.get('category')?.trim() || null;
	const { shopIds } = await getLocationContext(locals.user!.id);
	const [{ classes }, categories] = await Promise.all([
		getProductClasses(q, category, shopIds),
		getCategoryCounts()
	]);
	return { classes, categories, q, category };
};
