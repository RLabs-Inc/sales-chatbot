import { drizzle } from 'drizzle-orm/libsql';
import { createClient, type Client } from '@libsql/client';
import * as schema from './schema';
import { env } from '$env/dynamic/private';

// Lazy initialization to support build-time analysis without DATABASE_URL
let client: Client | null = null;
let _db: ReturnType<typeof drizzle<typeof schema>> | null = null;

export function getDb() {
	if (!_db) {
		if (!env.DATABASE_URL) {
			throw new Error('DATABASE_URL is not set');
		}
		client = createClient({ url: env.DATABASE_URL });
		_db = drizzle(client, { schema });
	}
	return _db;
}

// For backwards compatibility - getter that lazily initializes
export const db = new Proxy({} as ReturnType<typeof drizzle<typeof schema>>, {
	get(_, prop) {
		return getDb()[prop as keyof typeof _db];
	}
});
