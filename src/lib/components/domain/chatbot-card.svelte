<script lang="ts">
	import * as Card from '$lib/components/ui/card';
	import { Badge } from '$lib/components/ui/badge';
	import { cn } from '$lib/utils.js';
	import type { Chatbot } from '$lib/server/db/schema';

	type Props = {
		chatbot: Chatbot;
		href?: string;
		class?: string;
	};

	let { chatbot, href, class: className }: Props = $props();

	const statusVariants: Record<string, string> = {
		draft: 'bg-muted text-muted-foreground',
		testing: 'bg-meth-trust/15 text-meth-trust',
		active: 'bg-meth-closing/15 text-meth-closing',
		paused: 'bg-meth-urgency/15 text-meth-urgency'
	};
</script>

{#if href}
	<a {href} class={cn('block transition-transform hover:-translate-y-0.5', className)}>
		<Card.Root class="h-full transition-shadow hover:shadow-lg">
			<Card.Header class="pb-3">
				<div class="flex items-start justify-between gap-3">
					<div class="flex h-11 w-11 shrink-0 items-center justify-center rounded-lg bg-primary font-display text-lg font-medium text-primary-foreground">
						{chatbot.name.charAt(0).toUpperCase()}
					</div>
					<Badge variant="outline" class={cn('text-[0.65rem] uppercase tracking-wide', statusVariants[chatbot.status])}>
						{chatbot.status}
					</Badge>
				</div>
			</Card.Header>
			<Card.Content class="space-y-2">
				<Card.Title class="font-display text-base font-medium leading-tight">
					{chatbot.name}
				</Card.Title>
				<p class="text-sm font-medium text-primary">
					{chatbot.productName}
				</p>
				{#if chatbot.description}
					<p class="line-clamp-2 text-sm text-muted-foreground">
						{chatbot.description}
					</p>
				{/if}
			</Card.Content>
			<Card.Footer class="text-xs text-muted-foreground">
				<span>{chatbot.totalConversations} conversations</span>
				<span class="mx-2">·</span>
				<span>{chatbot.conversionsCount} conversions</span>
			</Card.Footer>
		</Card.Root>
	</a>
{:else}
	<Card.Root class={cn('h-full', className)}>
		<Card.Header class="pb-3">
			<div class="flex items-start justify-between gap-3">
				<div class="flex h-11 w-11 shrink-0 items-center justify-center rounded-lg bg-primary font-display text-lg font-medium text-primary-foreground">
					{chatbot.name.charAt(0).toUpperCase()}
				</div>
				<Badge variant="outline" class={cn('text-[0.65rem] uppercase tracking-wide', statusVariants[chatbot.status])}>
					{chatbot.status}
				</Badge>
			</div>
		</Card.Header>
		<Card.Content class="space-y-2">
			<Card.Title class="font-display text-base font-medium leading-tight">
				{chatbot.name}
			</Card.Title>
			<p class="text-sm font-medium text-primary">
				{chatbot.productName}
			</p>
			{#if chatbot.description}
				<p class="line-clamp-2 text-sm text-muted-foreground">
					{chatbot.description}
				</p>
			{/if}
		</Card.Content>
		<Card.Footer class="text-xs text-muted-foreground">
			<span>{chatbot.totalConversations} conversations</span>
			<span class="mx-2">·</span>
			<span>{chatbot.conversionsCount} conversions</span>
		</Card.Footer>
	</Card.Root>
{/if}
