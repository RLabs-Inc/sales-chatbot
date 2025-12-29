import { mdsvex } from 'mdsvex';
import adapter from '@sveltejs/adapter-node';
import { vitePreprocess } from '@sveltejs/vite-plugin-svelte';

/** @type {import('@sveltejs/kit').Config} */
const config = {
	preprocess: [vitePreprocess(), mdsvex()],

	kit: {
		adapter: adapter({
			// Railway/Node.js server config
			out: 'build',
			precompress: true,
			// Don't bundle native modules - load from node_modules at runtime
			external: ['better-sqlite3', '@node-rs/argon2', 'sharp']
		})
	},

	extensions: ['.svelte', '.svx']
};

export default config;
