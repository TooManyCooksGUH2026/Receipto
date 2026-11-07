import { getDashboardData } from '#lib/server/queries';
import { getLocationContext } from '#lib/server/location';
import type { PageServerLoad } from './$types';

export const load: PageServerLoad = async ({ locals }) => {
	const { shopIds } = await getLocationContext(locals.user!.id);
	const data = await getDashboardData(locals.user!.id, shopIds);
	const hour = new Date().getHours();
	const greeting = hour < 12 ? 'Good morning' : hour < 18 ? 'Good afternoon' : 'Good evening';
	return { ...data, greeting };
};
