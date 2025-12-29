<script lang="ts">
	import type { MessageDebugInfo, CapsuleDebugInfo, MethodologyDebugInfo } from '$lib/server/chatbot/types';
	import * as Collapsible from '$lib/components/ui/collapsible';
	import * as Card from '$lib/components/ui/card';
	import { Badge } from '$lib/components/ui/badge';
	import ChevronDownIcon from '@lucide/svelte/icons/chevron-down';
	import BrainIcon from '@lucide/svelte/icons/brain';
	import BookOpenIcon from '@lucide/svelte/icons/book-open';
	import TargetIcon from '@lucide/svelte/icons/target';
	import ZapIcon from '@lucide/svelte/icons/zap';
	import ClockIcon from '@lucide/svelte/icons/clock';

	type Props = {
		debugInfo: MessageDebugInfo;
		defaultOpen?: boolean;
	};

	let { debugInfo, defaultOpen = false }: Props = $props();
	// eslint-disable-next-line svelte/state-referenced-locally -- intentional: defaultOpen only sets initial state
	let isOpen = $state(defaultOpen);

	function formatScore(score: number): string {
		return (score * 100).toFixed(0) + '%';
	}

	function formatMs(ms: number): string {
		return ms < 1 ? '<1ms' : `${ms.toFixed(0)}ms`;
	}

	const typeColors: Record<string, string> = {
		phase_definition: 'bg-meth-phase',
		transition_trigger: 'bg-meth-transition',
		objection_response: 'bg-meth-objection',
		closing_technique: 'bg-meth-closing',
		qualification_question: 'bg-meth-question',
		value_proposition: 'bg-meth-value',
		urgency_creator: 'bg-meth-urgency',
		trust_builder: 'bg-meth-trust'
	};
</script>

