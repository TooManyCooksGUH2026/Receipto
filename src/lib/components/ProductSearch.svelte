<script lang="ts">
	import { goto } from '$app/navigation';
	import { formatCurrency } from '#lib/utils/format';
	import { LoaderCircle, Package, Search } from 'lucide-svelte';

	type SearchResult = {
		id: number;
		itemName: string;
		brand: string | null;
		size: string | null;
		className: string;
		category: string;
		icon: string | null;
		stats: { minPrice: number | null; storeCount: number; cheapestSupermarket: string | null } | null;
	};

	let {
		onSelect,
		placeholder = 'Search products…',
		initialQuery = '',
		compact = false
	}: {
		onSelect?: (product: SearchResult) => void;
		placeholder?: string;
		initialQuery?: string;
		compact?: boolean;
	} = $props();

	let query = $state(initialQuery);
	let results = $state<SearchResult[]>([]);
	let loading = $state(false);
	let open = $state(false);
	let error = $state('');
	let container: HTMLDivElement | undefined = $state();

	$effect(() => {
		const q = query.trim();
		if (q.length < 2) {
			results = [];
			loading = false;
			return;
		}

		const controller = new AbortController();
		loading = true;
		const timer = setTimeout(async () => {
			try {
				const response = await fetch(`/api/products/search?q=${encodeURIComponent(q)}&limit=7`, {
					signal: controller.signal
				});
				if (!response.ok) throw new Error('Search failed');
				const data = (await response.json()) as { products: SearchResult[] };
				results = data.products;
				open = true;
				error = '';
			} catch (err) {
				if ((err as Error).name !== 'AbortError') {
					error = 'Could not search right now.';
					results = [];
				}
			} finally {
				loading = false;
			}
		}, 220);

		return () => {
			clearTimeout(timer);
			controller.abort();
		};
	});

	function choose(product: SearchResult) {
		open = false;
		query = '';
		if (onSelect) onSelect(product);
		else goto(`/products/${product.id}`);
	}

	function onWindowClick(event: MouseEvent) {
		if (container && !container.contains(event.target as Node)) open = false;
	}
</script>

<svelte:window onclick={onWindowClick} />

<div class="relative" bind:this={container}>
	<label class="input w-full {compact ? 'input-sm' : ''}">
		<Search size={compact ? 15 : 17} class="opacity-60" />
		<input
			type="search"
			class="w-full bg-transparent outline-none"
			{placeholder}
			bind:value={query}
			onfocus={() => (open = query.trim().length >= 2)}
			aria-label="Search products"
		/>
		{#if loading}
			<LoaderCircle size={15} class="animate-spin opacity-60" />
		{/if}
	</label>

	{#if open && (results.length > 0 || error)}
		<div
			class="absolute left-0 right-0 top-[calc(100%+0.4rem)] z-50 overflow-hidden rounded-xl border border-surface-200 bg-surface-50 shadow-2xl dark:border-surface-700 dark:bg-surface-900"
		>
			{#if error}
				<p class="p-3 text-sm text-error-700 dark:text-error-300">{error}</p>
			{:else}
				{#each results as product (product.id)}
					<button
						type="button"
						class="flex w-full items-center gap-3 border-b border-surface-200/60 px-3 py-2.5 text-left last:border-0 hover:bg-primary-500/10 dark:border-surface-700/60"
						onclick={() => choose(product)}
					>
						<span class="grid h-9 w-9 shrink-0 place-items-center rounded-lg bg-surface-200/70 text-lg dark:bg-surface-800">
							{product.icon ?? '🛒'}
						</span>
						<span class="min-w-0 flex-1">
							<span class="block truncate text-sm font-semibold">{product.itemName}</span>
							<span class="block truncate text-xs opacity-55">
								{product.className}{product.size ? ` · ${product.size}` : ''}
							</span>
						</span>
						<span class="shrink-0 text-right">
							{#if product.stats?.minPrice !== null && product.stats?.minPrice !== undefined}
								<span class="price-chip">{formatCurrency(product.stats.minPrice)}</span>
							{:else}
								<span class="text-xs opacity-40">No price</span>
							{/if}
							<span class="mt-1 block text-[10px] opacity-50">
								{product.stats?.storeCount ?? 0} stores
							</span>
						</span>
					</button>
				{:else}
					<p class="flex items-center gap-2 p-3 text-sm opacity-60">
						<Package size={15} /> No products found.
					</p>
				{/each}
			{/if}
		</div>
	{/if}
</div>
