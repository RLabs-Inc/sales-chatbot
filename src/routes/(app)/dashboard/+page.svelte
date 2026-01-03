<script lang="ts">
	import { enhance } from '$app/forms';
	import type { PageProps } from './$types';
	import { PageHeader } from '$lib/components/ui/page-header';
	import { EmptyState } from '$lib/components/ui/empty-state';
	import { ChatbotCard } from '$lib/components/domain';
	import { Button } from '$lib/components/ui/button';
	import * as Card from '$lib/components/ui/card';
	import * as Dialog from '$lib/components/ui/dialog';
	import { Input } from '$lib/components/ui/input';
	import { Textarea } from '$lib/components/ui/textarea';
	import { Label } from '$lib/components/ui/label';
	import * as Alert from '$lib/components/ui/alert';
	import PlusIcon from '@lucide/svelte/icons/plus';
	import MessageSquareIcon from '@lucide/svelte/icons/message-square';
	import AlertCircleIcon from '@lucide/svelte/icons/alert-circle';

	let { data, form }: PageProps = $props();

	let showNewForm = $state(false);
	let isSubmitting = $state(false);
	let formError = $derived(form?.error ?? null);
</script>

<svelte:head>
	<title>Dashboard - SalesBot</title>
</svelte:head>

<div class="flex min-h-screen flex-col">
	<PageHeader title="Your Chatbots" subtitle="Create and manage your expert sales assistants">
		{#snippet actions()}
			<Button onclick={() => (showNewForm = true)}>
				<PlusIcon class="mr-2 h-4 w-4" />
				<span class="hidden sm:inline">New Chatbot</span>
				<span class="sm:hidden">New</span>
			</Button>
		{/snippet}
	</PageHeader>

	<main class="flex-1 p-4 sm:p-6">
		<div class="mx-auto max-w-6xl">
			{#if data.chatbots.length === 0 && !showNewForm}
				<EmptyState
					title="Create Your First Expert"
					description="Build a chatbot that knows your product or service inside out. It will answer customer questions while you focus on your work."
				>
					{#snippet icon()}
						<MessageSquareIcon class="h-10 w-10" />
					{/snippet}
					{#snippet action()}
						<Button size="lg" onclick={() => (showNewForm = true)}>
							<PlusIcon class="mr-2 h-4 w-4" />
							Create Chatbot
						</Button>
					{/snippet}
				</EmptyState>
			{:else}
				<div class="grid gap-4 sm:grid-cols-2 lg:grid-cols-3">
					{#if showNewForm}
						<Card.Root class="border-2 border-dashed border-primary/20 bg-card/50">
							<form
								method="POST"
								action="?/create"
								use:enhance={() => {
									isSubmitting = true;
									return async ({ update }) => {
										await update();
										isSubmitting = false;
									};
								}}
							>
								<Card.Header>
									<Card.Title class="font-display text-lg">Create New Chatbot</Card.Title>
								</Card.Header>
								<Card.Content class="space-y-4">
									{#if formError}
										<Alert.Root variant="destructive">
											<AlertCircleIcon class="h-4 w-4" />
											<Alert.Description>{formError}</Alert.Description>
										</Alert.Root>
									{/if}

									<div class="space-y-2">
										<Label for="name">Chatbot Name</Label>
										<Input
											id="name"
											name="name"
											value={form?.name ?? ''}
											placeholder="e.g., Maria - Consórcio Expert"
											required
										/>
									</div>

									<div class="space-y-2">
										<Label for="productName">Product/Service Name</Label>
										<Input
											id="productName"
											name="productName"
											value={form?.productName ?? ''}
											placeholder="e.g., Porto Seguro Consórcio"
											required
										/>
									</div>

									<div class="space-y-2">
										<Label>Type</Label>
										<div class="flex gap-4">
											<label class="flex cursor-pointer items-center gap-2 text-sm">
												<input type="radio" name="productType" value="product" checked class="accent-primary" />
												<span>Product</span>
											</label>
											<label class="flex cursor-pointer items-center gap-2 text-sm">
												<input type="radio" name="productType" value="service" class="accent-primary" />
												<span>Service</span>
											</label>
										</div>
									</div>

									<div class="space-y-2">
										<Label for="description">Description (optional)</Label>
										<Textarea
											id="description"
											name="description"
											value={form?.description ?? ''}
											placeholder="Brief description of what this chatbot helps with..."
											rows={2}
										/>
									</div>
								</Card.Content>
								<Card.Footer class="flex gap-2">
									<Button type="button" variant="outline" class="flex-1" onclick={() => (showNewForm = false)}>
										Cancel
									</Button>
									<Button type="submit" class="flex-1" disabled={isSubmitting}>
										{isSubmitting ? 'Creating...' : 'Create & Test'}
									</Button>
								</Card.Footer>
							</form>
						</Card.Root>
					{/if}

					{#each data.chatbots as chatbot (chatbot.id)}
						<ChatbotCard {chatbot} href="/chatbots/{chatbot.id}/test" />
					{/each}
				</div>
			{/if}
		</div>
	</main>
</div>
