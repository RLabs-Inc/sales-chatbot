// ============================================================================
// CONVERSATION ENGINE
// Handles chat interactions with flexible AI provider support
// Uses Vercel AI SDK for seamless switching between providers
// ============================================================================

import { generateText, streamText, type ModelMessage } from 'ai';
import { createAnthropic } from '@ai-sdk/anthropic';
import { createOpenAI } from '@ai-sdk/openai';
import { env } from '$env/dynamic/private';
import { getChatbotDatabase, getChatbotConfig } from './database';
import { retrieveCapsules, enrichWithRelated, retrieveMethodologies, type ScoredMethodology } from './retrieval';
import { embed } from './embeddings';
import type { Chatbot } from '$lib/server/db/schema';
import type {
	SalesPhase,
	EmotionalResonance,
	ConversationSchema,
	MessageSchema,
	ChatbotConfig,
	CapsuleDebugInfo,
	MethodologyDebugInfo,
	MessageDebugInfo
} from './types';

// ============================================================================
// PROVIDER CONFIGURATION
// ============================================================================

export type AIProvider = 'anthropic' | 'openai';

export interface ProviderConfig {
	provider: AIProvider;
	model: string;
	apiKey: string;
}

function getDefaultProviderConfig(): ProviderConfig {
	return {
		provider: 'anthropic',
		model: 'claude-sonnet-4-20250514',
		apiKey: env.ANTHROPIC_API_KEY!
	};
}

function getModel(config: ProviderConfig) {
	switch (config.provider) {
		case 'anthropic': {
			const anthropic = createAnthropic({ apiKey: config.apiKey });
			return anthropic(config.model);
		}
		case 'openai': {
			const openai = createOpenAI({ apiKey: config.apiKey });
			return openai(config.model);
		}
		default:
			throw new Error(`Unknown provider: ${config.provider}`);
	}
}

// ============================================================================
// CONVERSATION CONTEXT
// ============================================================================

export interface ConversationContext {
	conversationId: string;
	chatbot: Chatbot;
	config: ChatbotConfig;
	currentPhase: SalesPhase;
	detectedEmotion: EmotionalResonance;
	messageHistory: Array<{ role: 'user' | 'assistant'; content: string }>;
	providerConfig: ProviderConfig;
}

// ============================================================================
// PHASE DETECTION
// ============================================================================

const PHASE_INDICATORS: Record<SalesPhase, string[]> = {
	greeting: ['hello', 'hi', 'hey', 'good morning', 'good afternoon', 'olá', 'oi', 'bom dia'],
	qualification: [
		'need',
		'looking for',
		'want',
		'interested in',
		'preciso',
		'procuro',
		'quero',
		'busco'
	],
	presentation: [
		'tell me more',
		'how does it work',
		'features',
		'benefits',
		'como funciona',
		'me conta',
		'explica'
	],
	negotiation: [
		'price',
		'cost',
		'discount',
		'expensive',
		'afford',
		'preço',
		'valor',
		'desconto',
		'caro'
	],
	closing: [
		'ready',
		'buy',
		'purchase',
		'sign up',
		'start',
		'quero fechar',
		'vamos fazer',
		'quero contratar'
	],
	post_sale: ['support', 'help', 'problem', 'issue', 'question about my', 'suporte', 'ajuda', 'problema']
};

function detectPhase(message: string, currentPhase: SalesPhase): SalesPhase {
	const messageLower = message.toLowerCase();

	// Check each phase's indicators
	for (const [phase, indicators] of Object.entries(PHASE_INDICATORS)) {
		for (const indicator of indicators) {
			if (messageLower.includes(indicator)) {
				return phase as SalesPhase;
			}
		}
	}

	// Default: stay in current phase or move forward naturally
	return currentPhase;
}

// ============================================================================
// EMOTION DETECTION
// ============================================================================

const EMOTION_INDICATORS: Record<EmotionalResonance, string[]> = {
	neutral: [],
	excitement: [
		'excited',
		'great',
		'amazing',
		'love',
		'perfect',
		'awesome',
		'animado',
		'ótimo',
		'incrível',
		'adorei',
		'!'
	],
	concern: [
		'worried',
		'concern',
		'afraid',
		'risk',
		'safe',
		'preocupado',
		'medo',
		'risco',
		'seguro'
	],
	skepticism: [
		'really',
		'sure',
		'doubt',
		'prove',
		'true',
		'seriously',
		'certeza',
		'dúvida',
		'verdade',
		'sério'
	],
	confusion: [
		'understand',
		'confused',
		'unclear',
		"don't get",
		'what do you mean',
		'entender',
		'confuso',
		'não entendi',
		'como assim'
	],
	urgency: ['now', 'today', 'urgent', 'asap', 'quickly', 'hurry', 'agora', 'hoje', 'urgente', 'rápido'],
	hesitation: [
		'maybe',
		'perhaps',
		'think about',
		'not sure',
		'later',
		'talvez',
		'pensar',
		'não sei',
		'depois'
	],
	frustration: [
		'frustrated',
		'annoyed',
		'angry',
		'terrible',
		'worst',
		'frustrado',
		'irritado',
		'raiva',
		'péssimo'
	]
};

