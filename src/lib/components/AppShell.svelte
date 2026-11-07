<script lang="ts">
	import { page } from '$app/state';
	import Logo from './Logo.svelte';
	import Sidebar from './Sidebar.svelte';
	import ThemeToggle from './ThemeToggle.svelte';
	import { Menu } from 'lucide-svelte';
	import { initials } from '#lib/utils/format';

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
		flush = false,
		children
	}: {
		user: { name: string; email: string };
		sidebar: SidebarData;
		location?: Location | null;
		flush?: boolean;
		children: import('svelte').Snippet;
	} = $props();

	let mobileOpen = $state(false);

	$effect(() => {
		// Close the drawer whenever the route changes.
		page.url.pathname;
		mobileOpen = false;
	});
</script>

<div class="min-h-dvh">
	<div class="fixed inset-y-0 left-0 z-40 hidden w-72 lg:block">
		<Sidebar {user} {sidebar} {location} />
	</div>

	<div class="lg:pl-72">
		<header class="glass-nav sticky top-0 z-30 flex h-16 items-center gap-3 border-b border-surface-200/60 px-4 dark:border-surface-800 lg:hidden">
			<button
				type="button"
				class="btn-icon preset-tonal-surface"
				onclick={() => (mobileOpen = true)}
				aria-label="Open menu"
			>
				<Menu size={19} />
			</button>
			<a href="/dashboard" aria-label="Receipto home"><Logo size={28} /></a>
			<div class="ml-auto flex items-center gap-2">
				<ThemeToggle />
				<div class="grid h-9 w-9 place-items-center rounded-full bg-secondary-500/20 text-xs font-extrabold text-secondary-800 dark:text-secondary-200">
					{initials(user.name)}
				</div>
			</div>
		</header>

		<main class={flush ? '' : 'mx-auto max-w-[1500px] p-4 md:p-6 lg:p-8'}>
			{@render children()}
		</main>
	</div>

	{#if mobileOpen}
		<div class="fixed inset-0 z-50 lg:hidden">
			<button
				type="button"
				class="absolute inset-0 bg-surface-950/50 backdrop-blur-sm"
				onclick={() => (mobileOpen = false)}
				aria-label="Close menu overlay"
			></button>
			<div class="absolute inset-y-0 left-0 w-[min(88vw,20rem)] shadow-2xl">
				<Sidebar {user} {sidebar} {location} onClose={() => (mobileOpen = false)} />
			</div>
		</div>
	{/if}
</div>
