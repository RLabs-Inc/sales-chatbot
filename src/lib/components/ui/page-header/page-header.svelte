<script lang="ts">
	import { cn } from '$lib/utils.js';
	import type { Snippet } from 'svelte';
	import type { HTMLAttributes } from 'svelte/elements';

	type Props = {
		title: string;
		subtitle?: string;
		badge?: string;
		actions?: Snippet;
		stats?: Snippet;
		class?: string;
	} & HTMLAttributes<HTMLElement>;

	let { title, subtitle, badge, actions, stats, class: className, ...rest }: Props = $props();
</script>

<header
	{...rest}
	class={cn(
		'sticky top-0 z-50',
		'bg-background/90 backdrop-blur-md',
		'border-b border-sidebar-border',
		'px-4 py-3 sm:px-6 sm:py-4',
		className
	)}
>
	<div class="flex flex-wrap items-center justify-between gap-3">
		<div class="flex flex-wrap items-baseline gap-2 sm:gap-3">
			<h1 class="font-display text-lg font-medium text-foreground sm:text-xl lg:text-2xl">
				{title}
			</h1>
			{#if badge}
				<span class="inline-flex items-center rounded-full bg-accent/30 px-2.5 py-0.5 text-[0.6875rem] font-medium uppercase tracking-wide text-primary">
					{badge}
				</span>
			{/if}
			{#if subtitle}
				<span class="hidden text-sm text-muted-foreground sm:inline">
					{subtitle}
				</span>
			{/if}
		</div>

		<div class="flex items-center gap-3">
			{#if stats}
				<div class="hidden items-center gap-4 text-sm text-muted-foreground sm:flex">
					{@render stats()}
				</div>
			{/if}
			{#if actions}
				{@render actions()}
			{/if}
		</div>
	</div>
</header>
