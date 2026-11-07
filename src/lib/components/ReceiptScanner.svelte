<script lang="ts">
	import { goto } from '$app/navigation';
	import { readReceiptImage, type ReceiptOcrProgress } from '#lib/ocr/indra';
	import { SAMPLE_RECEIPT } from '#lib/data/sample-receipt';
	import type { ParsedReceipt } from '#lib/utils/receipt-types';
	import { formatCurrency } from '#lib/utils/format';
	import {
		IMAGE_MAX_BYTES,
		prepareReceiptImage,
		type PreparedImage
	} from '#lib/utils/image';
	import { shopDisplayName } from '#lib/utils/shop-name';
	import {
		Calendar,
		Camera,
		Check,
		ChevronDown,
		CircleAlert,
		CircleCheck,
		FileText,
		ImageUp,
		Info,
		LoaderCircle,
		Plus,
		RotateCcw,
		ScanLine,
		ShieldCheck,
		Sparkles,
		Store,
		Trash2,
		Upload,
		WandSparkles
	} from 'lucide-svelte';
	import { onDestroy } from 'svelte';

	type StoreOption = {
		id: number;
		shopName: string;
		supermarketName: string;
		area: string | null;
		city: string;
		region: string;
		address: string | null;
	};

	type Match = {
		id: number;
		itemName: string;
		brand: string | null;
		supermarket: string | null;
		className: string;
		score: number;
		matchedOn?: string;
	};

	type EditableItem = {
		key: string;
		name: string;
		price: number;
		quantity: number;
		productId: number | null;
		matches: Match[];
	};

	type EditableDiscount = {
		key: string;
		name: string;
		amount: number;
	};

	let {
		stores,
		recentStores
	}: {
		stores: StoreOption[];
		recentStores: {
			shopId: number;
			shopName: string;
			area: string | null;
			supermarket: string;
			city: string;
			visits: number;
		}[];
	} = $props();

	let mode = $state<'photo' | 'paste'>('photo');
	let file = $state<File | null>(null);
	let previewUrl = $state('');
	let ocrText = $state('');
	let ocrMarkdown = $state('');
	let ocrError = $state('');
	let parseError = $state('');
	let pastedText = $state('');
	let preparedImage = $state<PreparedImage | null>(null);
	let compressionInfo = $state('');
	let parsed = $state<ParsedReceipt | null>(null);
	let items = $state<EditableItem[]>([]);
	let discounts = $state<EditableDiscount[]>([]);
	let warnings = $state<string[]>([]);
	let shopId = $state<number | null>(recentStores[0]?.shopId ?? stores[0]?.id ?? null);
	let chain = $state(
		stores.find((store) => store.id === (recentStores[0]?.shopId ?? stores[0]?.id))?.supermarketName ??
			stores[0]?.supermarketName ??
			''
	);
	let purchasedAt = $state(new Date().toISOString().slice(0, 10));
	let total = $state<number | null>(null);
	let busy = $state<'idle' | 'ocr' | 'matching' | 'saving'>('idle');
	let progress = $state<ReceiptOcrProgress>({
		stage: 'loading',
		percent: 0,
		message: 'Indra OCR loads on first use'
	});
	let saveError = $state('');
	let showRaw = $state(false);
	let parserSource = $state<'gemma' | null>(null);
	let parserModel = $state<string | null>(null);

	let chainOptions = $derived(
		[...new Set(stores.map((store) => store.supermarketName))].sort((a, b) => a.localeCompare(b))
	);

	let storeGroups = $derived.by(() => {
		const map = new Map<string, StoreOption[]>();
		for (const store of stores) {
			if (store.supermarketName !== chain) continue;
			const list = map.get(store.city) ?? [];
			list.push(store);
			map.set(store.city, list);
		}
		return [...map.entries()].sort((a, b) => a[0].localeCompare(b[0]));
	});

	function changeChain(next: string) {
		chain = next;
		const first = stores.find((store) => store.supermarketName === next);
		shopId = first?.id ?? null;
	}

	let itemsTotal = $derived(
		Math.round(items.reduce((sum, item) => sum + (Number(item.price) || 0), 0) * 100) / 100
	);
	let discountsTotal = $derived(
		Math.round(
			discounts.reduce((sum, discount) => sum + Math.abs(Number(discount.amount) || 0), 0) * 100
		) / 100
	);
	let expectedTotal = $derived(Math.round((itemsTotal - discountsTotal) * 100) / 100);
	let totalMismatch = $derived(
		total !== null && Math.abs(Number(total) - expectedTotal) > 0.02
	);
	let canSave = $derived(
		busy === 'idle' && shopId !== null && items.some((item) => item.name.trim() && item.price > 0)
	);

	onDestroy(() => {
		if (previewUrl) URL.revokeObjectURL(previewUrl);
	});

	function clearParse() {
		parsed = null;
		items = [];
		discounts = [];
		warnings = [];
		parseError = '';
		parserSource = null;
		parserModel = null;
	}

	function setFile(next: File) {
		if (!next.type.startsWith('image/')) {
			ocrError = 'Choose an image of a paper receipt (JPG, PNG or HEIC).';
			return;
		}
		if (previewUrl) URL.revokeObjectURL(previewUrl);
		file = next;
		previewUrl = URL.createObjectURL(next);
		ocrError = '';
		ocrText = '';
		ocrMarkdown = '';
		preparedImage = null;
		compressionInfo = '';
		clearParse();
	}

	function handleInput(event: Event) {
		const input = event.currentTarget as HTMLInputElement;
		const next = input.files?.[0];
		if (next) setFile(next);
		// Allow re-selecting the same file later.
		input.value = '';
	}

	function handleDrop(event: DragEvent) {
		event.preventDefault();
		const next = event.dataTransfer?.files?.[0];
		if (next) setFile(next);
	}

	function resetPhoto() {
		if (previewUrl) URL.revokeObjectURL(previewUrl);
		file = null;
		previewUrl = '';
		ocrError = '';
		ocrText = '';
		ocrMarkdown = '';
		preparedImage = null;
		compressionInfo = '';
		clearParse();
	}

	async function runOcr() {
		if (!file || busy !== 'idle') return;
		busy = 'ocr';
		ocrError = '';
		clearParse();
		progress = { stage: 'loading', percent: 1, message: 'Compressing image…' };

		try {
			const prepared = await prepareReceiptImage(file);
			preparedImage = prepared;
			compressionInfo = prepared.compressed
				? `Compressed ${(prepared.originalBytes / 1_000_000).toFixed(1)} MB → ${(prepared.bytes / 1_000_000).toFixed(1)} MB (${prepared.width}×${prepared.height}).`
				: `Image is within the ${(IMAGE_MAX_BYTES / 1_000_000).toFixed(1)} MB limit.`;

			progress = { stage: 'loading', percent: 4, message: 'Starting on-device OCR…' };
			let text = '';
			try {
				const result = await readReceiptImage(prepared.file, (next) => (progress = next));
				text = result.text;
				ocrText = result.text;
				ocrMarkdown = result.markdown;
				if (!text.trim()) {
					ocrError = 'OCR found no readable text; Gemma 4 will read the image directly.';
				}
			} catch (error) {
				console.error(error);
				ocrError = 'Indra OCR could not start; Gemma 4 will read the image directly.';
			}

			// Gemma 4 is the only parser: send the OCR text and compressed image
			// straight to the server. There is no local fallback.
			await parseWithGemma(text, prepared.dataUrl);
		} catch (error) {
			console.error(error);
			ocrError = 'Could not prepare this image. Try a JPG or PNG photo.';
			busy = 'idle';
		}
	}

	type ParseResponse = {
		receipt: ParsedReceipt;
		items: { name: string; price: number; quantity: number; matches: Match[] }[];
		model: string | null;
	};

	function applyReceipt(receipt: ParsedReceipt, matches: ParseResponse['items'], model: string | null) {
		parsed = receipt;
		warnings = receipt.warnings.filter(
			(warning) => !warning.startsWith('Items £') && !warning.startsWith('Gemma items £')
		);
		items = receipt.items.map((item, index) => {
			const candidates = matches[index]?.matches ?? [];
			const best = candidates[0];
			return {
				key: crypto.randomUUID(),
				name: item.name,
				price: item.price,
				quantity: item.quantity,
				productId: best && best.score >= 0.45 ? best.id : null,
				matches: candidates
			};
		});
		discounts = receipt.discounts.map((discount) => ({
			key: crypto.randomUUID(),
			name: discount.name,
			amount: discount.amount
		}));
		total = receipt.total;
		purchasedAt = receipt.purchasedAt.slice(0, 10);
		parserSource = 'gemma';
		parserModel = model;

		const detectedChain =
			receipt.supermarket && stores.some((store) => store.supermarketName === receipt.supermarket)
				? receipt.supermarket
				: null;
		const recentStore = recentStores
			.map((recent) => stores.find((store) => store.id === recent.shopId))
			.find(Boolean);
		chain =
			detectedChain ??
			recentStore?.supermarketName ??
			stores[0]?.supermarketName ??
			'';
		const chainStores = stores.filter((store) => store.supermarketName === chain);
		shopId =
			chainStores.find((store) => store.city === recentStore?.city)?.id ??
			chainStores[0]?.id ??
			recentStore?.id ??
			stores[0]?.id ??
			null;
	}

	async function parseWithGemma(text: string, imageDataUrl: string | null) {
		parseError = '';
		parsed = null;
		items = [];
		discounts = [];
		warnings = [];
		parserSource = null;
		parserModel = null;
		busy = 'matching';

		try {
			const response = await fetch('/api/receipts/parse', {
				method: 'POST',
				headers: { 'Content-Type': 'application/json' },
				body: JSON.stringify({ text, image: imageDataUrl })
			});
			const data = (await response.json().catch(() => null)) as
				| (ParseResponse & { error?: string })
				| null;
			if (!response.ok) {
				throw new Error(data?.error ?? 'Gemma 4 parsing failed');
			}
			if (!data) throw new Error('Gemma 4 returned an empty response');
			applyReceipt(data.receipt, data.items, data.model);
		} catch (error) {
			console.error(error);
			parseError = error instanceof Error ? error.message : 'Gemma 4 parsing failed';
		} finally {
			busy = 'idle';
		}
	}

	async function retryParse() {
		if (busy !== 'idle') return;
		const text = ocrText || pastedText;
		const image = preparedImage?.dataUrl ?? null;
		if (!text && !image) return;
		await parseWithGemma(text, image);
	}

	async function useSample() {
		pastedText = SAMPLE_RECEIPT;
		ocrText = SAMPLE_RECEIPT;
		ocrMarkdown = '';
		preparedImage = null;
		compressionInfo = '';
		mode = 'paste';
		await parseWithGemma(SAMPLE_RECEIPT, null);
	}

	async function parsePasted() {
		if (!pastedText.trim() || busy !== 'idle') return;
		ocrText = pastedText;
		ocrMarkdown = '';
		preparedImage = null;
		compressionInfo = '';
		await parseWithGemma(pastedText, null);
	}

	async function refreshMatches(item: EditableItem) {
		if (!item.name.trim()) return;
		const supermarket = stores.find((store) => store.id === shopId)?.supermarketName ?? null;
		try {
			const response = await fetch('/api/products/match', {
				method: 'POST',
				headers: { 'Content-Type': 'application/json' },
				body: JSON.stringify({ name: item.name, supermarket })
			});
			if (!response.ok) return;
			const data = (await response.json()) as { matches: Match[] };
			item.matches = data.matches;
			if (item.productId === null && data.matches[0]?.score >= 0.45) {
				item.productId = data.matches[0].id;
			}
		} catch {
			/* keep current matches */
		}
	}

	function addItem() {
		items = [
			...items,
			{
				key: crypto.randomUUID(),
				name: '',
				price: 0,
				quantity: 1,
				productId: null,
				matches: []
			}
		];
	}

	function removeItem(key: string) {
		items = items.filter((item) => item.key !== key);
	}

	function addDiscount() {
		discounts = [
			...discounts,
			{ key: crypto.randomUUID(), name: 'Discount', amount: 0 }
		];
	}

	function removeDiscount(key: string) {
		discounts = discounts.filter((discount) => discount.key !== key);
	}

	async function save() {
		if (!canSave || shopId === null) return;
		saveError = '';
		busy = 'saving';
		try {
			const validItems = items.filter((item) => item.name.trim() && Number(item.price) >= 0);
			const validDiscounts = discounts.filter((discount) => Number(discount.amount) > 0);
			const response = await fetch('/api/receipts', {
				method: 'POST',
				headers: { 'Content-Type': 'application/json' },
				body: JSON.stringify({
					shopId,
					purchasedAt: new Date(`${purchasedAt}T12:00:00`).toISOString(),
					subtotal: itemsTotal,
					discountTotal: discountsTotal,
					total,
					items: validItems.map((item) => ({
						name: item.name.trim(),
						price: Number(item.price) || 0,
						quantity: Number(item.quantity) || 1,
						productId: item.productId
					})),
					discounts: validDiscounts.map((discount) => ({
						name: discount.name.trim() || 'Discount',
						amount: Math.abs(Number(discount.amount) || 0)
					})),
					source: file ? 'ocr' : 'manual',
					ocrText: ocrText || null
				})
			});
			const data = await response.json();
			if (!response.ok) throw new Error(data.error ?? 'Could not save the receipt');
			goto('/dashboard?scanned=1');
		} catch (error) {
			saveError = error instanceof Error ? error.message : 'Could not save the receipt';
			busy = 'idle';
		}
	}
