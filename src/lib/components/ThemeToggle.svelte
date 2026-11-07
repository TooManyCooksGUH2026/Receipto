<script lang="ts">
	import { onMount } from 'svelte';
	import { Moon, Sun } from 'lucide-svelte';

	let mode = $state<'light' | 'dark'>('light');

	onMount(() => {
		mode = document.documentElement.dataset.mode === 'dark' ? 'dark' : 'light';
	});

	function toggle() {
		mode = mode === 'dark' ? 'light' : 'dark';
		if (mode === 'dark') document.documentElement.dataset.mode = 'dark';
		else delete document.documentElement.dataset.mode;
		try {
			localStorage.setItem('receipto-mode', mode);
		} catch {
			/* ignore */
		}
	}
</script>

<button
	type="button"
	class="btn-icon preset-tonal-surface"
	aria-label={mode === 'dark' ? 'Switch to light mode' : 'Switch to dark mode'}
	title={mode === 'dark' ? 'Light mode' : 'Dark mode'}
	onclick={toggle}
>
	{#if mode === 'dark'}
		<Sun size={17} />
	{:else}
		<Moon size={17} />
	{/if}
</button>
