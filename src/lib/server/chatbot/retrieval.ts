// ============================================================================
// RETRIEVAL ENGINE - 10-Dimensional Scoring
// Pure mechanical retrieval - no LLM calls, microsecond performance
// ============================================================================

import type {
	KnowledgeCapsuleSchema,
	MethodologySchema,
	MethodologyType,
	RetrievalWeights,
	ContextType,
	SalesPhase,
	EmotionalResonance
} from './types';
import { defaultRetrievalWeights } from './types';

export interface RetrievalContext {
	message: string;
	messageEmbedding: number[];
	currentPhase?: SalesPhase;
	detectedEmotion?: EmotionalResonance;
	conversationHistory?: string[];
}

export interface ScoredCapsule {
	capsule: KnowledgeCapsuleSchema & { id: string; content: string };
	relevanceScore: number;
	valueScore: number;
	finalScore: number;
	matchDetails: {
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
}

// ============================================================================
// SCORING FUNCTIONS
// ============================================================================

function cosineSimilarity(a: number[], b: number[]): number {
	if (a.length !== b.length || a.length === 0) return 0;

	let dotProduct = 0;
	let normA = 0;
	let normB = 0;

	for (let i = 0; i < a.length; i++) {
		dotProduct += a[i] * b[i];
		normA += a[i] * a[i];
		normB += b[i] * b[i];
	}

	const magnitude = Math.sqrt(normA) * Math.sqrt(normB);
	return magnitude === 0 ? 0 : dotProduct / magnitude;
}

const STOP_WORDS = new Set([
	'a', 'an', 'the', 'is', 'are', 'was', 'were', 'be', 'been', 'being',
	'have', 'has', 'had', 'do', 'does', 'did', 'will', 'would', 'could',
	'should', 'may', 'might', 'must', 'shall', 'can', 'need', 'dare',
	'ought', 'used', 'to', 'of', 'in', 'for', 'on', 'with', 'at', 'by',
	'from', 'as', 'into', 'through', 'during', 'before', 'after', 'above',
	'below', 'between', 'under', 'again', 'further', 'then', 'once', 'here',
	'there', 'when', 'where', 'why', 'how', 'all', 'each', 'few', 'more',
	'most', 'other', 'some', 'such', 'no', 'nor', 'not', 'only', 'own',
	'same', 'so', 'than', 'too', 'very', 'just', 'and', 'but', 'if', 'or',
	'because', 'until', 'while', 'although', 'though', 'after', 'before',
	'i', 'me', 'my', 'myself', 'we', 'our', 'ours', 'ourselves', 'you',
	'your', 'yours', 'yourself', 'yourselves', 'he', 'him', 'his', 'himself',
	'she', 'her', 'hers', 'herself', 'it', 'its', 'itself', 'they', 'them',
	'their', 'theirs', 'themselves', 'what', 'which', 'who', 'whom', 'this',
	'that', 'these', 'those', 'am', 'is', 'are', 'was', 'were', 'be', 'been',
	// Portuguese
	'o', 'a', 'os', 'as', 'um', 'uma', 'uns', 'umas', 'de', 'da', 'do', 'das',
	'dos', 'em', 'na', 'no', 'nas', 'nos', 'por', 'para', 'com', 'sem',
	'sob', 'sobre', 'entre', 'até', 'após', 'desde', 'durante', 'perante',
	'que', 'se', 'não', 'mais', 'muito', 'já', 'também', 'só', 'seu', 'sua',
	'seus', 'suas', 'meu', 'minha', 'meus', 'minhas', 'ele', 'ela', 'eles',
	'elas', 'nós', 'vós', 'eu', 'tu', 'você', 'vocês', 'esse', 'essa',
	'esses', 'essas', 'este', 'esta', 'estes', 'estas', 'isso', 'isto',
	'aquele', 'aquela', 'aqueles', 'aquelas', 'aquilo'
]);

function extractKeywords(text: string): Set<string> {
	const normalized = text.toLowerCase()
		.replace(/[^\w\sáàâãéèêíìîóòôõúùûç]/g, ' ')
		.split(/\s+/)
		.filter(word => word.length > 2 && !STOP_WORDS.has(word));

	return new Set(normalized);
}

function scoreTriggerPhrases(message: string, triggerPhrases: string[]): number {
	if (!triggerPhrases || triggerPhrases.length === 0) return 0;

	const messageKeywords = extractKeywords(message);
	let bestScore = 0;

	for (const phrase of triggerPhrases) {
		const phraseKeywords = extractKeywords(phrase);
		if (phraseKeywords.size === 0) continue;

		let matches = 0;
		for (const keyword of phraseKeywords) {
			if (messageKeywords.has(keyword)) {
				matches++;
			}
			// Check for partial matches (plural/singular variations)
			for (const msgWord of messageKeywords) {
				if (msgWord.startsWith(keyword.slice(0, -1)) || keyword.startsWith(msgWord.slice(0, -1))) {
					matches += 0.5;
					break;
				}
			}
		}

		const score = Math.min(matches / phraseKeywords.size, 1);
		bestScore = Math.max(bestScore, score);
	}

	return bestScore;
}

function scoreSemanticTags(message: string, tags: string[]): number {
	if (!tags || tags.length === 0) return 0;

	const messageKeywords = extractKeywords(message);
	let matches = 0;

	for (const tag of tags) {
		const tagLower = tag.toLowerCase();
		if (messageKeywords.has(tagLower)) {
			matches++;
		}
		// Partial match
		for (const word of messageKeywords) {
			if (word.includes(tagLower) || tagLower.includes(word)) {
				matches += 0.5;
				break;
			}
		}
	}

	return Math.min(matches / tags.length, 1);
}

function scoreQuestionTypes(message: string, questionTypes: string[]): number {
	if (!questionTypes || questionTypes.length === 0) return 0;

	const messageLower = message.toLowerCase();
	let matches = 0;

	for (const qType of questionTypes) {
		const qTypeLower = qType.toLowerCase();
		if (messageLower.includes(qTypeLower)) {
			matches++;
		}
	}

	return Math.min(matches / questionTypes.length, 1);
}

const CONTEXT_KEYWORDS: Record<ContextType, string[]> = {
	product_info: ['what', 'tell', 'about', 'explain', 'describe', 'features', 'como', 'qual', 'sobre'],
	pricing: ['price', 'cost', 'how much', 'payment', 'valor', 'preço', 'quanto', 'parcela', 'mensalidade'],
	objection_handling: ['but', 'however', 'concern', 'worried', 'not sure', 'mas', 'porém', 'preocupado', 'dúvida'],
	competitor_comparison: ['compare', 'vs', 'versus', 'better', 'difference', 'comparar', 'diferença', 'melhor'],
	trust_building: ['trust', 'guarantee', 'safe', 'reliable', 'reviews', 'confiança', 'garantia', 'seguro'],
	process_explanation: ['how', 'process', 'steps', 'work', 'como funciona', 'processo', 'etapas', 'passo'],
	legal_terms: ['contract', 'terms', 'conditions', 'legal', 'contrato', 'termos', 'condições', 'cláusula'],
	faq: ['question', 'doubt', 'clarify', 'pergunta', 'dúvida', 'esclarecer'],
	closing_technique: ['decide', 'buy', 'purchase', 'ready', 'decidir', 'comprar', 'fechar', 'pronto'],
	follow_up: ['after', 'support', 'help', 'issue', 'depois', 'suporte', 'ajuda', 'problema']
};

function scoreContextAlignment(message: string, contextType: ContextType): number {
	const keywords = CONTEXT_KEYWORDS[contextType] || [];
	const messageLower = message.toLowerCase();

	let matches = 0;
	for (const keyword of keywords) {
		if (messageLower.includes(keyword)) {
			matches++;
		}
	}

	return Math.min(matches / Math.max(keywords.length * 0.3, 1), 1);
}

const EMOTION_KEYWORDS: Record<EmotionalResonance, string[]> = {
	neutral: [],
	excitement: ['excited', 'great', 'amazing', 'love', 'perfect', 'animado', 'ótimo', 'incrível', 'adorei'],
	concern: ['worried', 'concern', 'afraid', 'risk', 'preocupado', 'medo', 'risco', 'receio'],
	skepticism: ['really', 'sure', 'doubt', 'prove', 'evidence', 'certeza', 'dúvida', 'provar', 'verdade'],
	confusion: ['understand', 'confused', 'unclear', 'explain', 'entender', 'confuso', 'explicar', 'como assim'],
	urgency: ['now', 'today', 'urgent', 'asap', 'quickly', 'agora', 'hoje', 'urgente', 'rápido'],
	hesitation: ['maybe', 'perhaps', 'think about', 'not sure', 'talvez', 'pensar', 'não sei', 'será'],
	frustration: ['frustrated', 'annoyed', 'problem', 'issue', 'wrong', 'frustrado', 'problema', 'errado']
};

function scoreEmotionalResonance(
	message: string,
	capsuleEmotion: EmotionalResonance,
	detectedEmotion?: EmotionalResonance
): number {
	// If we detected emotion and it matches, high score
	if (detectedEmotion && detectedEmotion === capsuleEmotion) {
		return 0.9;
	}

	// Otherwise, try to detect from message
	const messageLower = message.toLowerCase();
	const keywords = EMOTION_KEYWORDS[capsuleEmotion] || [];

	let matches = 0;
	for (const keyword of keywords) {
		if (messageLower.includes(keyword)) {
			matches++;
		}
	}

	if (matches > 0) {
		return Math.min(0.3 + (matches * 0.2), 0.8);
	}

	// Neutral capsules get base score
	if (capsuleEmotion === 'neutral') {
		return 0.3;
	}

	return 0;
}

function scoreTemporalRelevance(temporal: string): number {
	switch (temporal) {
		case 'persistent': return 0.8;
		case 'seasonal': return 0.6;
		case 'conditional': return 0.4;
		case 'archived': return 0.1;
		default: return 0.5;
	}
}

function scoreSalesPhaseAlignment(
	capsulePhases: SalesPhase[],
	currentPhase?: SalesPhase
): number {
	if (!currentPhase || !capsulePhases || capsulePhases.length === 0) {
		return 0.5; // Neutral score when phase unknown
	}

	if (capsulePhases.includes(currentPhase)) {
		return 1.0;
	}

	// Adjacent phases get partial score
	const phaseOrder: SalesPhase[] = ['greeting', 'qualification', 'presentation', 'negotiation', 'closing', 'post_sale'];
	const currentIndex = phaseOrder.indexOf(currentPhase);

	for (const phase of capsulePhases) {
		const phaseIndex = phaseOrder.indexOf(phase);
		const distance = Math.abs(currentIndex - phaseIndex);
		if (distance === 1) return 0.6;
		if (distance === 2) return 0.3;
	}

	return 0.1;
}

// ============================================================================
// MAIN RETRIEVAL FUNCTION
// ============================================================================

export function retrieveCapsules(
	capsules: Array<KnowledgeCapsuleSchema & { id: string; content: string }>,
	context: RetrievalContext,
	weights: RetrievalWeights = defaultRetrievalWeights,
	maxResults: number = 5
): ScoredCapsule[] {
	const scored: ScoredCapsule[] = [];

	for (const capsule of capsules) {
		// Skip config records
		if (capsule.id === '__chatbot_config__') continue;

		// Skip if anti-triggers match
		if (capsule.antiTriggers && capsule.antiTriggers.length > 0) {
			const antiTriggered = capsule.antiTriggers.some(anti => {
				const antiKeywords = extractKeywords(anti);
				const messageKeywords = extractKeywords(context.message);
				let matches = 0;
				for (const kw of antiKeywords) {
					if (messageKeywords.has(kw)) matches++;
				}
				return matches / antiKeywords.size > 0.5;
			});
			if (antiTriggered) continue;
		}

		// Calculate individual scores
		const triggerScore = scoreTriggerPhrases(context.message, capsule.triggerPhrases);
		const vectorScore = cosineSimilarity(context.messageEmbedding, capsule.embedding);
		const tagScore = scoreSemanticTags(context.message, capsule.semanticTags);
		const questionScore = scoreQuestionTypes(context.message, capsule.questionTypes);

		// Calculate relevance (gatekeeper)
		const relevanceScore =
			triggerScore * weights.triggerPhrases +
			vectorScore * weights.vectorSimilarity +
			tagScore * weights.semanticTags +
			questionScore * weights.questionTypes;

		// Gatekeeper check
		if (relevanceScore < weights.relevanceGatekeeper) continue;

		// Calculate value scores
		const importanceScore = capsule.importanceWeight;
		const temporalScore = scoreTemporalRelevance(capsule.temporalRelevance);
		const contextScore = scoreContextAlignment(context.message, capsule.contextType);
		const confidenceScore = capsule.confidenceScore;
		const emotionScore = scoreEmotionalResonance(
			context.message,
			capsule.emotionalResonance,
			context.detectedEmotion
		);
		const objectionScore = capsule.objectionPattern ? 0.8 : 0;
		const phaseScore = scoreSalesPhaseAlignment(capsule.salesPhase, context.currentPhase);

		// Calculate value score
		const valueScore =
			importanceScore * weights.importanceWeight +
			temporalScore * weights.temporalRelevance +
			(contextScore * 0.5 + phaseScore * 0.5) * weights.contextAlignment +
			confidenceScore * weights.confidenceScore +
			emotionScore * weights.emotionalResonance +
			objectionScore * weights.objectionPattern;

		// Final score
		const finalScore = relevanceScore + valueScore;

		// Action required boost
		const boostedScore = capsule.actionRequired ? finalScore + 0.3 : finalScore;

		// Minimum score check
		if (boostedScore < weights.minimumFinalScore) continue;

		scored.push({
			capsule,
			relevanceScore,
			valueScore,
			finalScore: boostedScore,
			matchDetails: {
				triggerScore,
				vectorScore,
				tagScore,
				questionScore,
				importanceScore,
				temporalScore,
				contextScore,
				confidenceScore,
				emotionScore,
				objectionScore
			}
		});
	}

	// Sort by final score descending
	scored.sort((a, b) => b.finalScore - a.finalScore);

	// Return top results
	return scored.slice(0, maxResults);
}

// ============================================================================
// METHODOLOGY RETRIEVAL
// ============================================================================

export interface ScoredMethodology {
	methodology: MethodologySchema & { id: string; content: string };
	relevanceScore: number;
	phaseScore: number;
	emotionScore: number;
	priorityScore: number;
	finalScore: number;
	matchDetails: {
		triggerScore: number;
		vectorScore: number;
		phaseMatch: boolean;
		emotionMatch: boolean;
	};
}

export function retrieveMethodologies(
	methodologies: Array<MethodologySchema & { id: string; content: string }>,
	context: RetrievalContext,
	typeFilter?: MethodologyType[],
	maxResults: number = 3
): ScoredMethodology[] {
	const scored: ScoredMethodology[] = [];

	for (const methodology of methodologies) {
		// Filter by type if specified
		if (typeFilter && !typeFilter.includes(methodology.methodologyType)) {
			continue;
		}

		// Check phase match
		const phaseMatch = !context.currentPhase ||
			methodology.salesPhase.includes(context.currentPhase);
		const phaseScore = phaseMatch ? 1.0 : 0.3;

		// Check emotion match
		const emotionMatch = !context.detectedEmotion ||
			methodology.applicableEmotions.includes(context.detectedEmotion) ||
			methodology.applicableEmotions.includes('neutral');
		const emotionScore = emotionMatch ? 1.0 : 0.4;

		// Trigger phrase matching
		const triggerScore = scoreTriggerPhrases(context.message, methodology.triggerPhrases);

		// Vector similarity
		const vectorScore = cosineSimilarity(context.messageEmbedding, methodology.embedding);

		// Priority (lower number = higher priority)
		const priorityScore = 1.0 - (methodology.priority - 1) * 0.1;

		// Calculate relevance score (weighted combination)
		const relevanceScore =
			triggerScore * 0.35 +
			vectorScore * 0.25 +
			phaseScore * 0.20 +
			emotionScore * 0.20;

		// Minimum threshold
		if (relevanceScore < 0.15) continue;

		// Final score includes priority boost
		const finalScore = relevanceScore * priorityScore;

		scored.push({
			methodology,
			relevanceScore,
			phaseScore,
			emotionScore,
			priorityScore,
			finalScore,
			matchDetails: {
				triggerScore,
				vectorScore,
				phaseMatch,
				emotionMatch
			}
		});
	}

	// Sort by final score descending
	scored.sort((a, b) => b.finalScore - a.finalScore);

	return scored.slice(0, maxResults);
}

// ============================================================================
// CONTEXT ENRICHMENT (Tier 3 - related capsules via shared metadata)
// ============================================================================

export function enrichWithRelated(
	selected: ScoredCapsule[],
	allCapsules: Array<KnowledgeCapsuleSchema & { id: string; content: string }>,
	maxAdditional: number = 2
): ScoredCapsule[] {
	const selectedIds = new Set(selected.map(s => s.capsule.id));
	const selectedTags = new Set<string>();
	const selectedDomains = new Set<string>();

	// Collect tags and domains from selected capsules
	for (const s of selected) {
		s.capsule.semanticTags?.forEach(t => selectedTags.add(t.toLowerCase()));
	}

	// Find related capsules
	const related: ScoredCapsule[] = [];

	for (const capsule of allCapsules) {
		if (selectedIds.has(capsule.id)) continue;
		if (capsule.id === '__chatbot_config__') continue;

		// Check tag overlap
		let tagOverlap = 0;
		for (const tag of capsule.semanticTags || []) {
			if (selectedTags.has(tag.toLowerCase())) {
				tagOverlap++;
			}
		}

		if (tagOverlap >= 2) {
			related.push({
				capsule,
				relevanceScore: 0.3, // Enrichment tier
				valueScore: capsule.importanceWeight * 0.5,
				finalScore: 0.3 + capsule.importanceWeight * 0.5,
				matchDetails: {
					triggerScore: 0,
					vectorScore: 0,
					tagScore: tagOverlap / (capsule.semanticTags?.length || 1),
					questionScore: 0,
					importanceScore: capsule.importanceWeight,
					temporalScore: 0,
					contextScore: 0,
					confidenceScore: capsule.confidenceScore,
					emotionScore: 0,
					objectionScore: 0
				}
			});
		}
	}

	// Sort by overlap/importance and take top
	related.sort((a, b) => b.finalScore - a.finalScore);

	return [...selected, ...related.slice(0, maxAdditional)];
}
