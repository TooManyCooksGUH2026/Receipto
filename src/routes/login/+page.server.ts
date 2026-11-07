import { redirect } from '@sveltejs/kit';
import type { PageServerLoad } from './$types';

export const load: PageServerLoad = async ({ locals, url }) => {
	if (locals.user) redirect(303, '/dashboard');
	const requested = url.searchParams.get('redirectTo');
	const redirectTo = requested?.startsWith('/') && !requested.startsWith('//') ? requested : '/dashboard';
	return { redirectTo };
};