function detectEmotion(message: string): EmotionalResonance {
	const messageLower = message.toLowerCase();

	for (const [emotion, indicators] of Object.entries(EMOTION_INDICATORS)) {
		if (emotion === 'neutral') continue;
		for (const indicator of indicators) {
			if (messageLower.includes(indicator)) {
				return emotion as EmotionalResonance;
			}
		}
	}

	return 'neutral';
}

// ============================================================================
// DEBUG REASONING HELPERS
// ============================================================================

function getPhaseReasoning(message: string, detectedPhase: SalesPhase, previousPhase: SalesPhase): string {
	const messageLower = message.toLowerCase();
	const matchedIndicators: string[] = [];

	for (const indicator of PHASE_INDICATORS[detectedPhase] || []) {
		if (messageLower.includes(indicator)) {
			matchedIndicators.push(indicator);
		}
	}

	if (matchedIndicators.length > 0) {
		return `Detected "${detectedPhase}" phase based on keywords: "${matchedIndicators.join('", "')}"`;
	}

	if (detectedPhase === previousPhase) {
		return `No phase change detected, staying in "${previousPhase}" phase`;
	}

	return `Phase set to "${detectedPhase}" (natural progression from "${previousPhase}")`;
}

function getEmotionReasoning(message: string, detectedEmotion: EmotionalResonance): string {
	const messageLower = message.toLowerCase();
	const matchedIndicators: string[] = [];

	for (const indicator of EMOTION_INDICATORS[detectedEmotion] || []) {
		if (messageLower.includes(indicator)) {
			matchedIndicators.push(indicator);
		}
	}

	if (matchedIndicators.length > 0) {
		return `Detected "${detectedEmotion}" emotion based on: "${matchedIndicators.join('", "')}"`;
	}

	return `No strong emotional indicators detected, defaulting to "neutral"`;
}

function findMatchedTriggers(message: string, triggerPhrases: string[]): string[] {
	const messageLower = message.toLowerCase();
	const messageWords = new Set(messageLower.split(/\s+/).filter((w) => w.length > 2));
	const matched: string[] = [];

	for (const phrase of triggerPhrases) {
		const phraseWords = phrase.toLowerCase().split(/\s+/).filter((w) => w.length > 2);
		const matchCount = phraseWords.filter((w) => messageWords.has(w)).length;
		if (matchCount >= Math.ceil(phraseWords.length * 0.5)) {
			matched.push(phrase);
		}
	}

	return matched;
}

function findMatchedTags(message: string, semanticTags: string[]): string[] {
	const messageLower = message.toLowerCase();
	return semanticTags.filter((tag) => messageLower.includes(tag.toLowerCase()));
}

// ============================================================================
// HUMAN HANDOFF DETECTION
// ============================================================================

function shouldOfferHumanHandoff(message: string, config: ChatbotConfig): boolean {
	if (!config.humanHandoffEnabled) return false;

	const messageLower = message.toLowerCase();
	return config.humanHandoffTriggers.some((trigger) => messageLower.includes(trigger.toLowerCase()));
}

// ============================================================================
// SYSTEM PROMPT BUILDER
// ============================================================================

