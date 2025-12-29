<script lang="ts">
	import { cn } from '$lib/utils.js';
	import type { Snippet } from 'svelte';
	import type { HTMLAttributes } from 'svelte/elements';

	type Props = {
		icon?: Snippet;
		title: string;
		description?: string;
		action?: Snippet;
		class?: string;
	} & HTMLAttributes<HTMLDivElement>;

	let { icon, title, description, action, class: className, ...rest }: Props = $props();
</script>

<div
	{...rest}
	class={cn(
		'flex flex-col items-center justify-center text-center',
		'py-12 px-6',
		className
	)}
>
	{#if icon}
		<div class="mb-4 flex h-20 w-20 items-center justify-center rounded-full bg-accent/30 text-primary">
			{@render icon()}
		</div>
	{/if}

	<h2 class="font-display text-xl font-medium text-foreground">
		{title}
	</h2>

	{#if description}
		<p class="mt-2 max-w-sm text-sm text-muted-foreground leading-relaxed">
			{description}
		</p>
	{/if}

	{#if action}
		<div class="mt-6">
			{@render action()}
		</div>
	{/if}
</div>
