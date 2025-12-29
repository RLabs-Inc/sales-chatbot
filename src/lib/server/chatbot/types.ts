// ============================================================================
// fsDB SCHEMAS FOR PER-CHATBOT ISOLATED STORAGE
// Each chatbot gets its own fsDB instance with these collections
// ============================================================================

// ============================================================================
// KNOWLEDGE CAPSULES - The RAG content with rich retrieval metadata
// ============================================================================

export type ContextType =
	| 'product_info' // Core product/service details
	| 'pricing' // Prices, payment terms, conditions
	| 'objection_handling' // Responses to common objections
	| 'competitor_comparison' // How we compare to alternatives
	| 'trust_building' // Testimonials, guarantees, credentials
	| 'process_explanation' // How things work, steps involved
	| 'legal_terms' // Contracts, terms, conditions
	| 'faq' // Frequently asked questions
	| 'closing_technique' // How to close the sale
	| 'follow_up'; // Post-sale, support info

export type SalesPhase =
	| 'greeting' // Initial contact
	| 'qualification' // Understanding customer needs
	| 'presentation' // Showing the product/service
	| 'negotiation' // Handling concerns, pricing discussion
	| 'closing' // Getting the commitment
	| 'post_sale'; // After the deal, support

export type EmotionalResonance =
	| 'neutral'
	| 'excitement' // Customer is excited
	| 'concern' // Worried about something
	| 'skepticism' // Doubting, needs proof
	| 'confusion' // Doesn't understand
	| 'urgency' // Needs it now
	| 'hesitation' // Almost ready but holding back
	| 'frustration'; // Having a bad experience

export type TemporalRelevance =
	| 'persistent' // Always relevant (core product info)
	| 'seasonal' // Time-specific (promotions, etc.)
	| 'conditional' // Only when certain conditions met
	| 'archived'; // Historical, rarely needed

export interface KnowledgeCapsuleSchema {
	// Core content (markdown body)
	// contentColumn: 'content' - the actual text chunk

	// Source tracking
	sourceDocument: string; // Original filename
	sourceType: 'pdf' | 'docx' | 'txt' | 'manual' | 'template';
	chunkIndex: number;
	totalChunks: number;

	// Retrieval scoring dimensions
	triggerPhrases: string[]; // Situational activation - "when customer asks about..."
	questionTypes: string[]; // What questions this answers - "how much", "why should I"
	semanticTags: string[]; // Keywords for matching and enrichment
	contextType: ContextType;
	salesPhase: SalesPhase[];
	emotionalResonance: EmotionalResonance;
	temporalRelevance: TemporalRelevance;

	// Curator assessments
	importanceWeight: number; // 0-1, how critical is this info
	confidenceScore: number; // 0-1, how sure are we about this

	// Flags
	actionRequired: boolean; // Force inclusion (blocking info)
	objectionPattern: boolean; // This is an objection + response pair

	// Anti-patterns (optional)
	antiTriggers?: string[]; // When NOT to surface this

	// Vector embedding (computed at storage)
	embedding: number[];
}

// fsDB schema definition for knowledge capsules
export const knowledgeCapsuleSchemaDefinition = {
	content: 'string', // The actual knowledge text - stored in markdown body via contentColumn
	sourceDocument: 'string',
	sourceType: 'string',
	chunkIndex: 'number',
	totalChunks: 'number',
	triggerPhrases: 'string[]',
	questionTypes: 'string[]',
	semanticTags: 'string[]',
	contextType: 'string',
	salesPhase: 'string[]',
	emotionalResonance: 'string',
	temporalRelevance: 'string',
	importanceWeight: 'number',
	confidenceScore: 'number',
	actionRequired: 'boolean',
	objectionPattern: 'boolean',
	antiTriggers: 'string[]',
	embedding: 'vector:384'
} as const;

// ============================================================================
// METHODOLOGY - Sales templates and techniques
// ============================================================================

export type MethodologyType =
	| 'phase_definition' // How to behave in each sales phase
	| 'transition_trigger' // When to move between phases
	| 'objection_response' // Specific objection handling scripts
	| 'closing_technique' // How to close
	| 'qualification_question' // Questions to ask during qualification
	| 'value_proposition' // Key value points to emphasize
	| 'urgency_creator' // How to create buying urgency
	| 'trust_builder'; // How to build credibility

