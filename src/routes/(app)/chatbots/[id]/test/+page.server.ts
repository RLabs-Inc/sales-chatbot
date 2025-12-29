// ============================================================================
// CHAT TEST PAGE - Server load function
// ============================================================================

import { error } from '@sveltejs/kit';
import { eq, and } from 'drizzle-orm';
import { db } from '$lib/server/db';
import { chatbot } from '$lib/server/db/schema';
import { getChatbotStats, getChatbotDatabase } from '$lib/server/chatbot';
import type { PageServerLoad } from './$types';

export const load: PageServerLoad = async ({ locals, params }) => {
	if (!locals.user) {
		throw error(401, 'Unauthorized');
	}

	const [bot] = await db
		.select()
		.from(chatbot)
		.where(and(eq(chatbot.id, params.id), eq(chatbot.userId, locals.user.id)));

	if (!bot) {
		throw error(404, 'Chatbot not found');
	}

	// Get stats to show document count
	const stats = await getChatbotStats(params.id);

	// Get document list
	const chatbotDb = await getChatbotDatabase(params.id);
	const allCapsules = chatbotDb.knowledge
		.all()
		.filter((k: { id: string }) => k.id !== '__chatbot_config__');

	// Count unique documents
	const documents = new Set<string>();
	for (const capsule of allCapsules) {
		documents.add(capsule.sourceDocument as string);
	}

	// Get methodology count
	const methodologies = chatbotDb.methodology.all();

	return {
		chatbot: bot,
		stats,
		documentCount: documents.size,
		capsuleCount: allCapsules.length,
		methodologyCount: methodologies.length
	};
};
