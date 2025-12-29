<script lang="ts">
	import { cn } from '$lib/utils.js';
	import LoadingDots from './loading-dots.svelte';
	import type { ChatBubbleMessageProps } from './types';
	import SvelteMarkdown from 'svelte-markdown';

	let {
		ref = $bindable(null),
		typing = false,
		markdown = false,
		class: className,
		children,
		...rest
	}: ChatBubbleMessageProps = $props();

	// Extract text content from children for markdown rendering
	let textContent = $state('');
</script>

<div
	{...rest}
	bind:this={ref}
	class={cn(
		'order-2 rounded-lg px-4 py-3 text-sm leading-relaxed',
		'bg-secondary text-secondary-foreground',
		'group-data-[variant=sent]/chat-bubble:bg-primary group-data-[variant=sent]/chat-bubble:text-primary-foreground',
		'group-data-[variant=received]/chat-bubble:rounded-bl-none',
		'group-data-[variant=sent]/chat-bubble:order-1 group-data-[variant=sent]/chat-bubble:rounded-br-none',
		markdown && 'prose prose-sm max-w-none dark:prose-invert prose-p:my-1 prose-headings:my-2 prose-ul:my-1 prose-li:my-0',
		className
	)}
>
	{#if typing}
		<div class="flex size-full place-items-center justify-center py-1">
			<LoadingDots />
		</div>
	{:else if markdown && typeof children === 'undefined'}
		<SvelteMarkdown source={textContent} />
	{:else}
		{@render children?.()}
	{/if}
</div>
