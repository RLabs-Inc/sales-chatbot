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
	restoreConversation,
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

	console.log(`[chat] Request: conversationId=${conversationId}, message="${message.slice(0, 50)}..."`);
	console.log(`[chat] Active conversations in memory: ${Array.from(activeConversations.keys()).join(', ') || 'none'}`);

	if (conversationId && activeConversations.has(conversationId)) {
		// Fast path: context is in memory
		context = activeConversations.get(conversationId)!;
		console.log(`[chat] Found in memory with ${context.messageHistory.length} messages`);
	} else if (conversationId) {
		// Try to restore from fsDB (survives server restarts/deployments)
		const restored = await restoreConversation(bot, conversationId);
		if (restored) {
			context = restored;
			activeConversations.set(conversationId, context);
			console.log(`[chat] Restored conversation ${conversationId} from fsDB with ${context.messageHistory.length} messages`);
		} else {
			// Conversation not found, start new one
			context = await startConversation(bot, 'test-channel', 'test', locals.user.id);
			activeConversations.set(context.conversationId, context);
			console.log(`[chat] Started new conversation ${context.conversationId} (requested ${conversationId} not found)`);
		}
	} else {
		// No conversationId provided, start new conversation
		context = await startConversation(bot, 'test-channel', 'test', locals.user.id);
		activeConversations.set(context.conversationId, context);
	}

	try {
		// Get streaming response with debug info (this also detects emotion/phase)
		const { stream, updatedContext, humanHandoffRequested, debugInfo } = await chatStream(context, message);

		// Save customer message with freshly-detected emotion
		await saveMessage(updatedContext, 'customer', message);

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

					// Send detected phase/emotion immediately so UI updates right away
					controller.enqueue(
						encoder.encode(
							`data: ${JSON.stringify({ type: 'context', phase: updatedContext.currentPhase, emotion: updatedContext.detectedEmotion })}\n\n`
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

					// Save assistant message with capsule IDs for analytics tracking
					const capsuleIds = debugInfo.capsules.map(c => c.id);
					await saveMessage(updatedContext, 'assistant', fullResponse, capsuleIds);

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
