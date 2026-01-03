<script lang="ts">
	import { cn } from '$lib/utils';
	import ConversationRow from './conversation-row.svelte';
	import { EmptyState } from '$lib/components/ui/empty-state';
	import type { SalesPhase } from '$lib/server/chatbot/types';
	import MessageSquareIcon from '@lucide/svelte/icons/message-square';

	type ConversationSummary = {
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
	};

	type Props = {
		conversations: ConversationSummary[];
		title?: string;
		maxItems?: number;
		class?: string;
	};

	let {
		conversations,
		title = 'Recent Conversations',
		maxItems = 10,
		class: className
	}: Props = $props();

	let visibleConversations = $derived(conversations.slice(0, maxItems));
	let hasMore = $derived(conversations.length > maxItems);
</script>

<div class={cn('space-y-4', className)}>
	{#if title}
		<div class="flex items-center justify-between">
			<h3 class="font-display text-lg font-semibold">{title}</h3>
			<span class="text-sm text-muted-foreground">
				{conversations.length} total
			</span>
		</div>
	{/if}

	{#if visibleConversations.length > 0}
		<div class="space-y-2">
			{#each visibleConversations as conversation (conversation.id)}
				<ConversationRow {conversation} />
			{/each}
		</div>

		{#if hasMore}
			<p class="text-center text-sm text-muted-foreground">
				Showing {maxItems} of {conversations.length} conversations
			</p>
		{/if}
	{:else}
		<EmptyState
			title="No conversations yet"
			description="Conversations will appear here once customers start chatting with your bot."
		>
			{#snippet icon()}
				<MessageSquareIcon class="h-10 w-10" />
			{/snippet}
		</EmptyState>
	{/if}
</div>
