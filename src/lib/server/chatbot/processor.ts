// ============================================================================
// DOCUMENT PROCESSOR
// Processes uploaded documents into knowledge capsules using Claude Opus 4.5
// Supports: PDF (native), DOCX (mammoth), XLSX/CSV (xlsx), TXT/MD (direct), Images (vision)
// ============================================================================

import Anthropic from '@anthropic-ai/sdk';
import mammoth from 'mammoth';
import * as XLSX from 'xlsx';
import { getChatbotDatabase } from './database';
import { getKnowledgeCuratorSystemPrompt, getDocumentProcessingUserPrompt } from './curator-prompt';
import { embed } from './embeddings';
import type { Chatbot } from '$lib/server/db/schema';
import type { KnowledgeCapsuleSchema } from './types';
import { env } from '$env/dynamic/private';

// Lazy initialization for runtime env vars
let anthropic: Anthropic | null = null;
function getAnthropicClient(): Anthropic {
	if (!anthropic) {
		anthropic = new Anthropic({ apiKey: env.ANTHROPIC_API_KEY! });
	}
	return anthropic;
}

export interface ProcessingResult {
	success: boolean;
	capsulesCreated: number;
	errors: string[];
}

export type DocumentType = 'pdf' | 'docx' | 'xlsx' | 'csv' | 'txt' | 'md' | 'image';

export interface DocumentInput {
	type: DocumentType;
	name: string;
	content: string; // base64 for binary files, plain text for text files
	mimeType?: string; // For images: image/png, image/jpeg, etc.
}

// ============================================================================
// DOCUMENT EXTRACTION
// ============================================================================

async function extractDocxText(base64Content: string): Promise<string> {
	const buffer = Buffer.from(base64Content, 'base64');
	const result = await mammoth.extractRawText({ buffer });
	return result.value;
}

function extractXlsxText(base64Content: string): string {
	const buffer = Buffer.from(base64Content, 'base64');
	const workbook = XLSX.read(buffer, { type: 'buffer' });

	const texts: string[] = [];

	for (const sheetName of workbook.SheetNames) {
		const sheet = workbook.Sheets[sheetName];
		const csv = XLSX.utils.sheet_to_csv(sheet);
		texts.push(`## Sheet: ${sheetName}\n\n${csv}`);
	}

	return texts.join('\n\n');
}

function extractCsvText(content: string): string {
	// CSV is already text, just format it nicely
	return content;
}

export async function processDocument(
	chatbot: Chatbot,
	document: DocumentInput
): Promise<ProcessingResult> {
	const errors: string[] = [];
	let capsulesCreated = 0;

	try {
		// Get curator response from Claude Opus 4.5
		const capsuleData = await curateDocument(chatbot, document);

		// Store each capsule
		const db = await getChatbotDatabase(chatbot.id);

		for (const capsule of capsuleData) {
			try {
				// Generate embedding for the content
				const embedding = await embed(capsule.content);

				// Insert into fsDB - content goes in the markdown body
				db.knowledge.insert({
					...capsule.metadata,
					content: capsule.content,
					embedding
				});

				capsulesCreated++;
			} catch (err) {
				errors.push(`Failed to store capsule: ${err}`);
			}
		}

		return { success: errors.length === 0, capsulesCreated, errors };
	} catch (err) {
		return {
			success: false,
			capsulesCreated,
			errors: [...errors, `Processing failed: ${err}`]
		};
	}
}

interface CapsuleData {
	content: string;
	metadata: Omit<KnowledgeCapsuleSchema, 'embedding'>;
}