export interface MethodologySchema {
	// Core content (markdown body)
	// contentColumn: 'content' - the technique description

	// Classification
	methodologyType: MethodologyType;
	salesPhase: SalesPhase[];
	priority: number; // Order within type (1 = highest)

	// Activation
	triggerPhrases: string[]; // When to use this technique
	applicableEmotions: EmotionalResonance[]; // Customer states where this applies

	// Metadata
	title: string;
	summary: string;

	// Source (if from user input)
	isUserProvided: boolean; // True if salesperson added this
	sourceTemplate?: string; // Which template this came from

	// Vector for semantic matching
	embedding: number[];
}

export const methodologySchemaDefinition = {
	content: 'string', // Stored as markdown body via contentColumn
	methodologyType: 'string',
	salesPhase: 'string[]',
	priority: 'number',
	triggerPhrases: 'string[]',
	applicableEmotions: 'string[]',
	title: 'string',
	summary: 'string',
	isUserProvided: 'boolean',
	sourceTemplate: 'string',
	embedding: 'vector:384'
} as const;

// ============================================================================
// CONVERSATIONS - Chat sessions with end customers
// ============================================================================

export type ConversationStatus =
	| 'active' // Ongoing conversation
	| 'waiting_human' // Customer requested human
	| 'completed' // Naturally ended
	| 'converted' // Sale made
	| 'abandoned'; // Customer left

export type ConversationOutcome =
	| 'conversion' // Sale completed
	| 'appointment' // Appointment booked
	| 'human_handoff' // Transferred to human
	| 'follow_up_scheduled' // Will contact later
	| 'not_interested' // Customer declined
	| 'no_outcome'; // Just ended

export interface ConversationSchema {
	// contentColumn: 'summary' - AI-generated conversation summary

	// Channel info
	channelId: string;
	channelType: 'web_widget' | 'whatsapp' | 'telegram' | 'api';

	// Customer (anonymous or identified)
	customerIdentifier?: string; // Phone, email, or anonymous ID
	customerName?: string;

	// Status tracking
	status: ConversationStatus;
	outcome: ConversationOutcome;
	currentPhase: SalesPhase;

	// Funnel tracking
	reachedPhases: SalesPhase[]; // Which phases we got through
	objectionsFaced: string[]; // Objections encountered
	objectionsResolved: string[]; // Objections successfully handled

	// Stats
	messageCount: number;
	durationSeconds: number;

	// Human handoff
	humanRequested: boolean;
	humanHandoffReason?: string;

	// Timestamps
	startedAt: number;
	lastMessageAt: number;
	endedAt?: number;
}

export const conversationSchemaDefinition = {
	summary: 'string', // AI-generated conversation summary - stored in markdown body via contentColumn
	channelId: 'string',
	channelType: 'string',
	customerIdentifier: 'string',
	customerName: 'string',
	status: 'string',
	outcome: 'string',
	currentPhase: 'string',
	reachedPhases: 'string[]',
	objectionsFaced: 'string[]',
	objectionsResolved: 'string[]',
	messageCount: 'number',
	durationSeconds: 'number',
	humanRequested: 'boolean',
	humanHandoffReason: 'string',
	startedAt: 'number',
	lastMessageAt: 'number',
	endedAt: 'number'
} as const;

// ============================================================================
// MESSAGES - Individual messages in conversations
// ============================================================================

export type MessageRole = 'customer' | 'assistant' | 'system' | 'human_agent';

export interface MessageSchema {
	// contentColumn: 'content' - the message text

	// Relationship
	conversationId: string;

	// Message info
	role: MessageRole;
	timestamp: number;

	// Context at time of message (for assistant messages)
	salesPhaseAtTime?: SalesPhase;
	detectedEmotion?: EmotionalResonance;
	capsulesUsed?: string[]; // IDs of knowledge capsules retrieved

	// For customer messages
	detectedIntent?: string; // What did they want
	detectedObjection?: string; // If they raised an objection

	// For tracking
	tokenCount?: number;
}

export const messageSchemaDefinition = {
	content: 'string', // The message text - stored in markdown body via contentColumn
	conversationId: 'string',
	role: 'string',
	timestamp: 'number',
	salesPhaseAtTime: 'string',
	detectedEmotion: 'string',
	capsulesUsed: 'string[]',
	detectedIntent: 'string',
	detectedObjection: 'string',
	tokenCount: 'number'
} as const;

