import { GEMMA_API_KEY, GEMMA_BASE_URL, GEMMA_MODEL } from '$app/env/private';
import { parseReceiptText, type ParsedDiscount, type ParsedItem, type ParsedReceipt } from '#lib/utils/receipt-parser';
import { ALL_SUPERMARKETS, type Supermarket } from '#lib/data/catalog';

const DEFAULT_BASE_URL = 'https://openrouter.ai/api/v1';
const DEFAULT_MODEL = 'google/gemma-4-31b-it';
const DEFAULT_TIMEOUT = 45_000;

function configuredKey() {
	const key = (GEMMA_API_KEY ?? '').trim();
	if (!key) return null;
	if (/^(?:replace|your[-_]|placeholder|xxx|changeme)/i.test(key)) return null;
	return key;
}

export function isGemmaConfigured() {
	return configuredKey() !== null;
}

export function gemmaModel() {
	return (GEMMA_MODEL ?? '').trim() || DEFAULT_MODEL;
}

function endpoint() {
	const base = (GEMMA_BASE_URL ?? '').trim() || DEFAULT_BASE_URL;
	if (/\/chat\/completions\/?$/.test(base)) return base;
	return `${base.replace(/\/$/, '')}/chat/completions`;
}

function round(value: number) {
	return Math.round(value * 100) / 100;
}

function toNumber(value: unknown): number | null {
	if (typeof value === 'number' && Number.isFinite(value)) return value;
	if (typeof value === 'string') {
		const parsed = Number(value.replace(/[£,\s]/g, ''));
		return Number.isFinite(parsed) ? parsed : null;
	}
	return null;
}

function asArray(value: unknown): unknown[] {
	if (Array.isArray(value)) return value;
	if (value && typeof value === 'object') return [value];
	return [];
}

function normaliseSupermarket(value: unknown): Supermarket | null {
	if (typeof value !== 'string') return null;
	const cleaned = value
		.toLowerCase()
		.replace(/&/g, 'and')
		.replace(/[^a-z0-9]/g, '');
	const aliases: Record<string, Supermarket> = {
		tesco: 'Tesco',
		sainsburys: "Sainsbury's",
		sainburys: "Sainsbury's",
		asda: 'Asda',
		morrisons: 'Morrisons',
		aldi: 'Aldi',
		lidl: 'Lidl',
		waitrose: 'Waitrose',
		coop: 'Co-op',
		cooperative: 'Co-op',
		ms: 'M&S',
		marksandspencer: 'M&S',
		iceland: 'Iceland'
	};
	if (aliases[cleaned]) return aliases[cleaned];
	for (const supermarket of ALL_SUPERMARKETS) {
		const key = supermarket.toLowerCase().replace(/&/g, 'and').replace(/[^a-z0-9]/g, '');
		if (key && cleaned.includes(key)) return supermarket;
	}
	return null;
}

function normaliseDate(value: unknown, fallback: string): string {
	if (typeof value === 'string') {
		const iso = /^(\d{4})-(\d{2})-(\d{2})$/.exec(value.trim());
		if (iso) {
			const date = new Date(Date.UTC(Number(iso[1]), Number(iso[2]) - 1, Number(iso[3]), 12));
			if (!Number.isNaN(date.getTime())) return date.toISOString();
		}
		const uk = /^(\d{1,2})[/.\-](\d{1,2})[/.\-](\d{2,4})$/.exec(value.trim());
		if (uk) {
			let year = Number(uk[3]);
			if (year < 100) year += year > 70 ? 1900 : 2000;
			const date = new Date(Date.UTC(year, Number(uk[2]) - 1, Number(uk[1]), 12));
			if (!Number.isNaN(date.getTime())) return date.toISOString();
		}
		const parsed = new Date(value);
		if (!Number.isNaN(parsed.getTime())) return parsed.toISOString();
	}
	return fallback;
}

