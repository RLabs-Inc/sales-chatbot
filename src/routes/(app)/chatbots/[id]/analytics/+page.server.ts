// ============================================================================
// ANALYTICS PAGE - Server load for per-chatbot analytics
// Aggregates conversation data for visualization
// ============================================================================

import { error } from '@sveltejs/kit';
import { eq, and } from 'drizzle-orm';
import { db } from '$lib/server/db';
import { chatbot } from '$lib/server/db/schema';
import { getChatbotDatabase } from '$lib/server/chatbot';
import { requireLogin } from '$lib/server/auth';
import type { PageServerLoad } from './$types';
import type {
	SalesPhase,
	ConversationOutcome,
	ConversationSchema,
	MessageSchema
} from '$lib/server/chatbot/types';

// Types for analytics data
export interface PhaseTransition {
	from: SalesPhase;
	to: SalesPhase;
	count: number;
}

export interface OutcomeCount {
	outcome: ConversationOutcome;
	count: number;
	percentage: number;
}

export interface DocumentUsage {
	document: string;
	capsuleCount: number;
	useCount: number;
}

export interface ConversationSummary {
	id: string;
	status: string;
	outcome: string;
	currentPhase: SalesPhase;
	messageCount: number;
	durationSeconds: number;
	startedAt: number;
	lastMessageAt: number;
	reachedPhases: SalesPhase[];
	humanRequested: boolean;
}

export interface AnalyticsData {
	// Conventional metrics
	totalConversations: number;
	completedConversations: number;
	activeConversations: number;
	averageMessageCount: number;
	averageDurationMinutes: number;
	humanHandoffRate: number;
	conversionRate: number;

	// Outcome distribution
	outcomes: OutcomeCount[];

	// Phase flow data
	phaseTransitions: PhaseTransition[];
	phaseCounts: Record<SalesPhase, number>;
	phaseDropoffs: Record<SalesPhase, number>;

	// Knowledge effectiveness
	topDocuments: DocumentUsage[];
	totalCapsulesUsed: number;

	// Objection handling
	totalObjectionsFaced: number;
	totalObjectionsResolved: number;
	objectionResolutionRate: number;

	// Recent conversations
	recentConversations: ConversationSummary[];
}

// Sales phases in order (for flow visualization)
const PHASE_ORDER: SalesPhase[] = [
	'greeting',
	'qualification',
	'presentation',
	'negotiation',
	'closing',
	'post_sale'
];