async function curateDocument(chatbot: Chatbot, document: DocumentInput): Promise<CapsuleData[]> {
	const systemPrompt = getKnowledgeCuratorSystemPrompt(chatbot);

	// Build content blocks based on document type
	let contentBlocks: Anthropic.MessageCreateParams['messages'][0]['content'];

	switch (document.type) {
		case 'pdf':
			// Use Claude's native PDF support
			contentBlocks = [
				{
					type: 'document' as const,
					source: {
						type: 'base64' as const,
						media_type: 'application/pdf' as const,
						data: document.content
					}
				},
				{
					type: 'text' as const,
					text: getDocumentProcessingUserPrompt('', document.name, document.type)
				}
			];
			break;

		case 'image':
			// Use Claude's vision for images (product photos, infographics, etc.)
			contentBlocks = [
				{
					type: 'image' as const,
					source: {
						type: 'base64' as const,
						media_type: (document.mimeType || 'image/png') as
							| 'image/png'
							| 'image/jpeg'
							| 'image/gif'
							| 'image/webp',
						data: document.content
					}
				},
				{
					type: 'text' as const,
					text: getDocumentProcessingUserPrompt(
						'[Image content - extract all visible text and describe the visual information]',
						document.name,
						document.type
					)
				}
			];
			break;

		case 'docx': {
			// Extract text from DOCX
			const docxText = await extractDocxText(document.content);
			contentBlocks = [
				{
					type: 'text' as const,
					text: getDocumentProcessingUserPrompt(docxText, document.name, document.type)
				}
			];
			break;
		}

		case 'xlsx': {
			// Extract text from Excel
			const xlsxText = extractXlsxText(document.content);
			contentBlocks = [
				{
					type: 'text' as const,
					text: getDocumentProcessingUserPrompt(xlsxText, document.name, document.type)
				}
			];
			break;
		}

		case 'csv': {
			// CSV is text but might be base64 encoded
			const csvText = document.content.includes(',')
				? document.content
				: Buffer.from(document.content, 'base64').toString('utf-8');
			contentBlocks = [
				{
					type: 'text' as const,
					text: getDocumentProcessingUserPrompt(csvText, document.name, document.type)
				}
			];
			break;
		}

		case 'txt':
		case 'md':
		default: {
			// Plain text documents - may be base64 encoded if uploaded via file input
			let textContent = document.content;

			// Check if content is base64 encoded (doesn't start with common text patterns)
			if (!textContent.startsWith('#') && !textContent.startsWith('\n') &&
				!textContent.startsWith(' ') && !textContent.match(/^[a-zA-Z0-9]/)) {
				try {
					textContent = Buffer.from(document.content, 'base64').toString('utf-8');
				} catch {
					// Not base64, use as-is
				}
			}
			// Also try decoding if it looks like base64 (no spaces, specific character set)
			if (/^[A-Za-z0-9+/=]+$/.test(document.content.slice(0, 100))) {
				try {
					const decoded = Buffer.from(document.content, 'base64').toString('utf-8');
					// If decoded looks like text (has newlines, readable chars), use it
					if (decoded.includes('\n') || /^[\x20-\x7E\r\n\t]+$/.test(decoded.slice(0, 200))) {
						textContent = decoded;
					}
				} catch {
					// Not base64, use as-is
				}
			}

			contentBlocks = [
				{
					type: 'text' as const,
					text: getDocumentProcessingUserPrompt(textContent, document.name, document.type)
				}
			];
			break;
		}
	}

	const response = await getAnthropicClient().messages.create({
		model: 'claude-opus-4-5',
		max_tokens: 16000,
		system: systemPrompt,
		messages: [
			{
				role: 'user',
				content: contentBlocks
			}
		]
	});

	// Parse the response to extract capsules
	const responseText = response.content
		.filter((block): block is Anthropic.TextBlock => block.type === 'text')
		.map((block) => block.text)
		.join('\n');

	return parseCapsules(responseText, document.name, document.type);
}