function extractJson(content: string) {
	let text = content.trim();
	if (text.startsWith('```')) {
		text = text.replace(/^```(?:json)?\s*/i, '').replace(/\s*```$/, '');
	}
	try {
		return JSON.parse(text);
	} catch {
		const first = text.indexOf('{');
		const last = text.lastIndexOf('}');
		if (first >= 0 && last > first) {
			return JSON.parse(text.slice(first, last + 1));
		}
		throw new Error('Gemma returned invalid JSON');
	}
}

function readMessageContent(message: unknown): string {
	if (typeof message === 'string') return message;
	if (message && typeof message === 'object') {
		const content = (message as { content?: unknown }).content;
		if (typeof content === 'string') return content;
		if (Array.isArray(content)) {
			return content
				.map((part) =>
					typeof part === 'string'
						? part
						: part && typeof part === 'object' && 'text' in part
							? String((part as { text?: unknown }).text ?? '')
							: ''
				)
				.join('');
		}
	}
	return '';
}

const SYSTEM_PROMPT = `You are a high-accuracy UK supermarket receipt parser. Convert raw OCR text into valid JSON only, no markdown, no explanation.

Return exactly this JSON shape:
{
  "supermarket": "Tesco" | "Sainsbury's" | "Asda" | "Morrisons" | "Aldi" | "Lidl" | "Waitrose" | "Co-op" | "M&S" | "Iceland" | null,
  "purchasedAt": "YYYY-MM-DD" | null,
  "subtotal": number | null,
  "discounts": [{ "name": "string", "amount": number }],
  "total": number | null,
  "items": [{ "name": "string", "price": number, "quantity": number }]
}

Rules:
- "price" is the line total printed for that item, before separate discount lines. It is never a unit price unless that is the only amount printed.
- Quantity comes from "2 x", "2 @", or a quantity column; default 1. If a line says "MILK 2 @ 1.50" and only 1.50 is printed, set price 3.00 and quantity 2.
- Do not put SUBTOTAL, TOTAL, VAT, CASH, CARD, CHANGE, loyalty points, store address, headers, footers, or payment lines in items.
- Put all reductions in "discounts" as positive amounts: Clubcard/Nectar savings, multibuy savings, coupons, vouchers, meal-deal savings, price match, staff discount, etc.
- If a line has a negative amount, move it to discounts instead of items.
- "subtotal" is the printed items subtotal if present, otherwise sum the item prices.
- "total" is the final printed amount due after discounts.
- Use UK day-first dates and output YYYY-MM-DD.
- "supermarket" must be one of the listed values. Infer it from the header; use null if uncertain.
- Keep item names exactly as printed. Do not invent, translate, or merge products.
- Do not include discounts in item prices.
- Return JSON only.`;

