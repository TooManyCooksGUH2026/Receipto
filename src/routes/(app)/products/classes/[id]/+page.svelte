<script lang="ts">
	import { formatCurrency } from '#lib/utils/format';
	import { ArrowLeft, ChevronRight, Store } from 'lucide-svelte';
	import type { PageProps } from './$types';

	let { data }: PageProps = $props();

	let allPrices = $derived(
		data.variants
			.map((variant) => variant.stats?.minPrice)
			.filter((price): price is number => typeof price === 'number')
	);
	let cheapest = $derived(allPrices.length ? Math.min(...allPrices) : null);
	let highest = $derived(allPrices.length ? Math.max(...allPrices) : null);
</script>

<svelte:head>
	<title>{data.class.name} · Receipto</title>
</svelte:head>

<div class="space-y-6">
	<a href="/products" class="btn btn-sm preset-tonal-surface gap-1.5">
		<ArrowLeft size={15} /> Products
	</a>

	<header class="surface-card rise-in rounded-2xl p-5 sm:p-6">
		<div class="flex flex-col gap-5 sm:flex-row sm:items-center">
			<div class="grid h-20 w-20 shrink-0 place-items-center rounded-2xl bg-surface-200/60 text-4xl dark:bg-surface-800">
				{data.class.icon ?? '🛒'}
			</div>
			<div class="min-w-0 flex-1">
				<p class="text-xs font-bold uppercase tracking-[0.16em] text-primary-700 dark:text-primary-300">
					{data.class.category}
				</p>
				<h1 class="mt-1 text-3xl font-extrabold tracking-tight">{data.class.name}</h1>
			</div>
			<div class="grid grid-cols-3 gap-3 text-right">
				<div>
					<p class="text-[10px] font-bold uppercase tracking-wide opacity-45">From</p>
					<p class="text-xl font-extrabold tabular-nums">{cheapest !== null ? formatCurrency(cheapest) : '—'}</p>
				</div>
				<div>
					<p class="text-[10px] font-bold uppercase tracking-wide opacity-45">Highest</p>
					<p class="text-xl font-extrabold tabular-nums">{highest !== null ? formatCurrency(highest) : '—'}</p>
				</div>
				<div>
					<p class="text-[10px] font-bold uppercase tracking-wide opacity-45">Items</p>
					<p class="text-xl font-extrabold tabular-nums">{data.variants.length}</p>
				</div>
			</div>
		</div>
	</header>

	{#if data.ownBrand.length}
		<section class="surface-card rounded-2xl p-4 sm:p-5">
			<h2 class="text-lg font-extrabold tracking-tight">Own brand {data.class.name}</h2>
			<div class="mt-3 grid gap-2 sm:grid-cols-2 xl:grid-cols-3">
				{#each data.ownBrand as variant (variant.id)}
					<a
						href={`/products/${variant.id}`}
						class="flex items-center gap-2.5 rounded-xl border border-surface-200/60 p-3 transition hover:border-primary-400/50 hover:bg-primary-500/5 dark:border-surface-800"
					>
						<span class="grid h-10 w-10 shrink-0 place-items-center rounded-lg bg-surface-200/60 text-lg dark:bg-surface-800">
							{data.class.icon ?? '🛒'}
						</span>
						<span class="min-w-0 flex-1">
							<span class="block truncate text-sm font-bold">{variant.itemName}</span>
							<span class="block truncate text-[10px] opacity-50">
								{variant.supermarket}{variant.size ? ` · ${variant.size}` : ''}
							</span>
						</span>
						<span class="text-right">
							<span class="block text-sm font-extrabold tabular-nums">
								{variant.stats?.minPrice !== null && variant.stats?.minPrice !== undefined
									? formatCurrency(variant.stats.minPrice)
									: '—'}
							</span>
							<span class="block text-[9px] opacity-45">{variant.stats?.storeCount ?? 0} stores</span>
						</span>
						<ChevronRight size={14} class="shrink-0 opacity-25" />
					</a>
				{/each}
			</div>
		</section>
	{/if}

	{#if data.branded.length}
		<section class="surface-card rounded-2xl p-4 sm:p-5">
			<h2 class="text-lg font-extrabold tracking-tight">Branded {data.class.name}</h2>
			<div class="mt-3 grid gap-2 sm:grid-cols-2 xl:grid-cols-3">
				{#each data.branded as variant (variant.id)}
					<a
						href={`/products/${variant.id}`}
						class="flex items-center gap-2.5 rounded-xl border border-surface-200/60 p-3 transition hover:border-primary-400/50 hover:bg-primary-500/5 dark:border-surface-800"
					>
						<span class="grid h-10 w-10 shrink-0 place-items-center rounded-lg bg-surface-200/60 text-lg dark:bg-surface-800">
							{data.class.icon ?? '🛒'}
						</span>
						<span class="min-w-0 flex-1">
							<span class="block truncate text-sm font-bold">{variant.itemName}</span>
							<span class="block truncate text-[10px] opacity-50">
								{variant.brand}{variant.size ? ` · ${variant.size}` : ''}
							</span>
						</span>
						<span class="text-right">
							<span class="block text-sm font-extrabold tabular-nums">
								{variant.stats?.minPrice !== null && variant.stats?.minPrice !== undefined
									? formatCurrency(variant.stats.minPrice)
									: '—'}
							</span>
							<span class="block text-[9px] opacity-45">{variant.stats?.storeCount ?? 0} stores</span>
						</span>
						<ChevronRight size={14} class="shrink-0 opacity-25" />
					</a>
				{/each}
			</div>
		</section>
	{:else if !data.ownBrand.length}
		<div class="surface-card rounded-2xl p-8 text-center">
			<Store size={28} class="mx-auto opacity-30" />
			<p class="mt-2 text-sm opacity-55">No products in this category yet.</p>
		</div>
	{/if}
</div>
