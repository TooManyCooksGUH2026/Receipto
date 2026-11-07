<script lang="ts">
	import { invalidateAll } from '$app/navigation';
	import {
		ChevronDown,
		CircleAlert,
		Crosshair,
		LoaderCircle,
		MapPin,
		Search,
		X
	} from 'lucide-svelte';

	type Location = {
		lat: number;
		lng: number;
		label: string | null;
		radiusMiles: number;
	};

	type GeocodeResult = {
		label: string;
		lat: number;
		lng: number;
		type: string | null;
		postcode: string | null;
	};

	let {
		location,
		compact = false,
		variant = 'inline'
	}: {
		location: Location | null;
		compact?: boolean;
		variant?: 'inline' | 'popover';
	} = $props();

	const radiusOptions = [1, 3, 5, 10, 25, 50];

	function shortLabel(value: string | null) {
		return value?.split(',')[0]?.trim() || 'Saved location';
	}

	let open = $state(false);
	let query = $state(location?.label ?? '');
	let label = $state(location?.label ?? '');
	let lat = $state<number | null>(location?.lat ?? null);
	let lng = $state<number | null>(location?.lng ?? null);
	let radius = $state(location?.radiusMiles ?? 5);
	let suggestions = $state<GeocodeResult[]>([]);
	let loading = $state(false);
	let saving = $state(false);
	let error = $state('');
	let container: HTMLDivElement | undefined = $state();

	$effect(() => {
		// After saving or clearing, the layout reloads and passes fresh props.
		if (open) return;
		location;
		query = location?.label ?? '';
		label = location?.label ?? '';
		lat = location?.lat ?? null;
		lng = location?.lng ?? null;
		radius = location?.radiusMiles ?? 5;
	});

	$effect(() => {
		const q = query.trim();
		if (!open || q.length < 3 || (q === label && lat !== null)) {
			suggestions = [];
			return;
		}
		const controller = new AbortController();
		const timer = setTimeout(async () => {
			loading = true;
			try {
				const response = await fetch(`/api/geocode?q=${encodeURIComponent(q)}`, {
					signal: controller.signal
				});
				if (!response.ok) throw new Error('Geocode failed');
				const data = (await response.json()) as { results: GeocodeResult[] };
				suggestions = data.results;
				error = '';
			} catch (err) {
				if ((err as Error).name !== 'AbortError') {
					error = 'Could not search for that place.';
					suggestions = [];
				}
			} finally {
				loading = false;
			}
		}, 350);

		return () => {
			clearTimeout(timer);
			controller.abort();
		};
	});

	function choose(result: GeocodeResult) {
		lat = result.lat;
		lng = result.lng;
		label = result.label;
		query = result.label;
		suggestions = [];
		error = '';
	}

	function handleQueryInput(event: Event) {
		const value = (event.currentTarget as HTMLInputElement).value;
		// Editing the search text invalidates any previously chosen point.
		if (value.trim() !== label.trim()) {
			lat = null;
			lng = null;
			label = '';
		}
	}

	async function useMyLocation() {
		if (!navigator.geolocation) {
			error = 'Location is not available in this browser.';
			return;
		}
		loading = true;
		error = '';
		navigator.geolocation.getCurrentPosition(
			async (position) => {
				lat = position.coords.latitude;
				lng = position.coords.longitude;
				label = 'Current location';
				query = 'Current location';
				suggestions = [];
				try {
					const response = await fetch(`/api/geocode?lat=${lat}&lng=${lng}`);
					const data = (await response.json()) as { results: GeocodeResult[] };
					if (data.results?.[0]?.label) {
						label = data.results[0].label;
						query = label;
					}
				} catch {
					/* keep "Current location" */
				} finally {
					loading = false;
				}
			},
			() => {
				error = 'Could not get your location.';
				loading = false;
			},
			{ timeout: 10_000, maximumAge: 60_000 }
		);
	}

	async function save() {
		if (lat === null || lng === null) {
			error = 'Choose a place or use your current location.';
			return;
		}
		saving = true;
		error = '';
		try {
			const response = await fetch('/api/location', {
				method: 'POST',
				headers: { 'Content-Type': 'application/json' },
				body: JSON.stringify({
					lat,
					lng,
					label: label || query || 'Saved location',
					radiusMiles: radius
				})
			});
			if (!response.ok) throw new Error('Could not save location');
			open = false;
			await invalidateAll();
		} catch (err) {
			error = err instanceof Error ? err.message : 'Could not save location';
		} finally {
			saving = false;
		}
	}

	async function clear() {
		saving = true;
		error = '';
		try {
			const response = await fetch('/api/location', { method: 'DELETE' });
			if (!response.ok) throw new Error('Could not clear location');
			lat = null;
			lng = null;
			label = '';
			query = '';
			radius = 5;
			open = false;
			await invalidateAll();
		} catch (err) {
			error = err instanceof Error ? err.message : 'Could not clear location';
		} finally {
			saving = false;
		}
	}

	function onWindowClick(event: MouseEvent) {
		if (container && !container.contains(event.target as Node)) open = false;
	}
