<script lang="ts">
	import { formatCurrency } from '#lib/utils/format';

	let {
		series
	}: {
		series: { label: string; total: number; id: string }[];
	} = $props();

	let max = $derived(Math.max(1, ...series.map((point) => point.total)));
</script>

<div class="flex h-44 items-end gap-2 sm:gap-3">
	{#each series as point (point.id)}
		<div class="group flex h-full min-w-0 flex-1 flex-col items-center justify-end gap-2">
			<span class="pointer-events-none text-[10px] font-bold tabular-nums opacity-0 transition group-hover:opacity-80">
				{formatCurrency(point.total)}
			</span>
			<div
				class="w-full max-w-10 rounded-t-md bg-linear-to-t from-primary-600 to-primary-400 transition-all duration-300 group-hover:from-primary-700 group-hover:to-primary-300"
				style="height: {Math.max(5, (point.total / max) * 100)}%"
				title={`${point.label}: ${formatCurrency(point.total)}`}
			></div>
			<span class="truncate text-[10px] font-medium opacity-55">{point.label}</span>
		</div>
	{:else}
		<p class="m-auto text-sm opacity-50">No shops yet.</p>
	{/each}
</div>
