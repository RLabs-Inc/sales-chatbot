// ============================================================================
// DASHBOARD - Server load function and form actions
// ============================================================================

import { fail, redirect, isRedirect } from '@sveltejs/kit';
import { eq } from 'drizzle-orm';
import { db } from '$lib/server/db';
import { chatbot } from '$lib/server/db/schema';
import { getChatbotDatabase, saveChatbotConfig, getChatbotStats } from '$lib/server/chatbot';
import { requireLogin } from '$lib/server/auth';
import type { PageServerLoad, Actions } from './$types';

export const load: PageServerLoad = async () => {
	const user = requireLogin();

	const chatbots = await db
		.select()
		.from(chatbot)
		.where(eq(chatbot.userId, user.id))
		.orderBy(chatbot.updatedAt);

	// Load stats from fsDB for each chatbot
	const chatbotsWithStats = await Promise.all(
		chatbots.map(async (bot) => {
			const stats = await getChatbotStats(bot.id);
			return {
				...bot,
				stats
			};
		})
	);

	return {
		chatbots: chatbotsWithStats
	};
};

export const actions: Actions = {
	create: async ({ request }) => {
		const user = requireLogin();

		const formData = await request.formData();
		const name = formData.get('name') as string;
		const productName = formData.get('productName') as string;
		const productType = formData.get('productType') as 'product' | 'service';
		const description = formData.get('description') as string | null;

		// Validation
		if (!name || name.length < 2) {
			return fail(400, {
				error: 'Name must be at least 2 characters',
				name,
				productName,
				productType,
				description
			});
		}

		if (!productName || productName.length < 2) {
			return fail(400, {
				error: 'Product name must be at least 2 characters',
				name,
				productName,
				productType,
				description
			});
		}

		try {
			const now = new Date();
			const id = crypto.randomUUID();

			// Create chatbot record
			await db.insert(chatbot).values({
				id,
				userId: user.id,
				name,
				productName,
				productType: productType || 'product',
				description: description || null,
				status: 'draft',
				createdAt: now,
				updatedAt: now
			});

			// Initialize fsDB for the chatbot
			await getChatbotDatabase(id);

			// Save default config
			await saveChatbotConfig(id, {
				retrievalWeights: {
					triggerPhrases: 0.15,
					vectorSimilarity: 0.15,
					semanticTags: 0.05,
					questionTypes: 0.05,
					importanceWeight: 0.2,
					temporalRelevance: 0.1,
					contextAlignment: 0.1,
					confidenceScore: 0.05,
					emotionalResonance: 0.1,
					objectionPattern: 0.05,
					relevanceGatekeeper: 0.05,
					minimumFinalScore: 0.3
				},
				maxCapsulesPerQuery: 5,
				enableContextEnrichment: true,
				maxConversationTurns: 50,
				humanHandoffEnabled: true,
				humanHandoffTriggers: ['talk to human', 'real person', 'speak to someone'],
				temperature: 0.7,
				maxTokensPerResponse: 1000
			});

			throw redirect(303, `/chatbots/${id}/test`);
		} catch (err) {
			if (isRedirect(err)) throw err; // Re-throw redirects
			console.error('[dashboard] Create error:', err);
			return fail(500, {
				error: 'Failed to create chatbot',
				name,
				productName,
				productType,
				description
			});
		}
	}
};
