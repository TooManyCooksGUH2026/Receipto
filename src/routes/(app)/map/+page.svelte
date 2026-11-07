<script lang="ts">
	import { goto } from '$app/navigation';
	import LocationPicker from '#lib/components/LocationPicker.svelte';
	import ProductSearch from '#lib/components/ProductSearch.svelte';
	import StoreMap, { type MapStore } from '#lib/components/StoreMap.svelte';
	import { SUPERMARKET_META, type Supermarket } from '#lib/data/catalog';
	import { formatCurrency } from '#lib/utils/format';
	import {
		ArrowLeft,
		ChevronRight,
		ExternalLink,
		LoaderCircle,
		MapPin,
		Search,
		Store,
		Tag,
		X
	} from 'lucide-svelte';
	import type { PageProps } from './$types';

	let { data }: PageProps = $props();

	type ActiveProduct = NonNullable<typeof data.activeProduct>;

	let activeProduct = $state<ActiveProduct | null>(data.activeProduct);
	let stores = $state<MapStore[]>(data.stores);
	let minPrice = $state<number | null>(data.minPrice);
	let maxPrice = $state<number | null>(data.maxPrice);
	let pricedCount = $state(data.pricedCount);
	let suggestions = $state(data.suggestions);
	let selectedShopId = $state<number | null>(null);
	let loading = $state(false);
	let mobilePanel = $state(false);
	let dataKey = $state('');

	$effect(() => {
		// Re-sync the client view after saving a location/radius or another
		// server-side invalidation.
		const key = `${data.location?.lat}:${data.location?.lng}:${data.location?.radiusMiles}:${data.stores.length}`;
		if (key === dataKey) return;
		dataKey = key;
		activeProduct = data.activeProduct;
		stores = data.stores;
		minPrice = data.minPrice;
		maxPrice = data.maxPrice;
		pricedCount = data.pricedCount;
		suggestions = data.suggestions;
		selectedShopId = null;
	});

	let selectedStore = $derived(stores.find((store) => store.id === selectedShopId) ?? null);
	let pricedStores = $derived(
		stores
			.filter((store) => store.price !== null)
			.sort((a, b) => (a.price ?? 0) - (b.price ?? 0))
	);

	async function selectProduct(productId: number) {
		loading = true;
		try {
			const response = await fetch(`/api/map?productId=${productId}`);
			if (!response.ok) throw new Error('Could not load prices');
			const result = await response.json();
			activeProduct = result.activeProduct;
			stores = result.stores;
			minPrice = result.minPrice;
			maxPrice = result.maxPrice;
			pricedCount = result.pricedCount;
			suggestions = result.suggestions;
			selectedShopId = null;
			const url = new URL(window.location.href);
			url.searchParams.set('product', String(productId));
			history.replaceState({}, '', url);
		} finally {
			loading = false;
		}
	}

	function chooseStore(store: MapStore) {
		selectedShopId = store.id;
		mobilePanel = true;
	}

	function closeMobilePanel() {
		mobilePanel = false;
	}

	const chainColour = (chain: string) =>
		SUPERMARKET_META[chain as Supermarket]?.color ?? 'var(--color-surface-500)';
</script>

<svelte:head>
	<title>Price map · Receipto</title>
</svelte:head>

