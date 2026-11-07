<script lang="ts">
	import { SUPERMARKET_META, type Supermarket } from '#lib/data/catalog';
	import { formatCurrency, formatDate, formatRelative } from '#lib/utils/format';
	import { shopDisplayName } from '#lib/utils/shop-name';
	import {
		ArrowLeft,
		ExternalLink,
		MapPin,
		Search,
		Store,
		Tag
	} from 'lucide-svelte';
	import type { PageProps } from './$types';

	let { data }: PageProps = $props();
	let filter = $state('');

	let filtered = $derived(
		data.prices.filter((item) => {
			const q = filter.trim().toLowerCase();
			if (!q) return true;
			return (
				item.itemName.toLowerCase().includes(q) ||
				item.className.toLowerCase().includes(q) ||
				item.category.toLowerCase().includes(q)
			);
		})
	);

	let colour = $derived(SUPERMARKET_META[data.shop.supermarketName as Supermarket]?.color ?? '#555');
</script>

<svelte:head>
	<title>{data.shop.shopName} · Receipto</title>
</svelte:head>

<div class="space-y-6">
	<div class="flex flex-wrap items-center justify-between gap-3">
		<a href="/map" class="btn btn-sm preset-tonal-surface gap-1.5"><ArrowLeft size={15} /> Price map</a>
		<a
			href={`https://www.openstreetmap.org/?mlat=${data.shop.lat}&mlon=${data.shop.lng}#map=17/${data.shop.lat}/${data.shop.lng}`}
			target="_blank"
			rel="noreferrer"
			class="btn btn-sm preset-tonal-surface gap-1.5"
		>
			<ExternalLink size={15} /> OpenStreetMap
		</a>
	</div>

	<header class="surface-card rise-in overflow-hidden rounded-2xl">
		<div class="h-2 w-full" style={`background:${colour}`}></div>
		<div class="flex flex-col gap-5 p-5 sm:flex-row sm:items-center sm:p-6">
			<div class="grid h-20 w-20 shrink-0 place-items-center rounded-2xl text-2xl font-extrabold text-white" style={`background:${colour}`}>
				{data.shop.supermarketName.slice(0, 2).toUpperCase()}
			</div>
			<div class="min-w-0 flex-1">
				<p class="text-xs font-bold uppercase tracking-[0.16em] opacity-50">{data.shop.supermarketName}</p>
				<h1 class="mt-1 text-3xl font-extrabold tracking-tight">{shopDisplayName(data.shop.shopName, data.shop.area)}</h1>
				<p class="mt-1 flex items-center gap-1.5 text-sm opacity-60">
					<MapPin size={15} /> {data.shop.address ?? `${data.shop.city}, ${data.shop.region}`}
				</p>
			</div>
			<div class="grid grid-cols-3 gap-3 text-right">
				<div>
					<p class="text-[10px] font-bold uppercase tracking-wide opacity-45">Products</p>
					<p class="text-xl font-extrabold tabular-nums">{data.stats.productCount}</p>
				</div>
				<div>
					<p class="text-[10px] font-bold uppercase tracking-wide opacity-45">Avg price</p>
					<p class="text-xl font-extrabold tabular-nums">{formatCurrency(data.stats.avgPrice)}</p>
				</div>
				<div>
					<p class="text-[10px] font-bold uppercase tracking-wide opacity-45">Updated</p>
					<p class="text-sm font-extrabold">{data.stats.updatedAt ? formatRelative(data.stats.updatedAt) : '—'}</p>
				</div>
			</div>
		</div>
	</header>

	<section class="surface-card rounded-2xl p-4 sm:p-5">
		<div class="mb-4 flex flex-col gap-3 sm:flex-row sm:items-center sm:justify-between">
			<div>
				<h2 class="text-lg font-extrabold tracking-tight">Prices</h2>
			</div>
			<label class="input w-full sm:w-72">
				<Search size={16} class="opacity-55" />
				<input type="search" bind:value={filter} placeholder="Filter this store…" class="w-full bg-transparent outline-none" />
			</label>
		</div>

		{#if filtered.length}
			<div class="grid gap-2 sm:grid-cols-2 xl:grid-cols-3">
				{#each filtered as item (item.productId)}
					<a
						href={`/products/${item.productId}`}
						class="flex items-center gap-2.5 rounded-xl border border-surface-200/60 p-2.5 transition hover:border-primary-400/50 hover:bg-primary-500/5 dark:border-surface-800"
					>
						<span class="grid h-9 w-9 shrink-0 place-items-center rounded-lg bg-surface-200/60 text-lg dark:bg-surface-800">{item.icon ?? '🛒'}</span>
						<span class="min-w-0 flex-1">
							<span class="block truncate text-xs font-bold">{item.itemName}</span>
							<span class="block truncate text-[10px] opacity-50">{item.className}{item.size ? ` · ${item.size}` : ''}</span>
						</span>
						<span class="text-sm font-extrabold tabular-nums">{formatCurrency(item.price)}</span>
					</a>
				{/each}
			</div>
		{:else}
			<p class="rounded-xl border border-dashed border-surface-300/70 p-6 text-center text-sm opacity-55 dark:border-surface-700">
				No products.
			</p>
		{/if}
	</section>
</div>