</script>

<div class="grid gap-5 xl:grid-cols-[1.02fr_1fr]">
	<div class="space-y-5">
		<section class="surface-card rounded-2xl p-4 sm:p-5">
			<div class="mb-4 flex items-center justify-between gap-3">
				<h2 class="text-lg font-extrabold tracking-tight">1. Capture</h2>
				<span class="badge preset-tonal-primary gap-1.5 text-[10px]">
					<ShieldCheck size={12} /> On-device
				</span>
			</div>

			<div class="btn-group preset-outlined-surface-200-800 mb-4 w-full">
				<button type="button" class="btn flex-1 {mode === 'photo' ? 'preset-filled' : 'preset-tonal'}" onclick={() => (mode = 'photo')}>
					<Camera size={15} /> Photo
				</button>
				<button type="button" class="btn flex-1 {mode === 'paste' ? 'preset-filled' : 'preset-tonal'}" onclick={() => (mode = 'paste')}>
					<FileText size={15} /> Paste text
				</button>
			</div>

			{#if mode === 'photo'}
				{#if previewUrl}
					<div class="relative overflow-hidden rounded-xl border border-surface-200 bg-surface-950/5 dark:border-surface-700">
						<img src={previewUrl} alt="Receipt preview" class="max-h-80 w-full object-contain" />
						<button type="button" class="absolute right-2 top-2 btn-icon btn-icon-sm preset-filled-surface-500" onclick={resetPhoto} aria-label="Remove photo">
							<RotateCcw size={15} />
						</button>
					</div>
				{:else}
					<label
						class="flex cursor-pointer flex-col items-center justify-center rounded-xl border-2 border-dashed border-surface-300/80 bg-surface-200/20 px-4 py-10 text-center transition hover:border-primary-400 hover:bg-primary-500/5 dark:border-surface-700 dark:bg-surface-800/20"
						ondragover={(event) => event.preventDefault()}
						ondrop={handleDrop}
					>
						<div class="grid h-14 w-14 place-items-center rounded-2xl bg-primary-500/15 text-primary-800 dark:text-primary-200">
							<ImageUp size={26} />
						</div>
						<p class="mt-3 text-sm font-extrabold">Drop a receipt photo here</p>
						<input type="file" accept="image/*" class="sr-only" onchange={handleInput} />
					</label>
					<div class="mt-3 flex flex-wrap gap-2">
						<label class="btn btn-sm preset-tonal-primary gap-1.5 cursor-pointer">
							<Camera size={15} /> Use camera
							<input type="file" accept="image/*" capture="environment" class="sr-only" onchange={handleInput} />
						</label>
						<label class="btn btn-sm preset-tonal-surface gap-1.5 cursor-pointer">
							<Upload size={15} /> Upload image
							<input type="file" accept="image/*" class="sr-only" onchange={handleInput} />
						</label>
					</div>
				{/if}

				<div class="mt-4 flex flex-wrap gap-2">
					<button
						type="button"
						class="btn preset-filled-primary-500 flex-1 gap-2"
						disabled={!file || busy !== 'idle'}
						onclick={runOcr}
					>
						{#if busy === 'ocr'}
							<LoaderCircle size={17} class="animate-spin" /> Reading…
						{:else}
							<ScanLine size={17} /> Read with Indra OCR
						{/if}
					</button>
					<button type="button" class="btn preset-tonal-surface gap-2" onclick={useSample} disabled={busy !== 'idle'}>
						<Sparkles size={16} /> Sample receipt
					</button>
				</div>
			{:else}
				<textarea
					bind:value={pastedText}
					rows="10"
					class="textarea w-full font-mono text-xs"
					placeholder="Paste the text from a digital receipt or an OCR app…"
				></textarea>
				<div class="mt-3 flex flex-wrap gap-2">
					<button type="button" class="btn preset-filled-primary-500 flex-1 gap-2" disabled={!pastedText.trim() || busy !== 'idle'} onclick={parsePasted}>
						{#if busy === 'matching'}
							<LoaderCircle size={16} class="animate-spin" /> Parsing…
						{:else}
							<WandSparkles size={16} /> Parse receipt text
						{/if}
					</button>
					<button type="button" class="btn preset-tonal-surface gap-2" onclick={useSample} disabled={busy !== 'idle'}>
						<Sparkles size={16} /> Load sample
					</button>
				</div>
			{/if}

			{#if busy === 'ocr' || progress.percent > 0}
				<div class="mt-4 rounded-xl bg-surface-200/40 p-3 dark:bg-surface-800/40" role="status" aria-live="polite">
					<div class="flex items-center justify-between gap-2 text-xs">
						<span class="flex items-center gap-1.5 font-bold">
							{#if busy === 'ocr'}<LoaderCircle size={13} class="animate-spin" />{/if}
							{progress.message}
						</span>
						<span class="tabular-nums opacity-55">{progress.percent}%</span>
					</div>
					<div class="mt-2 h-2 overflow-hidden rounded-full bg-surface-300/60 dark:bg-surface-700">
						<div
							class="h-full rounded-full bg-linear-to-r from-primary-500 to-secondary-500 transition-all duration-300"
							style={`width:${Math.max(2, progress.percent)}%`}
						></div>
					</div>
					<p class="mt-2 text-[10px] opacity-50">
						First run downloads ~40 MB of Indra OCR models. The image is compressed on-device; OCR runs locally, then the compressed image and OCR text go to Gemma 4.
					</p>
				</div>
			{/if}

			{#if ocrError}
				<div class="mt-3 flex items-start gap-2 rounded-xl border border-error-500/30 bg-error-500/10 p-3 text-xs text-error-800 dark:text-error-200">
					<CircleAlert size={16} class="mt-0.5 shrink-0" />
					<p>{ocrError}</p>
				</div>
			{/if}

			{#if compressionInfo}
				<p class="mt-2 text-[10px] opacity-45">{compressionInfo}</p>
			{/if}

			<p class="mt-3 text-[10px] opacity-45">
				Images over {(IMAGE_MAX_BYTES / 1_000_000).toFixed(1)} MB or 2000px are resized on-device. The compressed image and OCR text are sent to Gemma 4 for parsing; product matching runs on the server.
			</p>


		</section>

		{#if parsed}
			<section class="surface-card rounded-2xl p-4 sm:p-5">
				<button
					type="button"
					class="flex w-full items-center justify-between text-left"
					onclick={() => (showRaw = !showRaw)}
				>
					<span>
						<span class="block text-sm font-extrabold">OCR output</span>
						<span class="block text-xs opacity-50">{ocrText.split('\n').length} lines read</span>
					</span>
					<ChevronDown size={16} class="opacity-50 transition {showRaw ? 'rotate-180' : ''}" />
				</button>
				{#if showRaw}
					<pre class="mt-3 max-h-72 overflow-auto rounded-xl bg-surface-950 p-3 text-[10px] leading-relaxed text-surface-100 scrollbar-thin">{ocrText}</pre>
				{/if}
			</section>
		{/if}
	</div>

	<div class="space-y-5">
		{#if parsed}
			<section class="surface-card rounded-2xl p-4 sm:p-5">
				<div class="mb-4 flex items-start justify-between gap-3">
					<h2 class="text-lg font-extrabold tracking-tight">2. Review</h2>
					<div class="flex flex-wrap items-center justify-end gap-1.5">
						{#if parserSource === 'gemma'}
							<span class="badge preset-tonal-secondary gap-1 text-[9px]" title={parserModel ?? 'Gemma 4'}>
								<Sparkles size={10} /> Gemma 4
							</span>
						{/if}
						<span class="badge preset-tonal-primary">{items.length} items</span>
					</div>
				</div>

				{#if warnings.length}
					<div class="mb-4 space-y-1 rounded-xl border border-warning-500/30 bg-warning-500/10 p-3 text-[11px] text-warning-950 dark:text-warning-100">
						{#each warnings as warning, index (index)}
							<p class="flex items-start gap-1.5"><Info size={13} class="mt-0.5 shrink-0" /> {warning}</p>
						{/each}
					</div>
				{/if}

				<div class="grid gap-3 sm:grid-cols-3">
					<label class="label">
						<span class="label-text">Supermarket</span>
						<select class="select w-full" value={chain} onchange={(event) => changeChain(event.currentTarget.value)}>
							{#each chainOptions as option (option)}
								<option value={option}>{option}</option>
							{/each}
						</select>
					</label>
					<label class="label sm:col-span-2">
						<span class="label-text flex items-center gap-1.5"><Store size={13} /> Store</span>
						<select class="select w-full" bind:value={shopId}>
							{#each storeGroups as [city, cityStores] (city)}
								<optgroup label={city}>
									{#each cityStores as store (store.id)}
										<option value={store.id}>{shopDisplayName(store.shopName, store.area)}</option>
									{/each}
								</optgroup>
							{/each}
						</select>
					</label>
				</div>
				<div class="mt-2 grid gap-3 sm:grid-cols-2">
					<label class="label">
						<span class="label-text flex items-center gap-1.5"><Calendar size={13} /> Date</span>
						<input type="date" class="input w-full" bind:value={purchasedAt} />
					</label>
					<div></div>
				</div>

				{#if recentStores.length}
					<div class="mt-2 flex flex-wrap gap-1.5">
						<span class="text-[10px] font-bold uppercase tracking-wide opacity-45">Recent:</span>
						{#each recentStores as recent (recent.shopId)}
							<button
								type="button"
								class="badge {shopId === recent.shopId ? 'preset-filled-primary-500' : 'preset-tonal-surface'} text-[10px]"
								onclick={() => {
									chain = recent.supermarket;
									shopId = recent.shopId;
								}}
							>
								{shopDisplayName(recent.shopName, recent.area)}
							</button>
						{/each}
					</div>
				{/if}

				<div class="mt-5">
					<div class="mb-2 flex items-center justify-between">
						<h3 class="text-xs font-bold uppercase tracking-[0.14em] opacity-50">Line items</h3>
						<button type="button" class="btn btn-xs preset-tonal-primary gap-1" onclick={addItem}>
							<Plus size={13} /> Add item
						</button>
					</div>

					<div class="space-y-2">
						{#each items as item (item.key)}
							<div class="rounded-xl border border-surface-200/70 p-2.5 dark:border-surface-800">
								<div class="flex flex-wrap items-start gap-2">
									<input
										class="input input-sm w-full min-w-0 flex-1 font-semibold sm:min-w-[12rem]"
										bind:value={item.name}
										placeholder="Item name"
										aria-label="Item name"
										onblur={() => refreshMatches(item)}
									/>
									<div class="flex shrink-0 items-center gap-2">
										<input
											type="number"
											step="0.01"
											min="0"
											inputmode="decimal"
											class="input input-sm w-24 text-right tabular-nums"
											bind:value={item.price}
											aria-label="Price"
										/>
										<input
											type="number"
											step="1"
											min="1"
											inputmode="numeric"
											class="input input-sm w-20 text-center tabular-nums"
											bind:value={item.quantity}
											aria-label="Quantity"
										/>
										<button type="button" class="btn-icon btn-icon-sm preset-tonal-error shrink-0" onclick={() => removeItem(item.key)} aria-label="Remove item">
											<Trash2 size={14} />
										</button>
									</div>
								</div>
								<div class="mt-2 flex items-center gap-2">
									<select
										class="select select-sm min-w-0 flex-1 text-xs"
										value={item.productId ?? ''}
										onchange={(event) => (item.productId = event.currentTarget.value ? Number(event.currentTarget.value) : null)}
									>
										<option value="">Create new product “{item.name || 'unnamed'}”</option>
										{#each item.matches as match (match.id)}
											<option value={match.id}>
												{match.itemName} · {match.className} ({Math.round(match.score * 100)}%)
											</option>
										{/each}
									</select>
									{#if item.productId}
										<span class="badge preset-tonal-success text-[9px] gap-1"><Check size={10} /> matched</span>
									{:else}
										<span class="badge preset-tonal-warning text-[9px]">new</span>
									{/if}
								</div>
							</div>
						{/each}
					</div>
				</div>

				<div class="mt-4">
					<div class="mb-2 flex items-center justify-between">
						<h3 class="text-xs font-bold uppercase tracking-[0.14em] opacity-50">Discounts</h3>
						<button type="button" class="btn btn-xs preset-tonal-primary gap-1" onclick={addDiscount}>
							<Plus size={13} /> Add discount
						</button>
					</div>
					{#if discounts.length}
						<div class="space-y-2">
							{#each discounts as discount (discount.key)}
								<div class="flex flex-wrap items-center gap-2 rounded-xl border border-surface-200/70 p-2.5 dark:border-surface-800">
									<input
										class="input input-sm min-w-0 flex-1"
										bind:value={discount.name}
										placeholder="Discount"
										aria-label="Discount name"
									/>
									<input
										type="number"
										step="0.01"
										min="0"
										inputmode="decimal"
										class="input input-sm w-24 text-right tabular-nums"
										bind:value={discount.amount}
										aria-label="Discount amount"
									/>
									<button type="button" class="btn-icon btn-icon-sm preset-tonal-error shrink-0" onclick={() => removeDiscount(discount.key)} aria-label="Remove discount">
										<Trash2 size={14} />
									</button>
								</div>
							{/each}
						</div>
					{:else}
						<p class="text-xs opacity-45">No discounts.</p>
					{/if}
				</div>

				<div class="mt-5 rounded-xl bg-surface-200/40 p-3 dark:bg-surface-800/40">
					<div class="flex items-center justify-between text-sm">
						<span class="opacity-60">Items</span>
						<span class="font-bold tabular-nums">{formatCurrency(itemsTotal)}</span>
					</div>
					{#if discountsTotal > 0}
						<div class="mt-1 flex items-center justify-between text-sm text-success-700 dark:text-success-300">
							<span>Discounts</span>
							<span class="font-bold tabular-nums">−{formatCurrency(discountsTotal)}</span>
						</div>
					{/if}
					<div class="mt-2 flex items-center justify-between border-t border-surface-300/60 pt-2 text-sm dark:border-surface-600">
						<span class="font-bold">Expected total</span>
						<span class="font-extrabold tabular-nums">{formatCurrency(expectedTotal)}</span>
					</div>
				</div>

				<label class="label mt-3">
					<span class="label-text">Receipt total (£)</span>
					<input type="number" step="0.01" min="0" inputmode="decimal" class="input w-full tabular-nums" bind:value={total} />
				</label>
				{#if totalMismatch}
					<p class="mt-1 text-[11px] text-warning-700 dark:text-warning-300">
						Printed total differs from items minus discounts.
					</p>
				{/if}

				{#if saveError}
					<div class="mt-3 flex items-start gap-2 rounded-xl border border-error-500/30 bg-error-500/10 p-3 text-xs text-error-800 dark:text-error-200">
						<CircleAlert size={15} class="mt-0.5 shrink-0" /> {saveError}
					</div>
				{/if}

				<button
					type="button"
					class="btn preset-filled-primary-500 mt-4 w-full gap-2"
					disabled={!canSave}
					onclick={save}
				>
					{#if busy === 'saving'}
						<LoaderCircle size={17} class="animate-spin" /> Saving…
					{:else}
						<CircleCheck size={17} /> Save {items.length} items · {formatCurrency(total ?? expectedTotal)}
					{/if}
				</button>

			</section>
		{:else if busy === 'matching'}
			<section class="surface-card rounded-2xl p-8 text-center">
				<div class="mx-auto grid h-14 w-14 place-items-center rounded-2xl bg-primary-500/15 text-primary-800 dark:text-primary-200">
					<LoaderCircle size={26} class="animate-spin" />
				</div>
				<h2 class="mt-4 text-xl font-extrabold tracking-tight">Gemma 4 is parsing</h2>
				<p class="mt-2 text-sm opacity-55">
					Using the OCR text and the compressed receipt image. No local parser is used.
				</p>
			</section>
		{:else if parseError}
			<section class="surface-card rounded-2xl p-8 text-center">
				<div class="mx-auto grid h-14 w-14 place-items-center rounded-2xl bg-error-500/12 text-error-800 dark:text-error-200">
					<CircleAlert size={26} />
				</div>
				<h2 class="mt-4 text-xl font-extrabold tracking-tight">Gemma 4 parsing failed</h2>
				<p class="mx-auto mt-2 max-w-sm text-sm opacity-60">{parseError}</p>
				<button type="button" class="btn preset-filled-primary-500 mt-5 gap-2" onclick={retryParse}>
					<RotateCcw size={16} /> Try again
				</button>
			</section>
		{:else}
			<section class="surface-card rounded-2xl p-8 text-center">
				<div class="mx-auto grid h-14 w-14 place-items-center rounded-2xl bg-primary-500/15 text-primary-800 dark:text-primary-200">
					<ScanLine size={26} />
				</div>
				<h2 class="mt-4 text-xl font-extrabold tracking-tight">No receipt loaded</h2>
				<button type="button" class="btn preset-tonal-primary mt-5 gap-2" onclick={useSample}>
					<Sparkles size={16} /> Sample receipt
				</button>
			</section>
		{/if}
	</div>
</div>