<div class="flex h-[calc(100dvh-4rem)] flex-col overflow-hidden lg:h-dvh xl:flex-row">
	<div class="flex min-h-0 flex-1 flex-col">
		<div class="border-b border-surface-200/70 bg-surface-50/70 p-2 dark:border-surface-800 dark:bg-surface-950/50 sm:p-3">
			<div class="mx-auto max-w-3xl rounded-xl border border-surface-200/70 bg-surface-50 p-2 shadow-sm dark:border-surface-700 dark:bg-surface-900">
				<ProductSearch
					placeholder="Search an item to compare prices"
					onSelect={(product) => {
						if (product.kind === 'class') goto(`/products/classes/${product.classId}`);
						else selectProduct(product.id);
					}}
					compact
				/>
				<div class="mt-1.5 flex flex-wrap items-center gap-2 px-1 text-[10px]">
					<LocationPicker location={data.location} compact variant="popover" />
					<span class="min-w-0 flex-1 truncate text-right opacity-55">
						{activeProduct?.itemName ?? 'Latest item'}
					</span>
					{#if minPrice !== null}
						<span class="shrink-0 font-bold text-primary-800 dark:text-primary-200">from {formatCurrency(minPrice)}</span>
					{/if}
				</div>
				{#if suggestions.length}
					<div class="mt-1.5 flex flex-wrap gap-1.5 px-1 pb-0.5">
						{#each suggestions.slice(0, 4) as suggestion (suggestion.id)}
							<button
								type="button"
								class="badge preset-tonal-surface gap-1 text-[10px]"
								onclick={() => selectProduct(suggestion.id)}
							>
								<span>{suggestion.icon ?? '🛒'}</span>
								{suggestion.itemName}
							</button>
						{/each}
					</div>
				{/if}
			</div>
		</div>

		<div class="relative min-h-0 flex-1">
			<StoreMap {stores} {selectedShopId} onSelectStore={chooseStore} userLocation={data.location} />

			{#if stores.length === 0}
				<div class="absolute inset-0 z-[550] grid place-items-center p-4 text-center">
					<div class="surface-card max-w-sm rounded-xl p-4">
						<MapPin size={24} class="mx-auto opacity-35" />
						<p class="mt-2 text-sm font-extrabold">No stores in this area</p>
						<p class="mt-1 text-xs opacity-55">Increase the radius or choose another location.</p>
					</div>
				</div>
			{/if}

			{#if loading}
				<div class="absolute inset-0 z-[550] grid place-items-center bg-surface-950/10 backdrop-blur-[1px]">
					<div class="flex items-center gap-2 rounded-full bg-surface-50 px-4 py-2 text-sm font-bold shadow-xl dark:bg-surface-900">
						<LoaderCircle size={16} class="animate-spin" /> Updating…
					</div>
				</div>
			{/if}

			<button
				type="button"
				class="btn preset-filled-primary-500 absolute bottom-24 right-4 z-[600] gap-1.5 shadow-xl xl:hidden"
				onclick={() => (mobilePanel = true)}
			>
				<Tag size={15} /> Prices
			</button>
		</div>
	</div>

	{#snippet panelContent()}
		<div class="flex h-full min-h-0 flex-col">
			<div class="border-b border-surface-200/70 p-4 dark:border-surface-800">
				<div class="flex items-start justify-between gap-3">
					<div class="min-w-0">
						<p class="text-[10px] font-bold uppercase tracking-[0.16em] opacity-45">Price map</p>
						<h1 class="mt-0.5 text-xl font-extrabold tracking-tight">
							{selectedStore ? selectedStore.supermarket : 'Prices'}
						</h1>
					</div>
					{#if selectedStore}
						<button type="button" class="btn-icon btn-icon-sm preset-tonal-surface" onclick={() => (selectedShopId = null)} aria-label="Back to list">
							<ArrowLeft size={16} />
						</button>
					{:else}
						<span class="badge preset-tonal-primary">{pricedCount} prices</span>
					{/if}
				</div>
			</div>

			<div class="min-h-0 flex-1 overflow-y-auto p-4 scrollbar-thin">
				{#if selectedStore}
					<div class="space-y-4">
						<div class="surface-card rounded-xl p-4">
							<div class="flex items-center gap-3">
								<div
									class="grid h-12 w-12 shrink-0 place-items-center rounded-xl text-sm font-extrabold text-white"
									style={`background:${chainColour(selectedStore.supermarket)}`}
								>
									{selectedStore.supermarket.slice(0, 2).toUpperCase()}
								</div>
								<div class="min-w-0">
									<p class="truncate text-sm font-extrabold">{selectedStore.name}</p>
									<p class="truncate text-xs opacity-55">{selectedStore.city} · {selectedStore.region}</p>
								</div>
							</div>
							{#if selectedStore.address}
								<p class="mt-3 flex items-start gap-1.5 text-xs opacity-60">
									<MapPin size={13} class="mt-0.5 shrink-0" /> {selectedStore.address}
								</p>
							{/if}
							<div class="mt-4 rounded-xl bg-primary-500/10 p-3">
								<p class="text-[10px] font-bold uppercase tracking-wide opacity-50">Price for</p>
								<p class="truncate text-sm font-bold">{activeProduct?.itemName ?? 'Selected item'}</p>
								<div class="mt-1 flex items-end justify-between gap-2">
									<p class="text-3xl font-extrabold tracking-tight text-primary-800 dark:text-primary-200">
										{selectedStore.price !== null ? formatCurrency(selectedStore.price) : 'Not stocked'}
									</p>
									{#if selectedStore.isCheapest}
										<span class="badge preset-filled-primary-500 text-[10px]">Cheapest</span>
									{/if}
								</div>
							</div>
							<div class="mt-4 flex gap-2">
								<a href={`/shops/${selectedStore.id}`} class="btn btn-sm preset-filled-surface-500 flex-1 gap-1.5">
									<Store size={14} /> All prices
								</a>
								<a
									href={`https://www.openstreetmap.org/?mlat=${selectedStore.lat}&mlon=${selectedStore.lng}#map=17/${selectedStore.lat}/${selectedStore.lng}`}
									target="_blank"
									rel="noreferrer"
									class="btn btn-sm preset-tonal-surface gap-1.5"
								>
									<ExternalLink size={14} /> OSM
								</a>
							</div>
						</div>

						{#if activeProduct}
							<div>
								<h2 class="mb-2 text-xs font-bold uppercase tracking-[0.14em] opacity-45">Cheapest stores</h2>
								<div class="space-y-1.5">
									{#each pricedStores.slice(0, 8) as store (store.id)}
										<button
											type="button"
											class="flex w-full items-center gap-2 rounded-lg border border-surface-200/60 p-2 text-left transition hover:border-primary-400/50 hover:bg-primary-500/5 dark:border-surface-800"
											onclick={() => chooseStore(store)}
										>
											<span class="h-2 w-2 rounded-full" style={`background:${chainColour(store.supermarket)}`}></span>
											<span class="min-w-0 flex-1">
												<span class="block truncate text-xs font-bold">{store.name}</span>
												<span class="block truncate text-[10px] opacity-50">{store.city}</span>
											</span>
											<span class="text-xs font-extrabold tabular-nums">{formatCurrency(store.price)}</span>
											<ChevronRight size={13} class="opacity-30" />
										</button>
									{/each}
								</div>
							</div>
						{/if}
					</div>
				{:else}
					<div class="space-y-4">
						{#if activeProduct}
							<div class="surface-card rounded-xl p-4">
								<div class="flex items-center gap-3">
									<span class="grid h-12 w-12 shrink-0 place-items-center rounded-xl bg-surface-200/60 text-2xl dark:bg-surface-800">
										{activeProduct.icon ?? '🛒'}
									</span>
									<div class="min-w-0">
										<p class="truncate text-sm font-extrabold">{activeProduct.itemName}</p>
										<p class="truncate text-xs opacity-55">{activeProduct.className} · {activeProduct.size ?? ''}</p>
									</div>
								</div>
								<div class="mt-4 grid grid-cols-3 gap-2 text-center">
									<div class="rounded-lg bg-primary-500/10 p-2">
										<p class="text-[9px] font-bold uppercase tracking-wide opacity-50">Cheapest</p>
										<p class="text-sm font-extrabold text-primary-800 dark:text-primary-200">
											{minPrice !== null ? formatCurrency(minPrice) : '—'}
										</p>
									</div>
									<div class="rounded-lg bg-surface-500/10 p-2">
										<p class="text-[9px] font-bold uppercase tracking-wide opacity-50">Highest</p>
										<p class="text-sm font-extrabold">{maxPrice !== null ? formatCurrency(maxPrice) : '—'}</p>
									</div>
									<div class="rounded-lg bg-surface-500/10 p-2">
										<p class="text-[9px] font-bold uppercase tracking-wide opacity-50">Stores</p>
										<p class="text-sm font-extrabold">{pricedCount}</p>
									</div>
								</div>

							</div>
						{:else}
							<div class="surface-card rounded-xl p-6 text-center">
								<Search size={26} class="mx-auto opacity-30" />
								<p class="mt-2 text-sm font-bold">Search for an item</p>
								<p class="mt-1 text-xs opacity-55">Choose a product above to put its price above every store on the map.</p>
							</div>
						{/if}

						{#if activeProduct && pricedStores.length}
							<div>
								<h2 class="mb-2 text-xs font-bold uppercase tracking-[0.14em] opacity-45">Prices</h2>
								<div class="space-y-1.5">
									{#each pricedStores.slice(0, 10) as store (store.id)}
										<button
											type="button"
											class="flex w-full items-center gap-2 rounded-lg border border-surface-200/60 p-2 text-left transition hover:border-primary-400/50 hover:bg-primary-500/5 dark:border-surface-800"
											onclick={() => chooseStore(store)}
										>
											<span class="h-2 w-2 rounded-full" style={`background:${chainColour(store.supermarket)}`}></span>
											<span class="min-w-0 flex-1">
												<span class="block truncate text-xs font-bold">{store.name}</span>
												<span class="block truncate text-[10px] opacity-50">{store.city}</span>
											</span>
											<span class="text-xs font-extrabold tabular-nums">{formatCurrency(store.price)}</span>
										</button>
									{/each}
								</div>
							</div>
						{/if}


					</div>
				{/if}
			</div>
		</div>
	{/snippet}

	<aside class="hidden w-[390px] shrink-0 border-l border-surface-200/70 bg-surface-50/70 backdrop-blur-xl dark:border-surface-800 dark:bg-surface-950/60 xl:block">
		{@render panelContent()}
	</aside>

	{#if mobilePanel}
		<div class="fixed inset-0 z-[700] xl:hidden">
			<button type="button" class="absolute inset-0 bg-surface-950/40 backdrop-blur-sm" onclick={closeMobilePanel} aria-label="Close panel"></button>
			<div class="absolute inset-x-0 bottom-0 max-h-[72dvh] overflow-hidden rounded-t-2xl border-t border-surface-200 bg-surface-50 shadow-2xl dark:border-surface-700 dark:bg-surface-950">
				<button
					type="button"
					class="absolute right-3 top-3 z-10 btn-icon btn-icon-sm preset-tonal-surface"
					onclick={closeMobilePanel}
					aria-label="Close panel"
				>
					<X size={16} />
				</button>
				{@render panelContent()}
			</div>
		</div>
	{/if}
</div>
