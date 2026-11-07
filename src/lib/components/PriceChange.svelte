<script lang="ts">
	import { ArrowDownRight, ArrowUpRight, Minus } from 'lucide-svelte';
	import { formatCurrency, formatPercent } from '#lib/utils/format';

	let {
		diff,
		pct,
		label,
		size = 'sm',
		invert = false
	}: {
		diff: number | null;
		pct?: number | null;
		label?: string;
		size?: 'sm' | 'lg';
		invert?: boolean;
	} = $props();

	let direction = $derived(diff === null ? 'flat' : diff > 0.004 ? 'up' : diff < -0.004 ? 'down' : 'flat');
	let good = $derived(direction === 'flat' ? false : invert ? direction === 'up' : direction === 'down');
	let colour = $derived(
		direction === 'flat'
			? 'text-surface-500 dark:text-surface-400'
			: good
				? 'text-success-700 dark:text-success-300'
				: 'text-error-700 dark:text-error-300'
	);
	let bg = $derived(
		direction === 'flat'
			? 'bg-surface-500/10'
			: good
				? 'bg-success-500/12'
				: 'bg-error-500/12'
	);
</script>

{#if diff !== null}
	<span
		class="inline-flex items-center gap-1 rounded-full {bg} {colour} {size === 'lg' ? 'px-2.5 py-1 text-sm' : 'px-2 py-0.5 text-xs'} font-bold"
		title={label}
	>
		{#if direction === 'up'}
			<ArrowUpRight size={size === 'lg' ? 16 : 13} />
		{:else if direction === 'down'}
			<ArrowDownRight size={size === 'lg' ? 16 : 13} />
		{:else}
			<Minus size={size === 'lg' ? 16 : 13} />
		{/if}
		{formatCurrency(Math.abs(diff))}
		{#if pct !== null && pct !== undefined}
			<span class="opacity-65">({formatPercent(pct, { signed: true })})</span>
		{/if}
	</span>
{:else}
	<span class="text-xs opacity-45">First shop</span>
{/if}
