import { error } from '@sveltejs/kit';
import { getReceiptComparison } from '#lib/server/receipt-comparison';
import type { PageServerLoad } from './$types';

export const load: PageServerLoad = async ({ params, locals }) => {
	const comparison = await getReceiptComparison(params.id, locals.user!.id);
	if (!comparison) error(404, 'Receipt not found');
	return comparison;
};