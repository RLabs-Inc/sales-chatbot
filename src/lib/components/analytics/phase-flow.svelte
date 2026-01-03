<script lang="ts">
	import { cn } from '$lib/utils';
	import type { SalesPhase } from '$lib/server/chatbot/types';

	type PhaseTransition = {
		from: SalesPhase;
		to: SalesPhase;
		count: number;
	};

	type Props = {
		phaseCounts: Record<SalesPhase, number>;
		phaseDropoffs: Record<SalesPhase, number>;
		transitions: PhaseTransition[];
		totalConversations: number;
		class?: string;
	};

	let { phaseCounts, phaseDropoffs, transitions, totalConversations, class: className }: Props =
		$props();

	// Phase configuration
	const phases: { phase: SalesPhase; label: string; color: string; bgColor: string }[] = [
		{
			phase: 'greeting',
			label: 'Greeting',
			color: 'text-meth-phase',
			bgColor: 'bg-meth-phase/15'
		},
		{
			phase: 'qualification',
			label: 'Qualification',
			color: 'text-meth-question',
			bgColor: 'bg-meth-question/15'
		},
		{
			phase: 'presentation',
			label: 'Presentation',
			color: 'text-meth-value',
			bgColor: 'bg-meth-value/15'
		},
		{
			phase: 'negotiation',
			label: 'Negotiation',
			color: 'text-meth-objection',
			bgColor: 'bg-meth-objection/15'
		},
		{
			phase: 'closing',
			label: 'Closing',
			color: 'text-meth-closing',
			bgColor: 'bg-meth-closing/15'
		},
		{
			phase: 'post_sale',
			label: 'Post-Sale',
			color: 'text-meth-trust',
			bgColor: 'bg-meth-trust/15'
		}
	];

	// Get forward transition count between consecutive phases
	function getForwardTransition(from: SalesPhase, to: SalesPhase): number {
		const t = transitions.find((t) => t.from === from && t.to === to);
		return t?.count || 0;
	}

	// Get backward transitions (loops) for a phase
	function getBackwardTransitions(toPhase: SalesPhase): PhaseTransition[] {
		const phaseIndex = phases.findIndex((p) => p.phase === toPhase);
		return transitions
			.filter((t) => {
				const fromIndex = phases.findIndex((p) => p.phase === t.from);
				const toIndex = phases.findIndex((p) => p.phase === t.to);
				return toIndex === phaseIndex && fromIndex > toIndex;
			})
			.sort((a, b) => b.count - a.count);
	}

	// Calculate progress bar width based on phase count vs total
	function getProgressWidth(phase: SalesPhase): number {
		if (totalConversations === 0) return 0;
		return Math.min(100, (phaseCounts[phase] / totalConversations) * 100);
	}

	// Get top 3 backward transitions overall
	let topBackwardTransitions = $derived.by(() => {
		const backward = transitions.filter((t) => {
			const fromIndex = phases.findIndex((p) => p.phase === t.from);
			const toIndex = phases.findIndex((p) => p.phase === t.to);
			return fromIndex > toIndex;
		});
		return backward.sort((a, b) => b.count - a.count).slice(0, 3);
	});
</script>

