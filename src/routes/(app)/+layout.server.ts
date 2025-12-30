// ============================================================================
// PROTECTED ROUTES LAYOUT - Auth guard for all (app) routes
// Loads user data, chatbots, and test sessions for sidebar navigation
// ============================================================================

import { redirect } from '@sveltejs/kit';
import { eq } from 'drizzle-orm';
import { db } from '$lib/server/db';
import { chatbot } from '$lib/server/db/schema';
import { getChatbotDatabase } from '$lib/server/chatbot';
import type { LayoutServerLoad } from './$types';

export interface TestSession {
	id: string;
	startedAt: number;
	lastMessageAt: number;
	messageCount: number;
	currentPhase: string;
	status: string;
}

export const load: LayoutServerLoad = async ({ locals, url, params }) => {
	if (!locals.user) {
		throw redirect(302, `/login?redirect=${encodeURIComponent(url.pathname)}`);
	}

	// Load all user's chatbots for sidebar
	const chatbots = await db
		.select()
		.from(chatbot)
		.where(eq(chatbot.userId, locals.user.id))
		.orderBy(chatbot.updatedAt);

	// If we're on a chatbot page, load the current chatbot
	let currentChatbot = null;
	let testSessions: TestSession[] = [];

	if (params.id) {
		currentChatbot = chatbots.find((c) => c.id === params.id) || null;

		// Load test sessions for this chatbot
		if (currentChatbot) {
			try {
				const chatbotDb = await getChatbotDatabase(params.id);
				const allConversations = chatbotDb.conversations.all();

				// Filter for test sessions (channelType === 'test' or 'api' for now)
				// and sort by most recent first
				testSessions = allConversations
					.filter((c: Record<string, unknown>) =>
						c.channelType === 'test' || c.channelType === 'api'
					)
					.map((c: Record<string, unknown>) => ({
						id: c.id as string,
						startedAt: c.startedAt as number,
						lastMessageAt: c.lastMessageAt as number,
						messageCount: c.messageCount as number,
						currentPhase: c.currentPhase as string,
						status: c.status as string
					}))
					.sort((a: TestSession, b: TestSession) => b.lastMessageAt - a.lastMessageAt)
					.slice(0, 20); // Limit to 20 most recent
			} catch {
				// No conversations yet, that's fine
			}
		}
	}

	return {
		user: locals.user,
		chatbots,
		currentChatbot,
		testSessions
	};
};