<Collapsible.Root bind:open={isOpen} class="mt-2">
	<Collapsible.Trigger
		class="inline-flex h-7 items-center gap-1.5 rounded-md px-2 text-xs text-muted-foreground transition-colors hover:bg-accent hover:text-foreground"
	>
		<BrainIcon class="h-3 w-3" />
		Glass Box
		<span class="transition-transform" class:rotate-180={isOpen}><ChevronDownIcon class="h-3 w-3" /></span>
		<span class="ml-1 text-muted-foreground/60">
			{debugInfo.capsules.length} caps · {debugInfo.methodologies.length} meth · {formatMs(debugInfo.retrievalTimeMs)}
		</span>
	</Collapsible.Trigger>

	<Collapsible.Content class="mt-2 space-y-3 rounded-lg border bg-muted/30 p-3 text-sm">
		<!-- Reasoning Section -->
		<div class="space-y-2">
			<div class="flex items-start gap-2">
				<TargetIcon class="mt-0.5 h-4 w-4 shrink-0 text-primary" />
				<div>
					<p class="font-medium">Phase Detection</p>
					<p class="text-muted-foreground">{debugInfo.phaseReasoning}</p>
				</div>
			</div>
			<div class="flex items-start gap-2">
				<ZapIcon class="mt-0.5 h-4 w-4 shrink-0 text-meth-question" />
				<div>
					<p class="font-medium">Emotion Detection</p>
					<p class="text-muted-foreground">{debugInfo.emotionReasoning}</p>
				</div>
			</div>
		</div>

		<!-- Performance Stats -->
		<div class="flex items-center gap-4 rounded-md bg-background/50 px-3 py-2 text-xs">
			<ClockIcon class="h-3.5 w-3.5 text-muted-foreground" />
			<span>Embedding: {formatMs(debugInfo.embeddingTimeMs)}</span>
			<span>Retrieval: {formatMs(debugInfo.retrievalTimeMs)}</span>
			<span class="text-muted-foreground">
				Scanned {debugInfo.totalCapsulesScanned} caps, {debugInfo.totalMethodologiesScanned} meth
			</span>
		</div>

		<!-- Knowledge Capsules -->
		{#if debugInfo.capsules.length > 0}
			<div>
				<div class="mb-2 flex items-center gap-1.5">
					<BookOpenIcon class="h-4 w-4 text-accent-foreground" />
					<span class="font-medium">Knowledge Capsules ({debugInfo.capsules.length})</span>
				</div>
				<div class="space-y-2">
					{#each debugInfo.capsules as capsule}
						<Card.Root class="bg-background/60">
							<Card.Content class="p-3">
								<div class="mb-2 flex items-start justify-between gap-2">
									<div class="flex items-center gap-2">
										<Badge variant="outline" class="text-xs">
											{capsule.contextType.replace('_', ' ')}
										</Badge>
										{#if capsule.isEnriched}
											<Badge variant="secondary" class="text-xs">enriched</Badge>
										{/if}
									</div>
									<span class="whitespace-nowrap text-xs font-medium text-primary">
										{formatScore(capsule.scores.final)}
									</span>
								</div>
								<p class="mb-2 line-clamp-2 text-xs text-muted-foreground">{capsule.contentPreview}</p>
								<div class="flex flex-wrap gap-1">
									{#if capsule.matchedTriggers.length > 0}
										{#each capsule.matchedTriggers.slice(0, 3) as trigger}
											<Badge variant="outline" class="bg-meth-closing/10 text-xs text-meth-closing">
												{trigger}
											</Badge>
										{/each}
									{/if}
									{#if capsule.matchedTags.length > 0}
										{#each capsule.matchedTags.slice(0, 3) as tag}
											<Badge variant="outline" class="text-xs">{tag}</Badge>
										{/each}
									{/if}
								</div>
								<div class="mt-2 grid grid-cols-5 gap-1 text-center text-[10px]">
									<div class="rounded bg-muted px-1 py-0.5">
										<span class="block text-muted-foreground">trigger</span>
										<span class="font-medium">{formatScore(capsule.scores.details.triggerScore)}</span>
									</div>
									<div class="rounded bg-muted px-1 py-0.5">
										<span class="block text-muted-foreground">vector</span>
										<span class="font-medium">{formatScore(capsule.scores.details.vectorScore)}</span>
									</div>
									<div class="rounded bg-muted px-1 py-0.5">
										<span class="block text-muted-foreground">emotion</span>
										<span class="font-medium">{formatScore(capsule.scores.details.emotionScore)}</span>
									</div>
									<div class="rounded bg-muted px-1 py-0.5">
										<span class="block text-muted-foreground">context</span>
										<span class="font-medium">{formatScore(capsule.scores.details.contextScore)}</span>
									</div>
									<div class="rounded bg-muted px-1 py-0.5">
										<span class="block text-muted-foreground">import</span>
										<span class="font-medium">{formatScore(capsule.scores.details.importanceScore)}</span>
									</div>
								</div>
							</Card.Content>
						</Card.Root>
					{/each}
				</div>
			</div>
		{/if}

		<!-- Methodology -->
		{#if debugInfo.methodologies.length > 0}
			<div>
				<div class="mb-2 flex items-center gap-1.5">
					<TargetIcon class="h-4 w-4 text-meth-transition" />
					<span class="font-medium">Sales Methodology ({debugInfo.methodologies.length})</span>
				</div>
				<div class="space-y-2">
					{#each debugInfo.methodologies as meth}
						<Card.Root class="bg-background/60">
							<Card.Content class="p-3">
								<div class="mb-2 flex items-start justify-between gap-2">
									<div class="flex items-center gap-2">
										<div class={`h-2 w-2 rounded-full ${typeColors[meth.methodologyType] || 'bg-muted'}`}></div>
										<span class="text-xs font-medium">{meth.title}</span>
									</div>
									<span class="whitespace-nowrap text-xs font-medium text-primary">
										{formatScore(meth.scores.final)}
									</span>
								</div>
								<p class="mb-2 line-clamp-2 text-xs text-muted-foreground">{meth.contentPreview}</p>
								<div class="flex flex-wrap items-center gap-1">
									{#if meth.phaseMatch}
										<Badge variant="outline" class="bg-meth-closing/10 text-xs text-meth-closing">
											phase ✓
										</Badge>
									{/if}
									{#if meth.emotionMatch}
										<Badge variant="outline" class="bg-primary/10 text-xs text-primary">
											emotion ✓
										</Badge>
									{/if}
									{#if meth.matchedTriggers.length > 0}
										{#each meth.matchedTriggers.slice(0, 3) as trigger}
											<Badge variant="outline" class="text-xs">{trigger}</Badge>
										{/each}
									{/if}
								</div>
							</Card.Content>
						</Card.Root>
					{/each}
				</div>
			</div>
		{/if}

		<!-- Injected Content Preview -->
		{#if debugInfo.injectedKnowledge || debugInfo.injectedMethodology}
			<div>
				<details class="group">
					<summary class="flex cursor-pointer items-center gap-1.5 text-xs font-medium hover:text-foreground">
						<ChevronDownIcon class="h-3 w-3 transition-transform group-open:rotate-180" />
						View injected prompt content
					</summary>
					<div class="mt-2 max-h-48 overflow-y-auto rounded border bg-background p-2 text-xs">
						{#if debugInfo.injectedMethodology}
							<p class="mb-2 font-medium text-meth-transition">METHODOLOGY:</p>
							<pre class="mb-3 whitespace-pre-wrap text-muted-foreground">{debugInfo.injectedMethodology}</pre>
						{/if}
						{#if debugInfo.injectedKnowledge}
							<p class="mb-2 font-medium text-accent-foreground">KNOWLEDGE:</p>
							<pre class="whitespace-pre-wrap text-muted-foreground">{debugInfo.injectedKnowledge}</pre>
						{/if}
					</div>
				</details>
			</div>
		{/if}
	</Collapsible.Content>
</Collapsible.Root>
