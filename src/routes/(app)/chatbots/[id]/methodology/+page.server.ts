// ============================================================================
// METHODOLOGY PAGE - Server load and form actions
// ============================================================================

import { error, fail } from '@sveltejs/kit';
import { eq, and } from 'drizzle-orm';
import { db } from '$lib/server/db';
import { chatbot } from '$lib/server/db/schema';
import { getChatbotDatabase, embed } from '$lib/server/chatbot';
import type { PageServerLoad, Actions } from './$types';
import type { MethodologySchema, MethodologyType, SalesPhase, EmotionalResonance } from '$lib/server/chatbot/types';

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

	// Get all methodologies from fsDB
	const chatbotDb = await getChatbotDatabase(params.id);
	const allMethodologies = chatbotDb.methodology.all();

	// Group by type for organized display
	const methodologiesByType: Record<MethodologyType, typeof allMethodologies> = {
		phase_definition: [],
		transition_trigger: [],
		objection_response: [],
		closing_technique: [],
		qualification_question: [],
		value_proposition: [],
		urgency_creator: [],
		trust_builder: []
	};

	for (const methodology of allMethodologies) {
		const type = methodology.methodologyType as MethodologyType;
		if (methodologiesByType[type]) {
			methodologiesByType[type].push(methodology);
		}
	}

	// Sort each group by priority
	for (const type of Object.keys(methodologiesByType) as MethodologyType[]) {
		methodologiesByType[type].sort(
			(a: { priority?: number }, b: { priority?: number }) => (a.priority || 0) - (b.priority || 0)
		);
	}

	return {
		chatbot: bot,
		methodologies: allMethodologies,
		methodologiesByType,
		totalCount: allMethodologies.length
	};
};

export const actions: Actions = {
	// Create a new methodology entry
	create: async ({ request, locals, params }) => {
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
		const title = formData.get('title') as string;
		const methodologyType = formData.get('methodologyType') as MethodologyType;
		const content = formData.get('content') as string;
		const summary = formData.get('summary') as string;
		const salesPhaseRaw = formData.getAll('salesPhase') as SalesPhase[];
		const triggerPhrasesRaw = formData.get('triggerPhrases') as string;
		const applicableEmotionsRaw = formData.getAll('applicableEmotions') as EmotionalResonance[];
		const priority = parseInt(formData.get('priority') as string) || 1;

		// Validation
		if (!title || title.length < 3) {
			return fail(400, {
				error: 'Title must be at least 3 characters',
				title,
				methodologyType,
				content,
				summary
			});
		}

		if (!methodologyType) {
			return fail(400, {
				error: 'Methodology type is required',
				title,
				methodologyType,
				content,
				summary
			});
		}

		if (!content || content.length < 10) {
			return fail(400, {
				error: 'Content must be at least 10 characters',
				title,
				methodologyType,
				content,
				summary
			});
		}

		// Parse trigger phrases (comma-separated)
		const triggerPhrases = triggerPhrasesRaw
			? triggerPhrasesRaw.split(',').map((p) => p.trim()).filter(Boolean)
			: [];

		// Generate embedding for the methodology
		const textForEmbedding = `${title} ${summary || ''} ${content}`;
		const embedding = await embed(textForEmbedding);

		// Create methodology record
		const chatbotDb = await getChatbotDatabase(params.id);
		const id = `meth-${Date.now()}-${Math.random().toString(36).slice(2, 8)}`;

		chatbotDb.methodology.insert({
			id,
			content,
			methodologyType,
			salesPhase: salesPhaseRaw.length > 0 ? salesPhaseRaw : ['greeting', 'qualification', 'presentation', 'negotiation', 'closing', 'post_sale'],
			priority,
			triggerPhrases,
			applicableEmotions: applicableEmotionsRaw.length > 0 ? applicableEmotionsRaw : ['neutral'],
			title,
			summary: summary || '',
			isUserProvided: true,
			sourceTemplate: '',
			embedding: Array.from(embedding)
		});

		return { success: true, id };
	},

	// Update an existing methodology
	update: async ({ request, locals, params }) => {
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
		const id = formData.get('id') as string;
		const title = formData.get('title') as string;
		const content = formData.get('content') as string;
		const summary = formData.get('summary') as string;
		const salesPhaseRaw = formData.getAll('salesPhase') as SalesPhase[];
		const triggerPhrasesRaw = formData.get('triggerPhrases') as string;
		const applicableEmotionsRaw = formData.getAll('applicableEmotions') as EmotionalResonance[];
		const priority = parseInt(formData.get('priority') as string) || 1;

		if (!id) {
			return fail(400, { error: 'Methodology ID is required' });
		}

		const chatbotDb = await getChatbotDatabase(params.id);
		const existing = chatbotDb.methodology.get(id);

		if (!existing) {
			return fail(404, { error: 'Methodology not found' });
		}

		// Parse trigger phrases
		const triggerPhrases = triggerPhrasesRaw
			? triggerPhrasesRaw.split(',').map((p) => p.trim()).filter(Boolean)
			: [];

		// Regenerate embedding if content changed
		let embedding = existing.embedding;
		if (content !== existing.content || title !== existing.title) {
			const textForEmbedding = `${title} ${summary || ''} ${content}`;
			embedding = Array.from(await embed(textForEmbedding));
		}

		// Update the record
		chatbotDb.methodology.update(id, {
			...existing,
			title,
			content,
			summary: summary || '',
			salesPhase: salesPhaseRaw.length > 0 ? salesPhaseRaw : existing.salesPhase,
			priority,
			triggerPhrases,
			applicableEmotions: applicableEmotionsRaw.length > 0 ? applicableEmotionsRaw : existing.applicableEmotions,
			embedding
		});

		return { success: true, id };
	},

	// Delete a methodology
	delete: async ({ request, locals, params }) => {
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
		const id = formData.get('id') as string;

		if (!id) {
			return fail(400, { error: 'Methodology ID is required' });
		}

		const chatbotDb = await getChatbotDatabase(params.id);
		const deleted = chatbotDb.methodology.delete(id);

		if (!deleted) {
			return fail(404, { error: 'Methodology not found' });
		}

		return { success: true };
	}
};
