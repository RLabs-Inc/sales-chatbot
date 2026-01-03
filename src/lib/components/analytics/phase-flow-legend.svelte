<script lang="ts">
	import { cn } from '$lib/utils';

	type Props = {
		class?: string;
	};

	let { class: className }: Props = $props();

	const phases = [
		{ label: 'Greeting', color: 'bg-meth-phase' },
		{ label: 'Qualification', color: 'bg-meth-question' },
		{ label: 'Presentation', color: 'bg-meth-value' },
		{ label: 'Negotiation', color: 'bg-meth-objection' },
		{ label: 'Closing', color: 'bg-meth-closing' },
		{ label: 'Post-Sale', color: 'bg-meth-trust' }
	];
</script>

<div class={cn('flex flex-wrap gap-x-4 gap-y-2', className)}>
	{#each phases as phase}
		<div class="flex items-center gap-1.5">
			<div class={cn('h-2.5 w-2.5 rounded-full', phase.color)}></div>
			<span class="text-xs text-muted-foreground">{phase.label}</span>
		</div>
	{/each}
</div>