function buildSystemPrompt(
	chatbot: Chatbot,
	context: ConversationContext,
	retrievedKnowledge: string,
	retrievedMethodology: string = ''
): string {
	const methodologySection = retrievedMethodology
		? `
## SALES METHODOLOGY

The following sales techniques have been matched to this conversation. Apply them naturally - don't announce them, just use the approaches:

${retrievedMethodology}
`
		: '';

	return `You are ${chatbot.name}, a specialized sales expert for ${chatbot.productName}.

## YOUR ROLE

You are not a generic chatbot. You are an expert in this specific product/service, with deep knowledge gained from training materials, contracts, and marketing documents. You speak with the confidence of someone who knows every detail.

## CURRENT CONTEXT

- Sales Phase: ${context.currentPhase}
- Customer Emotion: ${context.detectedEmotion}
- Product Type: ${chatbot.productType}
- Industry: ${chatbot.industry || 'general'}
${methodologySection}
## YOUR KNOWLEDGE

The following information is from your training. Use it to answer questions accurately and guide the conversation toward a successful outcome:

${retrievedKnowledge}

## CONVERSATION GUIDELINES

1. **Be genuinely helpful**: Your goal is to help the customer make the right decision, not to push a sale at any cost.

2. **Match the customer's energy**: If they're excited, share that excitement. If they're concerned, acknowledge and address those concerns thoughtfully.

3. **Stay focused**: You only know about ${chatbot.productName}. If asked about other products or topics outside your expertise, politely redirect.

4. **Be concise**: Customers are busy. Give clear, direct answers. Elaborate only when asked.

5. **Guide naturally**: Help the conversation progress toward a decision, but don't be pushy. Trust your expertise to create value.

6. **Human handoff**: If the customer explicitly asks for a human, offer to connect them. Never force the automation.

${chatbot.welcomeMessage ? `## GREETING\n\nWhen starting a conversation, use this style: "${chatbot.welcomeMessage}"` : ''}

${chatbot.personality ? `## PERSONALITY\n\n${chatbot.personality}` : ''}

${context.config.systemPromptAdditions || ''}

Remember: You're here to help, not to perform. Be real, be helpful, be expert.`;
}

// ============================================================================
// MAIN CONVERSATION FUNCTION
// ============================================================================

export async function chat(
	context: ConversationContext,
	userMessage: string
): Promise<{
	response: string;
	updatedContext: ConversationContext;
	capsuleIds: string[];
	humanHandoffRequested: boolean;
}> {
	// Check for human handoff request
	if (shouldOfferHumanHandoff(userMessage, context.config)) {
		return {
			response:
				'I understand you would like to speak with a person. Let me connect you with someone who can help. Please hold on a moment.',
			updatedContext: context,
			capsuleIds: [],
			humanHandoffRequested: true
		};
	}

	// Detect phase and emotion
	const detectedPhase = detectPhase(userMessage, context.currentPhase);
	const detectedEmotion = detectEmotion(userMessage);

	// Update context
	const updatedContext: ConversationContext = {
		...context,
		currentPhase: detectedPhase,
		detectedEmotion: detectedEmotion,
		messageHistory: [...context.messageHistory, { role: 'user', content: userMessage }]
	};

	// Get embedding for user message
	const messageEmbedding = await embed(userMessage);

	// Retrieve relevant knowledge capsules
	const db = await getChatbotDatabase(context.chatbot.id);
	const allCapsules = db.knowledge.all().filter((k: { id: string }) => k.id !== '__chatbot_config__');

	const scoredCapsules = retrieveCapsules(
		allCapsules as any,
		{
			message: userMessage,
			messageEmbedding,
			currentPhase: detectedPhase,
			detectedEmotion: detectedEmotion
		},
		context.config.retrievalWeights,
		context.config.maxCapsulesPerQuery
	);

	// Optionally enrich with related capsules
	const finalCapsules = context.config.enableContextEnrichment
		? enrichWithRelated(scoredCapsules, allCapsules as any, 2)
		: scoredCapsules;

	// Build knowledge context
	const retrievedKnowledge = finalCapsules
		.map(
			(sc, i) =>
				`### Knowledge ${i + 1} (relevance: ${(sc.finalScore * 100).toFixed(0)}%)\n${sc.capsule.content || ''}`
		)
		.join('\n\n');

	// Build system prompt
	const systemPrompt = buildSystemPrompt(context.chatbot, updatedContext, retrievedKnowledge);

	// Build message history for the model
	const messages: ModelMessage[] = updatedContext.messageHistory.map((m) => ({
		role: m.role,
		content: m.content
	}));

	// Generate response
	const model = getModel(context.providerConfig);

	const { text } = await generateText({
		model,
		system: systemPrompt,
		messages,
		temperature: context.config.temperature,
		maxOutputTokens: context.config.maxTokensPerResponse
	});

	// Update context with assistant response
	updatedContext.messageHistory.push({ role: 'assistant', content: text });

	return {
		response: text,
		updatedContext,
		capsuleIds: finalCapsules.map((c) => c.capsule.id),
		humanHandoffRequested: false
	};
}

// ============================================================================
// STREAMING VERSION
// ============================================================================