export const load: PageServerLoad = async ({ params, depends }) => {
	const user = requireLogin();
	depends('app:analytics');

	// Verify chatbot ownership
	const [bot] = await db
		.select()
		.from(chatbot)
		.where(and(eq(chatbot.id, params.id), eq(chatbot.userId, user.id)));

	if (!bot) {
		throw error(404, 'Chatbot not found');
	}

	// Get chatbot database
	const chatbotDb = await getChatbotDatabase(params.id);

	// Load all data
	// fsDB adds 'id' to records automatically, but it's not in the schema type
	type ConversationRecord = ConversationSchema & { id: string };
	const allConversations = chatbotDb.conversations.all() as ConversationRecord[];
	const allMessages = chatbotDb.messages.all() as MessageSchema[];
	const allKnowledge = chatbotDb.knowledge
		.all()
		.filter((k: { id: string }) => k.id !== '__chatbot_config__');

	// Build knowledge lookup (id -> document name)
	const capsuleToDocument = new Map<string, string>();
	for (const capsule of allKnowledge) {
		capsuleToDocument.set(capsule.id, capsule.sourceDocument || 'Unknown');
	}

	// ========================================================================
	// COMPUTE ANALYTICS
	// ========================================================================

	// Basic counts
	const totalConversations = allConversations.length;
	const completedConversations = allConversations.filter(
		(c) => c.status === 'completed' || c.status === 'converted'
	).length;
	const activeConversations = allConversations.filter((c) => c.status === 'active').length;
	const conversions = allConversations.filter((c) => c.outcome === 'conversion').length;
	const humanHandoffs = allConversations.filter((c) => c.humanRequested).length;

	// Averages
	const totalMessages = allConversations.reduce((sum, c) => sum + (c.messageCount || 0), 0);
	const totalDuration = allConversations.reduce((sum, c) => sum + (c.durationSeconds || 0), 0);
	const averageMessageCount = totalConversations > 0 ? totalMessages / totalConversations : 0;
	const averageDurationMinutes =
		totalConversations > 0 ? totalDuration / totalConversations / 60 : 0;

	// Rates
	const conversionRate = totalConversations > 0 ? (conversions / totalConversations) * 100 : 0;
	const humanHandoffRate =
		totalConversations > 0 ? (humanHandoffs / totalConversations) * 100 : 0;

	// Outcome distribution
	const outcomeCounts = new Map<ConversationOutcome, number>();
	for (const conv of allConversations) {
		const outcome = (conv.outcome || 'no_outcome') as ConversationOutcome;
		outcomeCounts.set(outcome, (outcomeCounts.get(outcome) || 0) + 1);
	}
	const outcomes: OutcomeCount[] = Array.from(outcomeCounts.entries()).map(([outcome, count]) => ({
		outcome,
		count,
		percentage: totalConversations > 0 ? (count / totalConversations) * 100 : 0
	}));

	// Phase transitions (for flow visualization)
	const transitionCounts = new Map<string, number>();
	const phaseCounts: Record<SalesPhase, number> = {
		greeting: 0,
		qualification: 0,
		presentation: 0,
		negotiation: 0,
		closing: 0,
		post_sale: 0
	};
	const phaseDropoffs: Record<SalesPhase, number> = {
		greeting: 0,
		qualification: 0,
		presentation: 0,
		negotiation: 0,
		closing: 0,
		post_sale: 0
	};

	for (const conv of allConversations) {
		const phases = conv.reachedPhases || [];
		for (const phase of phases) {
			if (phase in phaseCounts) {
				phaseCounts[phase as SalesPhase]++;
			}
		}

		// Count transitions between phases
		for (let i = 0; i < phases.length - 1; i++) {
			const from = phases[i];
			const to = phases[i + 1];
			const key = `${from}->${to}`;
			transitionCounts.set(key, (transitionCounts.get(key) || 0) + 1);
		}

		// Track where conversations dropped off (last phase if not converted)
		if (phases.length > 0 && conv.outcome !== 'conversion') {
			const lastPhase = phases[phases.length - 1] as SalesPhase;
			if (lastPhase in phaseDropoffs) {
				phaseDropoffs[lastPhase]++;
			}
		}
	}

	const phaseTransitions: PhaseTransition[] = Array.from(transitionCounts.entries())
		.map(([key, count]) => {
			const [from, to] = key.split('->') as [SalesPhase, SalesPhase];
			return { from, to, count };
		})
		.sort((a, b) => b.count - a.count);

	// Knowledge effectiveness (document usage)
	const documentUsage = new Map<string, { capsuleCount: Set<string>; useCount: number }>();

	// Initialize with all documents
	for (const capsule of allKnowledge) {
		const doc = capsule.sourceDocument || 'Unknown';
		if (!documentUsage.has(doc)) {
			documentUsage.set(doc, { capsuleCount: new Set(), useCount: 0 });
		}
		documentUsage.get(doc)!.capsuleCount.add(capsule.id);
	}

	// Count usage from messages
	let totalCapsulesUsed = 0;
	for (const message of allMessages) {
		const capsulesUsed = message.capsulesUsed || [];
		totalCapsulesUsed += capsulesUsed.length;

		for (const capsuleId of capsulesUsed) {
			const doc = capsuleToDocument.get(capsuleId);
			if (doc && documentUsage.has(doc)) {
				documentUsage.get(doc)!.useCount++;
			}
		}
	}

	const topDocuments: DocumentUsage[] = Array.from(documentUsage.entries())
		.map(([document, data]) => ({
			document,
			capsuleCount: data.capsuleCount.size,
			useCount: data.useCount
		}))
		.sort((a, b) => b.useCount - a.useCount)
		.slice(0, 10);

	// Objection handling
	let totalObjectionsFaced = 0;
	let totalObjectionsResolved = 0;
	for (const conv of allConversations) {
		totalObjectionsFaced += (conv.objectionsFaced || []).length;
		totalObjectionsResolved += (conv.objectionsResolved || []).length;
	}
	const objectionResolutionRate =
		totalObjectionsFaced > 0 ? (totalObjectionsResolved / totalObjectionsFaced) * 100 : 0;

	// Recent conversations
	const recentConversations: ConversationSummary[] = allConversations
		.sort((a, b) => (b.lastMessageAt || 0) - (a.lastMessageAt || 0))
		.slice(0, 20)
		.map((c) => ({
			id: c.id,
			status: c.status,
			outcome: c.outcome,
			currentPhase: c.currentPhase,
			messageCount: c.messageCount || 0,
			durationSeconds: c.durationSeconds || 0,
			startedAt: c.startedAt || 0,
			lastMessageAt: c.lastMessageAt || 0,
			reachedPhases: c.reachedPhases || [],
			humanRequested: c.humanRequested || false
		}));

	// Build analytics object
	const analytics: AnalyticsData = {
		totalConversations,
		completedConversations,
		activeConversations,
		averageMessageCount: Math.round(averageMessageCount * 10) / 10,
		averageDurationMinutes: Math.round(averageDurationMinutes * 10) / 10,
		humanHandoffRate: Math.round(humanHandoffRate * 10) / 10,
		conversionRate: Math.round(conversionRate * 10) / 10,
		outcomes,
		phaseTransitions,
		phaseCounts,
		phaseDropoffs,
		topDocuments,
		totalCapsulesUsed,
		totalObjectionsFaced,
		totalObjectionsResolved,
		objectionResolutionRate: Math.round(objectionResolutionRate * 10) / 10,
		recentConversations
	};

	return {
		chatbot: bot,
		analytics
	};
};
