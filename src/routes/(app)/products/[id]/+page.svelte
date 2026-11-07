<script lang="ts">
	import Sparkline from '#lib/components/Sparkline.svelte';
	import { SUPERMARKET_META, type Supermarket } from '#lib/data/catalog';
	import { formatCurrency, formatDate, formatRelative } from '#lib/utils/format';
	import {
		ArrowLeft,
		ArrowUpRight,
		Check,
		Clock3,
		MapPin,
		ShoppingBasket,
		Store,
		Tag,
		TrendingDown
	} from 'lucide-svelte';
	import type { PageProps } from './$types';

	let { data }: PageProps = $props();

	let history = $derived([...data.history].reverse());
	let historyValues = $derived(history.map((point) => point.price));
	let cheapest = $derived(data.stores[0] ?? null);
	let highest = $derived(data.stores[data.stores.length - 1] ?? null);
	let ownBrandEquivalents = $derived(data.equivalents.filter((item) => item.isOwnBrand));
	let brandedEquivalents = $derived(data.equivalents.filter((item) => !item.isOwnBrand));
	let chainColour = (chain: string) =>
		SUPERMARKET_META[chain as Supermarket]?.color ?? 'var(--color-surface-500)';
</script>

<svelte:head>
	<title>{data.product.itemName} · Receipto</title>
</svelte:head>