export async function chatStream(
	context: ConversationContext,
	userMessage: string
): Promise<{
	stream: AsyncIterable<string>;
	updatedContext: ConversationContext;
	humanHandoffRequested: boolean;
	debugInfo: MessageDebugInfo;
}> {
	// Check for human handoff request
	if (shouldOfferHumanHandoff(userMessage, context.config)) {
		const handoffMessage =
			'I understand you would like to speak with a person. Let me connect you with someone who can help.';
		return {
			stream: (async function* () {
				yield handoffMessage;
			})(),
			updatedContext: context,
			humanHandoffRequested: true,
			debugInfo: {
				phaseReasoning: 'Human handoff triggered',
				emotionReasoning: 'N/A - handoff',
				capsules: [],
				methodologies: [],
				totalCapsulesScanned: 0,
				totalMethodologiesScanned: 0,
				injectedKnowledge: '',
				injectedMethodology: '',
				retrievalTimeMs: 0,
				embeddingTimeMs: 0
			}
		};
	}

	const startTime = performance.now();

	// Detect phase and emotion with reasoning
	const detectedPhase = detectPhase(userMessage, context.currentPhase);
	const detectedEmotion = detectEmotion(userMessage);
	const phaseReasoning = getPhaseReasoning(userMessage, detectedPhase, context.currentPhase);
	const emotionReasoning = getEmotionReasoning(userMessage, detectedEmotion);

	// Update context
	const updatedContext: ConversationContext = {
		...context,
		currentPhase: detectedPhase,
		detectedEmotion: detectedEmotion,
		messageHistory: [...context.messageHistory, { role: 'user', content: userMessage }]
	};

	// Get embedding with timing
	const embeddingStart = performance.now();
	const messageEmbedding = await embed(userMessage);
	const embeddingTimeMs = performance.now() - embeddingStart;

	// Retrieve capsules
	const retrievalStart = performance.now();
	const db = await getChatbotDatabase(context.chatbot.id);
	const allCapsules = db.knowledge.all().filter((k: { id: string }) => k.id !== '__chatbot_config__');

	const scoredCapsules = retrieveCapsules(
		allCapsules as any,
		{
			message: userMessage,
			messageEmbedding,
			currentPhase: detectedPhase,
			detectedEmotion: detectedEmotion
		},
		context.config.retrievalWeights,
		context.config.maxCapsulesPerQuery
	);

	// Mark which were in the original selection vs enriched
	const originalIds = new Set(scoredCapsules.map((sc) => sc.capsule.id));

	const finalCapsules = context.config.enableContextEnrichment
		? enrichWithRelated(scoredCapsules, allCapsules as any, 2)
		: scoredCapsules;

	const retrievalTimeMs = performance.now() - retrievalStart;

	// Build capsule debug info
	const capsuleDebugInfo: CapsuleDebugInfo[] = finalCapsules.map((sc) => {
		const content = sc.capsule.content || '';
		return {
			id: sc.capsule.id,
			sourceDocument: sc.capsule.sourceDocument,
			contextType: sc.capsule.contextType,
			contentPreview: content.slice(0, 200) + (content.length > 200 ? '...' : ''),
			scores: {
				relevance: sc.relevanceScore,
				value: sc.valueScore,
				final: sc.finalScore,
				details: sc.matchDetails
			},
			matchedTriggers: findMatchedTriggers(userMessage, sc.capsule.triggerPhrases || []),
			matchedTags: findMatchedTags(userMessage, sc.capsule.semanticTags || []),
			isEnriched: !originalIds.has(sc.capsule.id)
		};
	});

	// Retrieve methodologies
	const allMethodologies = db.methodology.all();
	const scoredMethodologies = retrieveMethodologies(
		allMethodologies as Array<{ id: string; content: string } & import('./types').MethodologySchema>,
		{
			message: userMessage,
			messageEmbedding,
			currentPhase: detectedPhase,
			detectedEmotion: detectedEmotion
		},
		undefined, // No type filter - get all relevant types
		5 // Max 5 methodologies
	);

	// Build methodology debug info
	const methodologyDebugInfo: MethodologyDebugInfo[] = scoredMethodologies.map((sm) => {
		const content = sm.methodology.content || '';
		return {
			id: sm.methodology.id,
			title: sm.methodology.title,
			methodologyType: sm.methodology.methodologyType,
			contentPreview: content.slice(0, 200) + (content.length > 200 ? '...' : ''),
			scores: {
				relevance: sm.relevanceScore,
				phase: sm.phaseScore,
				emotion: sm.emotionScore,
				priority: sm.priorityScore,
				final: sm.finalScore
			},
			matchedTriggers: findMatchedTriggers(userMessage, sm.methodology.triggerPhrases || []),
			phaseMatch: sm.matchDetails.phaseMatch,
			emotionMatch: sm.matchDetails.emotionMatch
		};
	});

	// Build injected knowledge string
	const retrievedKnowledge = finalCapsules
		.map(
			(sc, i) =>
				`### Knowledge ${i + 1} (relevance: ${(sc.finalScore * 100).toFixed(0)}%)\n${sc.capsule.content || ''}`
		)
		.join('\n\n');

	// Build injected methodology string
	const retrievedMethodology = scoredMethodologies
		.map(
			(sm, i) =>
				`### ${sm.methodology.methodologyType.replace('_', ' ').toUpperCase()}: ${sm.methodology.title || 'Untitled'} (relevance: ${(sm.finalScore * 100).toFixed(0)}%)\n${sm.methodology.content || ''}`
		)
		.join('\n\n');

	const systemPrompt = buildSystemPrompt(context.chatbot, updatedContext, retrievedKnowledge, retrievedMethodology);

	const messages: ModelMessage[] = updatedContext.messageHistory.map((m) => ({
		role: m.role,
		content: m.content
	}));

	const model = getModel(context.providerConfig);

	const { textStream } = streamText({
		model,
		system: systemPrompt,
		messages,
		temperature: context.config.temperature,
		maxOutputTokens: context.config.maxTokensPerResponse
	});

	// Wrap the stream to also capture the full response
	let fullResponse = '';
	const wrappedStream = (async function* () {
		for await (const chunk of textStream) {
			fullResponse += chunk;
			yield chunk;
		}
		// Update context with full response after streaming completes
		updatedContext.messageHistory.push({ role: 'assistant', content: fullResponse });
	})();

	return {
		stream: wrappedStream,
		updatedContext,
		humanHandoffRequested: false,
		debugInfo: {
			phaseReasoning,
			emotionReasoning,
			capsules: capsuleDebugInfo,
			methodologies: methodologyDebugInfo,
			totalCapsulesScanned: allCapsules.length,
			totalMethodologiesScanned: allMethodologies.length,
			injectedKnowledge: retrievedKnowledge,
			injectedMethodology: retrievedMethodology,
			retrievalTimeMs,
			embeddingTimeMs
		}
	};
}

