<script lang="ts">
	import { onMount } from 'svelte';
	import { Crosshair, Maximize2 } from 'lucide-svelte';
	import type * as Leaflet from 'leaflet';
	import 'leaflet/dist/leaflet.css';

	export type MapStore = {
		id: number;
		name: string;
		supermarket: string;
		lat: number;
		lng: number;
		address: string | null;
		city: string;
		region: string;
		postcode: string | null;
		price: number | null;
		isCheapest: boolean;
		isMostExpensive: boolean;
	};

	let {
		stores,
		selectedShopId = null,
		onSelectStore,
		userLocation = null
	}: {
		stores: MapStore[];
		selectedShopId?: number | null;
		onSelectStore?: (store: MapStore) => void;
		userLocation?: { lat: number; lng: number; radiusMiles: number } | null;
	} = $props();

	let mapEl: HTMLDivElement;
	let map: Leaflet.Map | null = null;
	let markerLayer: Leaflet.LayerGroup | null = null;
	let locationLayer: Leaflet.LayerGroup | null = null;
	let L: typeof Leaflet | null = null;
	let currentZoom = $state(6);
	let lastLocationKey = '';

	function visibleStores() {
		const priced = stores.filter((store) => store.price !== null);
		const pool = priced.length ? priced : stores;
		if (currentZoom >= 8) return pool;

		const grouped = new Map<string, MapStore>();
		for (const store of pool) {
			const key = currentZoom >= 7 ? `${store.city}|${store.supermarket}` : store.city;
			const existing = grouped.get(key);
			if (!existing || (store.price ?? Infinity) < (existing.price ?? Infinity)) {
				grouped.set(key, store);
			}
		}
		return [...grouped.values()];
	}

	function formatPrice(value: number) {
		return new Intl.NumberFormat('en-GB', {
			style: 'currency',
			currency: 'GBP',
			minimumFractionDigits: 2
		}).format(value);
	}

	function markerHtml(store: MapStore) {
		const active = store.id === selectedShopId;
		if (store.price === null) {
			return `<div class="store-price-pin ${active ? 'is-active' : ''}">
				<span class="pin-label" style="border-color:var(--color-surface-400)">${store.supermarket}</span>
				<span class="pin-tail" style="background:var(--color-surface-400)"></span>
				<span class="pin-dot" style="background:var(--color-surface-400)"></span>
			</div>`;
		}
		const classes = ['pin-label', store.isCheapest ? 'is-cheapest' : '', store.isMostExpensive ? 'is-expensive' : '']
			.filter(Boolean)
			.join(' ');
		return `<div class="store-price-pin ${active ? 'is-active' : ''}">
			<span class="${classes}">${formatPrice(store.price)}</span>
			<span class="pin-tail"></span>
			<span class="pin-dot"></span>
		</div>`;
	}

	function renderLocation() {
		if (!L || !map || !locationLayer) return;
		const key = userLocation
			? `${userLocation.lat}:${userLocation.lng}:${userLocation.radiusMiles}`
			: '';
		if (key === lastLocationKey) return;
		const hadLocation = lastLocationKey !== '';
		lastLocationKey = key;
		locationLayer.clearLayers();
		if (!userLocation) {
			if (hadLocation) fitUk();
			return;
		}

		const circle = L.circle([userLocation.lat, userLocation.lng], {
			radius: userLocation.radiusMiles * 1609.344,
			color: '#3D8F1F',
			fillColor: '#7DE04B',
			fillOpacity: 0.08,
			weight: 1.5,
			dashArray: '5 5'
		}).addTo(locationLayer);
		L.circleMarker([userLocation.lat, userLocation.lng], {
			radius: 5,
			color: '#2F7A16',
			fillColor: '#3D8F1F',
			fillOpacity: 1,
			weight: 2
		}).addTo(locationLayer);
		map.fitBounds(circle.getBounds(), { padding: [30, 30], maxZoom: 14 });
	}

	function renderMarkers() {
		if (!L || !map || !markerLayer) return;
		markerLayer.clearLayers();
		for (const store of visibleStores()) {
			const icon = L.divIcon({
				className: 'store-price-marker',
				html: markerHtml(store),
				iconSize: [84, 46],
				iconAnchor: [42, 44]
			});
			const marker = L.marker([store.lat, store.lng], {
				icon,
				title: `${store.supermarket} — ${store.name}`,
				riseOnHover: true
			});
			marker.on('click', () => onSelectStore?.(store));
			marker.addTo(markerLayer);
		}
	}

	function fitUk() {
		map?.fitBounds(
			[
				[49.8, -7.6],
				[58.7, 1.9]
			],
			{ padding: [30, 30] }
		);
	}

	function locate() {
		if (!navigator.geolocation || !map) return;
		navigator.geolocation.getCurrentPosition(
			(position) => {
				map?.setView([position.coords.latitude, position.coords.longitude], 12, { animate: true });
			},
			() => fitUk(),
			{ timeout: 8000 }
		);
	}

	onMount(() => {
		let cancelled = false;
		(async () => {
			const leaflet = await import('leaflet');
			if (cancelled) return;
			L = leaflet.default;
			map = L.map(mapEl, {
				zoomControl: false,
				attributionControl: true,
				scrollWheelZoom: true
			}).setView([54.4, -3.2], 6);
			L.control.zoom({ position: 'bottomright' }).addTo(map);
			L.tileLayer('https://{s}.tile.openstreetmap.org/{z}/{x}/{y}.png', {
				maxZoom: 19,
				attribution: '&copy; <a href="https://www.openstreetmap.org/copyright">OpenStreetMap</a> contributors'
			}).addTo(map);
			markerLayer = L.layerGroup().addTo(map);
			locationLayer = L.layerGroup().addTo(map);
			map.on('zoomend', () => {
				currentZoom = map?.getZoom() ?? 6;
			});
			renderLocation();
			renderMarkers();
			setTimeout(() => map?.invalidateSize(), 150);
		})();

		return () => {
			cancelled = true;
			map?.remove();
			map = null;
			markerLayer = null;
		};
	});

	$effect(() => {
		// Re-render when the data or selection changes.
		stores;
		selectedShopId;
		currentZoom;
		renderMarkers();
	});

	$effect(() => {
		userLocation;
		renderLocation();
	});
