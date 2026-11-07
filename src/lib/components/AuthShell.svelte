<script lang="ts">
	import Logo from './Logo.svelte';
	import ThemeToggle from './ThemeToggle.svelte';

	let {
		title,
		children
	}: {
		title: string;
		children: import('svelte').Snippet;
	} = $props();
</script>

<div class="min-h-dvh bg-surface-50 dark:bg-surface-950">
	<div class="mx-auto flex min-h-dvh w-full max-w-sm flex-col px-5 py-6">
		<div class="flex items-center justify-between">
			<a href="/" aria-label="Receipto home"><Logo /></a>
			<ThemeToggle />
		</div>
		<div class="my-auto py-12">
			<h1 class="text-2xl font-extrabold tracking-tight">{title}</h1>
			<div class="mt-5">{@render children()}</div>
		</div>
	</div>
</div>
