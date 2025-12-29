// ============================================================================
// CHATBOT API - List and Create
// GET /api/chatbots - List user's chatbots
// POST /api/chatbots - Create new chatbot
// ============================================================================

import { json, error } from '@sveltejs/kit';
import { eq } from 'drizzle-orm';
import { db } from '$lib/server/db';
import { chatbot } from '$lib/server/db/schema';
import { getChatbotDatabase, saveChatbotConfig, defaultChatbotConfig } from '$lib/server/chatbot';
import type { RequestHandler } from './$types';

// GET /api/chatbots - List all chatbots for the authenticated user
export const GET: RequestHandler = async ({ locals }) => {
	if (!locals.user) {
		throw error(401, 'Unauthorized');
	}

	const chatbots = await db.select().from(chatbot).where(eq(chatbot.userId, locals.user.id));

	return json(chatbots);
};

// POST /api/chatbots - Create a new chatbot
export const POST: RequestHandler = async ({ locals, request }) => {
	if (!locals.user) {
		throw error(401, 'Unauthorized');
	}

	const body = await request.json();

	// Validate required fields
	if (!body.name || !body.productName || !body.productType) {
		throw error(400, 'Missing required fields: name, productName, productType');
	}

	// Generate ID
	const id = `bot-${Date.now()}-${Math.random().toString(36).slice(2, 8)}`;
	const now = new Date();

	// Create in SQLite
	const newChatbot = {
		id,
		userId: locals.user.id,
		name: body.name,
		description: body.description || null,
		avatar: body.avatar || null,
		productName: body.productName,
		productType: body.productType,
		industry: body.industry || null,
		personality: body.personality || null,
		welcomeMessage: body.welcomeMessage || null,
		fallbackMessage: body.fallbackMessage || null,
		status: 'draft' as const,
		totalConversations: 0,
		totalMessages: 0,
		conversionsCount: 0,
		createdAt: now,
		updatedAt: now
	};

	await db.insert(chatbot).values(newChatbot);

	// Initialize fsDB for this chatbot with default config
	await getChatbotDatabase(id);
	await saveChatbotConfig(id, defaultChatbotConfig);

	return json(newChatbot, { status: 201 });
};
