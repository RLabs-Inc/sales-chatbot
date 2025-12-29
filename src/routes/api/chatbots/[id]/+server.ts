// ============================================================================
// CHATBOT API - Individual operations
// GET /api/chatbots/[id] - Get chatbot details
// PUT /api/chatbots/[id] - Update chatbot
// DELETE /api/chatbots/[id] - Delete chatbot
// ============================================================================

import { json, error } from '@sveltejs/kit';
import { eq, and } from 'drizzle-orm';
import { db } from '$lib/server/db';
import { chatbot } from '$lib/server/db/schema';
import { deleteChatbotDatabase, getChatbotStats, getChatbotConfig } from '$lib/server/chatbot';
import type { RequestHandler } from './$types';

// Helper to get chatbot and verify ownership
async function getChatbotForUser(chatbotId: string, userId: string) {
	const [result] = await db
		.select()
		.from(chatbot)
		.where(and(eq(chatbot.id, chatbotId), eq(chatbot.userId, userId)));

	return result;
}

// GET /api/chatbots/[id] - Get chatbot with stats
export const GET: RequestHandler = async ({ locals, params }) => {
	if (!locals.user) {
		throw error(401, 'Unauthorized');
	}

	const bot = await getChatbotForUser(params.id, locals.user.id);
	if (!bot) {
		throw error(404, 'Chatbot not found');
	}

	// Get additional stats from fsDB
	const stats = await getChatbotStats(params.id);
	const config = await getChatbotConfig(params.id);

	return json({
		...bot,
		stats,
		config
	});
};

// PUT /api/chatbots/[id] - Update chatbot
export const PUT: RequestHandler = async ({ locals, params, request }) => {
	if (!locals.user) {
		throw error(401, 'Unauthorized');
	}

	const bot = await getChatbotForUser(params.id, locals.user.id);
	if (!bot) {
		throw error(404, 'Chatbot not found');
	}

	const body = await request.json();

	// Fields that can be updated
	const updateData: Partial<typeof bot> = {};

	if (body.name !== undefined) updateData.name = body.name;
	if (body.description !== undefined) updateData.description = body.description;
	if (body.avatar !== undefined) updateData.avatar = body.avatar;
	if (body.productName !== undefined) updateData.productName = body.productName;
	if (body.productType !== undefined) updateData.productType = body.productType;
	if (body.industry !== undefined) updateData.industry = body.industry;
	if (body.personality !== undefined) updateData.personality = body.personality;
	if (body.welcomeMessage !== undefined) updateData.welcomeMessage = body.welcomeMessage;
	if (body.fallbackMessage !== undefined) updateData.fallbackMessage = body.fallbackMessage;
	if (body.status !== undefined) updateData.status = body.status;

	updateData.updatedAt = new Date();

	await db.update(chatbot).set(updateData).where(eq(chatbot.id, params.id));

	const updated = await getChatbotForUser(params.id, locals.user.id);
	return json(updated);
};

// DELETE /api/chatbots/[id] - Delete chatbot
export const DELETE: RequestHandler = async ({ locals, params }) => {
	if (!locals.user) {
		throw error(401, 'Unauthorized');
	}

	const bot = await getChatbotForUser(params.id, locals.user.id);
	if (!bot) {
		throw error(404, 'Chatbot not found');
	}

	// Delete fsDB data first
	await deleteChatbotDatabase(params.id);

	// Delete from SQLite
	await db.delete(chatbot).where(eq(chatbot.id, params.id));

	return json({ success: true });
};