<div class="space-y-6">
	<div class="flex flex-wrap items-center justify-between gap-3">
		<div class="flex flex-wrap gap-2">
			<a href="/products" class="btn btn-sm preset-tonal-surface gap-1.5">
				<ArrowLeft size={15} /> Products
			</a>
			<a href={`/products/classes/${data.product.classId}`} class="btn btn-sm preset-tonal-surface gap-1.5">
				<Tag size={15} /> {data.product.className}
			</a>
		</div>
		<a href={`/map?product=${data.product.id}`} class="btn btn-sm preset-filled-primary-500 gap-1.5">
			<MapPin size={15} /> Show on map
		</a>
	</div>

	<header class="surface-card rise-in rounded-2xl p-5 sm:p-6">
		<div class="flex flex-col gap-5 sm:flex-row sm:items-center">
			<div class="grid h-20 w-20 shrink-0 place-items-center rounded-2xl bg-surface-200/60 text-4xl dark:bg-surface-800">
				{data.product.icon ?? '🛒'}
			</div>
			<div class="min-w-0 flex-1">
				<p class="text-xs font-bold uppercase tracking-[0.16em] text-primary-700 dark:text-primary-300">
					{data.product.category} · {data.product.className}
				</p>
				<h1 class="mt-1 text-3xl font-extrabold tracking-tight">{data.product.itemName}</h1>
				<p class="mt-1 text-sm opacity-55">
					{data.product.brand ?? 'Unbranded'}{data.product.size ? ` · ${data.product.size}` : ''}
					{#if data.product.supermarket} · {data.product.supermarket} own brand{/if}
				</p>
			</div>
			<div class="grid grid-cols-3 gap-3 sm:grid-cols-1 sm:text-right">
				<div>
					<p class="text-[10px] font-bold uppercase tracking-wide opacity-45">Cheapest</p>
					<p class="text-xl font-extrabold tabular-nums text-primary-800 dark:text-primary-200">
						{cheapest ? formatCurrency(cheapest.price) : '—'}
					</p>
				</div>
				<div>
					<p class="text-[10px] font-bold uppercase tracking-wide opacity-45">Highest</p>
					<p class="text-xl font-extrabold tabular-nums">{highest ? formatCurrency(highest.price) : '—'}</p>
				</div>
				<div>
					<p class="text-[10px] font-bold uppercase tracking-wide opacity-45">Stores</p>
					<p class="text-xl font-extrabold tabular-nums">{data.stats?.storeCount ?? 0}</p>
				</div>
			</div>
		</div>
	</header>

	<div class="grid gap-5 xl:grid-cols-[1.5fr_1fr]">
		<section class="surface-card rounded-2xl p-4 sm:p-5">
			<div class="mb-4 flex items-center justify-between">
				<h2 class="text-lg font-extrabold tracking-tight">Price comparison</h2>
				{#if data.stats?.avgPrice !== null && data.stats?.avgPrice !== undefined}
					<span class="badge preset-tonal-surface">avg {formatCurrency(data.stats.avgPrice)}</span>
				{/if}
			</div>

			{#if data.stores.length}
				<div class="overflow-hidden rounded-xl border border-surface-200/70 dark:border-surface-800">
					<table class="table w-full text-sm">
						<thead class="bg-surface-200/40 text-[10px] uppercase tracking-wide dark:bg-surface-800/50">
							<tr>
								<th class="px-3 py-2 text-left">Store</th>
								<th class="hidden px-3 py-2 text-left sm:table-cell">Area</th>
								<th class="px-3 py-2 text-right">Price</th>
								<th class="px-3 py-2 text-right">vs cheapest</th>
							</tr>
						</thead>
						<tbody>
							{#each data.stores as store, index (store.shopId)}
								{@const diff = cheapest ? store.price - cheapest.price : 0}
								<tr class="border-t border-surface-200/60 hover:bg-primary-500/5 dark:border-surface-800">
									<td class="px-3 py-2.5">
										<a href={`/shops/${store.shopId}`} class="flex items-center gap-2">
											<span class="h-2.5 w-2.5 shrink-0 rounded-full" style={`background:${chainColour(store.supermarket)}`}></span>
											<span class="min-w-0">
												<span class="block truncate font-bold">{store.shopName}</span>
											</span>
											{#if index === 0}
												<span class="badge preset-filled-primary-500 ml-1 text-[9px]">Best</span>
											{/if}
										</a>
									</td>
									<td class="hidden px-3 py-2.5 text-xs opacity-60 sm:table-cell">{store.city}</td>
									<td class="px-3 py-2.5 text-right font-extrabold tabular-nums">{formatCurrency(store.price)}</td>
									<td class="px-3 py-2.5 text-right text-xs font-bold tabular-nums {diff > 0 ? 'text-error-700 dark:text-error-300' : 'text-success-700 dark:text-success-300'}">
										{diff > 0 ? `+${formatCurrency(diff)}` : '—'}
									</td>
								</tr>
							{/each}
						</tbody>
					</table>
				</div>
			{:else}
				<p class="rounded-xl border border-dashed border-surface-300/70 p-6 text-center text-sm opacity-55 dark:border-surface-700">
					{data.location
						? 'No prices for this item within your selected radius.'
						: 'No store prices yet. Scan a receipt with this item to start tracking it.'}
				</p>
			{/if}
		</section>

		<div class="space-y-5">
			<section class="surface-card rounded-2xl p-4 sm:p-5">
				<div class="mb-3 flex items-center justify-between">
					<h2 class="text-lg font-extrabold tracking-tight">Price history</h2>
					<TrendingDown size={18} class="text-primary-600 dark:text-primary-300" />
				</div>
				{#if historyValues.length > 1}
					<Sparkline values={historyValues} width={300} height={100} />
					<div class="mt-3 flex items-center justify-between text-[10px] opacity-50">
						<span>{formatDate(history[0].purchasedAt)}</span>
						<span>{formatDate(history[history.length - 1].purchasedAt)}</span>
					</div>
				{:else}
					<p class="text-sm opacity-55">Not enough history yet.</p>
				{/if}
				{#if data.lastUserPurchase}
					<div class="mt-4 rounded-xl bg-primary-500/10 p-3">
						<p class="text-[10px] font-bold uppercase tracking-wide opacity-50">Last purchase</p>
						<div class="mt-1 flex items-center justify-between">
							<p class="text-sm font-extrabold">{formatCurrency(data.lastUserPurchase.price)}</p>
							<p class="text-xs opacity-60">{formatRelative(data.lastUserPurchase.purchasedAt)}</p>
						</div>
					</div>
				{/if}
			</section>

			<section class="surface-card rounded-2xl p-4 sm:p-5">
				<h2 class="text-lg font-extrabold tracking-tight">Recent prices</h2>
				<div class="mt-3 space-y-1.5">
					{#each data.history.slice(0, 6) as point, index (index)}
						<div class="flex items-center gap-2 rounded-lg px-1.5 py-2 hover:bg-surface-200/40 dark:hover:bg-surface-800/40">
							<span class="h-2 w-2 shrink-0 rounded-full" style={`background:${chainColour(point.supermarket)}`}></span>
							<span class="min-w-0 flex-1">
								<span class="block truncate text-xs font-bold">{point.shopName}</span>
								<span class="block text-[10px] opacity-50">{formatDate(point.purchasedAt)}</span>
							</span>
							<span class="text-xs font-extrabold tabular-nums">{formatCurrency(point.price)}</span>
							{#if point.isMine}
								<Check size={12} class="text-success-600" />
							{/if}
						</div>
					{/each}
				</div>
			</section>

			<section class="surface-card rounded-2xl p-4 sm:p-5">
				<h2 class="text-sm font-extrabold">Product details</h2>
				<dl class="mt-3 space-y-2 text-xs">
					<div class="flex justify-between gap-3"><dt class="opacity-50">Class</dt><dd class="font-bold">{data.product.className}</dd></div>
					<div class="flex justify-between gap-3"><dt class="opacity-50">Category</dt><dd class="font-bold">{data.product.category}</dd></div>
					<div class="flex justify-between gap-3"><dt class="opacity-50">Size</dt><dd class="font-bold">{data.product.size ?? '—'}</dd></div>
					<div class="flex justify-between gap-3"><dt class="opacity-50">Brand</dt><dd class="font-bold">{data.product.brand ?? '—'}</dd></div>
					<div class="flex justify-between gap-3"><dt class="opacity-50">Stores tracked</dt><dd class="font-bold">{data.stats?.storeCount ?? 0}</dd></div>
				</dl>
			</section>
		</div>
	</div>

	{#if ownBrandEquivalents.length > 1}
		<section class="surface-card rounded-2xl p-4 sm:p-5">
			<div class="mb-3 flex items-center justify-between">
				<h2 class="text-lg font-extrabold tracking-tight">Own brand</h2>
				<a href={`/products/classes/${data.product.classId}`} class="text-xs font-bold text-primary-700 hover:underline dark:text-primary-300">
					All {data.product.className}
				</a>
			</div>
			<div class="grid gap-2 sm:grid-cols-2 xl:grid-cols-3">
				{#each ownBrandEquivalents as equivalent (equivalent.id)}
					<a
						href={`/products/${equivalent.id}`}
						class="flex items-center gap-2.5 rounded-xl border p-2.5 transition hover:border-primary-400/50 hover:bg-primary-500/5
						{equivalent.id === data.product.id ? 'border-primary-500/50 bg-primary-500/10' : 'border-surface-200/60 dark:border-surface-800'}"
					>
						<span class="grid h-9 w-9 shrink-0 place-items-center rounded-lg bg-surface-200/60 text-lg dark:bg-surface-800">
							{data.product.icon ?? '🛒'}
						</span>
						<span class="min-w-0 flex-1">
							<span class="block truncate text-xs font-bold">{equivalent.itemName}</span>
							<span class="block truncate text-[10px] opacity-50">
								{equivalent.supermarket}{equivalent.size ? ` · ${equivalent.size}` : ''}
							</span>
						</span>
						<span class="text-right">
							<span class="block text-xs font-extrabold tabular-nums">
								{equivalent.stats?.minPrice !== null && equivalent.stats?.minPrice !== undefined
									? formatCurrency(equivalent.stats.minPrice)
									: '—'}
							</span>
							<span class="block text-[9px] opacity-45">{equivalent.stats?.storeCount ?? 0} stores</span>
						</span>
						{#if equivalent.id === data.product.id}
							<Check size={12} class="shrink-0 text-primary-700 dark:text-primary-300" />
						{/if}
					</a>
				{/each}
			</div>
		</section>
	{/if}

	{#if brandedEquivalents.length}
		<section class="surface-card rounded-2xl p-4 sm:p-5">
			<h2 class="text-lg font-extrabold tracking-tight">Branded</h2>
			<div class="mt-3 grid gap-2 sm:grid-cols-2 xl:grid-cols-3">
				{#each brandedEquivalents as equivalent (equivalent.id)}
					<a
						href={`/products/${equivalent.id}`}
						class="flex items-center gap-2.5 rounded-xl border p-2.5 transition hover:border-primary-400/50 hover:bg-primary-500/5
						{equivalent.id === data.product.id ? 'border-primary-500/50 bg-primary-500/10' : 'border-surface-200/60 dark:border-surface-800'}"
					>
						<span class="grid h-9 w-9 shrink-0 place-items-center rounded-lg bg-surface-200/60 text-lg dark:bg-surface-800">
							{data.product.icon ?? '🛒'}
						</span>
						<span class="min-w-0 flex-1">
							<span class="block truncate text-xs font-bold">{equivalent.itemName}</span>
							<span class="block truncate text-[10px] opacity-50">
								{equivalent.brand}{equivalent.size ? ` · ${equivalent.size}` : ''}
							</span>
						</span>
						<span class="text-right">
							<span class="block text-xs font-extrabold tabular-nums">
								{equivalent.stats?.minPrice !== null && equivalent.stats?.minPrice !== undefined
									? formatCurrency(equivalent.stats.minPrice)
									: '—'}
							</span>
							<span class="block text-[9px] opacity-45">{equivalent.stats?.storeCount ?? 0} stores</span>
						</span>
						{#if equivalent.id === data.product.id}
							<Check size={12} class="shrink-0 text-primary-700 dark:text-primary-300" />
						{/if}
					</a>
				{/each}
			</div>
		</section>
	{/if}
</div>
