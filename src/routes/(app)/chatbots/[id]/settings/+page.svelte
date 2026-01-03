<script lang="ts">
	import { enhance } from '$app/forms';
	import type { PageProps } from './$types';
	import { PageHeader } from '$lib/components/ui/page-header';
	import { Button } from '$lib/components/ui/button';
	import { Input } from '$lib/components/ui/input';
	import { Textarea } from '$lib/components/ui/textarea';
	import { Label } from '$lib/components/ui/label';
	import * as Card from '$lib/components/ui/card';
	import * as Alert from '$lib/components/ui/alert';
	import CheckCircleIcon from '@lucide/svelte/icons/check-circle';
	import AlertCircleIcon from '@lucide/svelte/icons/alert-circle';
	import UserIcon from '@lucide/svelte/icons/user';
	import SlidersIcon from '@lucide/svelte/icons/sliders-horizontal';
	import MessageSquareIcon from '@lucide/svelte/icons/message-square-plus';

	let { data, form }: PageProps = $props();

	// Form submission states
	let savingIdentity = $state(false);
	let savingBehavior = $state(false);
	let savingInstructions = $state(false);

	// Success messages (auto-dismiss)
	let identitySuccess = $state(false);
	let behaviorSuccess = $state(false);
	let instructionsSuccess = $state(false);

	// Derived error states
	let identityError = $derived(form?.section === 'identity' && form?.error ? form.error : null);
	let behaviorError = $derived(form?.section === 'behavior' && form?.error ? form.error : null);
	let instructionsError = $derived(form?.section === 'instructions' && form?.error ? form.error : null);

	function showSuccess(section: 'identity' | 'behavior' | 'instructions') {
		if (section === 'identity') {
			identitySuccess = true;
			setTimeout(() => (identitySuccess = false), 3000);
		} else if (section === 'behavior') {
			behaviorSuccess = true;
			setTimeout(() => (behaviorSuccess = false), 3000);
		} else {
			instructionsSuccess = true;
			setTimeout(() => (instructionsSuccess = false), 3000);
		}
	}

	// Industry options
	const industries = [
		{ value: '', label: 'Select an industry...' },
		{ value: 'financial', label: 'Financial Services' },
		{ value: 'insurance', label: 'Insurance' },
		{ value: 'real_estate', label: 'Real Estate' },
		{ value: 'automotive', label: 'Automotive' },
		{ value: 'home_services', label: 'Home Services' },
		{ value: 'healthcare', label: 'Healthcare' },
		{ value: 'education', label: 'Education' },
		{ value: 'technology', label: 'Technology' },
		{ value: 'retail', label: 'Retail' },
		{ value: 'other', label: 'Other' }
	];
</script>

<svelte:head>
	<title>Settings - {data.chatbot.name}</title>
</svelte:head>

