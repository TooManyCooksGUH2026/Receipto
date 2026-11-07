import { redirect } from '@sveltejs/kit';
import { getSidebarData } from '#lib/server/queries';
import { getUserLocation } from '#lib/server/location';
import type { LayoutServerLoad } from './$types';

export const load: LayoutServerLoad = async ({ locals, url }) => {
	if (!locals.user) {
		redirect(303, `/login?redirectTo=${encodeURIComponent(url.pathname + url.search)}`);
	}

	const [sidebar, location] = await Promise.all([
		getSidebarData(locals.user.id),
		getUserLocation(locals.user.id)
	]);

	return {
		user: locals.user,
		sidebar,
		location
	};
};
