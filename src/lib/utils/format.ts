export function toNumber(value: number | string | null | undefined): number {
	if (value === null || value === undefined || value === '') return 0;
	const n = typeof value === 'number' ? value : Number(value);
	return Number.isFinite(n) ? n : 0;
}

export function formatCurrency(value: number | string | null | undefined): string {
	const n = toNumber(value);
	return new Intl.NumberFormat('en-GB', {
		style: 'currency',
		currency: 'GBP',
		minimumFractionDigits: 2,
		maximumFractionDigits: 2
	}).format(n);
}

export function formatCompactCurrency(value: number | string | null | undefined): string {
	const n = toNumber(value);
	return new Intl.NumberFormat('en-GB', {
		style: 'currency',
		currency: 'GBP',
		notation: n >= 1000 ? 'compact' : 'standard',
		maximumFractionDigits: n >= 100 ? 0 : 2
	}).format(n);
}

export function formatDate(value: Date | string | null | undefined): string {
	if (!value) return '—';
	const date = value instanceof Date ? value : new Date(value);
	if (Number.isNaN(date.getTime())) return '—';
	return new Intl.DateTimeFormat('en-GB', {
		day: 'numeric',
		month: 'short',
		year: 'numeric'
	}).format(date);
}

export function formatShortDate(value: Date | string | null | undefined): string {
	if (!value) return '—';
	const date = value instanceof Date ? value : new Date(value);
	if (Number.isNaN(date.getTime())) return '—';
	return new Intl.DateTimeFormat('en-GB', { day: 'numeric', month: 'short' }).format(date);
}

export function formatRelative(value: Date | string | null | undefined): string {
	if (!value) return '—';
	const date = value instanceof Date ? value : new Date(value);
	if (Number.isNaN(date.getTime())) return '—';
	const diff = Date.now() - date.getTime();
	const days = Math.round(diff / 86_400_000);
	if (days <= 0) return 'Today';
	if (days === 1) return 'Yesterday';
	if (days < 7) return `${days} days ago`;
	if (days < 35) return `${Math.round(days / 7)} weeks ago`;
	return formatDate(date);
}

export function formatPercent(value: number, options: { signed?: boolean } = {}): string {
	const sign = options.signed && value > 0 ? '+' : '';
	return `${sign}${value.toFixed(1)}%`;
}

export function formatUnitPrice(price: number, size: string | null | undefined): string {
	if (!size) return '';
	const match = /^([\d.]+)\s*(kg|g|L|ml|l|pack|each)?/i.exec(size.trim());
	if (!match) return '';
	const amount = Number(match[1]);
	if (!Number.isFinite(amount) || amount <= 0) return '';
	const unit = (match[2] ?? '').toLowerCase();
	if (unit === 'kg') return `${formatCurrency((price / amount) * 1)}/kg`;
	if (unit === 'g') return `${formatCurrency((price / amount) * 1000)}/kg`;
	if (unit === 'l') return `${formatCurrency(price / amount)}/L`;
	if (unit === 'ml') return `${formatCurrency((price / amount) * 1000)}/L`;
	return '';
}

export function titleCase(value: string): string {
	return value
		.toLowerCase()
		.replace(/\b\w/g, (c) => c.toUpperCase())
		.replace(/\bTesco\b/g, 'Tesco');
}

export function initials(name: string | null | undefined): string {
	if (!name) return 'R';
	return name
		.split(/\s+/)
		.filter(Boolean)
		.slice(0, 2)
		.map((part) => part[0]?.toUpperCase() ?? '')
		.join('');
}
