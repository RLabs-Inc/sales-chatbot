// ============================================================================
// DOCUMENT API - Upload and manage training documents
// GET /api/chatbots/[id]/documents - List documents
// POST /api/chatbots/[id]/documents - Upload and process document
// ============================================================================

import { json, error } from '@sveltejs/kit';
import { eq, and } from 'drizzle-orm';
import { db } from '$lib/server/db';
import { chatbot } from '$lib/server/db/schema';
import {
	getChatbotDatabase,
	processDocument,
	initializeEmbeddings,
	type DocumentInput
} from '$lib/server/chatbot';
import type { RequestHandler } from './$types';

// Helper to verify chatbot ownership
async function verifyChatbotOwnership(chatbotId: string, userId: string) {
	const [result] = await db
		.select()
		.from(chatbot)
		.where(and(eq(chatbot.id, chatbotId), eq(chatbot.userId, userId)));

	return result;
}

// GET /api/chatbots/[id]/documents - List all documents (unique source documents)
export const GET: RequestHandler = async ({ locals, params }) => {
	if (!locals.user) {
		throw error(401, 'Unauthorized');
	}

	const bot = await verifyChatbotOwnership(params.id, locals.user.id);
	if (!bot) {
		throw error(404, 'Chatbot not found');
	}

	const chatbotDb = await getChatbotDatabase(params.id);

	// Get unique source documents from knowledge capsules
	const allCapsules = chatbotDb.knowledge.all().filter(
		(k: { id: string }) => k.id !== '__chatbot_config__'
	);

	// Group by source document
	const documentsMap = new Map<
		string,
		{
			name: string;
			type: string;
			capsuleCount: number;
		}
	>();

	for (const capsule of allCapsules) {
		const key = capsule.sourceDocument as string;
		if (!documentsMap.has(key)) {
			documentsMap.set(key, {
				name: key,
				type: capsule.sourceType as string,
				capsuleCount: 0
			});
		}
		const doc = documentsMap.get(key)!;
		doc.capsuleCount++;
	}

	return json(Array.from(documentsMap.values()));
};

// Helper to convert ArrayBuffer to base64
function arrayBufferToBase64(buffer: ArrayBuffer): string {
	const bytes = new Uint8Array(buffer);
	let binary = '';
	for (let i = 0; i < bytes.byteLength; i++) {
		binary += String.fromCharCode(bytes[i]);
	}
	return btoa(binary);
}

// Helper to get mime type from file name
function getMimeType(fileName: string): string {
	const ext = fileName.toLowerCase().split('.').pop();
	switch (ext) {
		case 'png': return 'image/png';
		case 'jpg':
		case 'jpeg': return 'image/jpeg';
		case 'gif': return 'image/gif';
		case 'webp': return 'image/webp';
		default: return 'application/octet-stream';
	}
}

// POST /api/chatbots/[id]/documents - Upload and process a document
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

	// Parse multipart form data
	const formData = await request.formData();
	const file = formData.get('file') as File | null;
	const textContent = formData.get('content') as string | null;
	const documentType = formData.get('type') as string | null;

	const startTime = Date.now();
	let documentInput: DocumentInput;

	if (file) {
		// File upload - convert to base64
		const buffer = await file.arrayBuffer();
		const base64Content = arrayBufferToBase64(buffer);

		// Determine document type from file extension
		const fileName = file.name.toLowerCase();
		let detectedType: DocumentInput['type'] = 'txt';

		if (fileName.endsWith('.pdf')) detectedType = 'pdf';
		else if (fileName.endsWith('.docx')) detectedType = 'docx';
		else if (fileName.endsWith('.xlsx') || fileName.endsWith('.xls')) detectedType = 'xlsx';
		else if (fileName.endsWith('.csv')) detectedType = 'csv';
		else if (fileName.endsWith('.md')) detectedType = 'md';
		else if (fileName.endsWith('.png') || fileName.endsWith('.jpg') || fileName.endsWith('.jpeg') || fileName.endsWith('.gif') || fileName.endsWith('.webp'))
			detectedType = 'image';

		documentInput = {
			name: file.name,
			type: detectedType,
			content: base64Content,
			mimeType: detectedType === 'image' ? getMimeType(file.name) : undefined
		};
	} else if (textContent) {
		// Direct text content
		documentInput = {
			name: (formData.get('name') as string) || 'manual-input.txt',
			type: (documentType as DocumentInput['type']) || 'txt',
			content: textContent
		};
	} else {
		throw error(400, 'No file or content provided');
	}

	try {
		// Process the document - this creates knowledge capsules
		const result = await processDocument(bot, documentInput);
		const processingTime = Date.now() - startTime;

		return json(
			{
				success: result.success,
				name: documentInput.name,
				capsulesCreated: result.capsulesCreated,
				processingTimeMs: processingTime,
				errors: result.errors
			},
			{ status: 201 }
		);
	} catch (err) {
		console.error('[documents] Processing error:', err);
		throw error(500, `Failed to process document: ${err instanceof Error ? err.message : 'Unknown error'}`);
	}
};
