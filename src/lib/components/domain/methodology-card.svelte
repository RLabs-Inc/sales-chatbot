<script lang="ts">
	import * as Card from '$lib/components/ui/card';
	import { Badge } from '$lib/components/ui/badge';
	import { Button } from '$lib/components/ui/button';
	import { cn } from '$lib/utils.js';
	import type { Snippet } from 'svelte';
	import type { MethodologyType, SalesPhase } from '$lib/server/chatbot/types';
	import PencilIcon from '@lucide/svelte/icons/pencil';
	import Trash2Icon from '@lucide/svelte/icons/trash-2';

	type MethodologyRecord = {
		id: string;
		title: string;
		summary?: string;
		content: string;
		methodologyType: MethodologyType;
		salesPhase: SalesPhase[];
		priority?: number;
		triggerPhrases?: string[];
	};

	type Props = {
		methodology: MethodologyRecord;
		onEdit?: () => void;
		onDelete?: () => void;
		expanded?: boolean;
		class?: string;
	};

	let { methodology, onEdit, onDelete, expanded = false, class: className }: Props = $props();
</script>

<Card.Root class={cn('transition-shadow hover:shadow-md', className)}>
	<Card.Header class="pb-2">
		<div class="flex items-start justify-between gap-2">
			<Card.Title class="font-display text-base font-medium leading-tight">
				{methodology.title}
			</Card.Title>
			<Badge variant="outline" class="shrink-0 text-xs">
				#{methodology.priority || 1}
			</Badge>
		</div>
		{#if methodology.summary}
			<Card.Description class="text-sm">
				{methodology.summary}
			</Card.Description>
		{/if}
	</Card.Header>

	{#if expanded}
		<Card.Content class="space-y-3">
			<div class="prose prose-sm max-w-none rounded-md bg-muted/50 p-3 dark:prose-invert">
				<pre class="whitespace-pre-wrap font-sans text-sm">{methodology.content}</pre>
			</div>

			{#if methodology.salesPhase?.length > 0}
				<div class="flex flex-wrap gap-1.5">
					{#each methodology.salesPhase as phase}
						<Badge variant="secondary" class="text-xs capitalize">{phase.replace('_', ' ')}</Badge>
					{/each}
				</div>
			{/if}

			{#if methodology.triggerPhrases && methodology.triggerPhrases.length > 0}
				<p class="text-xs text-muted-foreground">
					<span class="font-medium">Triggers:</span> {methodology.triggerPhrases.join(', ')}
				</p>
			{/if}
		</Card.Content>

		<Card.Footer class="gap-2 pt-0">
			{#if onEdit}
				<Button variant="outline" size="sm" onclick={onEdit}>
					<PencilIcon class="mr-1 h-3 w-3" />
					Edit
				</Button>
			{/if}
			{#if onDelete}
				<Button variant="destructive" size="sm" onclick={onDelete}>
					<Trash2Icon class="mr-1 h-3 w-3" />
					Delete
				</Button>
			{/if}
		</Card.Footer>
	{/if}
</Card.Root>
