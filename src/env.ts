import { defineEnvVars } from '@sveltejs/kit/env';

export const variables = defineEnvVars({
	DATABASE_URL: {
		description: 'PostgreSQL connection string used by Drizzle and Better Auth'
	},
	BETTER_AUTH_SECRET: {
		description: 'Secret used by Better Auth to sign sessions'
	},
	BETTER_AUTH_URL: {
		description: 'Public origin of the app, used by Better Auth'
	},
	PUBLIC_INDRA_MODEL_BASE: {
		public: true,
		description:
			'Optional URL/path for locally hosted Indra OCR models. Empty streams the pinned models from Hugging Face.'
	},
	OVERPASS_URL: {
		description: 'Overpass API endpoint used by the OSM shop import script'
	}
});
