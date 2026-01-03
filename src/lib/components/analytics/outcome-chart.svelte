<script lang="ts">
	import { cn } from '$lib/utils';
	import type { ConversationOutcome } from '$lib/server/chatbot/types';

	type OutcomeData = {
		outcome: ConversationOutcome;
		count: number;
		percentage: number;
	};

	type Props = {
		outcomes: OutcomeData[];
		total: number;
		class?: string;
	};

	let { outcomes, total, class: className }: Props = $props();

	// Outcome colors and labels
	const outcomeConfig: Record<
		ConversationOutcome,
		{ color: string; label: string; cssColor: string }
	> = {
		conversion: {
			color: 'bg-meth-closing',
			label: 'Converted',
			cssColor: 'oklch(var(--meth-closing))'
		},
		appointment: {
			color: 'bg-meth-phase',
			label: 'Appointment',
			cssColor: 'oklch(var(--meth-phase))'
		},
		human_handoff: {
			color: 'bg-meth-transition',
			label: 'Human Handoff',
			cssColor: 'oklch(var(--meth-transition))'
		},
		follow_up_scheduled: {
			color: 'bg-meth-trust',
			label: 'Follow-up',
			cssColor: 'oklch(var(--meth-trust))'
		},
		not_interested: {
			color: 'bg-meth-urgency',
			label: 'Not Interested',
			cssColor: 'oklch(var(--meth-urgency))'
		},
		no_outcome: {
			color: 'bg-muted',
			label: 'No Outcome',
			cssColor: 'oklch(var(--muted))'
		}
	};

	// Build conic gradient for donut chart
	let conicGradient = $derived.by(() => {
		if (outcomes.length === 0) {
			return 'conic-gradient(oklch(var(--muted)) 0deg 360deg)';
		}

		const segments: string[] = [];
		let currentAngle = 0;

		for (const outcome of outcomes) {
			const config = outcomeConfig[outcome.outcome];
			const angle = (outcome.percentage / 100) * 360;
			const endAngle = currentAngle + angle;

			segments.push(`${config.cssColor} ${currentAngle}deg ${endAngle}deg`);
			currentAngle = endAngle;
		}

		// Fill remaining with muted if percentages don't add up to 100
		if (currentAngle < 360) {
			segments.push(`oklch(var(--muted)) ${currentAngle}deg 360deg`);
		}

		return `conic-gradient(${segments.join(', ')})`;
	});

	// Sort outcomes by count (highest first) for legend
	let sortedOutcomes = $derived(
		[...outcomes].sort((a, b) => b.count - a.count).filter((o) => o.count > 0)
	);
</script>

<div class={cn('flex flex-col items-center gap-6 sm:flex-row sm:items-start', className)}>
	<!-- Donut Chart -->
	<div class="relative h-40 w-40 shrink-0">
		<div
			class="h-full w-full rounded-full"
			style="background: {conicGradient};"
		></div>
		<!-- Center hole -->
		<div
			class="absolute left-1/2 top-1/2 flex h-24 w-24 -translate-x-1/2 -translate-y-1/2 flex-col items-center justify-center rounded-full bg-background"
		>
			<span class="font-display text-2xl font-semibold">{total}</span>
			<span class="text-xs text-muted-foreground">Total</span>
		</div>
	</div>

	<!-- Legend -->
	<div class="flex flex-wrap justify-center gap-x-4 gap-y-2 sm:flex-col sm:gap-y-3">
		{#each sortedOutcomes as outcome}
			{@const config = outcomeConfig[outcome.outcome]}
			<div class="flex items-center gap-2">
				<div class={cn('h-3 w-3 rounded-full', config.color)}></div>
				<div class="flex items-baseline gap-1.5">
					<span class="text-sm font-medium">{outcome.count}</span>
					<span class="text-xs text-muted-foreground">{config.label}</span>
					<span class="text-xs text-muted-foreground">({outcome.percentage.toFixed(0)}%)</span>
				</div>
			</div>
		{/each}
		{#if sortedOutcomes.length === 0}
			<p class="text-sm text-muted-foreground">No conversation data yet</p>
		{/if}
	</div>
</div>
