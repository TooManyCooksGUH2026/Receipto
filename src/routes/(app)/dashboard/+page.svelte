<script lang="ts">
	import { page } from '$app/state';
	import PriceChange from '#lib/components/PriceChange.svelte';
	import ProductSearch from '#lib/components/ProductSearch.svelte';
	import SpendBars from '#lib/components/SpendBars.svelte';
	import StatCard from '#lib/components/StatCard.svelte';
	import { SUPERMARKET_META, type Supermarket } from '#lib/data/catalog';
	import { formatCurrency, formatDate, formatRelative } from '#lib/utils/format';
	import {
		ArrowRight,
		ChevronRight,
		CircleCheck,
		Clock3,
		MapPin,
		ReceiptText,
		ScanLine,
		ShoppingBasket,
		Sparkles,
		Store,
		TrendingUp,
		Wallet,
		X
	} from 'lucide-svelte';
	import type { PageProps } from './$types';

	let { data }: PageProps = $props();

	let firstName = $derived(data.user?.name?.split(' ')[0] ?? 'there');
	let hasReceipts = $derived(data.recent.length > 0);
	let last = $derived(data.recent[0] ?? null);
	let showScanned = $state(page.url.searchParams.get('scanned') === '1');

	function dismissScanned() {
		showScanned = false;
		const url = new URL(window.location.href);
		url.searchParams.delete('scanned');
		history.replaceState({}, '', url);
	}
</script>

<svelte:head>
	<title>Dashboard · Receipto</title>
</svelte:head>