</script>

<div class="relative h-full w-full overflow-hidden">
	<div class="absolute inset-0" bind:this={mapEl}></div>

	<div class="absolute right-3 bottom-20 z-[500] flex gap-2">
		<button type="button" class="btn-icon btn-icon-sm preset-tonal-surface shadow-lg" onclick={fitUk} title="Fit UK" aria-label="Fit UK">
			<Maximize2 size={15} />
		</button>
		<button type="button" class="btn-icon btn-icon-sm preset-tonal-surface shadow-lg" onclick={locate} title="Use my location" aria-label="Use my location">
			<Crosshair size={15} />
		</button>
	</div>

	<div class="pointer-events-none absolute bottom-5 left-3 z-[500]">
		<div class="pointer-events-auto rounded-xl border border-surface-200/70 bg-surface-50/90 px-3 py-2 text-[10px] shadow-lg backdrop-blur-md dark:border-surface-700 dark:bg-surface-900/90">
			<div class="flex items-center gap-3">
				<span class="flex items-center gap-1"><span class="h-2.5 w-2.5 rounded-full bg-primary-500"></span> Cheapest</span>
				<span class="flex items-center gap-1"><span class="h-2.5 w-2.5 rounded-full bg-error-400"></span> Highest</span>
				<span class="flex items-center gap-1"><span class="h-2.5 w-2.5 rounded-full bg-surface-400"></span> No price</span>
			</div>
			{#if currentZoom < 8}
				<p class="mt-1 opacity-50">Zoom in to reveal more stores.</p>
			{/if}
		</div>
	</div>
</div>