// ============================================================================
// RETRIEVAL SCORING WEIGHTS (configurable per chatbot)
// ============================================================================

export interface RetrievalWeights {
	// Relevance score (gatekeeper)
	triggerPhrases: number; // Default: 0.15
	vectorSimilarity: number; // Default: 0.15
	semanticTags: number; // Default: 0.05
	questionTypes: number; // Default: 0.05

	// Value score
	importanceWeight: number; // Default: 0.20
	temporalRelevance: number; // Default: 0.10
	contextAlignment: number; // Default: 0.10
	confidenceScore: number; // Default: 0.05
	emotionalResonance: number; // Default: 0.10
	objectionPattern: number; // Default: 0.05

	// Thresholds
	relevanceGatekeeper: number; // Default: 0.05 (minimum to consider)
	minimumFinalScore: number; // Default: 0.30 (minimum to include)
}

export const defaultRetrievalWeights: RetrievalWeights = {
	triggerPhrases: 0.15,
	vectorSimilarity: 0.15,
	semanticTags: 0.05,
	questionTypes: 0.05,
	importanceWeight: 0.20,
	temporalRelevance: 0.10,
	contextAlignment: 0.10,
	confidenceScore: 0.05,
	emotionalResonance: 0.10,
	objectionPattern: 0.05,
	relevanceGatekeeper: 0.05,
	minimumFinalScore: 0.30
};

// ============================================================================
// CHATBOT INSTANCE CONFIG (stored in fsDB as single record)
// ============================================================================

export interface ChatbotConfig {
	// Retrieval tuning
	retrievalWeights: RetrievalWeights;
	maxCapsulesPerQuery: number; // Default: 5
	enableContextEnrichment: boolean; // Tier 3 related capsules

	// Conversation behavior
	maxConversationTurns: number; // Before suggesting human
	humanHandoffEnabled: boolean;
	humanHandoffTriggers: string[]; // Phrases that trigger handoff offer

	// AI settings
	systemPromptAdditions?: string; // Extra instructions for the AI
	temperature: number; // Default: 0.7
	maxTokensPerResponse: number; // Default: 500
}

export const defaultChatbotConfig: ChatbotConfig = {
	retrievalWeights: defaultRetrievalWeights,
	maxCapsulesPerQuery: 5,
	enableContextEnrichment: true,
	maxConversationTurns: 50,
	humanHandoffEnabled: true,
	humanHandoffTriggers: ['talk to human', 'real person', 'speak to someone'],
	temperature: 0.7,
	maxTokensPerResponse: 500
};

// ============================================================================
// DEBUG INFO - For glass-box test chat experience
// ============================================================================

export interface CapsuleDebugInfo {
	id: string;
	sourceDocument: string;
	contextType: ContextType;
	contentPreview: string; // First 200 chars
	scores: {
		relevance: number;
		value: number;
		final: number;
		details: {
			triggerScore: number;
			vectorScore: number;
			tagScore: number;
			questionScore: number;
			importanceScore: number;
			temporalScore: number;
			contextScore: number;
			confidenceScore: number;
			emotionScore: number;
			objectionScore: number;
		};
	};
	matchedTriggers: string[];
	matchedTags: string[];
	isEnriched: boolean; // True if added via context enrichment
}

export interface MethodologyDebugInfo {
	id: string;
	title: string;
	methodologyType: MethodologyType;
	contentPreview: string;
	scores: {
		relevance: number;
		phase: number;
		emotion: number;
		priority: number;
		final: number;
	};
	matchedTriggers: string[];
	phaseMatch: boolean;
	emotionMatch: boolean;
}

export interface MessageDebugInfo {
	// Detection results
	phaseReasoning: string;
	emotionReasoning: string;
	detectedIntent?: string;
	detectedObjection?: string;

	// Retrieval results
	capsules: CapsuleDebugInfo[];
	methodologies: MethodologyDebugInfo[];
	totalCapsulesScanned: number;
	totalMethodologiesScanned: number;

	// What was injected into the prompt
	injectedKnowledge: string;
	injectedMethodology: string;

	// Timing
	retrievalTimeMs: number;
	embeddingTimeMs: number;
}
