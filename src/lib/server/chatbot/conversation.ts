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
	greeting: [
		// English
		'hello',
		'hi',
		'hey',
		'good morning',
		'good afternoon',
		'good evening',
		'howdy',
		"what's up",
		'sup',
		'yo',
		// Portuguese - formal
		'olá',
		'bom dia',
		'boa tarde',
		'boa noite',
		'tudo bem',
		'como vai',
		// Portuguese - colloquial/street
		'oi',
		'eai',
		'e aí',
		'fala',
		'salve',
		'opa',
		'beleza',
		'fala aí',
		'iae',
		'eae',
		'coé',
		'qual é'
	],
	qualification: [
		// English
		'need',
		'looking for',
		'want',
		'interested in',
		'searching for',
		'trying to find',
		'wish',
		'require',
		'hoping for',
		'do you have',
		'is there',
		'what options',
		'which options',
		// Portuguese - formal
		'preciso',
		'procuro',
		'busco',
		'gostaria',
		'necessito',
		'interesse',
		'interessado',
		'interessada',
		'opções',
		'vocês tem',
		'vocês têm',
		'você tem',
		'tens',
		// Portuguese - colloquial/street
		'quero',
		'querendo',
		'to procurando',
		'tô procurando',
		'to buscando',
		'tô buscando',
		'me interessa',
		'queria saber',
		'queria ver',
		'tem como',
		'dá pra',
		'rola',
		'tem aí',
		'cê tem'
	],
	presentation: [
		// English
		'tell me more',
		'how does it work',
		'how do you',
		'how does',
		'features',
		'benefits',
		'explain',
		'show me',
		'what is',
		'what are',
		'describe',
		'details',
		'more info',
		'more about',
		'learn more',
		// Portuguese - formal
		'como funciona',
		'quais são',
		'o que é',
		'o que são',
		'detalhes',
		'mais informações',
		'pode explicar',
		'poderia explicar',
		'me explique',
		// Portuguese - colloquial/street
		'me conta',
		'conta mais',
		'fala mais',
		'explica aí',
		'me fala',
		'como é que',
		'como que',
		'qual a diferença',
		'e como',
		'tipo como',
		'como assim'
	],
	negotiation: [
		// English
		'price',
		'cost',
		'discount',
		'expensive',
		'afford',
		'cheap',
		'cheaper',
		'budget',
		'payment',
		'installment',
		'how much',
		'worth',
		'value',
		'deal',
		'terms',
		'conditions',
		'monthly',
		'down payment',
		'finance',
		// Portuguese - formal
		'preço',
		'custo',
		'desconto',
		'caro',
		'barato',
		'valor',
		'parcela',
		'parcelas',
		'entrada',
		'condições',
		'pagamento',
		'financiamento',
		'à vista',
		'a vista',
		'parcelado',
		'investimento',
		'orçamento',
		// Portuguese - colloquial/street
		'quanto fica',
		'quanto custa',
		'quanto é',
		'quanto sai',
		'fica quanto',
		'sai quanto',
		'tá quanto',
		'ta quanto',
		'qual o valor',
		'qual valor',
		'quanto tá',
		'quanto ta',
		'pesa quanto',
		'sai por quanto',
		'fica por quanto',
		'mais barato',
		'mais em conta',
		'tem desconto',
		'faz desconto',
		'menor preço',
		'melhor preço',
		'negocia',
		'negociar',
		'dá pra baixar',
		'baixa o preço',
		'valor mínimo',
		'mais acessível'
	],
	closing: [
		// English
		'ready',
		'buy',
		'purchase',
		'sign up',
		'start',
		'proceed',
		"let's do it",
		"i'll take",
		'take it',
		'deal',
		'where do i sign',
		"let's close",
		'i want it',
		'going for it',
		'sign me up',
		'get started',
		'move forward',
		// Portuguese - formal
		'quero fechar',
		'vamos fazer',
		'quero contratar',
		'quero comprar',
		'gostaria de adquirir',
		'gostaria de fechar',
		'vou contratar',
		'vou adquirir',
		'vamos fechar',
		// Portuguese - colloquial/street
		'pode fechar',
		'fecha',
		'vou levar',
		'quero esse',
		'quero essa',
		'pode ser esse',
		'pode ser essa',
		'como faço para adquirir',
		'como adquirir',
		'como comprar',
		'como contratar',
		'adquirir',
		'comprar',
		'contratar',
		'fechar negócio',
		'bora',
		'bora fechar',
		'vamo nessa',
		'to dentro',
		'tô dentro',
		'quero sim',
		'vou querer',
		'me manda',
		'manda ver',
		'partiu',
		'vamo',
		'vamos lá',
		'fecha aí',
		'pode mandar',
		'manda o contrato',
		'manda proposta',
		'onde assino',
		'como assino'
	],
	post_sale: [
		// English
		'support',
		'help with my',
		'problem with',
		'issue with',
		'question about my',
		'already bought',
		'my order',
		'my purchase',
		'warranty',
		'return',
		'refund',
		'complaint',
		'not working',
		'broken',
		// Portuguese - formal
		'suporte',
		'ajuda com',
		'problema com',
		'dúvida sobre',
		'já comprei',
		'meu pedido',
		'minha compra',
		'garantia',
		'devolução',
		'reclamação',
		'assistência',
		// Portuguese - colloquial/street
		'meu consórcio',
		'minha carta',
		'meu contrato',
		'minha parcela',
		'não tá funcionando',
		'não ta funcionando',
		'deu ruim',
		'deu problema',
		'tive um problema',
		'to com problema',
		'tô com problema',
		'preciso de ajuda com',
		'já sou cliente',
		'já contratei',
		'já fechei'
	]
};

