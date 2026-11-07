<script lang="ts">
	import { formatCurrency } from '#lib/utils/format';
	import { ChevronRight, PackageSearch, Search, SlidersHorizontal } from 'lucide-svelte';
	import type { PageProps } from './$types';

	let { data }: PageProps = $props();
</script>

<svelte:head>
	<title>Products · Receipto</title>
</svelte:head>

<div class="space-y-6">
	<header class="rise-in">
		<h1 class="text-3xl font-extrabold tracking-tight sm:text-4xl">Products</h1>
	</header>

	<section class="surface-card rounded-2xl p-3">
		<form method="GET" class="flex flex-col gap-2 sm:flex-row">
			<label class="input flex-1">
				<Search size={17} class="opacity-55" />
				<input
					type="search"
					name="q"
					value={data.q}
					placeholder="Search a product or brand"
					class="w-full bg-transparent outline-none"
				/>
			</label>
			{#if data.category}
				<input type="hidden" name="category" value={data.category} />
			{/if}
			<button type="submit" class="btn preset-filled-primary-500 gap-2">
				<SlidersHorizontal size={16} /> Search
			</button>
		</form>
	</section>

	<div class="flex flex-wrap gap-2">
		<a
			href={`/products${data.q ? `?q=${encodeURIComponent(data.q)}` : ''}`}
			class="badge {data.category ? 'preset-tonal-surface' : 'preset-filled-primary-500'} px-3 py-1.5"
		>
			All
		</a>
		{#each data.categories as category (category.category)}
			{@const href = `/products?category=${encodeURIComponent(category.category)}${data.q ? `&q=${encodeURIComponent(data.q)}` : ''}`}
			<a
				{href}
				class="badge {data.category === category.category ? 'preset-filled-primary-500' : 'preset-tonal-surface'} px-3 py-1.5"
			>
				{category.category}
				<span class="opacity-55">{category.count}</span>
			</a>
		{/each}
	</div>

	{#if data.classes.length}
		<div class="grid gap-3 sm:grid-cols-2 xl:grid-cols-3">
			{#each data.classes as cls (cls.id)}
				<a
					href={`/products/classes/${cls.id}`}
					class="surface-card group flex flex-col rounded-2xl p-4 transition hover:-translate-y-0.5 hover:border-primary-400/50 hover:shadow-xl"
				>
					<div class="flex items-start gap-3">
						<span class="grid h-12 w-12 shrink-0 place-items-center rounded-xl bg-surface-200/60 text-2xl dark:bg-surface-800">
							{cls.icon ?? '🛒'}
						</span>
						<div class="min-w-0 flex-1">
							<p class="truncate text-sm font-extrabold">{cls.name}</p>
							<p class="mt-1 text-[10px] font-bold uppercase tracking-wide text-primary-700 dark:text-primary-300">
								{cls.category}
							</p>
						</div>
						<ChevronRight size={16} class="mt-1 shrink-0 opacity-25 transition group-hover:translate-x-0.5 group-hover:opacity-70" />
					</div>

					<div class="mt-3 flex flex-wrap items-center gap-1">
						<span class="mr-0.5 text-[9px] font-bold uppercase tracking-wide opacity-40">Own brand</span>
						{#each cls.ownBrand.slice(0, 5) as variant (variant.id)}
							<span class="badge preset-tonal-surface text-[9px]">{variant.supermarket}</span>
						{/each}
						{#if cls.branded.length}
							<span class="badge preset-tonal-primary text-[9px]">{cls.branded.length} branded</span>
						{/if}
					</div>

					<div class="mt-4 flex items-end justify-between gap-2 border-t border-surface-200/60 pt-3 dark:border-surface-800">
						<div>
							<p class="text-[10px] opacity-50">From</p>
							<p class="text-lg font-extrabold tabular-nums">
								{cls.cheapest !== null ? formatCurrency(cls.cheapest) : '—'}
							</p>
						</div>
						<p class="text-[10px] opacity-50">{cls.variants.length} items</p>
					</div>
				</a>
			{/each}
		</div>
	{:else}
		<div class="surface-card rounded-2xl p-12 text-center">
			<PackageSearch size={34} class="mx-auto opacity-30" />
			<h2 class="mt-3 text-lg font-extrabold">No products found</h2>
			<a href="/products" class="btn btn-sm preset-filled-primary-500 mt-4">Clear filters</a>
		</div>
	{/if}
</div>
