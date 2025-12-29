// Simple health check endpoint that doesn't require database
import { json } from '@sveltejs/kit';
import type { RequestHandler } from './$types';

export const GET: RequestHandler = async () => {
	return json({ status: 'ok', timestamp: new Date().toISOString() });
};