<div class="space-y-6">
	{#if showScanned}
		<div class="rise-in flex items-center gap-3 rounded-2xl border border-success-500/30 bg-success-500/10 p-3 pr-2 text-success-900 dark:text-success-100">
			<span class="grid h-9 w-9 shrink-0 place-items-center rounded-xl bg-success-500/20">
				<CircleCheck size={19} />
			</span>
			<div class="min-w-0 flex-1">
				<p class="text-sm font-extrabold">Receipt saved</p>
				<p class="text-xs opacity-65">The price tables and map have been updated with this shop.</p>
			</div>
			<button type="button" class="btn-icon btn-icon-sm preset-tonal-surface" onclick={dismissScanned} aria-label="Dismiss">
				<X size={15} />
			</button>
		</div>
	{/if}

	<header class="flex flex-col gap-4 sm:flex-row sm:items-end sm:justify-between">
		<div class="rise-in">
			<p class="text-xs font-bold uppercase tracking-[0.18em] text-primary-700 dark:text-primary-300">
				{data.greeting}, {firstName}
			</p>
			<h1 class="mt-1 text-3xl font-extrabold tracking-tight sm:text-4xl">Dashboard</h1>
			{#if hasReceipts}
				<p class="mt-1 text-sm opacity-60">
					{data.stats.receiptCount} shops · {formatRelative(last?.purchasedAt)}
				</p>
			{/if}
		</div>
		<a href="/scan" class="btn preset-filled-primary-500 gap-2 self-start shadow-lg shadow-primary-500/20 sm:self-auto">
			<ScanLine size={17} />
			Scan new receipt
		</a>
	</header>

	{#if hasReceipts}
		<section class="grid grid-cols-2 gap-3 lg:grid-cols-4">
			<StatCard
				label="Last shop"
				value={formatCurrency(data.stats.lastShopTotal)}
				sub={last ? `${last.shop.supermarket} · ${last.shop.city}` : undefined}
				icon={ReceiptText}
				tone="primary"
			/>
			<StatCard
				label="30-day spend"
				value={formatCurrency(data.stats.spend30)}
				sub={`${data.stats.receipts30} shops this month`}
				icon={Wallet}
				tone="secondary"
			/>
			<StatCard
				label="Average basket"
				value={formatCurrency(data.stats.avgBasket)}
				icon={ShoppingBasket}
				tone="tertiary"
			/>
			<StatCard
				label="Items tracked"
				value={String(data.stats.itemsTracked)}
				sub={data.stats.favouriteShop ? `Favourite: ${data.stats.favouriteShop.supermarket}` : undefined}
				icon={TrendingUp}
				tone="surface"
			/>
		</section>

		<div class="grid gap-5 xl:grid-cols-[1.55fr_1fr]">
			<div class="space-y-5">
				<section class="surface-card rounded-2xl p-4 sm:p-5">
					<div class="mb-4 flex items-center justify-between">
						<h2 class="text-lg font-extrabold tracking-tight">Recent shops</h2>
						<a href="/map" class="btn btn-sm preset-tonal-primary gap-1.5">
							<MapPin size={14} /> Price map
						</a>
					</div>

					<div class="space-y-2">
						{#each data.recent as receipt, index (receipt.id)}
							<a
								href={`/receipts/${receipt.id}`}
								class="group flex items-center gap-3 rounded-xl border border-transparent p-2.5 transition hover:border-surface-200 hover:bg-surface-200/35 dark:hover:border-surface-700 dark:hover:bg-surface-800/45"
								title="Compare this basket at other supermarkets"
							>
								<div
									class="grid h-11 w-11 shrink-0 place-items-center rounded-xl text-sm font-extrabold text-white shadow-sm"
									style={`background:${SUPERMARKET_META[receipt.shop.supermarket as Supermarket]?.color ?? '#555'}`}
								>
									{receipt.shop.supermarket.slice(0, 2).toUpperCase()}
								</div>
								<div class="min-w-0 flex-1">
									<div class="flex items-center gap-2">
										<p class="truncate text-sm font-bold">{receipt.shop.supermarket}</p>
										{#if index === 0}
											<span class="rounded-full bg-primary-500/15 px-1.5 py-0.5 text-[9px] font-extrabold uppercase tracking-wide text-primary-800 dark:text-primary-200">Latest</span>
										{/if}
									</div>
									<p class="truncate text-[11px] opacity-50">
										{receipt.shop.city} · {formatDate(receipt.purchasedAt)} · {receipt.itemCount} items
									</p>
								</div>
								<div class="text-right">
									<p class="text-sm font-extrabold tabular-nums">{formatCurrency(receipt.total)}</p>
									<div class="mt-0.5 flex justify-end">
										<PriceChange diff={receipt.diff} pct={receipt.diffPct} label={receipt.previousShopName ? `vs ${receipt.previousShopName}` : 'First shop'} />
									</div>
								</div>
								<ChevronRight size={16} class="shrink-0 opacity-30 transition group-hover:translate-x-0.5 group-hover:opacity-70" />
							</a>
						{/each}
					</div>
				</section>

				<section class="surface-card rounded-2xl p-4 sm:p-5">
					<div class="mb-4 flex items-center justify-between">
						<div>
							<h2 class="text-lg font-extrabold tracking-tight">Spending</h2>
						</div>
						<span class="badge preset-tonal-surface gap-1.5">
							<Clock3 size={12} /> {data.spendSeries.length > 0 ? formatCurrency(data.stats.avgBasket) + ' avg' : 'No data'}
						</span>
					</div>
					<SpendBars series={data.spendSeries} />
				</section>

				<section class="surface-card rounded-2xl p-4 sm:p-5">
					<div class="mb-3 flex items-center justify-between">
						<h2 class="text-lg font-extrabold tracking-tight">Commonly bought</h2>
						<Sparkles size={18} class="text-primary-600 dark:text-primary-300" />
					</div>
					<div class="grid gap-2 sm:grid-cols-2">
						{#each data.topProducts as product (product.id)}
							<a
								href={`/products/${product.id}`}
								class="flex items-center gap-3 rounded-xl border border-surface-200/60 p-2.5 transition hover:border-primary-400/50 hover:bg-primary-500/5 dark:border-surface-800"
							>
								<span class="grid h-10 w-10 shrink-0 place-items-center rounded-lg bg-surface-200/60 text-lg dark:bg-surface-800">
									{product.icon ?? '🛒'}
								</span>
								<span class="min-w-0 flex-1">
									<span class="block truncate text-sm font-bold">{product.itemName}</span>
									<span class="block truncate text-[11px] opacity-50">
										Bought {product.times}× · {product.size ?? product.className}
									</span>
								</span>
								<span class="text-right">
									<span class="block text-xs font-extrabold tabular-nums">{formatCurrency(product.lastPrice)}</span>
									{#if product.stats?.cheapestSupermarket && product.stats.minPrice !== null}
										<span class="block text-[10px] opacity-50">
											from {formatCurrency(product.stats.minPrice)}
										</span>
									{/if}
								</span>
							</a>
						{/each}
					</div>
				</section>
			</div>

			<div class="space-y-5">
				<section class="surface-card rounded-2xl p-4 sm:p-5">
					<h2 class="text-lg font-extrabold tracking-tight">Search prices</h2>
					<div class="mt-3">
						<ProductSearch compact placeholder="Search a product" />
					</div>
				</section>

				<section class="relative overflow-hidden rounded-2xl bg-linear-to-br from-secondary-600 via-secondary-500 to-tertiary-500 p-5 text-white shadow-xl shadow-secondary-500/20">
					<div class="absolute -right-10 -top-10 h-36 w-36 rounded-full bg-white/10"></div>
					<div class="absolute -bottom-14 -left-8 h-36 w-36 rounded-full bg-white/10"></div>
					<div class="relative">
						<p class="text-[11px] font-bold uppercase tracking-[0.18em] text-white/70">Last shop vs previous</p>
						{#if data.stats.lastShopDiff !== null}
							<p class="mt-2 text-3xl font-extrabold tracking-tight">
								{formatCurrency(Math.abs(data.stats.lastShopDiff))}
								<span class="text-lg font-bold text-white/75">{data.stats.lastShopDiff >= 0 ? 'more' : 'less'}</span>
							</p>
							<p class="mt-1 text-sm text-white/75">
								{data.stats.lastShopName} vs {data.stats.previousShopName ?? 'your previous shop'}
							</p>
							<div class="mt-3 flex items-center gap-2">
								<span class="rounded-full bg-white/15 px-2 py-1 text-xs font-bold">
									{data.stats.lastShopDiffPct !== null ? `${data.stats.lastShopDiffPct > 0 ? '+' : ''}${data.stats.lastShopDiffPct}%` : '—'}
								</span>
								<span class="text-xs text-white/65">basket change</span>
							</div>
						{:else}
							<p class="mt-2 text-2xl font-extrabold">First shop logged</p>
						{/if}
						<a href="/scan" class="mt-5 inline-flex items-center gap-2 rounded-xl bg-white px-3.5 py-2 text-sm font-extrabold text-secondary-800 transition hover:bg-white/90">
							<ScanLine size={16} /> Add another shop
						</a>
					</div>
				</section>

				<section class="surface-card rounded-2xl p-4 sm:p-5">
					<div class="mb-3 flex items-center justify-between">
						<h2 class="text-lg font-extrabold tracking-tight">Recent purchases</h2>
						<a href="/products" class="text-xs font-bold text-primary-700 hover:underline dark:text-primary-300">Browse all</a>
					</div>
					<div class="space-y-1">
						{#each data.recentItems.slice(0, 7) as item (item.id)}
							{#if item.productId}
								<a href={`/products/${item.productId}`} class="flex items-center gap-2 rounded-lg px-1.5 py-2 hover:bg-surface-200/50 dark:hover:bg-surface-800/50">
									<span class="min-w-0 flex-1 truncate text-xs font-semibold">{item.name}</span>
									<span class="text-xs font-bold tabular-nums">{formatCurrency(item.price)}</span>
									<ArrowRight size={13} class="opacity-30" />
								</a>
							{:else}
								<div class="flex items-center gap-2 px-1.5 py-2">
									<span class="min-w-0 flex-1 truncate text-xs font-semibold">{item.name}</span>
									<span class="text-xs font-bold tabular-nums">{formatCurrency(item.price)}</span>
								</div>
							{/if}
						{/each}
					</div>
				</section>

				<section class="surface-card rounded-2xl p-4 sm:p-5">
					<div class="flex items-start gap-3">
						<div class="grid h-10 w-10 shrink-0 place-items-center rounded-xl bg-primary-500/15 text-primary-800 dark:text-primary-200">
							<Store size={18} />
						</div>
						<div>
							<h2 class="text-sm font-extrabold">Favourite shop</h2>
							{#if data.stats.favouriteShop}
								<p class="mt-0.5 text-xs opacity-60">
									{data.stats.favouriteShop.supermarket} in {data.stats.favouriteShop.city} · {data.stats.favouriteShop.visits} visits
								</p>
								<a href={`/shops/${data.stats.favouriteShop.shopId}`} class="mt-2 inline-flex items-center gap-1 text-xs font-bold text-primary-700 hover:underline dark:text-primary-300">
									View shop <ChevronRight size={13} />
								</a>
							{:else}
								<p class="mt-0.5 text-xs opacity-60">No favourite shop yet.</p>
							{/if}
						</div>
					</div>
				</section>
			</div>
		</div>
	{:else}
		<section class="surface-card relative overflow-hidden rounded-3xl p-8 text-center sm:p-14">
			<div class="absolute inset-0 bg-linear-to-br from-primary-500/10 via-transparent to-secondary-500/10"></div>
			<div class="relative mx-auto max-w-lg">
				<div class="mx-auto grid h-16 w-16 place-items-center rounded-2xl bg-primary-500/15 text-primary-800 dark:text-primary-200">
					<ScanLine size={30} />
				</div>
				<h2 class="mt-5 text-2xl font-extrabold tracking-tight">No receipts yet</h2>
				<div class="mx-auto mt-5 max-w-sm text-left">
					<ProductSearch compact placeholder="Search a product" />
				</div>
				<div class="mt-5 flex flex-wrap justify-center gap-3">
					<a href="/scan" class="btn preset-filled-primary-500 gap-2"><ScanLine size={17} /> Scan a receipt</a>
					<a href="/map" class="btn preset-tonal-surface gap-2"><MapPin size={17} /> Open map</a>
				</div>
			</div>
		</section>
	{/if}
</div>
