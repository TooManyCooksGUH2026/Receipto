<script lang="ts">
	import { goto } from '$app/navigation';
	import AuthShell from '#lib/components/AuthShell.svelte';
	import { authClient } from '#lib/client/auth';
	import { ArrowRight, CircleAlert, LoaderCircle } from 'lucide-svelte';

	let name = $state('');
	let email = $state('');
	let password = $state('');
	let confirm = $state('');
	let error = $state('');
	let loading = $state(false);

	async function submit(event: SubmitEvent) {
		event.preventDefault();
		error = '';
		if (password.length < 8) {
			error = 'Use at least 8 characters for your password.';
			return;
		}
		if (password !== confirm) {
			error = 'The passwords do not match.';
			return;
		}
		loading = true;
		try {
			const result = await authClient.signUp.email({ name, email, password });
			if (result.error) {
				error = result.error.message ?? 'Could not create your account.';
				return;
			}
			goto('/dashboard');
		} catch {
			error = 'Could not reach the sign-up service.';
		} finally {
			loading = false;
		}
	}
</script>

<svelte:head>
	<title>Create account · Receipto</title>
</svelte:head>

<AuthShell title="Create account">
	<form method="POST" onsubmit={submit} class="space-y-4">
		<label class="label" for="register-name">
			<span class="label-text">Name</span>
			<input id="register-name" name="name" type="text" class="input w-full" autocomplete="name" placeholder="Name" bind:value={name} required />
		</label>
		<label class="label" for="register-email">
			<span class="label-text">Email</span>
			<input id="register-email" name="email" type="email" class="input w-full" autocomplete="email" placeholder="you@example.com" bind:value={email} required />
		</label>
		<label class="label" for="register-password">
			<span class="label-text">Password</span>
			<input id="register-password" name="password" type="password" class="input w-full" autocomplete="new-password" placeholder="At least 8 characters" bind:value={password} required minlength="8" />
		</label>
		<label class="label" for="register-confirm">
			<span class="label-text">Confirm password</span>
			<input id="register-confirm" name="confirm" type="password" class="input w-full" autocomplete="new-password" placeholder="Password" bind:value={confirm} required />
		</label>

		{#if error}
			<div class="flex items-start gap-2 rounded-xl border border-error-500/30 bg-error-500/10 p-3 text-xs text-error-800 dark:text-error-200">
				<CircleAlert size={15} class="mt-0.5 shrink-0" /> {error}
			</div>
		{/if}

		<button type="submit" class="btn preset-filled-primary-500 w-full gap-2" disabled={loading}>
			{#if loading}<LoaderCircle size={17} class="animate-spin" />{:else}<ArrowRight size={17} />{/if}
			Create account
		</button>
	</form>

	<p class="mt-6 text-center text-sm opacity-60">
		<a href="/login" class="font-bold text-primary-700 hover:underline dark:text-primary-300">Sign in</a>
	</p>
</AuthShell>
