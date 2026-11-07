<script lang="ts">
	import { goto } from '$app/navigation';
	import { page } from '$app/state';
	import { authClient } from '#lib/client/auth';
	import { formatCurrency, initials } from '#lib/utils/format';
	import LocationPicker from './LocationPicker.svelte';
	import Logo from './Logo.svelte';
	import ProductSearch from './ProductSearch.svelte';
	import ThemeToggle from './ThemeToggle.svelte';
	import {
		ChevronRight,
		LayoutDashboard,
		LogOut,
		MapPin,
		ReceiptText,
		ScanLine,
		ShoppingBasket,
		X
	} from 'lucide-svelte';

	type SidebarData = {
		recentItems: {
			id: number;
			name: string;
			price: number;
			productId: number | null;
			shopName: string;
			purchasedAt: string;
		}[];
		common: {
			id: number;
			itemName: string;
			size: string | null;
			icon: string | null;
			times: number;
			avgPrice: number;
		}[];
	};

	type Location = {
		lat: number;
		lng: number;
		label: string | null;
		radiusMiles: number;
	};

	let {
		user,
		sidebar,
		location = null,
		onClose
	}: {
		user: { name: string; email: string };
		sidebar: SidebarData;
		location?: Location | null;
		onClose?: () => void;
	} = $props();

	const nav = [
		{ href: '/dashboard', label: 'Dashboard', icon: LayoutDashboard },
		{ href: '/map', label: 'Price map', icon: MapPin },
		{ href: '/products', label: 'Products', icon: ShoppingBasket },
		{ href: '/scan', label: 'Scan receipt', icon: ScanLine }
	];

	async function signOut() {
		await authClient.signOut();
		goto('/');
	}
</script>

