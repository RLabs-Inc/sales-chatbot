// ============================================================================
// DOCUMENTS PAGE - Server load function
// Lists all documents for a chatbot and handles delete action
// ============================================================================

import { error, fail } from '@sveltejs/kit';
import { eq, and } from 'drizzle-orm';
import { db } from '$lib/server/db';
import { chatbot } from '$lib/server/db/schema';
import { getChatbotDatabase, deleteDocumentCapsules } from '$lib/server/chatbot';
import type { PageServerLoad, Actions } from './$types';

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

	// Get all documents from knowledge capsules
	const chatbotDb = await getChatbotDatabase(params.id);
	const allCapsules = chatbotDb.knowledge
		.all()
		.filter((k: { id: string }) => k.id !== '__chatbot_config__');

	// Group by source document
	const documentsMap = new Map<
		string,
		{
			name: string;
			type: string;
			capsuleCount: number;
			createdAt: number;
		}
	>();

	for (const capsule of allCapsules) {
		const key = capsule.sourceDocument as string;
		if (!documentsMap.has(key)) {
			documentsMap.set(key, {
				name: key,
				type: capsule.sourceType as string,
				capsuleCount: 0,
				createdAt: capsule.createdAt as number || Date.now()
			});
		}
		const doc = documentsMap.get(key)!;
		doc.capsuleCount++;
	}

	// Sort by most recent first
	const documents = Array.from(documentsMap.values()).sort(
		(a, b) => b.createdAt - a.createdAt
	);

	return {
		chatbot: bot,
		documents,
		totalCapsules: allCapsules.length
	};
};

export const actions: Actions = {
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
		const documentName = formData.get('documentName') as string;

		if (!documentName) {
			return fail(400, { error: 'Document name is required' });
		}

		try {
			const deletedCount = await deleteDocumentCapsules(params.id, documentName);
			return { success: true, deletedCount };
		} catch (err) {
			console.error('[documents] Delete error:', err);
			return fail(500, {
				error: `Failed to delete document: ${err instanceof Error ? err.message : 'Unknown error'}`
			});
		}
	}
};
