<script lang="ts">
	import { Button } from '$lib/components/ui/button';
	import TrashIcon from '@lucide/svelte/icons/trash-2';
	import { cn } from '$lib/utils.js';

	type DocumentType = 'pdf' | 'docx' | 'xlsx' | 'xls' | 'csv' | 'image' | 'md' | 'txt';

	type Props = {
		name: string;
		type: DocumentType | string;
		capsuleCount: number;
		onDelete?: () => void;
		isDeleting?: boolean;
		class?: string;
	};

	let { name, type, capsuleCount, onDelete, isDeleting = false, class: className }: Props = $props();

	function getFileIcon(fileType: string): string {
		switch (fileType) {
			case 'pdf': return '📄';
			case 'docx': return '📝';
			case 'xlsx':
			case 'xls':
			case 'csv': return '📊';
			case 'image': return '🖼️';
			case 'md': return '📋';
			default: return '📁';
		}
	}
</script>

<div
	class={cn(
		'flex items-center gap-3 rounded-lg bg-secondary/50 p-3 transition-colors',
		'hover:bg-secondary',
		isDeleting && 'pointer-events-none opacity-50',
		className
	)}
>
	<div class="flex h-9 w-9 shrink-0 items-center justify-center rounded-lg bg-accent/30 text-lg">
		{getFileIcon(type)}
	</div>

	<div class="min-w-0 flex-1">
		<h4 class="truncate font-display text-sm font-medium">
			{name}
		</h4>
		<div class="flex items-center gap-2 text-xs text-muted-foreground">
			<span class="font-medium uppercase text-primary">{type}</span>
			<span>·</span>
			<span>{capsuleCount} pieces</span>
		</div>
	</div>

	{#if onDelete}
		<Button
			variant="ghost"
			size="icon"
			class="h-8 w-8 shrink-0 text-muted-foreground hover:bg-destructive/10 hover:text-destructive"
			onclick={onDelete}
			disabled={isDeleting}
			aria-label="Delete document"
		>
			{#if isDeleting}
				<span class="h-4 w-4 animate-spin rounded-full border-2 border-current border-t-transparent"></span>
			{:else}
				<TrashIcon class="h-4 w-4" />
			{/if}
		</Button>
	{/if}
</div>
