<script lang="ts">
	import { page } from '$app/state';
	import Logo from '#lib/components/Logo.svelte';
	import { ArrowLeft, MapPin, SearchX } from 'lucide-svelte';
</script>

<svelte:head>
	<title>{page.status} · Receipto</title>
</svelte:head>

<div class="grid min-h-dvh place-items-center p-6">
	<div class="surface-card w-full max-w-lg rounded-3xl p-8 text-center">
		<div class="mx-auto w-fit"><Logo /></div>
		<div class="mx-auto mt-8 grid h-16 w-16 place-items-center rounded-2xl bg-error-500/12 text-error-800 dark:text-error-200">
			<SearchX size={30} />
		</div>
		<p class="mt-5 text-xs font-bold uppercase tracking-[0.18em] opacity-45">Error {page.status}</p>
		<h1 class="mt-1 text-2xl font-extrabold tracking-tight">
			{page.status === 404 ? 'Page not found' : 'Error'}
		</h1>
		<p class="mt-2 text-sm opacity-60">{page.error?.message ?? 'Not found.'}</p>
		<div class="mt-6 flex flex-wrap justify-center gap-2">
			<a href="/dashboard" class="btn preset-filled-primary-500 gap-2"><ArrowLeft size={16} /> Dashboard</a>
			<a href="/map" class="btn preset-tonal-surface gap-2"><MapPin size={16} /> Price map</a>
		</div>
	</div>
</div>
