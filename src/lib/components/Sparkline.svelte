<script module lang="ts">
	let counter = 0;
</script>

<script lang="ts">
	let {
		values,
		width = 160,
		height = 48,
		stroke = 'var(--color-primary-600)',
		fill = 'var(--color-primary-500)',
		showDot = true
	}: {
		values: number[];
		width?: number;
		height?: number;
		stroke?: string;
		fill?: string;
		showDot?: boolean;
	} = $props();

	const id = `spark-${counter++}`;

	let geometry = $derived.by(() => {
		if (!values.length) return { line: '', area: '', lastX: 0, lastY: 0 };
		const min = Math.min(...values);
		const max = Math.max(...values);
		const range = max - min || 1;
		const pad = 4;
		const points = values.map((value, index) => {
			const x = values.length === 1 ? width / 2 : pad + (index / (values.length - 1)) * (width - pad * 2);
			const y = height - pad - ((value - min) / range) * (height - pad * 2);
			return [x, y] as const;
		});
		const line = points.map(([x, y], index) => `${index === 0 ? 'M' : 'L'}${x.toFixed(1)},${y.toFixed(1)}`).join(' ');
		const area = `${line} L${points[points.length - 1][0].toFixed(1)},${height} L${points[0][0].toFixed(1)},${height} Z`;
		return { line, area, lastX: points[points.length - 1][0], lastY: points[points.length - 1][1] };
	});
</script>

<svg {width} {height} viewBox={`0 0 ${width} ${height}`} class="overflow-visible" aria-hidden="true">
	<defs>
		<linearGradient id={id} x1="0" y1="0" x2="0" y2="1">
			<stop offset="0%" stop-color={fill} stop-opacity=".28" />
			<stop offset="100%" stop-color={fill} stop-opacity="0" />
		</linearGradient>
	</defs>
	<path d={geometry.area} fill={`url(#${id})`} />
	<path
		d={geometry.line}
		fill="none"
		stroke={stroke}
		stroke-width="2.2"
		stroke-linecap="round"
		stroke-linejoin="round"
	/>
	{#if showDot && values.length}
		<circle cx={geometry.lastX} cy={geometry.lastY} r="3.2" fill={stroke} />
	{/if}
</svg>
