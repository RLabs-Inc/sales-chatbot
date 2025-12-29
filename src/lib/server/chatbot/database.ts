// ============================================================================
// CHATBOT DATABASE FACTORY
// Creates isolated fsDB instances per chatbot
// ============================================================================

import { createDatabase, type Database } from '@rlabs-inc/fsdb';
import {
	knowledgeCapsuleSchemaDefinition,
	methodologySchemaDefinition,
	conversationSchemaDefinition,
	messageSchemaDefinition,
	defaultChatbotConfig,
	type ChatbotConfig
} from './types';

// fsDB record types (schema + id + content)
interface KnowledgeRecord {
	id: string;
	content: string;
	sourceDocument: string;
	[key: string]: unknown;
}

interface ConversationRecord {
	id: string;
	status: string;
	outcome: string;
	[key: string]: unknown;
}

// Base path for all chatbot data
const CHATBOTS_DATA_PATH = '.data/chatbots';

// Cache of active chatbot databases
const chatbotDatabases = new Map<string, ChatbotDatabase>();

// Using 'any' for collection types to avoid fsDB generic constraints
// The actual data is typed through our schema definitions
export interface ChatbotDatabase {
	db: Database;
	knowledge: any;
	methodology: any;
	conversations: any;
	messages: any;
	close: () => Promise<void>;
}

export async function getChatbotDatabase(chatbotId: string): Promise<ChatbotDatabase> {
	// Return cached if exists
	const cached = chatbotDatabases.get(chatbotId);
	if (cached) return cached;

	// Create new database for this chatbot
	// Include chatbotId in basePath for proper isolation
	const db = createDatabase({
		name: chatbotId,
		basePath: `${CHATBOTS_DATA_PATH}/${chatbotId}`,
		local: true
	});

	// Create collections with schemas
	const knowledge = db.collection('knowledge', {
		schema: knowledgeCapsuleSchemaDefinition as any,
		contentColumn: 'content',
		autoSave: true,
		watchFiles: false
	});

	const methodology = db.collection('methodology', {
		schema: methodologySchemaDefinition as any,
		contentColumn: 'content',
		autoSave: true,
		watchFiles: false
	});

	const conversations = db.collection('conversations', {
		schema: conversationSchemaDefinition as any,
		contentColumn: 'summary',
		autoSave: true,
		watchFiles: false
	});

	const messages = db.collection('messages', {
		schema: messageSchemaDefinition as any,
		contentColumn: 'content',
		autoSave: true,
		watchFiles: false
	});

	// Load existing data
	await Promise.all([
		knowledge.load(),
		methodology.load(),
		conversations.load(),
		messages.load()
	]);

	const chatbotDb: ChatbotDatabase = {
		db,
		knowledge,
		methodology,
		conversations,
		messages,
		close: async () => {
			await Promise.all([
				knowledge.save(),
				methodology.save(),
				conversations.save(),
				messages.save()
			]);
			db.close();
			chatbotDatabases.delete(chatbotId);
		}
	};

	chatbotDatabases.set(chatbotId, chatbotDb);
	return chatbotDb;
}

export async function closeChatbotDatabase(chatbotId: string): Promise<void> {
	const db = chatbotDatabases.get(chatbotId);
	if (db) {
		await db.close();
	}
}

export async function closeAllChatbotDatabases(): Promise<void> {
	const closePromises = Array.from(chatbotDatabases.values()).map((db) => db.close());
	await Promise.all(closePromises);
}

export async function deleteChatbotDatabase(chatbotId: string): Promise<void> {
	// Close if open
	await closeChatbotDatabase(chatbotId);

	// Delete the folder
	const fs = await import('fs/promises');
	const path = await import('path');
	const dbPath = path.join(CHATBOTS_DATA_PATH, chatbotId);

	try {
		await fs.rm(dbPath, { recursive: true, force: true });
	} catch {
		// Folder might not exist
	}
}

// ============================================================================
// CONFIG MANAGEMENT (stored as special record in knowledge collection)
// ============================================================================

const CONFIG_ID = '__chatbot_config__';

export async function getChatbotConfig(chatbotId: string): Promise<ChatbotConfig> {
	const db = await getChatbotDatabase(chatbotId);

	// Try to get existing config
	const existing = db.knowledge.get(CONFIG_ID);
	if (existing) {
		try {
			return JSON.parse(existing.content || '{}') as ChatbotConfig;
		} catch {
			// Invalid config, return default
		}
	}

	return { ...defaultChatbotConfig };
}

export async function saveChatbotConfig(
	chatbotId: string,
	config: ChatbotConfig
): Promise<void> {
	const db = await getChatbotDatabase(chatbotId);

	const existing = db.knowledge.get(CONFIG_ID);
	if (existing) {
		db.knowledge.updateField(CONFIG_ID, 'content', JSON.stringify(config, null, 2));
	} else {
		// Create config record with minimal metadata
		db.knowledge.insert({
			id: CONFIG_ID,
			content: JSON.stringify(config, null, 2),
			sourceDocument: '__system__',
			sourceType: 'manual',
			chunkIndex: 0,
			totalChunks: 1,
			triggerPhrases: [],
			questionTypes: [],
			semanticTags: ['__config__'],
			contextType: 'product_info',
			salesPhase: [],
			emotionalResonance: 'neutral',
			temporalRelevance: 'persistent',
			importanceWeight: 0,
			confidenceScore: 1,
			actionRequired: false,
			objectionPattern: false,
			embedding: []
		});
	}
}

// ============================================================================
// STATS HELPERS
// ============================================================================

export async function getChatbotStats(chatbotId: string) {
	const db = await getChatbotDatabase(chatbotId);

	const allKnowledge = db.knowledge.all().filter((k: KnowledgeRecord) => k.id !== CONFIG_ID);
	const allConversations = db.conversations.all();
	const allMethodology = db.methodology.all();

	const conversions = allConversations.filter((c: ConversationRecord) => c.outcome === 'conversion');
	const activeConversations = allConversations.filter((c: ConversationRecord) => c.status === 'active');

	return {
		knowledgeCapsules: allKnowledge.length,
		methodologyEntries: allMethodology.length,
		totalConversations: allConversations.length,
		activeConversations: activeConversations.length,
		conversions: conversions.length,
		conversionRate:
			allConversations.length > 0
				? (conversions.length / allConversations.length) * 100
				: 0
	};
}