function parseYamlSimple(yamlStr: string): Record<string, unknown> {
	// Simple YAML parser for our known structure
	const result: Record<string, unknown> = {};
	const lines = yamlStr.split('\n');
	let currentKey = '';
	let currentArray: string[] = [];
	let inArray = false;

	for (const line of lines) {
		const trimmed = line.trim();
		if (!trimmed || trimmed.startsWith('#')) continue;

		// Check for array item
		if (trimmed.startsWith('- ')) {
			if (inArray) {
				currentArray.push(trimmed.slice(2).replace(/^["']|["']$/g, ''));
			}
			continue;
		}

		// Check for key: value
		const colonIndex = trimmed.indexOf(':');
		if (colonIndex > 0) {
			// Save previous array if any
			if (inArray && currentKey) {
				result[currentKey] = currentArray;
				currentArray = [];
				inArray = false;
			}

			const key = trimmed.slice(0, colonIndex).trim();
			const value = trimmed.slice(colonIndex + 1).trim();

			if (value === '' || value === '[]') {
				// Start of array or empty array
				currentKey = key;
				inArray = value !== '[]';
				if (value === '[]') {
					result[key] = [];
				}
			} else if (value.startsWith('[') && value.endsWith(']')) {
				// Inline array
				const items = value
					.slice(1, -1)
					.split(',')
					.map((s) => s.trim().replace(/^["']|["']$/g, ''))
					.filter((s) => s);
				result[key] = items;
			} else if (value === 'true') {
				result[key] = true;
			} else if (value === 'false') {
				result[key] = false;
			} else if (!isNaN(Number(value)) && value !== '') {
				result[key] = Number(value);
			} else {
				result[key] = value.replace(/^["']|["']$/g, '');
			}
		}
	}

	// Save last array if any
	if (inArray && currentKey) {
		result[currentKey] = currentArray;
	}

	return result;
}

function parseCapsules(
	responseText: string,
	documentName: string,
	documentType: string
): CapsuleData[] {
	const capsules: CapsuleData[] = [];

	// Split by YAML blocks (```yaml ... ```)
	const yamlBlockRegex = /```yaml\s*([\s\S]*?)```/g;
	let match;
	let chunkIndex = 0;

	while ((match = yamlBlockRegex.exec(responseText)) !== null) {
		const yamlContent = match[1].trim();

		try {
			// Split YAML frontmatter from content
			// Use regex to only split on --- that's on its own line (not inside markdown tables)
			const parts = yamlContent.split(/\n---\n/).filter((p) => p.trim());

			if (parts.length >= 1) {
				const frontmatter = parseYamlSimple(parts[0]) as Partial<KnowledgeCapsuleSchema>;
				const content = parts[1]?.trim() || '';

				// Validate and fill defaults
				const metadata: Omit<KnowledgeCapsuleSchema, 'embedding'> = {
					sourceDocument: (frontmatter.sourceDocument as string) || documentName,
					sourceType:
						(frontmatter.sourceType as KnowledgeCapsuleSchema['sourceType']) ||
						(documentType === 'pdf' ? 'pdf' : 'txt'),
					chunkIndex: (frontmatter.chunkIndex as number) ?? chunkIndex,
					totalChunks: (frontmatter.totalChunks as number) ?? 0,
					triggerPhrases: (frontmatter.triggerPhrases as string[]) || [],
					questionTypes: (frontmatter.questionTypes as string[]) || [],
					semanticTags: (frontmatter.semanticTags as string[]) || [],
					contextType:
						(frontmatter.contextType as KnowledgeCapsuleSchema['contextType']) || 'product_info',
					salesPhase:
						(frontmatter.salesPhase as KnowledgeCapsuleSchema['salesPhase']) || ['presentation'],
					emotionalResonance:
						(frontmatter.emotionalResonance as KnowledgeCapsuleSchema['emotionalResonance']) ||
						'neutral',
					temporalRelevance:
						(frontmatter.temporalRelevance as KnowledgeCapsuleSchema['temporalRelevance']) ||
						'persistent',
					importanceWeight: (frontmatter.importanceWeight as number) ?? 0.5,
					confidenceScore: (frontmatter.confidenceScore as number) ?? 0.8,
					actionRequired: (frontmatter.actionRequired as boolean) ?? false,
					objectionPattern: (frontmatter.objectionPattern as boolean) ?? false,
					antiTriggers: frontmatter.antiTriggers as string[] | undefined
				};

				if (content) {
					capsules.push({ content, metadata });
					chunkIndex++;
				}
			}
		} catch (err) {
			console.error(`Failed to parse YAML block: ${err}`);
		}
	}

	// Update totalChunks for all capsules
	const totalChunks = capsules.length;
	for (const capsule of capsules) {
		capsule.metadata.totalChunks = totalChunks;
	}

	return capsules;
}

export async function processMethodology(
	chatbot: Chatbot,
	templateType: string,
	content: string
): Promise<ProcessingResult> {
	const db = await getChatbotDatabase(chatbot.id);
	const errors: string[] = [];
	let capsulesCreated = 0;

	try {
		const embedding = await embed(content);

		db.methodology.insert({
			methodologyType: templateType as any,
			salesPhase: ['greeting', 'qualification', 'presentation', 'negotiation', 'closing'],
			priority: 1,
			triggerPhrases: [],
			applicableEmotions: ['neutral'],
			title: templateType,
			summary: content.slice(0, 200),
			content,  // Full content for markdown body
			isUserProvided: true,
			embedding
		});

		capsulesCreated = 1;
	} catch (err) {
		errors.push(`Failed to process methodology: ${err}`);
	}

	return { success: errors.length === 0, capsulesCreated, errors };
}

export async function deleteDocumentCapsules(
	chatbotId: string,
	documentName: string
): Promise<number> {
	const db = await getChatbotDatabase(chatbotId);
	const existing = db.knowledge.find((k: { sourceDocument: string }) => k.sourceDocument === documentName);

	for (const capsule of existing) {
		db.knowledge.delete(capsule.id);
	}

	return existing.length;
}
