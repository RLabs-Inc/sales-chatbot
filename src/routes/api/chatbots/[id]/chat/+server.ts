// ============================================================================
// CHAT API - Streaming conversation endpoint
// POST /api/chatbots/[id]/chat - Send message, get streaming response
// ============================================================================

import { error } from '@sveltejs/kit';
import { eq, and } from 'drizzle-orm';
import { db } from '$lib/server/db';
import { chatbot } from '$lib/server/db/schema';
import {
	chatStream,
	startConversation,
	saveMessage,
	initializeEmbeddings,
	getChatbotConfig,
	type ConversationContext
} from '$lib/server/chatbot';
import type { RequestHandler } from './$types';

// In-memory conversation contexts (for demo - would use Redis in production)
const activeConversations = new Map<string, ConversationContext>();

// Helper to verify chatbot ownership (for testing interface)
async function verifyChatbotOwnership(chatbotId: string, userId: string) {
	const [result] = await db
		.select()
		.from(chatbot)
		.where(and(eq(chatbot.id, chatbotId), eq(chatbot.userId, userId)));

	return result;
}

// POST /api/chatbots/[id]/chat - Send message and stream response
export const POST: RequestHandler = async ({ locals, params, request }) => {
	if (!locals.user) {
		throw error(401, 'Unauthorized');
	}

	const bot = await verifyChatbotOwnership(params.id, locals.user.id);
	if (!bot) {
		throw error(404, 'Chatbot not found');
	}

	// Ensure embeddings are ready
	await initializeEmbeddings();

	const body = await request.json();
	const { message, conversationId } = body;

	if (!message || typeof message !== 'string') {
		throw error(400, 'Message is required');
	}

	// Get or create conversation context
	let context: ConversationContext;

	if (conversationId && activeConversations.has(conversationId)) {
		context = activeConversations.get(conversationId)!;
	} else {
		// Start new conversation
		context = await startConversation(bot, 'test-channel', 'api', locals.user.id);
		activeConversations.set(context.conversationId, context);
	}

	// Save customer message
	await saveMessage(context, 'customer', message);

	try {
		// Get streaming response with debug info
		const { stream, updatedContext, humanHandoffRequested, debugInfo } = await chatStream(context, message);

		// Update stored context
		activeConversations.set(context.conversationId, updatedContext);

		// Create readable stream for response
		const encoder = new TextEncoder();

		const readableStream = new ReadableStream({
			async start(controller) {
				try {
					// Send conversation ID first
					controller.enqueue(
						encoder.encode(
							`data: ${JSON.stringify({ type: 'conversation_id', id: context.conversationId })}\n\n`
						)
					);

					// Send debug info early so UI can display it while streaming
					controller.enqueue(
						encoder.encode(
							`data: ${JSON.stringify({ type: 'debug', debugInfo })}\n\n`
						)
					);

					// Send human handoff status if requested
					if (humanHandoffRequested) {
						controller.enqueue(
							encoder.encode(`data: ${JSON.stringify({ type: 'human_handoff', requested: true })}\n\n`)
						);
					}

					// Stream the response chunks
					let fullResponse = '';
					for await (const chunk of stream) {
						fullResponse += chunk;
						controller.enqueue(
							encoder.encode(`data: ${JSON.stringify({ type: 'chunk', content: chunk })}\n\n`)
						);
					}

					// Save assistant message
					await saveMessage(updatedContext, 'assistant', fullResponse);

					// Send completion signal
					controller.enqueue(
						encoder.encode(
							`data: ${JSON.stringify({ type: 'done', phase: updatedContext.currentPhase, emotion: updatedContext.detectedEmotion })}\n\n`
						)
					);

					controller.close();
				} catch (err) {
					console.error('[chat] Streaming error:', err);
					controller.enqueue(
						encoder.encode(
							`data: ${JSON.stringify({ type: 'error', message: err instanceof Error ? err.message : 'Unknown error' })}\n\n`
						)
					);
					controller.close();
				}
			}
		});

		return new Response(readableStream, {
			headers: {
				'Content-Type': 'text/event-stream',
				'Cache-Control': 'no-cache',
				Connection: 'keep-alive'
			}
		});
	} catch (err) {
		console.error('[chat] Error:', err);
		throw error(500, `Chat error: ${err instanceof Error ? err.message : 'Unknown error'}`);
	}
};
