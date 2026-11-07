import { createAuthClient } from 'better-auth/svelte';

export const authClient = createAuthClient({
	baseURL: typeof window === 'undefined' ? undefined : window.location.origin
});
