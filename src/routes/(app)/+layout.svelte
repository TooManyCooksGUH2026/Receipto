<script lang="ts">
	import { page } from '$app/state';
	import AppShell from '#lib/components/AppShell.svelte';
	import type { LayoutProps } from './$types';

	let { data, children }: LayoutProps = $props();
	let flush = $derived(page.url.pathname.startsWith('/map'));
</script>

{#if data.user}
	<AppShell user={data.user} sidebar={data.sidebar} location={data.location} {flush}>
		{@render children()}
	</AppShell>
{/if}