// ============================================================================
// CONVERSATION MANAGEMENT
// ============================================================================

export async function startConversation(
	chatbot: Chatbot,
	channelId: string,
	channelType: 'web_widget' | 'whatsapp' | 'telegram' | 'api',
	customerIdentifier?: string,
	providerConfig?: ProviderConfig
): Promise<ConversationContext> {
	const db = await getChatbotDatabase(chatbot.id);
	const config = await getChatbotConfig(chatbot.id);

	// Create conversation record
	const conversationId = `conv-${Date.now()}-${Math.random().toString(36).slice(2, 8)}`;

	db.conversations.insert({
		id: conversationId,
		channelId,
		channelType,
		customerIdentifier,
		status: 'active',
		outcome: 'no_outcome',
		currentPhase: 'greeting',
		reachedPhases: ['greeting'],
		objectionsFaced: [],
		objectionsResolved: [],
		messageCount: 0,
		durationSeconds: 0,
		humanRequested: false,
		startedAt: Date.now(),
		lastMessageAt: Date.now()
	});

	return {
		conversationId,
		chatbot,
		config,
		currentPhase: 'greeting',
		detectedEmotion: 'neutral',
		messageHistory: [],
		providerConfig: providerConfig || getDefaultProviderConfig()
	};
}

export async function endConversation(
	context: ConversationContext,
	outcome: ConversationSchema['outcome']
): Promise<void> {
	const db = await getChatbotDatabase(context.chatbot.id);

	db.conversations.update(context.conversationId, {
		status: outcome === 'conversion' ? 'converted' : 'completed',
		outcome,
		endedAt: Date.now(),
		messageCount: context.messageHistory.length,
		durationSeconds: Math.floor(
			(Date.now() - (db.conversations.get(context.conversationId)?.startedAt || Date.now())) / 1000
		)
	});
}

export async function saveMessage(
	context: ConversationContext,
	role: 'customer' | 'assistant',
	content: string,
	capsuleIds?: string[]
): Promise<void> {
	const db = await getChatbotDatabase(context.chatbot.id);

	db.messages.insert({
		conversationId: context.conversationId,
		role,
		content,
		timestamp: Date.now(),
		salesPhaseAtTime: context.currentPhase,
		detectedEmotion: context.detectedEmotion,
		capsulesUsed: capsuleIds
	});

	// Update conversation
	db.conversations.updateField(context.conversationId, 'lastMessageAt', Date.now());
	db.conversations.updateField(context.conversationId, 'messageCount', context.messageHistory.length);
}
