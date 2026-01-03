<script lang="ts">
	import { cn } from '$lib/utils';
	import { Badge } from '$lib/components/ui/badge';
	import type { SalesPhase, ConversationOutcome } from '$lib/server/chatbot/types';
	import MessageSquareIcon from '@lucide/svelte/icons/message-square';
	import ClockIcon from '@lucide/svelte/icons/clock';
	import UserIcon from '@lucide/svelte/icons/user';
	import CheckCircleIcon from '@lucide/svelte/icons/check-circle';
	import XCircleIcon from '@lucide/svelte/icons/x-circle';
	import PhoneForwardedIcon from '@lucide/svelte/icons/phone-forwarded';

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
		conversation: ConversationSummary;
		class?: string;
	};

	let { conversation, class: className }: Props = $props();

	// Format duration
	function formatDuration(seconds: number): string {
		if (seconds < 60) return `${seconds}s`;
		const minutes = Math.floor(seconds / 60);
		if (minutes < 60) return `${minutes}m`;
		const hours = Math.floor(minutes / 60);
		const remainingMinutes = minutes % 60;
		return `${hours}h ${remainingMinutes}m`;
	}

	// Format relative time
	function formatRelativeTime(timestamp: number): string {
		const now = Date.now();
		const diff = now - timestamp;
		const seconds = Math.floor(diff / 1000);
		const minutes = Math.floor(seconds / 60);
		const hours = Math.floor(minutes / 60);
		const days = Math.floor(hours / 24);

		if (days > 0) return `${days}d ago`;
		if (hours > 0) return `${hours}h ago`;
		if (minutes > 0) return `${minutes}m ago`;
		return 'just now';
	}

	// Outcome configuration
	const outcomeConfig: Record<string, { label: string; variant: 'default' | 'secondary' | 'destructive' | 'outline'; icon: typeof CheckCircleIcon }> = {
		conversion: { label: 'Converted', variant: 'default', icon: CheckCircleIcon },
		appointment: { label: 'Appointment', variant: 'secondary', icon: ClockIcon },
		human_handoff: { label: 'Handoff', variant: 'outline', icon: PhoneForwardedIcon },
		follow_up_scheduled: { label: 'Follow-up', variant: 'secondary', icon: ClockIcon },
		not_interested: { label: 'Not Interested', variant: 'destructive', icon: XCircleIcon },
		no_outcome: { label: 'No Outcome', variant: 'outline', icon: MessageSquareIcon }
	};

	// Phase colors
	const phaseColors: Record<SalesPhase, string> = {
		greeting: 'bg-meth-phase',
		qualification: 'bg-meth-question',
		presentation: 'bg-meth-value',
		negotiation: 'bg-meth-objection',
		closing: 'bg-meth-closing',
		post_sale: 'bg-meth-trust'
	};

	let config = $derived(outcomeConfig[conversation.outcome] || outcomeConfig.no_outcome);
	let IconComponent = $derived(config.icon);
</script>

<div class={cn('flex items-center gap-4 rounded-lg border p-3 transition-all hover:bg-muted/50', className)}>
	<!-- Phase journey indicator -->
	<div class="hidden shrink-0 sm:flex sm:gap-0.5">
		{#each conversation.reachedPhases as phase, i}
			<div
				class={cn('h-2 w-4 first:rounded-l-full last:rounded-r-full', phaseColors[phase])}
				title={phase}
			></div>
		{/each}
	</div>

	<!-- Main content -->
	<div class="min-w-0 flex-1">
		<div class="flex items-center gap-2">
			<Badge variant={config.variant} class="shrink-0">
				<IconComponent class="mr-1 h-3 w-3" />
				{config.label}
			</Badge>
			{#if conversation.humanRequested}
				<Badge variant="outline" class="shrink-0">
					<UserIcon class="mr-1 h-3 w-3" />
					Human Requested
				</Badge>
			{/if}
		</div>
		<div class="mt-1 flex flex-wrap items-center gap-x-3 gap-y-1 text-xs text-muted-foreground">
			<span class="flex items-center gap-1">
				<MessageSquareIcon class="h-3 w-3" />
				{conversation.messageCount} messages
			</span>
			<span class="flex items-center gap-1">
				<ClockIcon class="h-3 w-3" />
				{formatDuration(conversation.durationSeconds)}
			</span>
			<span>{formatRelativeTime(conversation.lastMessageAt)}</span>
		</div>
	</div>

	<!-- Mobile phase indicator -->
	<div class="flex gap-0.5 sm:hidden">
		{#each conversation.reachedPhases.slice(0, 3) as phase}
			<div class={cn('h-1.5 w-3 rounded-full', phaseColors[phase])}></div>
		{/each}
		{#if conversation.reachedPhases.length > 3}
			<span class="text-xs text-muted-foreground">+{conversation.reachedPhases.length - 3}</span>
		{/if}
	</div>
</div>
