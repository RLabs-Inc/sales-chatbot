// ============================================================================
// CHATBOT MODULE - Main exports
// ============================================================================

// Types
export * from './types';

// Database
export {
	getChatbotDatabase,
	closeChatbotDatabase,
	closeAllChatbotDatabases,
	deleteChatbotDatabase,
	getChatbotConfig,
	saveChatbotConfig,
	getChatbotStats,
	type ChatbotDatabase
} from './database';

// Retrieval
export {
	retrieveCapsules,
	enrichWithRelated,
	type RetrievalContext,
	type ScoredCapsule
} from './retrieval';

// Curator prompts
export {
	getKnowledgeCuratorSystemPrompt,
	getDocumentProcessingUserPrompt,
	getMethodologyProcessingUserPrompt
} from './curator-prompt';

// Document processing
export {
	processDocument,
	processMethodology,
	deleteDocumentCapsules,
	type ProcessingResult,
	type DocumentInput,
	type DocumentType
} from './processor';

// Embeddings
export {
	initializeEmbeddings,
	embed,
	embedBatch,
	getEmbeddingDimension,
	isEmbeddingsReady
} from './embeddings';

// Conversation engine
export {
	chat,
	chatStream,
	startConversation,
	endConversation,
	saveMessage,
	restoreConversation,
	type ConversationContext,
	type ProviderConfig,
	type AIProvider
} from './conversation';
