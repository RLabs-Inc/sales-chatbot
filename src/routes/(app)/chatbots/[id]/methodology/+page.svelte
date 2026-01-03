<script lang="ts">
	import type { PageProps } from './$types';
	import { PageHeader } from '$lib/components/ui/page-header';
	import { EmptyState } from '$lib/components/ui/empty-state';
	import { MethodologyCard, MethodologyForm } from '$lib/components/domain';
	import * as Card from '$lib/components/ui/card';
	import * as Tabs from '$lib/components/ui/tabs';
	import * as Accordion from '$lib/components/ui/accordion';
	import * as Dialog from '$lib/components/ui/dialog';
	import * as Alert from '$lib/components/ui/alert';
	import { Button } from '$lib/components/ui/button';
	import { Badge } from '$lib/components/ui/badge';
	import type { MethodologyType } from '$lib/server/chatbot/types';
	import BookOpenIcon from '@lucide/svelte/icons/book-open';
	import PlusIcon from '@lucide/svelte/icons/plus';
	import TargetIcon from '@lucide/svelte/icons/target';
	import ArrowRightIcon from '@lucide/svelte/icons/arrow-right';
	import MessageCircleIcon from '@lucide/svelte/icons/message-circle';
	import TrophyIcon from '@lucide/svelte/icons/trophy';
	import HelpCircleIcon from '@lucide/svelte/icons/help-circle';
	import SparklesIcon from '@lucide/svelte/icons/sparkles';
	import ClockIcon from '@lucide/svelte/icons/clock';
	import ShieldCheckIcon from '@lucide/svelte/icons/shield-check';

	let { data, form }: PageProps = $props();

	// Dialog state
	let isCreateOpen = $state(false);
	let isEditOpen = $state(false);
	let isDeleteOpen = $state(false);
	let editingMethodology = $state<typeof data.methodologies[0] | null>(null);
	let deletingMethodology = $state<typeof data.methodologies[0] | null>(null);
	let activeTab = $state<MethodologyType>('phase_definition');

	// Type metadata - using theme colors for dark mode support
	const typeConfig: Record<MethodologyType, { label: string; icon: typeof TargetIcon; color: string }> = {
		phase_definition: { label: 'Phase Definitions', icon: TargetIcon, color: 'bg-meth-phase' },
		transition_trigger: { label: 'Transitions', icon: ArrowRightIcon, color: 'bg-meth-transition' },
		objection_response: { label: 'Objections', icon: MessageCircleIcon, color: 'bg-meth-objection' },
		closing_technique: { label: 'Closing', icon: TrophyIcon, color: 'bg-meth-closing' },
		qualification_question: { label: 'Questions', icon: HelpCircleIcon, color: 'bg-meth-question' },
		value_proposition: { label: 'Value Props', icon: SparklesIcon, color: 'bg-meth-value' },
		urgency_creator: { label: 'Urgency', icon: ClockIcon, color: 'bg-meth-urgency' },
		trust_builder: { label: 'Trust', icon: ShieldCheckIcon, color: 'bg-meth-trust' }
	};

	function closeDialogs() {
		isCreateOpen = false;
		isEditOpen = false;
		isDeleteOpen = false;
		editingMethodology = null;
		deletingMethodology = null;
	}

	$effect(() => {
		if (form?.success) closeDialogs();
	});
</script>

<svelte:head>
	<title>Sales Methodology - {data.chatbot.name}</title>
</svelte:head>

