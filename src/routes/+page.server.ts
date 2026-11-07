import { redirect } from '@sveltejs/kit';
import { getLandingStats } from '#lib/server/queries';
import type { PageServerLoad } from './$types';

export const load: PageServerLoad = async ({ locals }) => {
	if (locals.user) redirect(303, '/dashboard');
	const stats = await getLandingStats();
	return { stats };
};