<aside class="flex h-full min-h-0 flex-col border-r border-surface-200/70 bg-surface-50/75 backdrop-blur-xl dark:border-surface-800 dark:bg-surface-950/70">
	<div class="flex items-center justify-between px-5 pb-3 pt-5">
		<a href="/dashboard" class="rounded-lg focus:outline-none" aria-label="Receipto home">
			<Logo />
		</a>
		{#if onClose}
			<button type="button" class="btn-icon btn-icon-sm preset-tonal-surface" onclick={onClose} aria-label="Close menu">
				<X size={17} />
			</button>
		{/if}
	</div>

	<nav class="space-y-1 px-3">
		{#each nav as item (item.href)}
			{@const active = page.url.pathname === item.href || page.url.pathname.startsWith(item.href + '/')}
			<a
				href={item.href}
				class="group flex items-center gap-3 rounded-xl px-3 py-2.5 text-sm font-semibold transition
				{active
					? 'bg-primary-500/16 text-surface-950 dark:text-primary-200'
					: 'text-surface-600 hover:bg-surface-200/60 hover:text-surface-950 dark:text-surface-300 dark:hover:bg-surface-800/70 dark:hover:text-surface-50'}"
				aria-current={active ? 'page' : undefined}
			>
				<item.icon size={18} class={active ? 'text-primary-700 dark:text-primary-300' : 'opacity-70'} />
				<span class="flex-1">{item.label}</span>
				{#if active}
					<span class="h-1.5 w-1.5 rounded-full bg-primary-600 dark:bg-primary-300"></span>
				{/if}
			</a>
		{/each}
	</nav>

	<div class="px-4 pt-4">
		<LocationPicker {location} compact variant="popover" />
	</div>
	<div class="px-4 pt-2">
		<ProductSearch compact placeholder="Search a product…" />
	</div>

	<div class="mt-5 min-h-0 flex-1 space-y-6 overflow-y-auto px-4 pb-4 scrollbar-thin">
		<section>
			<div class="mb-2 flex items-center justify-between px-1">
				<h2 class="text-[11px] font-bold uppercase tracking-[0.16em] opacity-50">From your recent shops</h2>
				<ReceiptText size={13} class="opacity-40" />
			</div>
			{#if sidebar.recentItems.length}
				<ul class="space-y-1">
					{#each sidebar.recentItems.slice(0, 7) as item (item.id)}
						<li>
							{#if item.productId}
								<a
									href={`/products/${item.productId}`}
									class="flex items-center gap-2 rounded-lg px-2 py-1.5 hover:bg-surface-200/60 dark:hover:bg-surface-800/60"
								>
									<span class="min-w-0 flex-1">
										<span class="block truncate text-xs font-semibold">{item.name}</span>
										<span class="block truncate text-[10px] opacity-50">{item.shopName}</span>
									</span>
									<span class="text-xs font-bold tabular-nums">{formatCurrency(item.price)}</span>
								</a>
							{:else}
								<div class="flex items-center gap-2 px-2 py-1.5">
									<span class="min-w-0 flex-1 truncate text-xs font-semibold">{item.name}</span>
									<span class="text-xs font-bold tabular-nums">{formatCurrency(item.price)}</span>
								</div>
							{/if}
						</li>
					{/each}
				</ul>
			{:else}
				<p class="rounded-xl border border-dashed border-surface-300/70 p-3 text-xs leading-relaxed opacity-60 dark:border-surface-700">
					No recent items.
				</p>
			{/if}
		</section>

		<section>
			<div class="mb-2 flex items-center justify-between px-1">
				<h2 class="text-[11px] font-bold uppercase tracking-[0.16em] opacity-50">Commonly bought</h2>
				<ShoppingBasket size={13} class="opacity-40" />
			</div>
			{#if sidebar.common.length}
				<ul class="space-y-1">
					{#each sidebar.common as item (item.id)}
						<li>
							<a
								href={`/products/${item.id}`}
								class="flex items-center gap-2 rounded-lg px-2 py-1.5 hover:bg-surface-200/60 dark:hover:bg-surface-800/60"
							>
								<span class="grid h-7 w-7 shrink-0 place-items-center rounded-md bg-surface-200/60 text-sm dark:bg-surface-800">
									{item.icon ?? '🛒'}
								</span>
								<span class="min-w-0 flex-1">
									<span class="block truncate text-xs font-semibold">{item.itemName}</span>
									<span class="block text-[10px] opacity-50">bought {item.times}×</span>
								</span>
								<span class="text-[11px] font-semibold tabular-nums opacity-70">{formatCurrency(item.avgPrice)}</span>
							</a>
						</li>
					{/each}
				</ul>
			{:else}
				<p class="px-2 text-xs opacity-55">No items yet.</p>
			{/if}
		</section>

		<a
			href="/scan"
			class="group flex items-center justify-between rounded-xl bg-linear-to-br from-primary-500 to-primary-600 p-3 text-primary-950 shadow-lg shadow-primary-500/20 transition hover:brightness-105"
		>
			<span class="text-sm font-extrabold">Scan a receipt</span>
			<ChevronRight size={18} class="transition group-hover:translate-x-0.5" />
		</a>
	</div>

	<div class="border-t border-surface-200/70 p-3 dark:border-surface-800">
		<div class="flex items-center gap-2 rounded-xl p-2">
			<div class="grid h-9 w-9 shrink-0 place-items-center rounded-full bg-secondary-500/20 text-xs font-extrabold text-secondary-800 dark:text-secondary-200">
				{initials(user.name)}
			</div>
			<div class="min-w-0 flex-1">
				<p class="truncate text-xs font-bold">{user.name}</p>
				<p class="truncate text-[10px] opacity-50">{user.email}</p>
			</div>
			<ThemeToggle />
			<button
				type="button"
				class="btn-icon btn-icon-sm preset-tonal-error"
				onclick={signOut}
				aria-label="Sign out"
				title="Sign out"
			>
				<LogOut size={15} />
			</button>
		</div>
	</div>
</aside>