<div class="flex min-h-screen flex-col">
	<PageHeader title="Sales Methodology" badge={data.chatbot.name}>
		{#snippet stats()}
			<span><strong class="text-foreground">{data.totalCount}</strong> techniques</span>
		{/snippet}
		{#snippet actions()}
			<Button onclick={() => isCreateOpen = true}>
				<PlusIcon class="mr-2 h-4 w-4" />
				<span class="hidden sm:inline">Add Technique</span>
			</Button>
		{/snippet}
	</PageHeader>

	<main class="flex-1 p-4 sm:p-6">
		{#if form?.error}
			<Alert.Root variant="destructive" class="mb-4">
				<Alert.Description>{form.error}</Alert.Description>
			</Alert.Root>
		{/if}

		{#if data.totalCount === 0}
			<EmptyState
				title="No methodology defined"
				description="Add sales techniques to teach your chatbot HOW to sell. Your expertise becomes the bot's expertise."
			>
				{#snippet icon()}
					<BookOpenIcon class="h-8 w-8" />
				{/snippet}
				{#snippet action()}
					<Button onclick={() => isCreateOpen = true}>
						<PlusIcon class="mr-2 h-4 w-4" />
						Add Your First Technique
					</Button>
				{/snippet}
			</EmptyState>
		{:else}
			<Tabs.Root value={activeTab} onValueChange={(v) => activeTab = v as MethodologyType}>
				<Tabs.List class="mb-4 flex flex-wrap gap-1">
					{#each Object.entries(typeConfig) as [typeKey, config] (typeKey)}
						{@const methType = typeKey as MethodologyType}
						{@const count = data.methodologiesByType[methType]?.length || 0}
						{@const TabIcon = config.icon}
						<Tabs.Trigger value={methType} class="flex items-center gap-1.5 text-xs sm:text-sm">
							<TabIcon class="h-3.5 w-3.5" />
							<span class="hidden lg:inline">{config.label}</span>
							{#if count > 0}
								<Badge variant="secondary" class="h-5 min-w-5 text-xs">{count}</Badge>
							{/if}
						</Tabs.Trigger>
					{/each}
				</Tabs.List>

				{#each Object.entries(typeConfig) as [typeKey, config] (typeKey)}
					{@const methType = typeKey as MethodologyType}
					{@const ContentIcon = config.icon}
					<Tabs.Content value={methType}>
						<Card.Root>
							<Card.Header class="pb-3">
								<div class="flex items-center gap-3">
									<div class={`rounded-lg p-2 text-white ${config.color}`}>
										<ContentIcon class="h-5 w-5" />
									</div>
									<Card.Title class="font-display">{config.label}</Card.Title>
								</div>
							</Card.Header>
							<Card.Content>
								{#if !data.methodologiesByType[methType]?.length}
									<div class="py-6 text-center text-muted-foreground">
										<p>No {config.label.toLowerCase()} yet.</p>
										<Button variant="outline" size="sm" class="mt-2" onclick={() => { activeTab = methType; isCreateOpen = true; }}>
											<PlusIcon class="mr-1 h-3 w-3" />
											Add one
										</Button>
									</div>
								{:else}
									<Accordion.Root type="single" class="w-full">
										{#each data.methodologiesByType[methType] as methodology}
											<Accordion.Item value={methodology.id}>
												<Accordion.Trigger class="hover:no-underline">
													<div class="flex items-center gap-2">
														<span class="font-medium">{methodology.title}</span>
														<Badge variant="outline" class="text-xs">#{methodology.priority || 1}</Badge>
													</div>
												</Accordion.Trigger>
												<Accordion.Content>
													<MethodologyCard
														{methodology}
														expanded
														onEdit={() => { editingMethodology = methodology; isEditOpen = true; }}
														onDelete={() => { deletingMethodology = methodology; isDeleteOpen = true; }}
													/>
												</Accordion.Content>
											</Accordion.Item>
										{/each}
									</Accordion.Root>
								{/if}
							</Card.Content>
						</Card.Root>
					</Tabs.Content>
				{/each}
			</Tabs.Root>
		{/if}
	</main>
</div>

<!-- Create Dialog -->
<Dialog.Root bind:open={isCreateOpen}>
	<Dialog.Content class="max-h-[90vh] overflow-y-auto sm:max-w-2xl">
		<Dialog.Header>
			<Dialog.Title>Add Sales Technique</Dialog.Title>
			<Dialog.Description>Teach your chatbot a new sales technique.</Dialog.Description>
		</Dialog.Header>
		<MethodologyForm action="?/create" defaultType={activeTab} onCancel={() => isCreateOpen = false} />
	</Dialog.Content>
</Dialog.Root>

<!-- Edit Dialog -->
<Dialog.Root bind:open={isEditOpen}>
	<Dialog.Content class="max-h-[90vh] overflow-y-auto sm:max-w-2xl">
		<Dialog.Header>
			<Dialog.Title>Edit Technique</Dialog.Title>
		</Dialog.Header>
		{#if editingMethodology}
			<MethodologyForm action="?/update" methodology={editingMethodology} onCancel={() => isEditOpen = false} />
		{/if}
	</Dialog.Content>
</Dialog.Root>

<!-- Delete Dialog -->
<Dialog.Root bind:open={isDeleteOpen}>
	<Dialog.Content class="sm:max-w-md">
		<Dialog.Header>
			<Dialog.Title>Delete Technique</Dialog.Title>
			<Dialog.Description>
				Delete "{deletingMethodology?.title}"? This cannot be undone.
			</Dialog.Description>
		</Dialog.Header>
		<form method="POST" action="?/delete" class="flex justify-end gap-2 pt-4">
			<input type="hidden" name="id" value={deletingMethodology?.id} />
			<Button type="button" variant="outline" onclick={() => isDeleteOpen = false}>Cancel</Button>
			<Button type="submit" variant="destructive">Delete</Button>
		</form>
	</Dialog.Content>
</Dialog.Root>
