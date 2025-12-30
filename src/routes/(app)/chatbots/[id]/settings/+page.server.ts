// ============================================================================
// SETTINGS PAGE - Server load and form actions
// Handles chatbot configuration (SQLite + fsDB config)
// ============================================================================

import { error, fail } from '@sveltejs/kit';
import { eq, and } from 'drizzle-orm';
import { db } from '$lib/server/db';
import { chatbot } from '$lib/server/db/schema';
import { getChatbotConfig, saveChatbotConfig } from '$lib/server/chatbot';
import type { PageServerLoad, Actions } from './$types';
import type { ChatbotConfig } from '$lib/server/chatbot/types';

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

	// Get config from fsDB
	const config = await getChatbotConfig(params.id);

	return {
		chatbot: bot,
		config
	};
};

export const actions: Actions = {
	// Update chatbot identity (stored in SQLite)
	updateIdentity: async ({ request, locals, params }) => {
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

		const formData = await request.formData();
		const name = formData.get('name') as string;
		const productName = formData.get('productName') as string;
		const description = formData.get('description') as string;
		const industry = formData.get('industry') as string;
		const personality = formData.get('personality') as string;
		const welcomeMessage = formData.get('welcomeMessage') as string;

		// Validation
		if (!name || name.length < 2) {
			return fail(400, {
				error: 'Chatbot name must be at least 2 characters',
				section: 'identity'
			});
		}

		if (!productName || productName.length < 2) {
			return fail(400, {
				error: 'Product name must be at least 2 characters',
				section: 'identity'
			});
		}

		try {
			await db
				.update(chatbot)
				.set({
					name,
					productName,
					description: description || null,
					industry: industry || null,
					personality: personality || null,
					welcomeMessage: welcomeMessage || null,
					updatedAt: new Date()
				})
				.where(eq(chatbot.id, params.id));

			return { success: true, section: 'identity' };
		} catch (err) {
			console.error('[settings] Update identity error:', err);
			return fail(500, {
				error: 'Failed to update chatbot settings',
				section: 'identity'
			});
		}
	},

	// Update behavior settings (stored in fsDB config)
	updateBehavior: async ({ request, locals, params }) => {
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

		const formData = await request.formData();
		const temperature = parseFloat(formData.get('temperature') as string) || 0.7;
		const maxTokensPerResponse = parseInt(formData.get('maxTokensPerResponse') as string) || 1000;
		const humanHandoffEnabled = formData.get('humanHandoffEnabled') === 'on';
		const humanHandoffTriggersRaw = formData.get('humanHandoffTriggers') as string;

		// Parse triggers (comma-separated)
		const humanHandoffTriggers = humanHandoffTriggersRaw
			? humanHandoffTriggersRaw.split(',').map((t) => t.trim()).filter(Boolean)
			: ['talk to human', 'real person', 'speak to someone'];

		// Validation
		if (temperature < 0 || temperature > 1) {
			return fail(400, {
				error: 'Temperature must be between 0 and 1',
				section: 'behavior'
			});
		}

		if (maxTokensPerResponse < 50 || maxTokensPerResponse > 5000) {
			return fail(400, {
				error: 'Max tokens must be between 50 and 5000',
				section: 'behavior'
			});
		}

		try {
			const currentConfig = await getChatbotConfig(params.id);
			const updatedConfig: ChatbotConfig = {
				...currentConfig,
				temperature,
				maxTokensPerResponse,
				humanHandoffEnabled,
				humanHandoffTriggers
			};

			await saveChatbotConfig(params.id, updatedConfig);

			return { success: true, section: 'behavior' };
		} catch (err) {
			console.error('[settings] Update behavior error:', err);
			return fail(500, {
				error: 'Failed to update behavior settings',
				section: 'behavior'
			});
		}
	},

	// Update custom instructions (stored in fsDB config)
	updateInstructions: async ({ request, locals, params }) => {
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

		const formData = await request.formData();
		const systemPromptAdditions = formData.get('systemPromptAdditions') as string;

		try {
			const currentConfig = await getChatbotConfig(params.id);
			const updatedConfig: ChatbotConfig = {
				...currentConfig,
				systemPromptAdditions: systemPromptAdditions || undefined
			};

			await saveChatbotConfig(params.id, updatedConfig);

			return { success: true, section: 'instructions' };
		} catch (err) {
			console.error('[settings] Update instructions error:', err);
			return fail(500, {
				error: 'Failed to update custom instructions',
				section: 'instructions'
			});
		}
	}
};
