const STOP_WORDS = new Set([
	'the',
	'a',
	'an',
	'and',
	'with',
	'of',
	'fresh',
	'large',
	'medium',
	'ready',
	'to',
	'eat',
	'pack',
	'each',
	'approx',
	'free',
	'range',
	'own',
	'brand',
	'specially',
	'selected',
	'extra',
	'value',
	'everyday',
	'essential',
	'essentials',
	'basics',
	'finest',
	'taste',
	'the',
	'difference',
	'classic',
	'original'
]);

const ABBREVIATIONS: Record<string, string> = {
	choc: 'chocolate',
	chkn: 'chicken',
	chse: 'cheese',
	brd: 'bread',
	whlmlk: 'wholemeal',
	whl: 'whole',
	mlk: 'milk',
	org: 'organic',
	semi: 'semiskimmed',
	skim: 'skimmed',
	veg: 'vegetable',
	frz: 'frozen',
	sltd: 'salted',
	sl: 'salted',
	unslt: 'unsalted',
	swt: 'sweet',
	crn: 'corn',
	tom: 'tomato',
	toms: 'tomatoes',
	pot: 'potato',
	pots: 'potatoes',
	chick: 'chicken',
	breast: 'breast',
	flts: 'fillets',
	fillet: 'fillets',
	saus: 'sausages',
	snck: 'snack',
	drk: 'drink',
	cln: 'cleaner',
	wsh: 'wash',
	liq: 'liquid',
	dsh: 'dish',
	tbl: 'tablet',
	tbls: 'tablets',
	rll: 'roll',
	rl: 'roll',
	pk: 'pack',
	pck: 'pack',
	x: ' ',
	coop: 'coop',
	'co-op': 'coop',
	sainsburys: 'sainsburys',
	sainburys: 'sainsburys',
	's/bd': 'sainsburys',
	morrisons: 'morrisons',
	morr: 'morrisons',
	tesco: 'tesco',
	asda: 'asda',
	aldi: 'aldi',
	lidl: 'lidl',
	waitrose: 'waitrose',
	wait: 'waitrose',
	iceland: 'iceland',
	ms: 'marksandspencer',
	'm&s': 'marksandspencer'
};

export function normaliseName(value: string): string {
	return value
		.toLowerCase()
		.replace(/[£@*#]/g, ' ')
		.replace(/(\d+)\s*(?:x|@)\s*/g, ' ')
		.replace(/\b\d+(?:\.\d+)?\s*(?:kg|g|ml|l|cl|pack|pcs|each)\b/g, ' ')
		.replace(/[^a-z0-9\s]/g, ' ')
		.split(/\s+/)
		.map((token) => ABBREVIATIONS[token] ?? token)
		.filter((token) => token && !STOP_WORDS.has(token))
		.join(' ')
		.trim();
}

export function tokenSet(value: string): Set<string> {
	return new Set(normaliseName(value).split(/\s+/).filter(Boolean));
}

export function diceCoefficient(a: string, b: string): number {
	const left = normaliseName(a);
	const right = normaliseName(b);
	if (!left || !right) return 0;
	if (left === right) return 1;
	if (left.length < 2 || right.length < 2) return left === right ? 1 : 0;
	const bigrams = (value: string) => {
		const set = new Map<string, number>();
		for (let i = 0; i < value.length - 1; i++) {
			const gram = value.slice(i, i + 2);
			set.set(gram, (set.get(gram) ?? 0) + 1);
		}
		return set;
	};
	const aGrams = bigrams(left);
	const bGrams = bigrams(right);
	let overlap = 0;
	for (const [gram, count] of aGrams) {
		const other = bGrams.get(gram) ?? 0;
		overlap += Math.min(count, other);
	}
	const total = left.length - 1 + (right.length - 1);
	return total > 0 ? (2 * overlap) / total : 0;
}

export function tokenOverlap(a: string, b: string): number {
	const left = tokenSet(a);
	const right = tokenSet(b);
	if (!left.size || !right.size) return 0;
	let overlap = 0;
	for (const token of left) {
		if (right.has(token)) overlap++;
	}
	return overlap / Math.max(left.size, right.size);
}

/** Combined score in the range 0..1, biased towards exact tokens. */
export function matchScore(query: string, candidate: string): number {
	const normalisedQuery = normaliseName(query);
	const normalisedCandidate = normaliseName(candidate);
	if (!normalisedQuery || !normalisedCandidate) return 0;
	if (normalisedQuery === normalisedCandidate) return 1;
	const dice = diceCoefficient(query, candidate);
	const overlap = tokenOverlap(query, candidate);
	const substring =
		normalisedCandidate.includes(normalisedQuery) || normalisedQuery.includes(normalisedCandidate)
			? 0.18
			: 0;
	return Math.min(1, dice * 0.62 + overlap * 0.3 + substring);
}