<div class={cn('space-y-6', className)}>
	<!-- Main Phase Flow -->
	<div class="relative">
		<!-- Desktop: Horizontal flow -->
		<div class="hidden lg:block">
			<div class="flex items-stretch gap-1">
				{#each phases as phaseConfig, index}
					{@const count = phaseCounts[phaseConfig.phase]}
					{@const dropoff = phaseDropoffs[phaseConfig.phase]}
					{@const nextPhase = phases[index + 1]?.phase}
					{@const forwardCount = nextPhase ? getForwardTransition(phaseConfig.phase, nextPhase) : 0}
					{@const progressWidth = getProgressWidth(phaseConfig.phase)}

					<!-- Phase Node -->
					<div class="flex flex-1 flex-col">
						<div
							class={cn(
								'relative rounded-lg border p-3 transition-all',
								phaseConfig.bgColor,
								count > 0 ? 'border-current/20' : 'border-muted opacity-50'
							)}
						>
							<!-- Progress bar background -->
							<div
								class="absolute inset-0 rounded-lg bg-current/5 transition-all"
								style="width: {progressWidth}%"
							></div>

							<div class="relative">
								<p class={cn('text-xs font-medium uppercase tracking-wide', phaseConfig.color)}>
									{phaseConfig.label}
								</p>
								<p class="mt-1 font-display text-xl font-semibold">{count}</p>
								{#if dropoff > 0}
									<p class="mt-0.5 text-xs text-muted-foreground">
										<span class="text-meth-urgency">{dropoff}</span> dropped
									</p>
								{/if}
							</div>
						</div>

						<!-- Arrow to next phase -->
						{#if index < phases.length - 1}
							<div class="flex h-8 items-center justify-end pr-2">
								{#if forwardCount > 0}
									<div class="flex items-center gap-1 text-xs text-muted-foreground">
										<span>{forwardCount}</span>
										<svg class="h-4 w-4" viewBox="0 0 24 24" fill="none" stroke="currentColor">
											<path
												d="M5 12h14m0 0l-4-4m4 4l-4 4"
												stroke-width="2"
												stroke-linecap="round"
												stroke-linejoin="round"
											/>
										</svg>
									</div>
								{/if}
							</div>
						{/if}
					</div>
				{/each}
			</div>
		</div>

		<!-- Mobile/Tablet: Vertical flow -->
		<div class="lg:hidden">
			<div class="flex flex-col gap-2">
				{#each phases as phaseConfig, index}
					{@const count = phaseCounts[phaseConfig.phase]}
					{@const dropoff = phaseDropoffs[phaseConfig.phase]}
					{@const nextPhase = phases[index + 1]?.phase}
					{@const forwardCount = nextPhase ? getForwardTransition(phaseConfig.phase, nextPhase) : 0}
					{@const progressWidth = getProgressWidth(phaseConfig.phase)}

					<div class="flex items-center gap-3">
						<!-- Phase Node -->
						<div
							class={cn(
								'relative flex-1 rounded-lg border p-3',
								phaseConfig.bgColor,
								count > 0 ? 'border-current/20' : 'border-muted opacity-50'
							)}
						>
							<div
								class="absolute inset-0 rounded-lg bg-current/5"
								style="width: {progressWidth}%"
							></div>
							<div class="relative flex items-center justify-between">
								<div>
									<p class={cn('text-xs font-medium uppercase tracking-wide', phaseConfig.color)}>
										{phaseConfig.label}
									</p>
									<p class="font-display text-lg font-semibold">{count}</p>
								</div>
								{#if dropoff > 0}
									<span class="rounded-full bg-meth-urgency/15 px-2 py-0.5 text-xs text-meth-urgency">
										-{dropoff}
									</span>
								{/if}
							</div>
						</div>

						<!-- Stats column -->
						<div class="w-16 text-right">
							{#if forwardCount > 0 && index < phases.length - 1}
								<div class="text-xs text-muted-foreground">
									{forwardCount} →
								</div>
							{/if}
						</div>
					</div>
				{/each}
			</div>
		</div>
	</div>

	<!-- Backward Transitions (Loops) -->
	{#if topBackwardTransitions.length > 0}
		<div class="rounded-lg border border-meth-transition/20 bg-meth-transition/5 p-4">
			<p class="mb-3 text-xs font-medium uppercase tracking-wide text-meth-transition">
				Conversation Loops
			</p>
			<div class="flex flex-wrap gap-3">
				{#each topBackwardTransitions as loop}
					{@const fromConfig = phases.find((p) => p.phase === loop.from)}
					{@const toConfig = phases.find((p) => p.phase === loop.to)}
					{#if fromConfig && toConfig}
						<div class="flex items-center gap-2 rounded-full bg-background px-3 py-1.5 text-sm">
							<span class={fromConfig.color}>{fromConfig.label}</span>
							<svg
								class="h-4 w-4 text-muted-foreground"
								viewBox="0 0 24 24"
								fill="none"
								stroke="currentColor"
							>
								<path
									d="M19 12H5m0 0l4 4m-4-4l4-4"
									stroke-width="2"
									stroke-linecap="round"
									stroke-linejoin="round"
								/>
							</svg>
							<span class={toConfig.color}>{toConfig.label}</span>
							<span class="ml-1 font-medium">{loop.count}×</span>
						</div>
					{/if}
				{/each}
			</div>
			<p class="mt-2 text-xs text-muted-foreground">
				Shows when conversations moved back to earlier phases (objection handling, re-qualification,
				etc.)
			</p>
		</div>
	{/if}
</div>
