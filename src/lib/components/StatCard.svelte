<script lang="ts">
	let {
		label,
		value,
		sub,
		icon,
		tone = 'primary'
	}: {
		label: string;
		value: string;
		sub?: string;
		icon: any;
		tone?: 'primary' | 'secondary' | 'tertiary' | 'surface';
	} = $props();

	const toneClasses: Record<string, string> = {
		primary: 'bg-primary-500/18 text-primary-800 dark:text-primary-200',
		secondary: 'bg-secondary-500/15 text-secondary-800 dark:text-secondary-200',
		tertiary: 'bg-tertiary-500/15 text-tertiary-800 dark:text-tertiary-200',
		surface: 'bg-surface-500/15 text-surface-800 dark:text-surface-200'
	};
</script>

<div class="surface-card rise-in rounded-2xl p-4">
	<div class="flex items-start justify-between gap-3">
		<div class="min-w-0">
			<p class="text-[11px] font-bold uppercase tracking-[0.14em] opacity-50">{label}</p>
			<p class="mt-2 truncate text-2xl font-extrabold tracking-tight">{value}</p>
			{#if sub}
				<p class="mt-1 truncate text-xs opacity-55">{sub}</p>
			{/if}
		</div>
		<div class="grid h-10 w-10 shrink-0 place-items-center rounded-xl {toneClasses[tone]}">
			<icon size={19}></icon>
		</div>
	</div>
</div>
