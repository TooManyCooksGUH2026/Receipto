<script lang="ts">
	let { compact = false, size = 34 }: { compact?: boolean; size?: number } = $props();
</script>

<span class="inline-flex items-center gap-2.5">
	<svg
		width={size}
		height={size}
		viewBox="0 0 40 40"
		fill="none"
		xmlns="http://www.w3.org/2000/svg"
		aria-hidden="true"
	>
		<defs>
			<linearGradient id="receipto-logo-bg" x1="4" y1="2" x2="36" y2="38" gradientUnits="userSpaceOnUse">
				<stop stop-color="var(--color-primary-400)" />
				<stop offset="1" stop-color="var(--color-primary-700)" />
			</linearGradient>
		</defs>
		<rect x="1" y="1" width="38" height="38" rx="10" fill="url(#receipto-logo-bg)" />
		<path
			d="M9 7.5h22v23.2l-2.75-1.9-2.75 1.9-2.75-1.9-2.75 1.9-2.75-1.9-2.75 1.9-2.75-1.9L9 30.7V7.5Z"
			fill="var(--color-surface-50)"
			opacity=".97"
		/>
		<rect x="13" y="11.4" width="14" height="2.2" rx="1.1" fill="var(--color-primary-950)" opacity=".9" />
		<rect x="13" y="15.8" width="14" height="1.7" rx=".85" fill="var(--color-primary-900)" opacity=".42" />
		<rect x="13" y="19.1" width="9.8" height="1.7" rx=".85" fill="var(--color-primary-900)" opacity=".42" />
		<rect x="13" y="22.4" width="11.8" height="1.7" rx=".85" fill="var(--color-primary-900)" opacity=".42" />
		<circle cx="27.5" cy="25.8" r="4.1" fill="var(--color-primary-600)" />
		<text
			x="27.5"
			y="27.5"
			text-anchor="middle"
			font-family="Montserrat, Avenir, sans-serif"
			font-size="5.6"
			font-weight="800"
			fill="var(--color-surface-50)"
		>£</text>
		<path d="M12 32.4h16" stroke="var(--color-primary-950)" stroke-width="1.4" stroke-linecap="round" opacity=".18" />
	</svg>
	{#if !compact}
		<span class="text-xl font-extrabold tracking-tight text-surface-950 dark:text-surface-50">
			Receipto
		</span>
	{/if}
</span>
