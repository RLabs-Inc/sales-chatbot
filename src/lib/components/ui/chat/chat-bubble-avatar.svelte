<script lang="ts">
	import * as Avatar from '$lib/components/ui/avatar';
	import { cn } from '$lib/utils.js';
	import type { Snippet } from 'svelte';

	type Props = {
		class?: string;
		children?: Snippet;
	};

	let { class: className, children }: Props = $props();
</script>

<Avatar.Root
	class={cn(
		'order-1 h-8 w-8',
		'group-data-[variant=sent]/chat-bubble:order-2',
		className
	)}
>
	{@render children?.()}
</Avatar.Root>
