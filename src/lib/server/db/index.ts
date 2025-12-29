import { drizzle } from 'drizzle-orm/better-sqlite3';
import Database from 'better-sqlite3';
import * as schema from './schema';
import { env } from '$env/dynamic/private';

// Lazy initialization to support build-time analysis without DATABASE_PATH
let sqlite: Database.Database | null = null;
let _db: ReturnType<typeof drizzle<typeof schema>> | null = null;

export function getDb() {
	if (!_db) {
		// Use DATABASE_PATH for file path, default to local.db
		const dbPath = env.DATABASE_PATH || './local.db';
		sqlite = new Database(dbPath);
		// Enable WAL mode for better performance
		sqlite.pragma('journal_mode = WAL');
		_db = drizzle(sqlite, { schema });
	}
	return _db;
}

// For backwards compatibility - getter that lazily initializes
export const db = new Proxy({} as ReturnType<typeof drizzle<typeof schema>>, {
	get(_, prop) {
		return getDb()[prop as keyof typeof _db];
	}
});