</script>

<svelte:window onclick={onWindowClick} />

<div class="relative" bind:this={container}>
	<button
		type="button"
		class={compact
			? 'btn btn-sm preset-tonal-surface max-w-full gap-1.5'
			: 'flex w-full items-center gap-2 rounded-xl border border-surface-200/70 bg-surface-50 p-2 text-left transition hover:border-primary-400/50 dark:border-surface-700 dark:bg-surface-900'}
		onclick={() => (open = !open)}
		aria-expanded={open}
	>
		{#if compact}
			<MapPin size={14} class="shrink-0 opacity-60" />
			<span class="min-w-0 truncate text-xs font-bold">
				{location ? shortLabel(location.label) : 'Set location'}
			</span>
			{#if location}
				<span class="shrink-0 text-[10px] opacity-55">{location.radiusMiles} mi</span>
			{/if}
		{:else}
			<span class="grid h-8 w-8 shrink-0 place-items-center rounded-lg bg-primary-500/12 text-primary-800 dark:text-primary-200">
				<MapPin size={15} />
			</span>
			<span class="min-w-0 flex-1">
				<span class="block truncate text-xs font-bold">
					{location ? shortLabel(location.label) : 'Set location'}
				</span>
				<span class="block text-[10px] opacity-55">
					{location ? `Within ${location.radiusMiles} miles` : 'All UK prices'}
				</span>
			</span>
			<ChevronDown size={14} class="shrink-0 opacity-45" />
		{/if}
	</button>

	{#if open}
		<div
			class={variant === 'popover'
				? 'absolute left-0 top-full z-[650] mt-2 w-80 max-w-[calc(100vw-2rem)] rounded-xl border border-surface-200 bg-surface-50 p-3 shadow-2xl dark:border-surface-700 dark:bg-surface-900'
				: 'mt-2 rounded-xl border border-surface-200 bg-surface-50 p-3 dark:border-surface-700 dark:bg-surface-900'}
		>
			<div class="mb-2 flex items-center justify-between">
				<p class="text-xs font-extrabold">Location</p>
				<button type="button" class="btn-icon btn-icon-xs preset-tonal-surface" onclick={() => (open = false)} aria-label="Close">
					<X size={13} />
				</button>
			</div>

			<label class="input w-full">
				<Search size={15} class="opacity-55" />
				<input
					type="search"
					class="w-full bg-transparent outline-none"
					placeholder="Postcode, town or area"
					bind:value={query}
					oninput={handleQueryInput}
					aria-label="Search location"
				/>
				{#if loading}
					<LoaderCircle size={14} class="animate-spin opacity-55" />
				{/if}
			</label>

			{#if suggestions.length}
				<div class="mt-2 overflow-hidden rounded-lg border border-surface-200 dark:border-surface-700">
					{#each suggestions as result (result.label + result.lat)}
						<button
							type="button"
							class="block w-full border-b border-surface-200/60 px-2 py-2 text-left text-xs last:border-0 hover:bg-primary-500/10 dark:border-surface-700/60"
							onclick={() => choose(result)}
						>
							<span class="block truncate font-semibold">{result.label}</span>
							<span class="block text-[10px] capitalize opacity-50">{result.type ?? 'place'}</span>
						</button>
					{/each}
				</div>
			{/if}

			<div class="mt-2 flex items-center justify-between gap-2">
				<button type="button" class="btn btn-sm preset-tonal-primary gap-1.5" onclick={useMyLocation} disabled={loading}>
					<Crosshair size={14} /> Use my location
				</button>
				<label class="label">
					<span class="label-text">Radius</span>
					<select class="select select-sm w-24" bind:value={radius} aria-label="Radius">
						{#each radiusOptions as option (option)}
							<option value={option}>{option} mi</option>
						{/each}
					</select>
				</label>
			</div>

			{#if lat !== null && lng !== null}
				<p class="mt-2 truncate text-[10px] opacity-55">
					{label || 'Selected place'}
				</p>
			{/if}

			{#if error}
				<div class="mt-2 flex items-start gap-1.5 rounded-lg border border-error-500/30 bg-error-500/10 p-2 text-[11px] text-error-800 dark:text-error-200">
					<CircleAlert size={13} class="mt-0.5 shrink-0" /> {error}
				</div>
			{/if}

			<div class="mt-3 flex gap-2">
				<button type="button" class="btn preset-filled-primary-500 flex-1 gap-1.5" onclick={save} disabled={saving}>
					{#if saving}<LoaderCircle size={14} class="animate-spin" />{:else}<MapPin size={14} />{/if}
					Save
				</button>
				{#if location}
					<button type="button" class="btn preset-tonal-error" onclick={clear} disabled={saving}>
						Clear
					</button>
				{/if}
			</div>
		</div>
	{/if}
</div>