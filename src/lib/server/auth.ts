import { betterAuth } from 'better-auth';
import { drizzleAdapter } from '@better-auth/drizzle-adapter';
import { sveltekitCookies } from 'better-auth/svelte-kit';
import { getRequestEvent } from '$app/server';
import { dev } from '$app/env';
import { BETTER_AUTH_SECRET, BETTER_AUTH_URL } from '$app/env/private';
import { db } from './db';
import * as schema from './schema';

const fallbackBaseURL = BETTER_AUTH_URL || process.env.BETTER_AUTH_URL || 'http://localhost:5173';

export const auth = betterAuth({
	appName: 'Receipto',
	secret:
		BETTER_AUTH_SECRET ||
		process.env.BETTER_AUTH_SECRET ||
		'receipto-local-development-secret-change-me',
	// `vite dev --host` serves the app from a LAN address, so in development
	// let Better Auth resolve the base URL and trusted origin from the request.
	baseURL: dev
		? {
				allowedHosts: ['*'],
				fallback: fallbackBaseURL,
				protocol: 'http'
			}
		: fallbackBaseURL,
	database: drizzleAdapter(db, {
		provider: 'pg',
		schema
	}),
	emailAndPassword: {
		enabled: true,
		minPasswordLength: 8,
		autoSignIn: true
	},
	session: {
		expiresIn: 60 * 60 * 24 * 30,
		updateAge: 60 * 60 * 24
	},
	advanced: {
		defaultCookieAttributes: {
			sameSite: 'lax',
			secure: process.env.NODE_ENV === 'production'
		}
	},
	plugins: [sveltekitCookies(getRequestEvent)]
});