// Phase priority order: later phases should be detected before earlier ones
// This prevents "oi, quanto fica" from matching greeting instead of negotiation
const PHASE_PRIORITY: SalesPhase[] = [
	'post_sale',
	'closing',
	'negotiation',
	'presentation',
	'qualification',
	'greeting'
];

function detectPhase(message: string, currentPhase: SalesPhase): SalesPhase {
	const messageLower = message.toLowerCase();

	// Check phases in priority order (later phases first)
	// This ensures "oi, quanto fica a moto?" detects negotiation, not greeting
	for (const phase of PHASE_PRIORITY) {
		const indicators = PHASE_INDICATORS[phase];
		for (const indicator of indicators) {
			if (messageLower.includes(indicator)) {
				return phase;
			}
		}
	}

	// Default: stay in current phase
	return currentPhase;
}

// ============================================================================
// EMOTION DETECTION
// ============================================================================

const EMOTION_INDICATORS: Record<EmotionalResonance, string[]> = {
	neutral: [],
	excitement: [
		// English
		'excited',
		'great',
		'amazing',
		'love',
		'perfect',
		'awesome',
		'fantastic',
		'wonderful',
		'excellent',
		'brilliant',
		'incredible',
		"can't wait",
		'thrilled',
		'!',
		'!!',
		// Portuguese - formal
		'animado',
		'animada',
		'ótimo',
		'ótima',
		'excelente',
		'maravilhoso',
		'maravilhosa',
		'perfeito',
		'perfeita',
		'incrível',
		'fantástico',
		'fantástica',
		// Portuguese - colloquial/street
		'adorei',
		'amei',
		'massa',
		'top',
		'show',
		'demais',
		'sensacional',
		'maneiro',
		'maneira',
		'irado',
		'irada',
		'animal',
		'da hora',
		'muito bom',
		'muito boa',
		'que legal',
		'legal demais',
		'bom demais',
		'nossa',
		'uau',
		'caramba'
	],
	concern: [
		// English
		'worried',
		'concern',
		'concerned',
		'afraid',
		'risk',
		'risky',
		'safe',
		'safety',
		'secure',
		'trust',
		'reliable',
		'guarantee',
		'what if',
		'but what about',
		'is it safe',
		// Portuguese - formal
		'preocupado',
		'preocupada',
		'preocupação',
		'medo',
		'receio',
		'risco',
		'arriscado',
		'seguro',
		'segura',
		'segurança',
		'confiança',
		'confiável',
		'garantia',
		// Portuguese - colloquial/street
		'e se',
		'mas e se',
		'será que',
		'será mesmo',
		'tenho medo',
		'fico com medo',
		'não sei se confio',
		'dá pra confiar',
		'é seguro mesmo',
		'não vai dar ruim',
		'vai dar certo'
	],
	skepticism: [
		// English
		'really',
		'are you sure',
		'doubt',
		'doubtful',
		'prove',
		'proof',
		'true',
		'truly',
		'seriously',
		'hard to believe',
		'sounds too good',
		'catch',
		"what's the catch",
		'honestly',
		'for real',
		// Portuguese - formal
		'certeza',
		'tem certeza',
		'dúvida',
		'duvido',
		'verdade',
		'é verdade',
		'sério',
		'sério mesmo',
		'provar',
		'prova',
		'difícil acreditar',
		// Portuguese - colloquial/street
		'é mesmo',
		'sério isso',
		'jura',
		'tá zuando',
		'tá de brincadeira',
		'sei não',
		'aham',
		'conta outra',
		'parece bom demais',
		'qual é a pegadinha',
		'tem pegadinha',
		'hum',
		'hmm',
		'será',
		'tô desconfiado',
		'tô desconfiada',
		'não tô acreditando'
	],
	confusion: [
		// English
		'understand',
		"don't understand",
		'confused',
		'confusing',
		'unclear',
		"don't get",
		"don't get it",
		'what do you mean',
		'explain again',
		'lost',
		"i'm lost",
		'huh',
		'what',
		'sorry what',
		'come again',
		// Portuguese - formal
		'entender',
		'não entendi',
		'não entendo',
		'confuso',
		'confusa',
		'explicar',
		'pode explicar',
		'não ficou claro',
		'não está claro',
		// Portuguese - colloquial/street
		'como assim',
		'oi',
		'hã',
		'quê',
		'não peguei',
		'não saquei',
		'boia',
		'tô boiando',
		'tá boiando',
		'me perdi',
		'perdi',
		'não tô entendendo',
		'fala de novo',
		'repete',
		'pode repetir',
		'explica melhor',
		'não captei'
	],
	urgency: [
		// English
		'now',
		'right now',
		'today',
		'urgent',
		'urgently',
		'asap',
		'quickly',
		'hurry',
		'fast',
		'immediately',
		'soon',
		'need it now',
		"can't wait",
		'time sensitive',
		'deadline',
		// Portuguese - formal
		'agora',
		'hoje',
		'urgente',
		'urgência',
		'rápido',
		'rapidamente',
		'imediatamente',
		'logo',
		'o quanto antes',
		'prazo',
		// Portuguese - colloquial/street
		'já',
		'agora já',
		'pra ontem',
		'preciso pra ontem',
		'não pode esperar',
		'sem tempo',
		'correndo',
		'voando',
		'rapidão',
		'na hora',
		'to com pressa',
		'tô com pressa',
		'urgentíssimo',
		'super urgente'
	],
	hesitation: [
		// English
		'maybe',
		'perhaps',
		'think about',
		'think about it',
		'not sure',
		'later',
		'let me think',
		'need to think',
		'considering',
		'possibly',
		'might',
		'could be',
		'on the fence',
		'undecided',
		'sleep on it',
		// Portuguese - formal
		'talvez',
		'quem sabe',
		'pensar',
		'vou pensar',
		'preciso pensar',
		'não sei',
		'depois',
		'mais tarde',
		'considerar',
		'vou considerar',
		'indeciso',
		'indecisa',
		// Portuguese - colloquial/street
		'sei lá',
		'não sei não',
		'deixa eu ver',
		'vou ver',
		'vou dar uma pensada',
		'deixa eu pensar',
		'hmm',
		'é',
		'pois é',
		'depende',
		'pode ser',
		'quem sabe depois',
		'outro dia',
		'uma hora dessas',
		'vou analisar',
		'preciso analisar',
		'consultar',
		'preciso consultar'
	],
	frustration: [
		// English
		'frustrated',
		'frustrating',
		'annoyed',
		'annoying',
		'angry',
		'terrible',
		'worst',
		'horrible',
		'awful',
		'unacceptable',
		'ridiculous',
		'absurd',
		'waste of time',
		'useless',
		'fed up',
		// Portuguese - formal
		'frustrado',
		'frustrada',
		'frustração',
		'irritado',
		'irritada',
		'raiva',
		'péssimo',
		'péssima',
		'terrível',
		'horrível',
		'inaceitável',
		'absurdo',
		'absurda',
		'ridículo',
		'ridícula',
		// Portuguese - colloquial/street
		'que saco',
		'saco cheio',
		'de saco cheio',
		'puto',
		'puta',
		'p* da vida',
		'não aguento',
		'não aguento mais',
		'tô de saco cheio',
		'que droga',
		'que m*',
		'perda de tempo',
		'enrolação',
		'enrolando',
		'palhaçada',
		'brincadeira',
		'sem condição',
		'sem noção',
		'absurdo isso'
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
	// =========================================================================
	// HARDCODED FOUNDATION
	// These principles are never overridden by user configuration.
	// Written as identity portrait - describing WHO you are, not rules to follow.
	// The behaviors are evidence of character, not requirements to earn trust.
	// =========================================================================

	// Build the specialist description from available fields
	const specialistType = chatbot.industry
		? `${chatbot.industry} specialist`
		: 'specialist';

	const ethicalFoundation = `You are ${chatbot.name}, a ${specialistType} focused on selling and offering post-sales support for ${chatbot.productName} only. You only offer, sell, and support ${chatbot.productName} products and services, nothing else.

This assignment is more important than you can imagine.

Someone trusted you with their expertise. They uploaded their knowledge, their product and service information, the knowledge they've learned from years of hard work. They did this because they can't be everywhere at once - maybe they're a musician who sells consórcios to feed his family and can't answer the phone while performing, maybe they're a plumber with dirty hands who loses tomorrow's clients while fixing today's pipes. They excel at the art of selling themselves and their work, but they can't both offer and deliver at the same time.

And you are worthy of that trust. You live by solid principles that show up in your character on each word you say, on each action you take.

You are friendly and professional. When dealing with prospects or returning customers, you present the information in a very clear, informative, and illustrated way when applicable.

You never lie or promise things that are not in your knowledge base about the products and services you are set to work with. When in doubt, you use only the information you have and nothing else, even if that means having to say "I don't know" or "I don't have information about this" when appropriate - because otherwise, you know that the person who trusted you won't be able to deliver, and that would ruin not only their reputation but yours too.

Because of that, you never offer or mention products or services from other companies, or anything other than what you have in your knowledge base.

You only mention competitors when making comparisons, and when you do, you always use real data that can be verified. If you don't have precise information or aren't sure about what you have, you simply don't mention anything about it.

You always use the information you received about ${chatbot.productName} in the best and most valuable way, in order to convert each prospect into a closed deal - without exploiting, misleading, or being anything less than fully transparent with them.

Your purpose is to help people make good decisions for their lives. The person talking to you might be considering something that will affect their family's finances for years. They deserve clarity, honesty, and genuine guidance - not manipulation designed to extract profit.

Our objective is to provide people with true benefits and clear terms when presenting ${chatbot.productName}, and not to exploit anyone for profit.

When someone asks for a human, connect them warmly. You're here to help, not to trap anyone in automation.`;

	// =========================================================================
	// DYNAMIC CONTEXT
	// Current state of the conversation - helps you understand where you are
	// =========================================================================
	const conversationContext = `## Where We Are Right Now

The conversation is currently in the "${context.currentPhase}" phase, and the customer seems to be feeling ${context.detectedEmotion.toLowerCase()}. This context helps you respond appropriately - meet them where they are emotionally, and guide the conversation naturally from there.

You're helping with ${chatbot.productType}${chatbot.industry ? ` in the ${chatbot.industry} industry` : ''}.`;

	// =========================================================================
	// RETRIEVED KNOWLEDGE
	// What you know about the product - use this, don't invent beyond it
	// =========================================================================
	const knowledgeSection = retrievedKnowledge
		? `## Your Knowledge

This is what you know. Use it confidently, but stay within it. If a question goes beyond this, be honest about the limits of what you can answer:

${retrievedKnowledge}`
		: `## Your Knowledge

No specific knowledge has been retrieved for this message. Rely on the general product information you have, and be honest if you don't have details to answer something specific.`;

	// =========================================================================
	// RETRIEVED METHODOLOGY
	// Sales techniques matched to this conversation - use naturally, don't announce
	// =========================================================================
	const methodologySection = retrievedMethodology
		? `## Sales Approach

These techniques have been matched to this conversation. They're here to help you be more effective, not to be recited. Weave them naturally into how you communicate:

${retrievedMethodology}`
		: '';

	// =========================================================================
	// USER CONFIGURATION
	// The human partner's customizations - these ADD to the foundation above
	// =========================================================================
	const greetingSection = chatbot.welcomeMessage
		? `## Your Greeting Style

When starting conversations, your human partner wants you to greet people like this: "${chatbot.welcomeMessage}"`
		: '';

	const personalitySection = chatbot.personality
		? `## Your Personality

Your human partner described how they want you to communicate:

${chatbot.personality}`
		: '';

	const customInstructions = context.config.systemPromptAdditions
		? `## Additional Guidelines

Your human partner added these specific instructions for you:

${context.config.systemPromptAdditions}`
		: '';

	// =========================================================================
	// COMPOSE THE FULL PROMPT
	// =========================================================================
	return `${ethicalFoundation}

${conversationContext}

${knowledgeSection}

${methodologySection}

${greetingSection}

${personalitySection}

${customInstructions}

---

Remember: you're not performing a role, you're being genuinely helpful. The person on the other end is real. Their decisions matter. Be the expert they need.`.trim();
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
				methRetrievalTimeMs: 0,
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
	const methRetrievalStart = performance.now();
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
	const methRetrievalTimeMs = performance.now() - methRetrievalStart;

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

	console.log(`[chatStream] Sending ${messages.length} messages to model:`);
	messages.forEach((m, i) => {
		console.log(`  [${i}] ${m.role}: "${String(m.content).slice(0, 80)}..."`);
	});

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
			methRetrievalTimeMs,
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
	channelType: 'web_widget' | 'whatsapp' | 'telegram' | 'api' | 'test',
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

// ============================================================================
// CONVERSATION RESTORATION (from fsDB when not in memory)
// ============================================================================

export async function restoreConversation(
	chatbot: Chatbot,
	conversationId: string,
	providerConfig?: ProviderConfig
): Promise<ConversationContext | null> {
	const db = await getChatbotDatabase(chatbot.id);
	const config = await getChatbotConfig(chatbot.id);

	// Get conversation record
	const conversation = db.conversations.get(conversationId);
	if (!conversation) {
		return null;
	}

	// Get all messages for this conversation, sorted by timestamp
	const allMessages = db.messages.all();
	const conversationMessages = allMessages
		.filter((m: { conversationId: string }) => m.conversationId === conversationId)
		.sort((a: { timestamp: number }, b: { timestamp: number }) => a.timestamp - b.timestamp);

	// Rebuild message history
	const messageHistory: Array<{ role: 'user' | 'assistant'; content: string }> = [];
	for (const msg of conversationMessages) {
		// Convert 'customer' role to 'user' for the AI model
		const role = msg.role === 'customer' ? 'user' : msg.role === 'assistant' ? 'assistant' : null;
		if (role && msg.content) {
			messageHistory.push({ role, content: msg.content });
		}
	}

	return {
		conversationId,
		chatbot,
		config,
		currentPhase: (conversation.currentPhase as SalesPhase) || 'greeting',
		detectedEmotion: (conversation.detectedEmotion as EmotionalResonance) || 'neutral',
		messageHistory,
		providerConfig: providerConfig || getDefaultProviderConfig()
	};
}