<div class="flex min-h-screen flex-col">
	<PageHeader title="Settings" badge={data.chatbot.name}>
		{#snippet stats()}
			<span>Configure your chatbot's personality and behavior</span>
		{/snippet}
	</PageHeader>

	<main class="flex-1 p-4 sm:p-6">
		<div class="mx-auto max-w-3xl space-y-6">
			<!-- Identity Section -->
			<Card.Root>
				<Card.Header>
					<div class="flex items-center gap-3">
						<div class="flex h-10 w-10 items-center justify-center rounded-lg bg-primary/10 text-primary">
							<UserIcon class="h-5 w-5" />
						</div>
						<div>
							<Card.Title class="font-display">Identity</Card.Title>
							<Card.Description>Basic information about your chatbot</Card.Description>
						</div>
					</div>
				</Card.Header>
				<Card.Content>
					<form
						method="POST"
						action="?/updateIdentity"
						use:enhance={() => {
							savingIdentity = true;
							return async ({ result, update }) => {
								await update();
								savingIdentity = false;
								if (result.type === 'success') {
									showSuccess('identity');
								}
							};
						}}
						class="space-y-4"
					>
						{#if identityError}
							<Alert.Root variant="destructive">
								<AlertCircleIcon class="h-4 w-4" />
								<Alert.Description>{identityError}</Alert.Description>
							</Alert.Root>
						{/if}

						{#if identitySuccess}
							<Alert.Root class="border-meth-closing/30 bg-meth-closing/10 text-meth-closing">
								<CheckCircleIcon class="h-4 w-4" />
								<Alert.Description>Identity settings saved successfully!</Alert.Description>
							</Alert.Root>
						{/if}

						<div class="grid gap-4 sm:grid-cols-2">
							<div class="space-y-2">
								<Label for="name">Chatbot Name</Label>
								<Input
									id="name"
									name="name"
									value={data.chatbot.name}
									placeholder="e.g., Maria"
									required
								/>
							</div>

							<div class="space-y-2">
								<Label for="productName">Product/Service Name</Label>
								<Input
									id="productName"
									name="productName"
									value={data.chatbot.productName}
									placeholder="e.g., Porto Seguro Consórcio"
									required
								/>
							</div>
						</div>

						<div class="space-y-2">
							<Label for="industry">Industry</Label>
							<select
								id="industry"
								name="industry"
								class="flex h-10 w-full rounded-md border border-input bg-background px-3 py-2 text-sm ring-offset-background focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring"
							>
								{#each industries as ind}
									<option value={ind.value} selected={data.chatbot.industry === ind.value}>
										{ind.label}
									</option>
								{/each}
							</select>
						</div>

						<div class="space-y-2">
							<Label for="description">Description</Label>
							<Textarea
								id="description"
								name="description"
								value={data.chatbot.description || ''}
								placeholder="Brief description of what this chatbot helps with..."
								rows={2}
							/>
						</div>

						<div class="space-y-2">
							<Label for="personality">Personality</Label>
							<Textarea
								id="personality"
								name="personality"
								value={data.chatbot.personality || ''}
								placeholder="Describe the chatbot's tone and personality. E.g., 'Friendly and professional, uses simple language, occasionally uses humor to lighten the mood.'"
								rows={3}
							/>
							<p class="text-xs text-muted-foreground">
								Define how your chatbot should communicate with customers
							</p>
						</div>

						<div class="space-y-2">
							<Label for="welcomeMessage">Welcome Message</Label>
							<Textarea
								id="welcomeMessage"
								name="welcomeMessage"
								value={data.chatbot.welcomeMessage || ''}
								placeholder="E.g., 'Olá! Eu sou a Maria, especialista em consórcios. Como posso te ajudar hoje?'"
								rows={2}
							/>
							<p class="text-xs text-muted-foreground">
								The first message your chatbot sends to start a conversation
							</p>
						</div>

						<div class="flex justify-end">
							<Button type="submit" disabled={savingIdentity}>
								{savingIdentity ? 'Saving...' : 'Save Identity'}
							</Button>
						</div>
					</form>
				</Card.Content>
			</Card.Root>

			<!-- Behavior Section -->
			<Card.Root>
				<Card.Header>
					<div class="flex items-center gap-3">
						<div class="flex h-10 w-10 items-center justify-center rounded-lg bg-meth-transition/10 text-meth-transition">
							<SlidersIcon class="h-5 w-5" />
						</div>
						<div>
							<Card.Title class="font-display">Behavior</Card.Title>
							<Card.Description>Control how your chatbot responds</Card.Description>
						</div>
					</div>
				</Card.Header>
				<Card.Content>
					<form
						method="POST"
						action="?/updateBehavior"
						use:enhance={() => {
							savingBehavior = true;
							return async ({ result, update }) => {
								await update();
								savingBehavior = false;
								if (result.type === 'success') {
									showSuccess('behavior');
								}
							};
						}}
						class="space-y-4"
					>
						{#if behaviorError}
							<Alert.Root variant="destructive">
								<AlertCircleIcon class="h-4 w-4" />
								<Alert.Description>{behaviorError}</Alert.Description>
							</Alert.Root>
						{/if}

						{#if behaviorSuccess}
							<Alert.Root class="border-meth-closing/30 bg-meth-closing/10 text-meth-closing">
								<CheckCircleIcon class="h-4 w-4" />
								<Alert.Description>Behavior settings saved successfully!</Alert.Description>
							</Alert.Root>
						{/if}

						<div class="grid gap-4 sm:grid-cols-2">
							<div class="space-y-2">
								<Label for="temperature">Temperature</Label>
								<Input
									id="temperature"
									name="temperature"
									type="number"
									min="0"
									max="1"
									step="0.1"
									value={data.config.temperature}
								/>
								<p class="text-xs text-muted-foreground">
									0 = focused/deterministic, 1 = creative/varied
								</p>
							</div>

							<div class="space-y-2">
								<Label for="maxTokensPerResponse">Max Response Length</Label>
								<Input
									id="maxTokensPerResponse"
									name="maxTokensPerResponse"
									type="number"
									min="50"
									max="5000"
									step="50"
									value={data.config.maxTokensPerResponse}
								/>
								<p class="text-xs text-muted-foreground">
									Maximum tokens per response (50-5000)
								</p>
							</div>
						</div>

						<div class="space-y-3">
							<div class="flex items-center gap-3">
								<input
									id="humanHandoffEnabled"
									name="humanHandoffEnabled"
									type="checkbox"
									checked={data.config.humanHandoffEnabled}
									class="h-4 w-4 rounded border-input accent-primary"
								/>
								<Label for="humanHandoffEnabled" class="font-normal">
									Enable human handoff
								</Label>
							</div>
							<p class="text-xs text-muted-foreground">
								Allow customers to request speaking with a human
							</p>
						</div>

						<div class="space-y-2">
							<Label for="humanHandoffTriggers">Handoff Trigger Phrases</Label>
							<Textarea
								id="humanHandoffTriggers"
								name="humanHandoffTriggers"
								value={data.config.humanHandoffTriggers.join(', ')}
								placeholder="talk to human, real person, speak to someone"
								rows={2}
							/>
							<p class="text-xs text-muted-foreground">
								Comma-separated phrases that trigger handoff offer
							</p>
						</div>

						<div class="flex justify-end">
							<Button type="submit" disabled={savingBehavior}>
								{savingBehavior ? 'Saving...' : 'Save Behavior'}
							</Button>
						</div>
					</form>
				</Card.Content>
			</Card.Root>

			<!-- Custom Instructions Section -->
			<Card.Root>
				<Card.Header>
					<div class="flex items-center gap-3">
						<div class="flex h-10 w-10 items-center justify-center rounded-lg bg-meth-objection/10 text-meth-objection">
							<MessageSquareIcon class="h-5 w-5" />
						</div>
						<div>
							<Card.Title class="font-display">Custom Instructions</Card.Title>
							<Card.Description>Additional rules and guidelines for your chatbot</Card.Description>
						</div>
					</div>
				</Card.Header>
				<Card.Content>
					<form
						method="POST"
						action="?/updateInstructions"
						use:enhance={() => {
							savingInstructions = true;
							return async ({ result, update }) => {
								await update();
								savingInstructions = false;
								if (result.type === 'success') {
									showSuccess('instructions');
								}
							};
						}}
						class="space-y-4"
					>
						{#if instructionsError}
							<Alert.Root variant="destructive">
								<AlertCircleIcon class="h-4 w-4" />
								<Alert.Description>{instructionsError}</Alert.Description>
							</Alert.Root>
						{/if}

						{#if instructionsSuccess}
							<Alert.Root class="border-meth-closing/30 bg-meth-closing/10 text-meth-closing">
								<CheckCircleIcon class="h-4 w-4" />
								<Alert.Description>Custom instructions saved successfully!</Alert.Description>
							</Alert.Root>
						{/if}

						<div class="space-y-2">
							<Label for="systemPromptAdditions">Additional Instructions</Label>
							<Textarea
								id="systemPromptAdditions"
								name="systemPromptAdditions"
								value={data.config.systemPromptAdditions || ''}
								placeholder="Add any specific rules or guidelines here. For example:
- Never mention competitor products by name
- Always recommend scheduling a call for purchases over R$50.000
- If asked about financing, explain our partnership with Banco X"
								rows={8}
							/>
							<p class="text-xs text-muted-foreground">
								These instructions are added to every conversation. Use them for company-specific rules,
								compliance requirements, or special handling instructions.
							</p>
						</div>

						<div class="flex justify-end">
							<Button type="submit" disabled={savingInstructions}>
								{savingInstructions ? 'Saving...' : 'Save Instructions'}
							</Button>
						</div>
					</form>
				</Card.Content>
			</Card.Root>
		</div>
	</main>
</div>