export async function parseReceiptWithGemma(ocrText: string): Promise<ParsedReceipt | null> {
	const key = configuredKey();
	if (!key) return null;

	const fallback = parseReceiptText(ocrText);

	const response = await fetch(endpoint(), {
		method: 'POST',
		headers: {
			Authorization: `Bearer ${key}`,
			'Content-Type': 'application/json',
			'HTTP-Referer': 'http://localhost:5173',
			'X-Title': 'Receipto'
		},
		body: JSON.stringify({
			model: gemmaModel(),
			messages: [
				{ role: 'system', content: SYSTEM_PROMPT },
				{ role: 'user', content: `OCR TEXT:\n${ocrText}` }
			],
			temperature: 0,
			max_tokens: 3000
		}),
		signal: AbortSignal.timeout(DEFAULT_TIMEOUT)
	});

	const body = await response.json().catch(() => null);
	if (!response.ok) {
		const message =
			body && typeof body === 'object' && 'error' in body
				? JSON.stringify((body as { error: unknown }).error).slice(0, 300)
				: `HTTP ${response.status}`;
		throw new Error(`Gemma request failed: ${message}`);
	}

	const content = readMessageContent(body?.choices?.[0]?.message);
	if (!content) throw new Error('Gemma returned an empty response');
	const payload = extractJson(content) as Record<string, unknown>;

	const rawItems = asArray(
		payload.items ?? payload.lineItems ?? payload.products ?? payload.purchases
	);
	const rawDiscounts = asArray(
		payload.discounts ?? payload.savings ?? payload.reductions ?? payload.discountLines
	);

	const items: ParsedItem[] = [];
	const discounts: ParsedDiscount[] = [];

	for (const raw of rawItems.slice(0, 120)) {
		if (!raw || typeof raw !== 'object') continue;
		const item = raw as Record<string, unknown>;
		const name = String(
			item.name ?? item.description ?? item.item ?? item.product ?? item.title ?? ''
		).trim();
		const price = toNumber(item.price ?? item.total ?? item.amount ?? item.lineTotal);
		const quantity = Math.max(
			1,
			Math.min(99, toNumber(item.quantity ?? item.qty) ?? 1)
		);
		if (!name || price === null) continue;
		// A model may ignore the instruction and put a reduction in items.
		const looksLikeDiscount =
			/^(?:clubcard|nectar|multi-?buy|promo(?:tion)?|coupon|voucher|savings?|discount|price\s+match|price\s+promise)\b/i.test(
				name
			);
		if (price < 0 || looksLikeDiscount) {
			discounts.push({ name, amount: round(Math.abs(price)) });
			continue;
		}
		if (price > 500) continue;
		items.push({ name, price: round(price), quantity });
	}

	const discountFromTotal = toNumber(
		payload.discountTotal ?? payload.totalDiscount ?? payload.savingTotal
	);
	if (!discounts.length && discountFromTotal !== null && discountFromTotal > 0) {
		discounts.push({ name: 'Discounts', amount: round(Math.abs(discountFromTotal)) });
	}

	for (const raw of rawDiscounts.slice(0, 40)) {
		if (typeof raw === 'number') {
			if (raw > 0) discounts.push({ name: 'Discount', amount: round(raw) });
			continue;
		}
		if (!raw || typeof raw !== 'object') continue;
		const discount = raw as Record<string, unknown>;
		const name = String(
			discount.name ?? discount.description ?? discount.label ?? 'Discount'
		).trim();
		const amount = toNumber(
			discount.amount ?? discount.value ?? discount.price ?? discount.total
		);
		if (amount !== null && Math.abs(amount) > 0) {
			discounts.push({ name: name || 'Discount', amount: round(Math.abs(amount)) });
		}
	}

	if (!items.length) {
		// A structurally valid response without products is not useful; use the
		// deterministic parser instead.
		return null;
	}

	const itemSubtotal = round(items.reduce((sum, item) => sum + item.price, 0));
	const discountTotal = round(discounts.reduce((sum, discount) => sum + discount.amount, 0));
	const expectedTotal = round(itemSubtotal - discountTotal);
	const payloadSubtotal = toNumber(payload.subtotal ?? payload.subTotal ?? payload.itemsTotal);
	const payloadTotal = toNumber(payload.total ?? payload.amountDue ?? payload.grandTotal);
	const total = payloadTotal ?? expectedTotal;
	const subtotal = payloadSubtotal ?? itemSubtotal;
	const warnings: string[] = [];

	if (payloadTotal !== null && Math.abs(payloadTotal - expectedTotal) > 0.02) {
		warnings.push(
			`Gemma items £${itemSubtotal.toFixed(2)} − discounts £${discountTotal.toFixed(2)} = £${expectedTotal.toFixed(2)}, but the printed total is £${payloadTotal.toFixed(2)}.`
		);
	}
	if (!fallback.supermarket && !normaliseSupermarket(payload.supermarket)) {
		warnings.push('Supermarket not recognised — choose the store manually.');
	}

	return {
		supermarket:
			normaliseSupermarket(payload.supermarket ?? payload.store ?? payload.retailer) ??
			fallback.supermarket,
		purchasedAt: normaliseDate(payload.purchasedAt ?? payload.date, fallback.purchasedAt),
		subtotal,
		discountTotal,
		discounts,
		expectedTotal,
		total,
		items,
		rawText: ocrText,
		warnings
	};
}