import { ALL_SUPERMARKETS, type Supermarket } from '#lib/data/catalog';

export type ParsedItem = {
	name: string;
	price: number;
	quantity: number;
};

export type ParsedDiscount = {
	name: string;
	amount: number;
};

export type ParsedReceipt = {
	supermarket: Supermarket | null;
	purchasedAt: string;
	subtotal: number | null;
	discountTotal: number;
	discounts: ParsedDiscount[];
	expectedTotal: number | null;
	total: number | null;
	items: ParsedItem[];
	rawText: string;
	warnings: string[];
};

const SUPERMARKET_PATTERNS: [Supermarket, RegExp][] = [
	['Tesco', /\btesco\b/i],
	["Sainsbury's", /sainsbury|s\/bd|sainbury/i],
	['Asda', /\basda\b/i],
	['Morrisons', /\bmorrison/i],
	['Aldi', /\baldi\b/i],
	['Lidl', /\blidl\b/i],
	['Waitrose', /\bwaitrose\b/i],
	['Co-op', /co-?op|cooperative/i],
	['M&S', /marks\s*(?:&|and)?\s*spencer|\bm&s\b/i],
	['Iceland', /\biceland\b/i]
];

const MONTHS: Record<string, number> = {
	jan: 0,
	feb: 1,
	mar: 2,
	apr: 3,
	may: 4,
	jun: 5,
	jul: 6,
	aug: 7,
	sep: 8,
	sept: 8,
	oct: 9,
	nov: 10,
	dec: 11
};

const EXCLUDED = [
	/\btotal\b/i,
	/\bsub\s*-?\s*total\b/i,
	/\bamount\s+due\b/i,
	/\bbalance\b/i,
	/\bto\s+pay\b/i,
	/\bvat\b/i,
	/\btax\b/i,
	/\bchange\b/i,
	/\bcash\b/i,
	/\bcard\b/i,
	/\bvisa\b/i,
	/\bmastercard\b/i,
	/\bamex\b/i,
	/\bpayment\b/i,
	/\bpaid\b/i,
	/\bcontactless\b/i,
	/\bloyalty\b/i,
	/\bclubcard\b/i,
	/\bnectar\b/i,
	/\breceipt\b/i,
	/\btill\b/i,
	/\bcashier\b/i,
	/\boperator\b/i,
	/\bstore\b/i,
	/\bthank\s+you\b/i,
	/\bsavings?\b/i,
	/\bdiscount\b/i,
	/\bcoupon\b/i,
	/\bpoints?\b/i,
	/\bdelivery\b/i,
	/\brefund\b/i,
	/\bdeposit\b/i,
	/\bvat\s*(?:no|number|reg)\b/i,
	/\bwww\b/i,
	/\bhttps?\b/i,
	/\bphone\b/i,
	/\btel\b/i,
	/\bdate\b/i,
	/\btime\b/i,
	/\baddress\b/i,
	/\bopening\b/i,
	/\bself\s*checkout\b/i,
	/\bbag\s+charge\b/i,
	/\bcarrier\s+bag\b/i
];

const ADDRESS_LINE =
	/\b(?:road|street|st\.?|avenue|ave|lane|drive|close|way|place|square|retail park|centre|center|unit|tel|phone|www|http)\b/i;

