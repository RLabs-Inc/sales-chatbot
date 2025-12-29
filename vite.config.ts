import tailwindcss from '@tailwindcss/vite';
import { defineConfig } from 'vitest/config';
import { playwright } from '@vitest/browser-playwright';
import { sveltekit } from '@sveltejs/kit/vite';

export default defineConfig({
	plugins: [tailwindcss(), sveltekit()],

	// Externalize native Node modules that can't be bundled
	ssr: {
		external: [
			// LibSQL/SQLite native bindings
			'@libsql/client',
			'@libsql/linux-x64-gnu',
			'@libsql/linux-x64-musl',
			'@libsql/darwin-arm64',
			'@libsql/darwin-x64',
			'@libsql/win32-x64-msvc',
			'libsql',
			// Argon2 native bindings
			'@node-rs/argon2',
			'@node-rs/argon2-linux-x64-gnu',
			'@node-rs/argon2-linux-x64-musl',
			'@node-rs/argon2-darwin-arm64',
			'@node-rs/argon2-darwin-x64',
			// Sharp image processing
			'sharp',
			// Other native modules
			'@neon-rs/load',
			'bufferutil',
			'utf-8-validate'
		]
	},

	test: {
		expect: { requireAssertions: true },

		projects: [
			{
				extends: './vite.config.ts',

				test: {
					name: 'client',

					browser: {
						enabled: true,
						provider: playwright(),
						instances: [{ browser: 'chromium', headless: true }]
					},

					include: ['src/**/*.svelte.{test,spec}.{js,ts}'],
					exclude: ['src/lib/server/**']
				}
			},

			{
				extends: './vite.config.ts',

				test: {
					name: 'server',
					environment: 'node',
					include: ['src/**/*.{test,spec}.{js,ts}'],
					exclude: ['src/**/*.svelte.{test,spec}.{js,ts}']
				}
			}
		]
	}
});
