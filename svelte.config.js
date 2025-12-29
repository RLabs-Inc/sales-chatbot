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
			external: [
				'@libsql/client',
				'@libsql/linux-x64-gnu',
				'@libsql/linux-x64-musl',
				'@node-rs/argon2',
				'sharp',
				'libsql'
			]
		})
	},

	extensions: ['.svelte', '.svx']
};

export default config;
