<script lang="ts">
	import './layout.css';
	import type { LayoutProps } from './$types';

	let { children, data }: LayoutProps = $props();
</script>

<svelte:head>
	<title>Receipto</title>
</svelte:head>

{@render children()}
