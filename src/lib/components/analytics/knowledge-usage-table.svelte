<script lang="ts">
	import { cn } from '$lib/utils';
	import FileTextIcon from '@lucide/svelte/icons/file-text';
	import BookOpenIcon from '@lucide/svelte/icons/book-open';
	import TrendingUpIcon from '@lucide/svelte/icons/trending-up';

	type DocumentUsage = {
		document: string;
		capsuleCount: number;
		useCount: number;
	};

	type Props = {
		documents: DocumentUsage[];
		totalCapsulesUsed: number;
		class?: string;
	};

	let { documents, totalCapsulesUsed, class: className }: Props = $props();

	// Calculate usage efficiency (uses per capsule)
	function getEfficiency(doc: DocumentUsage): number {
		if (doc.capsuleCount === 0) return 0;
		return doc.useCount / doc.capsuleCount;
	}

	// Get max use count for bar visualization
	let maxUseCount = $derived(Math.max(...documents.map((d) => d.useCount), 1));

	// Truncate long document names
	function truncateName(name: string, maxLength = 30): string {
		if (name.length <= maxLength) return name;
		const ext = name.includes('.') ? '.' + name.split('.').pop() : '';
		return name.slice(0, maxLength - ext.length - 3) + '...' + ext;
	}
</script>

<div class={cn('space-y-4', className)}>
	<!-- Summary -->
	<div class="flex items-center gap-4 text-sm">
		<div class="flex items-center gap-2 text-muted-foreground">
			<BookOpenIcon class="h-4 w-4" />
			<span><strong class="text-foreground">{documents.length}</strong> documents</span>
		</div>
		<div class="flex items-center gap-2 text-muted-foreground">
			<TrendingUpIcon class="h-4 w-4" />
			<span><strong class="text-foreground">{totalCapsulesUsed}</strong> capsules used</span>
		</div>
	</div>

	<!-- Table -->
	{#if documents.length > 0}
		<div class="overflow-hidden rounded-lg border">
			<table class="w-full">
				<thead>
					<tr class="border-b bg-muted/50">
						<th class="px-4 py-2 text-left text-xs font-medium uppercase tracking-wide text-muted-foreground">
							Document
						</th>
						<th class="px-4 py-2 text-right text-xs font-medium uppercase tracking-wide text-muted-foreground">
							Capsules
						</th>
						<th class="px-4 py-2 text-right text-xs font-medium uppercase tracking-wide text-muted-foreground">
							Uses
						</th>
						<th class="hidden px-4 py-2 text-left text-xs font-medium uppercase tracking-wide text-muted-foreground sm:table-cell">
							Usage
						</th>
					</tr>
				</thead>
				<tbody>
					{#each documents as doc, index}
						{@const barWidth = (doc.useCount / maxUseCount) * 100}
						<tr class={cn('border-b last:border-0', index % 2 === 0 ? 'bg-background' : 'bg-muted/20')}>
							<td class="px-4 py-2.5">
								<div class="flex items-center gap-2">
									<FileTextIcon class="h-4 w-4 shrink-0 text-muted-foreground" />
									<span class="text-sm" title={doc.document}>
										{truncateName(doc.document)}
									</span>
								</div>
							</td>
							<td class="px-4 py-2.5 text-right text-sm tabular-nums">
								{doc.capsuleCount}
							</td>
							<td class="px-4 py-2.5 text-right text-sm font-medium tabular-nums">
								{doc.useCount}
							</td>
							<td class="hidden px-4 py-2.5 sm:table-cell">
								<div class="h-2 w-full overflow-hidden rounded-full bg-muted">
									<div
										class="h-full rounded-full bg-primary/60 transition-all"
										style="width: {barWidth}%"
									></div>
								</div>
							</td>
						</tr>
					{/each}
				</tbody>
			</table>
		</div>
	{:else}
		<div class="rounded-lg border border-dashed p-6 text-center">
			<FileTextIcon class="mx-auto h-8 w-8 text-muted-foreground" />
			<p class="mt-2 text-sm text-muted-foreground">No document usage data yet</p>
		</div>
	{/if}
</div>
