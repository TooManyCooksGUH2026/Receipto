import { json } from '@sveltejs/kit';
import {
	clearUserLocation,
	getUserLocation,
	saveUserLocation
} from '#lib/server/location';
import type { RequestHandler } from './$types';

export const GET: RequestHandler = async ({ locals }) => {
	if (!locals.user) return json({ error: 'Unauthorized' }, { status: 401 });
	return json({ location: await getUserLocation(locals.user.id) });
};

export const POST: RequestHandler = async ({ request, locals }) => {
	if (!locals.user) return json({ error: 'Unauthorized' }, { status: 401 });
	const body = (await request.json().catch(() => null)) as {
		lat?: number;
		lng?: number;
		label?: string | null;
		radiusMiles?: number | null;
	} | null;
	if (!body) return json({ error: 'Invalid request' }, { status: 400 });

	try {
		const location = await saveUserLocation(locals.user.id, {
			lat: Number(body.lat),
			lng: Number(body.lng),
			label: body.label ?? null,
			radiusMiles: body.radiusMiles ?? 5
		});
		return json({ location });
	} catch (error) {
		return json(
			{ error: error instanceof Error ? error.message : 'Could not save location' },
			{ status: 400 }
		);
	}
};

export const DELETE: RequestHandler = async ({ locals }) => {
	if (!locals.user) return json({ error: 'Unauthorized' }, { status: 401 });
	await clearUserLocation(locals.user.id);
	return json({ location: null });
};