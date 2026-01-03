<script lang="ts">
	import { cn } from '$lib/utils';
	import type { Snippet } from 'svelte';
	import type { Component } from 'svelte';

	type Props = {
		label: string;
		value: string | number;
		subtitle?: string;
		trend?: 'up' | 'down' | 'neutral';
		trendValue?: string;
		icon?: Component;
		variant?: 'default' | 'primary' | 'success' | 'warning' | 'muted';
		class?: string;
	};

	let {
		label,
		value,
		subtitle,
		trend,
		trendValue,
		icon: Icon,
		variant = 'default',
		class: className
	}: Props = $props();

	const variantStyles = {
		default: 'bg-card border-border',
		primary: 'bg-primary/5 border-primary/20',
		success: 'bg-meth-closing/5 border-meth-closing/20',
		warning: 'bg-meth-urgency/5 border-meth-urgency/20',
		muted: 'bg-muted/50 border-muted'
	};

	const iconStyles = {
		default: 'text-muted-foreground',
		primary: 'text-primary',
		success: 'text-meth-closing',
		warning: 'text-meth-urgency',
		muted: 'text-muted-foreground'
	};
</script>

<div
	class={cn(
		'rounded-xl border p-4 transition-all hover:shadow-sm',
		variantStyles[variant],
		className
	)}
>
	<div class="flex items-start justify-between gap-3">
		<div class="min-w-0 flex-1">
			<p class="text-xs font-medium uppercase tracking-wide text-muted-foreground">
				{label}
			</p>
			<p class="mt-1 font-display text-2xl font-semibold tracking-tight sm:text-3xl">
				{value}
			</p>
			{#if subtitle}
				<p class="mt-0.5 text-xs text-muted-foreground">
					{subtitle}
				</p>
			{/if}
			{#if trend && trendValue}
				<div class="mt-2 flex items-center gap-1 text-xs">
					{#if trend === 'up'}
						<span class="text-meth-closing">+{trendValue}</span>
					{:else if trend === 'down'}
						<span class="text-meth-urgency">-{trendValue}</span>
					{:else}
						<span class="text-muted-foreground">{trendValue}</span>
					{/if}
				</div>
			{/if}
		</div>
		{#if Icon}
			<div
				class={cn(
					'flex h-10 w-10 shrink-0 items-center justify-center rounded-lg bg-background/50',
					iconStyles[variant]
				)}
			>
				<Icon class="h-5 w-5" />
			</div>
		{/if}
	</div>
</div>
