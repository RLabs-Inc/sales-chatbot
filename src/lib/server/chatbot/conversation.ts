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
