<script lang="ts">
	import { cn } from '$lib/utils';
	import type { Snippet } from 'svelte';

	type Props = {
		columns?: 2 | 3 | 4;
		children: Snippet;
		class?: string;
	};

	let { columns = 4, children, class: className }: Props = $props();

	const columnStyles = {
		2: 'grid-cols-1 sm:grid-cols-2',
		3: 'grid-cols-1 sm:grid-cols-2 lg:grid-cols-3',
		4: 'grid-cols-1 sm:grid-cols-2 lg:grid-cols-4'
	};
</script>

<div class={cn('grid gap-4', columnStyles[columns], className)}>
	{@render children()}
</div>
