// ============================================================================
// CHAT TEST PAGE - Server load function
// ============================================================================

import { error } from '@sveltejs/kit';
import { eq, and } from 'drizzle-orm';
import { db } from '$lib/server/db';
import { chatbot } from '$lib/server/db/schema';
import { getChatbotStats, getChatbotDatabase } from '$lib/server/chatbot';
import { requireLogin } from '$lib/server/auth';
import type { PageServerLoad } from './$types';

export interface LoadedMessage {
	role: 'user' | 'assistant';
	content: string;
}

export interface LoadedSession {
	id: string;
	messages: LoadedMessage[];
	currentPhase: string;
	detectedEmotion: string;
}

export const load: PageServerLoad = async ({ params, url, depends }) => {
	const user = requireLogin();

	// Track dependencies for targeted invalidation
	depends('app:testSessions'); // For sidebar session list refresh
	depends('app:testSession:current'); // For current session reload on URL param change

	const [bot] = await db
		.select()
		.from(chatbot)
		.where(and(eq(chatbot.id, params.id), eq(chatbot.userId, user.id)));

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

	// Check if we need to load a specific session
	const sessionId = url.searchParams.get('session');
	let loadedSession: LoadedSession | null = null;

	console.log(`[test page load] sessionId=${sessionId}`);

	if (sessionId) {
		try {
			// Load conversation by ID (use get() not find())
			const conversation = chatbotDb.conversations.get(sessionId);
			console.log(`[test page load] conversation found:`, !!conversation);
			if (conversation) {
				// Load messages for this conversation
				const allMessages = chatbotDb.messages.all();
				const sessionMessages = allMessages
					.filter((m: Record<string, unknown>) => m.conversationId === sessionId)
					.sort((a: Record<string, unknown>, b: Record<string, unknown>) =>
						(a.timestamp as number) - (b.timestamp as number)
					)
					.map((m: Record<string, unknown>) => ({
						role: m.role === 'customer' ? 'user' : m.role as string,
						content: m.content as string
					}));

				loadedSession = {
					id: sessionId,
					messages: sessionMessages as LoadedMessage[],
					currentPhase: conversation.currentPhase as string || 'greeting',
					detectedEmotion: 'neutral'
				};
				console.log(`[test page load] loaded ${sessionMessages.length} messages`);
			}
		} catch (err) {
			console.error(`[test page load] Error loading session:`, err);
		}
	}

	return {
		chatbot: bot,
		stats,
		documentCount: documents.size,
		capsuleCount: allCapsules.length,
		methodologyCount: methodologies.length,
		loadedSession
	};
};