const STORE_HEADER =
	/^(?:lidl|aldi|tesco|asda|morrisons|sainsbury'?s|sainsburys|waitrose|co-?op|coop|m&s|marks\s*&?\s*spencer|iceland)(?:\s+(?:stores?|ltd|limited|supermarket|food|foodhall|express|extra|superstore|local|metro|retail|plc|simply|high|street|road))*$/i;

// Lines that describe a reduction rather than a product. Negative amounts are
// always treated as discounts; these phrases catch receipts that print the
// reduction as a positive number.
const DISCOUNT_PHRASE =
	/\b(?:savings?|discounts?|coupons?|vouchers?|bogof|promo(?:tion)?|price\s+match|price\s+promise)\b|\bclubcard\s+(?:savings?|discount)\b|\bnectar\s+(?:savings?|discount)\b|\bmulti-?buy\s+(?:savings?|discount)\b/i;

const PAYMENT_LINE = /\b(?:cash|card|visa|mastercard|amex|payment|change|paid|contactless)\b/i;

function cleanLine(line: string) {
	return line
		.replace(/\s+/g, ' ')
		.replace(/^[\s*|]+|[\s*|]+$/g, '')
		.trim();
}

function extractAmounts(line: string): number[] {
	const amounts: number[] = [];
	const regex = /(?:£\s*)?(\d{1,4}(?:,\d{3})*\.\d{2})(?:\s*[A-Z*])?/g;
	let match: RegExpExecArray | null;
	while ((match = regex.exec(line))) {
		amounts.push(Number(match[1].replace(/,/g, '')));
	}
	return amounts;
}

function hasNegativeAmount(line: string) {
	return /(?:^|[\s(])-\s*£?\s*\d{1,4}(?:,\d{3})*\.\d{2}|(?:^|[\s(])£?\s*\d{1,4}(?:,\d{3})*\.\d{2}\s*-/.test(
		line
	);
}

function isDiscountLine(line: string) {
	if (!extractAmounts(line).length) return false;
	if (PAYMENT_LINE.test(line)) return false;
	return hasNegativeAmount(line) || DISCOUNT_PHRASE.test(line);
}

function isExcluded(line: string): boolean {
	return EXCLUDED.some((pattern) => pattern.test(line));
}

function detectSupermarket(text: string): Supermarket | null {
	for (const [name, pattern] of SUPERMARKET_PATTERNS) {
		if (pattern.test(text)) return name;
	}
	// Some receipts print a store number before the brand; fall back to a
	// fuzzy check of the first few lines.
	const head = text.split('\n').slice(0, 8).join(' ');
	for (const name of ALL_SUPERMARKETS) {
		if (head.toLowerCase().includes(name.toLowerCase().replace("'s", ''))) return name;
	}
	return null;
}

function detectDate(text: string): string {
	const now = new Date();
	const lines = text.split('\n').slice(0, 30);

	for (const line of lines) {
		const dmy = /\b(\d{1,2})[\/.\-](\d{1,2})[\/.\-](\d{2,4})\b/.exec(line);
		if (dmy) {
			let day = Number(dmy[1]);
			let month = Number(dmy[2]) - 1;
			let year = Number(dmy[3]);
			if (year < 100) year += year > 70 ? 1900 : 2000;
			// UK receipts are day-first. Swap only when the first value cannot
			// be a day but the second can.
			if (day > 31 && month + 1 <= 31) {
				[day, month] = [month + 1, day - 1];
			}
			const date = new Date(Date.UTC(year, month, day, 12));
			if (!Number.isNaN(date.getTime()) && date.getTime() <= now.getTime() + 86_400_000) {
				return date.toISOString();
			}
		}

		const iso = /\b(\d{4})-(\d{2})-(\d{2})\b/.exec(line);
		if (iso) {
			const date = new Date(Date.UTC(Number(iso[1]), Number(iso[2]) - 1, Number(iso[3]), 12));
			if (!Number.isNaN(date.getTime())) return date.toISOString();
		}

		const named = /\b(\d{1,2})\s+([A-Za-z]{3,9})\s+(\d{2,4})\b/.exec(line);
		if (named) {
			const month = MONTHS[named[2].toLowerCase().slice(0, 3)];
			if (month !== undefined) {
				let year = Number(named[3]);
				if (year < 100) year += year > 70 ? 1900 : 2000;
				const date = new Date(Date.UTC(year, month, Number(named[1]), 12));
				if (!Number.isNaN(date.getTime())) return date.toISOString();
			}
		}
	}

	return now.toISOString();
}

function detectSubtotal(lines: string[]): number | null {
	let subtotal: number | null = null;
	for (const line of lines) {
		if (
			/\bsub\s*-?\s*total\b/i.test(line) ||
			/\btotal\s+(?:before|excluding)\s+(?:savings|discounts?|offers?)\b/i.test(line)
		) {
			const amounts = extractAmounts(line);
			if (amounts.length) subtotal = amounts[amounts.length - 1];
		}
	}
	return subtotal;
}

function detectTotal(lines: string[]): number | null {
	let total: number | null = null;
	for (let i = 0; i < lines.length; i++) {
		const line = lines[i];
		if (/\bsub\s*-?\s*total\b/i.test(line)) continue;
		if (/\b(?:savings?|discount|vat|items?|points?)\b/i.test(line)) continue;
		if (/\b(total|amount\s+due|balance\s+due|to\s+pay|grand\s+total)\b/i.test(line)) {
			const amounts = extractAmounts(line);
			if (amounts.length) total = amounts[amounts.length - 1];
			else if (i + 1 < lines.length) {
				const next = extractAmounts(lines[i + 1]);
				if (next.length) total = next[next.length - 1];
			}
		}
	}
	return total;
}

function extractQuantity(line: string): number {
	const at = /(\d+(?:\.\d+)?)\s*(?:x|@)\s*£?\s*\d+(?:\.\d{2})?/i.exec(line);
	if (at) {
		const quantity = Number(at[1]);
		if (quantity > 0 && quantity <= 50) return quantity;
	}
	const trailing = /[xX]\s*(\d{1,2})\b/.exec(line);
	if (trailing) {
		const quantity = Number(trailing[1]);
		if (quantity > 0 && quantity <= 50) return quantity;
	}
	return 1;
}

function cleanItemName(raw: string): string {
	return raw
		.replace(/^\s*\d{2,6}\s+/, '')
		.replace(/^\s*(?:\d+(?:\.\d+)?)\s*(?:x|@)\s*/i, '')
		.replace(/\s+\d+(?:\.\d+)?\s*(?:x|@)\s*$/i, '')
		.replace(/\s+[@*]+$/g, '')
		.replace(/\s+[A-Z]\s*$/g, '')
		.replace(/\s{2,}/g, ' ')
		.replace(/^[\s\-–—*|]+|[\s\-–—*|]+$/g, '')
		.trim();
}

function isPlausibleName(name: string): boolean {
	if (name.length < 2 || name.length > 80) return false;
	if (!/[A-Za-z]{2}/.test(name)) return false;
	if (ADDRESS_LINE.test(name)) return false;
	if (isExcluded(name)) return false;
	if (/^[\d\s.,£]+$/.test(name)) return false;
	return true;
}

function parseItems(lines: string[]): ParsedItem[] {
	const items: ParsedItem[] = [];
	let pending = '';

	for (const rawLine of lines) {
		const line = cleanLine(rawLine);
		if (!line) continue;

		if (isDiscountLine(line) || isExcluded(line)) {
			pending = '';
			continue;
		}

		const amounts = extractAmounts(line);
		if (!amounts.length) {
			if (STORE_HEADER.test(line) && !/\d/.test(line)) {
				pending = '';
				continue;
			}
			if (isPlausibleName(line)) {
				// A product name split over two lines: keep the most recent
				// plausible fragment.
				pending = line;
			}
			continue;
		}

		const quantity = extractQuantity(line);
		let price = amounts[amounts.length - 1];
		// Some receipts print only the unit price for a multi-buy line:
		// "MILK 2 @ 1.50". In that case the line total is quantity × unit price.
		const unitPrice = /(\d+(?:\.\d+)?)\s*(?:x|@)\s*£?\s*(\d+\.\d{2})\s*$/i.exec(line);
		if (unitPrice && amounts.length === 1) {
			price = Math.round(Number(unitPrice[1]) * Number(unitPrice[2]) * 100) / 100;
		}
		if (!(price > 0 && price < 300)) {
			pending = '';
			continue;
		}

		const lastAmountIndex = line.lastIndexOf(amounts[amounts.length - 1].toFixed(2));
		let namePart =
			lastAmountIndex >= 0
				? line.slice(0, lastAmountIndex)
				: line.replace(/(?:£\s*)?\d+(?:\.\d{2})\s*[A-Z*]?\s*$/, '');

		// Remove a trailing unit price / weight block, e.g. "£1.50/kg".
		namePart = namePart.replace(/£?\d+(?:\.\d{2})?\s*\/\s*(?:kg|g|l|ml)\s*$/i, '');
		namePart = cleanItemName(namePart);

		if (namePart.length < 2 && pending) {
			namePart = cleanItemName(pending);
		} else if (pending && namePart.length < 12) {
			const combined = cleanItemName(`${pending} ${namePart}`);
			if (combined.length <= 80) namePart = combined;
		}

		pending = '';

		if (!isPlausibleName(namePart)) continue;

		// Avoid obvious header/footer totals that slipped through.
		if (/^(total|subtotal|balance|amount|card|cash|change|vat)$/i.test(namePart)) continue;

		items.push({
			name: namePart,
			price: Math.round(price * 100) / 100,
			quantity
		});
	}

	return items;
}

function cleanDiscountName(line: string): string {
	return cleanItemName(
		line
			.replace(/(?:£\s*)?\d{1,4}(?:,\d{3})*\.\d{2}(?:\s*[A-Z*])?/g, ' ')
			.replace(/£/g, ' ')
			.replace(/\b(?:total|subtotal)\b/gi, ' ')
	)
		.replace(/\s+/g, ' ')
		.trim()
		.slice(0, 60) || 'Discount';
}

type DiscountCandidate = {
	discount: ParsedDiscount;
	definite: boolean;
};

function parseDiscountCandidates(lines: string[]): DiscountCandidate[] {
	const candidates: DiscountCandidate[] = [];
	const seen = new Set<string>();

	for (const rawLine of lines) {
		const line = cleanLine(rawLine);
		if (!line || !isDiscountLine(line)) continue;
		const amounts = extractAmounts(line);
		if (!amounts.length) continue;
		const amount = amounts[amounts.length - 1];
		if (!(amount > 0 && amount < 300)) continue;
		const name = cleanDiscountName(line);
		const key = `${name.toLowerCase()}|${amount.toFixed(2)}`;
		if (seen.has(key)) continue;
		seen.add(key);
		candidates.push({
			discount: { name, amount: Math.round(amount * 100) / 100 },
			definite: hasNegativeAmount(line)
		});
	}

	return candidates;
}

function round(value: number) {
	return Math.round(value * 100) / 100;
}

function sumDiscounts(discounts: ParsedDiscount[]) {
	return round(discounts.reduce((sum, discount) => sum + discount.amount, 0));
}

export function parseReceiptText(text: string): ParsedReceipt {
	const normalised = text.replace(/\r/g, '').replace(/\u00a0/g, ' ');
	const lines = normalised.split('\n').map(cleanLine).filter(Boolean);
	const warnings: string[] = [];

	const supermarket = detectSupermarket(normalised);
	if (!supermarket) warnings.push('Supermarket not recognised — choose the store manually.');

	const items = parseItems(lines);
	const printedSubtotal = detectSubtotal(lines);
	const printedTotal = detectTotal(lines);
	const candidates = parseDiscountCandidates(lines);
	const negativeDiscounts = candidates.filter((candidate) => candidate.definite).map((candidate) => candidate.discount);
	const positiveDiscounts = candidates.filter((candidate) => !candidate.definite).map((candidate) => candidate.discount);
	const allDiscounts = [...negativeDiscounts, ...positiveDiscounts];
	const itemSubtotal = round(items.reduce((sum, item) => sum + item.price, 0));

	// Reconcile item subtotal, discounts and printed total. Receipts vary:
	// some print savings after the total (informational), some itemise the
	// reduction as a negative line, and some already net it into item prices.
	let discounts: ParsedDiscount[] = [];
	if (printedTotal !== null && itemSubtotal > 0) {
		const possibilities = [
			{ label: 'none', list: [] as ParsedDiscount[] },
			{ label: 'negative', list: negativeDiscounts },
			{ label: 'all', list: allDiscounts },
			{ label: 'positive', list: positiveDiscounts }
		];
		const matched = possibilities.find(
			(possibility) =>
				Math.abs(round(itemSubtotal - sumDiscounts(possibility.list) - printedTotal)) <= 0.02
		);
		discounts = matched ? matched.list : negativeDiscounts.length ? negativeDiscounts : positiveDiscounts;
	} else {
		discounts = negativeDiscounts.length ? negativeDiscounts : positiveDiscounts;
	}

	const discountTotal = sumDiscounts(discounts);
	const expectedTotal = itemSubtotal > 0 ? round(itemSubtotal - discountTotal) : null;
	const total =
		printedTotal ?? (expectedTotal !== null && expectedTotal > 0 ? expectedTotal : null);

	if (!items.length) warnings.push('No line items found. Try a sharper photo or paste the receipt text.');
	if (printedTotal === null && expectedTotal !== null && expectedTotal > 0) {
		warnings.push('Total not found on the receipt — using items minus discounts.');
	}
	if (printedTotal !== null && expectedTotal !== null && Math.abs(printedTotal - expectedTotal) > 0.02) {
		warnings.push(
			`Items £${itemSubtotal.toFixed(2)} − discounts £${discountTotal.toFixed(2)} = £${expectedTotal.toFixed(2)}, but the printed total is £${printedTotal.toFixed(2)}.`
		);
	}

	return {
		supermarket,
		purchasedAt: detectDate(normalised),
		subtotal: printedSubtotal ?? (itemSubtotal > 0 ? itemSubtotal : null),
		discountTotal,
		discounts,
		expectedTotal,
		total,
		items,
		rawText: normalised,
		warnings
	};
}

export const SAMPLE_RECEIPT = `TESCO STORES LTD
TESCO EXTRA
119 High Street, London
Tel: 020 7946 0123
VAT No: GB 123 4567 89

Date: 03/11/2026  Time: 18:42
Till: 04  Cashier: 2178
Clubcard points this visit: 46

TESCO WHITE BREAD 800G           1.15
TESCO SEMI-SKIMMED MILK 2L       1.45
FREE RANGE EGGS 6 PACK           2.20
BANANAS 1KG                      1.15
TESCO MATURE CHEDDAR 400G        3.60
HEINZ BAKED BEANS 415G           1.40
TESCO PENNE PASTA 500G           1.10
NAPOLINA CHOPPED TOMATOES 400G   0.95
TESCO CHICKEN BREAST 600G        4.50
TESCO BASMATI RICE 1KG           2.40
ALPRO OAT MILK 1L                2.40
TESCO FREE RANGE EGGS 6          2.20
TESCO OLIVE OIL 500ML            4.50
TESCO TOILET ROLL 9 PACK         4.50
CADBURY DAIRY MILK 180G          2.50
WALKERS READY SALTED 6 PACK     2.20
2 x TESCO AVOCADOS 2 PACK       3.60
SUBTOTAL                        41.80
CLUBCARD SAVINGS                 -1.20
TOTAL                           40.60
CARD PAYMENT                    40.60
CHANGE                           0.00
THANK YOU FOR SHOPPING WITH TESCO`;
