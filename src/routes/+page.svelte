<script lang="ts">
	import Logo from '#lib/components/Logo.svelte';
	import Sparkline from '#lib/components/Sparkline.svelte';
	import ThemeToggle from '#lib/components/ThemeToggle.svelte';
	import { formatCurrency } from '#lib/utils/format';
	import {
		ArrowRight,
		MapPin,
		ReceiptText,
		ScanLine,
		Store,
		TrendingDown,
		Zap
	} from 'lucide-svelte';
	import type { PageProps } from './$types';

	let { data }: PageProps = $props();

	const features = [
		{ icon: ScanLine, title: 'Scan receipts', text: 'On-device OCR.' },
		{ icon: MapPin, title: 'Map stores', text: 'OpenStreetMap prices.' },
		{ icon: TrendingDown, title: 'Compare baskets', text: 'Current vs previous shop.' }
	];

	const mockSeries = [68, 72, 64, 81, 77, 86, 74, 92];
</script>

<svelte:head>
	<title>Receipto — UK supermarket prices</title>
	<meta name="description" content="Scan receipts and compare food prices across UK supermarkets." />
</svelte:head>

<div class="min-h-dvh">
	<header class="sticky top-0 z-40 border-b border-surface-200/50 bg-surface-50/70 backdrop-blur-xl dark:border-surface-800/70 dark:bg-surface-950/60">
		<div class="mx-auto flex h-16 max-w-7xl items-center gap-4 px-4 sm:px-6">
			<a href="/" aria-label="Receipto home"><Logo /></a>
			<div class="ml-auto flex items-center gap-2">
				<ThemeToggle />
				<a href="/login" class="btn btn-sm preset-tonal-surface">Sign in</a>
				<a href="/register" class="btn btn-sm preset-filled-primary-500 gap-1.5">
					Create account <ArrowRight size={15} />
				</a>
			</div>
		</div>
	</header>

	<main>
		<section class="mx-auto grid max-w-7xl gap-12 px-4 pb-16 pt-14 sm:px-6 lg:grid-cols-[1.05fr_1fr] lg:items-center lg:pb-24 lg:pt-20">
			<div class="rise-in">
				<h1 class="text-4xl font-extrabold leading-[1.05] tracking-tight sm:text-5xl lg:text-6xl">
					UK supermarket<br />
					<span class="bg-linear-to-r from-primary-600 via-secondary-600 to-tertiary-500 bg-clip-text text-transparent">price tracker.</span>
				</h1>
				<p class="mt-5 max-w-md text-base opacity-65 sm:text-lg">
					Scan a receipt and compare prices across stores.
				</p>
				<div class="mt-7 flex flex-wrap gap-3">
					<a href="/register" class="btn preset-filled-primary-500 gap-2">
						<ScanLine size={18} /> Start
					</a>
					<a href="/login" class="btn preset-tonal-surface gap-2">
						<TrendingDown size={18} /> Sign in
					</a>
				</div>
			</div>

			<div class="relative mx-auto w-full max-w-lg lg:max-w-none">
				<div class="surface-card relative rounded-3xl p-4 sm:p-5">
					<div class="flex items-center justify-between">
						<div>
							<p class="text-[10px] font-bold uppercase tracking-[0.16em] opacity-45">This month</p>
							<p class="mt-1 text-3xl font-extrabold tracking-tight">£284.60</p>
						</div>
						<span class="grid h-11 w-11 place-items-center rounded-2xl bg-primary-500/15 text-primary-800 dark:text-primary-200">
							<ReceiptText size={21} />
						</span>
					</div>

					<div class="mt-4 rounded-2xl bg-surface-200/40 p-3 dark:bg-surface-800/40">
						<div class="flex items-center justify-between">
							<p class="text-[10px] font-bold uppercase tracking-wide opacity-45">Basket</p>
							<span class="badge preset-tonal-primary text-[9px]">8 shops</span>
						</div>
						<Sparkline values={mockSeries} width={420} height={78} />
					</div>

					<div class="mt-3 space-y-2">
						{#each [
							{ chain: 'Tesco', city: 'London', price: 42.15, colour: '#00539f' },
							{ chain: "Sainsbury's", city: 'London', price: 39.8, colour: '#f06c00' },
							{ chain: 'Waitrose', city: 'London', price: 51.1, colour: '#7ab800' }
						] as shop (shop.chain)}
							<div class="flex items-center gap-2.5 rounded-xl border border-surface-200/60 p-2.5 dark:border-surface-800">
								<span class="grid h-8 w-8 place-items-center rounded-lg text-[10px] font-extrabold text-white" style={`background:${shop.colour}`}>{shop.chain.slice(0, 2).toUpperCase()}</span>
								<span class="min-w-0 flex-1">
									<span class="block text-xs font-bold">{shop.chain}</span>
									<span class="block text-[10px] opacity-50">{shop.city}</span>
								</span>
								<span class="text-xs font-extrabold tabular-nums">{formatCurrency(shop.price)}</span>
							</div>
						{/each}
					</div>
				</div>
			</div>
		</section>

		<section class="border-y border-surface-200/60 bg-surface-50/40 py-6 dark:border-surface-800 dark:bg-surface-950/30">
			<div class="mx-auto grid max-w-7xl grid-cols-2 gap-4 px-4 sm:grid-cols-4 sm:px-6">
				{#each [
					{ value: data.stats.chains, label: 'Chains', icon: Store },
					{ value: data.stats.shops, label: 'Stores', icon: MapPin },
					{ value: data.stats.products, label: 'Products', icon: ReceiptText },
					{ value: data.stats.prices, label: 'Prices', icon: Zap }
				] as stat (stat.label)}
					<div class="flex items-center gap-3">
						<span class="grid h-10 w-10 place-items-center rounded-xl bg-primary-500/12 text-primary-800 dark:text-primary-200">
							<stat.icon size={18} />
						</span>
						<div>
							<p class="text-xl font-extrabold tabular-nums">{stat.value.toLocaleString('en-GB')}</p>
							<p class="text-[10px] font-bold uppercase tracking-wide opacity-45">{stat.label}</p>
						</div>
					</div>
				{/each}
			</div>
		</section>

		<section class="mx-auto max-w-7xl px-4 py-16 sm:px-6">
			<div class="grid gap-4 md:grid-cols-3">
				{#each features as feature (feature.title)}
					<div class="surface-card rounded-2xl p-5">
						<div class="grid h-11 w-11 place-items-center rounded-xl bg-primary-500/12 text-primary-800 dark:text-primary-200">
							<feature.icon size={21} />
						</div>
						<h2 class="mt-4 text-lg font-extrabold tracking-tight">{feature.title}</h2>
						<p class="mt-1 text-sm opacity-55">{feature.text}</p>
					</div>
				{/each}
			</div>
		</section>
	</main>

	<footer class="border-t border-surface-200/60 py-8 dark:border-surface-800">
		<div class="mx-auto flex max-w-7xl flex-col gap-4 px-4 text-xs opacity-55 sm:flex-row sm:items-center sm:justify-between sm:px-6">
			<div class="flex items-center gap-2">
				<Logo size={24} compact />
				<span>Receipto</span>
			</div>
			<p>
				Map data © <a class="underline" href="https://www.openstreetmap.org/copyright" target="_blank" rel="noreferrer">OpenStreetMap</a> contributors ·
				OCR by <a class="underline" href="https://huggingface.co/datalab-to/indra-ocr" target="_blank" rel="noreferrer">Datalab Indra OCR</a>
			</p>
		</div>
	</footer>
</div>
