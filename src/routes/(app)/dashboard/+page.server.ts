// ============================================================================
// DASHBOARD - Server load function and form actions
// ============================================================================

import { fail, redirect, isRedirect } from '@sveltejs/kit';
import { eq } from 'drizzle-orm';
import { db } from '$lib/server/db';
import { chatbot } from '$lib/server/db/schema';
import { getChatbotDatabase, saveChatbotConfig } from '$lib/server/chatbot';
import type { PageServerLoad, Actions } from './$types';

export const load: PageServerLoad = async ({ locals }) => {
	const chatbots = await db
		.select()
		.from(chatbot)
		.where(eq(chatbot.userId, locals.user!.id))
		.orderBy(chatbot.updatedAt);

	return {
		chatbots
	};
};

export const actions: Actions = {
	create: async ({ request, locals }) => {
		if (!locals.user) {
			return fail(401, { error: 'Unauthorized' });
		}

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
				userId: locals.user.id,
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
				maxTokensPerResponse: 500
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
