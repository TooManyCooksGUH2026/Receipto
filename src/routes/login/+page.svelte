<script lang="ts">
	import { goto } from '$app/navigation';
	import AuthShell from '#lib/components/AuthShell.svelte';
	import { authClient } from '#lib/client/auth';
	import { ArrowRight, CircleAlert, LoaderCircle } from 'lucide-svelte';
	import type { PageProps } from './$types';

	let { data }: PageProps = $props();
	let email = $state('');
	let password = $state('');
	let error = $state('');
	let loading = $state(false);

	async function submit(event: SubmitEvent) {
		event.preventDefault();
		error = '';
		loading = true;
		try {
			const result = await authClient.signIn.email({ email, password });
			if (result.error) {
				error = result.error.message ?? 'Could not sign in.';
				return;
			}
			goto(data.redirectTo);
		} catch {
			error = 'Could not reach the sign-in service.';
		} finally {
			loading = false;
		}
	}
</script>

<svelte:head>
	<title>Sign in · Receipto</title>
</svelte:head>

<AuthShell title="Sign in">
	<form method="POST" onsubmit={submit} class="space-y-4">
		<label class="label" for="login-email">
			<span class="label-text">Email</span>
			<input id="login-email" name="email" type="email" class="input w-full" autocomplete="email" placeholder="you@example.com" bind:value={email} required />
		</label>
		<label class="label" for="login-password">
			<span class="label-text">Password</span>
			<input id="login-password" name="password" type="password" class="input w-full" autocomplete="current-password" placeholder="Password" bind:value={password} required />
		</label>

		{#if error}
			<div class="flex items-start gap-2 rounded-xl border border-error-500/30 bg-error-500/10 p-3 text-xs text-error-800 dark:text-error-200">
				<CircleAlert size={15} class="mt-0.5 shrink-0" /> {error}
			</div>
		{/if}

		<button type="submit" class="btn preset-filled-primary-500 w-full gap-2" disabled={loading}>
			{#if loading}<LoaderCircle size={17} class="animate-spin" />{:else}<ArrowRight size={17} />{/if}
			Sign in
		</button>
	</form>

	<p class="mt-6 text-center text-sm opacity-60">
		<a href="/register" class="font-bold text-primary-700 hover:underline dark:text-primary-300">Create an account</a>
	</p>
</AuthShell>
