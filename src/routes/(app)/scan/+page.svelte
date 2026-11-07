<script lang="ts">
	import ReceiptScanner from '#lib/components/ReceiptScanner.svelte';
	import { ScanLine, ShieldCheck } from 'lucide-svelte';
	import type { PageProps } from './$types';

	let { data }: PageProps = $props();
</script>

<svelte:head>
	<title>Scan a receipt · Receipto</title>
</svelte:head>

<div class="space-y-6">
	<header class="rise-in">
		<div class="flex flex-wrap items-center gap-2">
			<p class="text-xs font-bold uppercase tracking-[0.18em] text-primary-700 dark:text-primary-300">Receipt scanner</p>
			<span class="badge preset-tonal-primary gap-1 text-[10px]"><ShieldCheck size={12} /> Private by default</span>
		</div>
		<h1 class="mt-1 text-3xl font-extrabold tracking-tight sm:text-4xl">Scan a receipt</h1>
	</header>

	<ReceiptScanner stores={data.stores} recentStores={data.recentStores} />

	<div class="flex items-center justify-center gap-2 pb-2 text-[10px] opacity-40">
		<ScanLine size={12} /> Powered by Datalab Indra OCR · model weights OpenRAIL-M
	</div>
</div>
