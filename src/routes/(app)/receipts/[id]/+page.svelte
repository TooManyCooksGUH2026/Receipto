<script lang="ts">
	import PriceChange from '#lib/components/PriceChange.svelte';
	import { SUPERMARKET_META, type Supermarket } from '#lib/data/catalog';
	import { formatCurrency, formatDate, formatRelative } from '#lib/utils/format';
	import { ArrowLeft, MapPin, ShoppingBasket, Store } from 'lucide-svelte';
	import type { PageProps } from './$types';

	let { data }: PageProps = $props();

	let actual = $derived(data.comparison.find((row) => row.isActual) ?? null);
	let others = $derived(data.comparison.filter((row) => !row.isActual));
	let cheapest = $derived(data.comparison.find((row) => row.isCheapest) ?? null);
	let savings = $derived(
		actual && cheapest && !cheapest.isActual ? actual.total - cheapest.total : 0
	);

	const chainColour = (chain: string) =>
		SUPERMARKET_META[chain as Supermarket]?.color ?? 'var(--color-surface-500)';
</script>

<svelte:head>
	<title>{data.receipt.shopName} · Receipto</title>
</svelte:head>

<div class="space-y-6">
	<a href="/dashboard" class="btn btn-sm preset-tonal-surface gap-1.5">
		<ArrowLeft size={15} /> Dashboard
	</a>

	<header class="surface-card rise-in rounded-2xl p-5 sm:p-6">
		<div class="flex flex-col gap-5 sm:flex-row sm:items-center">
			<div
				class="grid h-16 w-16 shrink-0 place-items-center rounded-2xl text-sm font-extrabold text-white"
				style={`background:${chainColour(data.receipt.supermarket)}`}
			>
				{data.receipt.supermarket.slice(0, 2).toUpperCase()}
			</div>
			<div class="min-w-0 flex-1">
				<p class="text-xs font-bold uppercase tracking-[0.16em] opacity-50">
					{data.receipt.supermarket} · {formatDate(data.receipt.purchasedAt)}
				</p>
				<h1 class="mt-1 text-3xl font-extrabold tracking-tight">{data.receipt.shopName}</h1>
				<p class="mt-1 flex items-center gap-1.5 text-sm opacity-60">
					<MapPin size={15} /> {data.receipt.city} · {formatRelative(data.receipt.purchasedAt)} · {data.receipt.itemCount} items
				</p>
			</div>
			<div class="grid grid-cols-3 gap-3 text-right">
				<div>
					<p class="text-[10px] font-bold uppercase tracking-wide opacity-45">Paid</p>
					<p class="text-xl font-extrabold tabular-nums">{formatCurrency(data.receipt.total)}</p>
				</div>
				<div>
					<p class="text-[10px] font-bold uppercase tracking-wide opacity-45">Items</p>
					<p class="text-xl font-extrabold tabular-nums">{formatCurrency(data.receipt.subtotal)}</p>
				</div>
				<div>
					<p class="text-[10px] font-bold uppercase tracking-wide opacity-45">Discounts</p>
					<p class="text-xl font-extrabold tabular-nums">{formatCurrency(data.receipt.discountTotal)}</p>
				</div>
			</div>
		</div>
	</header>

	<div class="grid gap-5 xl:grid-cols-[1.35fr_1fr]">
		<section class="surface-card rounded-2xl p-4 sm:p-5">
			<div class="mb-4 flex items-start justify-between gap-3">
				<div>
					<h2 class="text-lg font-extrabold tracking-tight">Same basket elsewhere</h2>
					<p class="text-xs opacity-55">Compared before discounts, using the nearest store for each chain.</p>
				</div>
				<span class="badge preset-tonal-surface gap-1.5"><Store size={13} /> {others.length} chains</span>
			</div>

			{#if cheapest && actual && !cheapest.isActual}
				<div class="mb-4 flex items-center gap-3 rounded-xl bg-success-500/10 p-3 text-success-900 dark:text-success-100">
					<span class="grid h-9 w-9 shrink-0 place-items-center rounded-xl bg-success-500/20">
						<ShoppingBasket size={18} />
					</span>
					<div>
						<p class="text-sm font-extrabold">Cheapest at {cheapest.chain}</p>
						<p class="text-xs opacity-70">
							{savings > 0 ? `${formatCurrency(savings)} less` : 'Same price'} than this shop's items.
						</p>
					</div>
				</div>
			{/if}

			<div class="overflow-hidden rounded-xl border border-surface-200/70 dark:border-surface-800">
				<table class="table w-full text-sm">
					<thead class="bg-surface-200/40 text-[10px] uppercase tracking-wide dark:bg-surface-800/50">
						<tr>
							<th class="px-3 py-2 text-left">Supermarket</th>
							<th class="hidden px-3 py-2 text-left md:table-cell">Nearest store</th>
							<th class="px-3 py-2 text-right">Basket</th>
							<th class="px-3 py-2 text-right">vs yours</th>
						</tr>
					</thead>
					<tbody>
						{#each others as row (row.chain)}
							<tr class="border-t border-surface-200/60 dark:border-surface-800">
								<td class="px-3 py-2.5">
									<div class="flex items-center gap-2">
										<span class="h-2.5 w-2.5 shrink-0 rounded-full" style={`background:${chainColour(row.chain)}`}></span>
										<div class="min-w-0">
											<p class="flex items-center gap-1.5 truncate font-bold">
												{row.chain}
												{#if row.isCheapest}
													<span class="badge preset-filled-primary-500 text-[9px]">Cheapest</span>
												{/if}
											</p>
											<p class="text-[10px] opacity-50 md:hidden">{row.storeName}</p>
										</div>
									</div>
								</td>
								<td class="hidden px-3 py-2.5 md:table-cell">
									{#if row.storeId}
										<a href={`/shops/${row.storeId}`} class="text-xs font-semibold hover:underline">{row.storeName}</a>
									{:else}
										<span class="text-xs">{row.storeName}</span>
									{/if}
									<p class="text-[10px] opacity-45">{row.distanceMiles} mi away</p>
								</td>
								<td class="px-3 py-2.5 text-right">
									<p class="font-extrabold tabular-nums">{formatCurrency(row.total)}</p>
									{#if row.missingCount}
										<p class="text-[10px] text-warning-700 dark:text-warning-300">{row.missingCount} unavailable</p>
									{/if}
								</td>
								<td class="px-3 py-2.5 text-right">
									<div class="flex justify-end">
										{#if row.missingCount}
											<span class="text-[10px] font-semibold text-warning-700 dark:text-warning-300">Not comparable</span>
										{:else}
											<PriceChange diff={row.difference} pct={row.differencePct} label={`vs ${data.receipt.shopName}`} />
										{/if}
									</div>
								</td>
							</tr>
						{/each}
					</tbody>
				</table>
			</div>
			<p class="mt-3 text-[10px] opacity-45">
				Own-brand items are compared with that chain's own-brand equivalent. Branded items use the same product.
			</p>
		</section>

		<section class="surface-card rounded-2xl p-4 sm:p-5">
			<div class="mb-3 flex items-center justify-between">
				<h2 class="text-lg font-extrabold tracking-tight">Basket items</h2>
				<span class="badge preset-tonal-surface">{data.items.length} items</span>
			</div>
			<div class="space-y-1">
				{#each data.items as item (item.id)}
					<div class="flex items-center gap-2 rounded-lg px-1.5 py-2 hover:bg-surface-200/40 dark:hover:bg-surface-800/40">
						<span class="grid h-8 w-8 shrink-0 place-items-center rounded-lg bg-surface-200/60 text-base dark:bg-surface-800">
							{item.icon ?? '🛒'}
						</span>
						<div class="min-w-0 flex-1">
							<p class="truncate text-xs font-bold">{item.itemName ?? item.nameInReceipt}</p>
							<p class="truncate text-[10px] opacity-50">
								{item.className ?? 'Unmatched'}{item.size ? ` · ${item.size}` : ''} · {item.quantity}×
							</p>
						</div>
						{#if item.productId}
							<a href={`/products/${item.productId}`} class="shrink-0 text-xs font-extrabold tabular-nums hover:underline">
								{formatCurrency(item.price)}
							</a>
						{:else}
							<span class="shrink-0 text-xs font-extrabold tabular-nums">{formatCurrency(item.price)}</span>
						{/if}
					</div>
				{/each}
			</div>
		</section>
	</div>
</div>