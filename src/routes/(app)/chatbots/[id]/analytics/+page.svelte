<script lang="ts">
	import type { PageProps } from './$types';
	import { PageHeader } from '$lib/components/ui/page-header';
	import * as Card from '$lib/components/ui/card';
	import {
		StatCard,
		StatGrid,
		OutcomeChart,
		PhaseFlow,
		KnowledgeUsageTable,
		ConversationList
	} from '$lib/components/analytics';
	import { EmptyState } from '$lib/components/ui/empty-state';

	// Icons
	import MessageSquareIcon from '@lucide/svelte/icons/message-square';
	import UsersIcon from '@lucide/svelte/icons/users';
	import TargetIcon from '@lucide/svelte/icons/target';
	import ClockIcon from '@lucide/svelte/icons/clock';
	import TrendingUpIcon from '@lucide/svelte/icons/trending-up';
	import UserCheckIcon from '@lucide/svelte/icons/user-check';
	import ShieldCheckIcon from '@lucide/svelte/icons/shield-check';
	import BarChart3Icon from '@lucide/svelte/icons/bar-chart-3';

	let { data }: PageProps = $props();

	// Check if we have any data
	let hasData = $derived(data.analytics.totalConversations > 0);
</script>

<svelte:head>
	<title>Analytics - {data.chatbot.name}</title>
</svelte:head>

<div class="flex min-h-screen flex-col">
	<PageHeader title="Analytics" badge={data.chatbot.name}>
		{#snippet stats()}
			<span>Conversation insights and performance metrics</span>
		{/snippet}
	</PageHeader>

	<main class="flex-1 p-4 sm:p-6">
		<div class="mx-auto max-w-6xl space-y-8">
			{#if hasData}
				<!-- Key Metrics -->
				<section>
					<h2 class="mb-4 font-display text-lg font-semibold">Overview</h2>
					<StatGrid columns={4}>
						<StatCard
							label="Total Conversations"
							value={data.analytics.totalConversations}
							subtitle="{data.analytics.activeConversations} active"
							icon={MessageSquareIcon}
						/>
						<StatCard
							label="Conversion Rate"
							value="{data.analytics.conversionRate}%"
							variant={data.analytics.conversionRate > 10 ? 'success' : 'default'}
							icon={TargetIcon}
						/>
						<StatCard
							label="Avg. Messages"
							value={data.analytics.averageMessageCount}
							subtitle="per conversation"
							icon={UsersIcon}
						/>
						<StatCard
							label="Avg. Duration"
							value="{data.analytics.averageDurationMinutes}m"
							icon={ClockIcon}
						/>
					</StatGrid>
				</section>

				<!-- Secondary Metrics -->
				<section>
					<StatGrid columns={3}>
						<StatCard
							label="Human Handoff Rate"
							value="{data.analytics.humanHandoffRate}%"
							variant={data.analytics.humanHandoffRate < 20 ? 'muted' : 'warning'}
							icon={UserCheckIcon}
						/>
						<StatCard
							label="Objection Resolution"
							value="{data.analytics.objectionResolutionRate}%"
							subtitle="{data.analytics.totalObjectionsResolved}/{data.analytics.totalObjectionsFaced} resolved"
							variant={data.analytics.objectionResolutionRate > 50 ? 'success' : 'default'}
							icon={ShieldCheckIcon}
						/>
						<StatCard
							label="Knowledge Used"
							value={data.analytics.totalCapsulesUsed}
							subtitle="capsule retrievals"
							icon={TrendingUpIcon}
						/>
					</StatGrid>
				</section>

				<!-- Phase Flow Visualization -->
				<section>
					<Card.Root>
						<Card.Header>
							<Card.Title class="font-display">Conversation Flow</Card.Title>
							<Card.Description>
								How conversations progress through sales phases
							</Card.Description>
						</Card.Header>
						<Card.Content>
							<PhaseFlow
								phaseCounts={data.analytics.phaseCounts}
								phaseDropoffs={data.analytics.phaseDropoffs}
								transitions={data.analytics.phaseTransitions}
								totalConversations={data.analytics.totalConversations}
							/>
						</Card.Content>
					</Card.Root>
				</section>

				<!-- Two-column layout: Outcomes & Knowledge -->
				<div class="grid gap-6 lg:grid-cols-2">
					<!-- Outcome Distribution -->
					<section>
						<Card.Root class="h-full">
							<Card.Header>
								<Card.Title class="font-display">Outcomes</Card.Title>
								<Card.Description>
									How conversations ended
								</Card.Description>
							</Card.Header>
							<Card.Content>
								<OutcomeChart
									outcomes={data.analytics.outcomes}
									total={data.analytics.totalConversations}
								/>
							</Card.Content>
						</Card.Root>
					</section>

					<!-- Knowledge Effectiveness -->
					<section>
						<Card.Root class="h-full">
							<Card.Header>
								<Card.Title class="font-display">Document Effectiveness</Card.Title>
								<Card.Description>
									Which documents are being used most
								</Card.Description>
							</Card.Header>
							<Card.Content>
								<KnowledgeUsageTable
									documents={data.analytics.topDocuments}
									totalCapsulesUsed={data.analytics.totalCapsulesUsed}
								/>
							</Card.Content>
						</Card.Root>
					</section>
				</div>

				<!-- Recent Conversations -->
				<section>
					<Card.Root>
						<Card.Header>
							<Card.Title class="font-display">Recent Conversations</Card.Title>
							<Card.Description>
								Latest customer interactions with phase journey
							</Card.Description>
						</Card.Header>
						<Card.Content>
							<ConversationList
								conversations={data.analytics.recentConversations}
								maxItems={10}
							/>
						</Card.Content>
					</Card.Root>
				</section>
			{:else}
				<!-- Empty State -->
				<Card.Root class="py-12">
					<EmptyState
						title="No analytics data yet"
						description="Analytics will appear here once your chatbot starts having conversations with customers. Upload documents, configure your methodology, and embed the widget to get started."
					>
						{#snippet icon()}
							<BarChart3Icon class="h-10 w-10" />
						{/snippet}
					</EmptyState>
				</Card.Root>
			{/if}
		</div>
	</main>
</div>
