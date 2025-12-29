<script lang="ts">
	import { enhance } from '$app/forms';
	import { Button } from '$lib/components/ui/button';
	import { Input } from '$lib/components/ui/input';
	import { Textarea } from '$lib/components/ui/textarea';
	import { Label } from '$lib/components/ui/label';
	import type { MethodologyType, SalesPhase, EmotionalResonance } from '$lib/server/chatbot/types';

	type MethodologyRecord = {
		id: string;
		title: string;
		summary?: string;
		content: string;
		methodologyType: MethodologyType;
		salesPhase: SalesPhase[];
		priority?: number;
		triggerPhrases?: string[];
		applicableEmotions?: EmotionalResonance[];
	};

	type Props = {
		action: string;
		methodology?: MethodologyRecord;
		defaultType?: MethodologyType;
		onCancel: () => void;
		onSubmitStart?: () => void;
		onSubmitEnd?: () => void;
	};

	let {
		action,
		methodology,
		defaultType = 'phase_definition',
		onCancel,
		onSubmitStart,
		onSubmitEnd
	}: Props = $props();

	let isSubmitting = $state(false);

	const methodologyTypes: Array<{ value: MethodologyType; label: string }> = [
		{ value: 'phase_definition', label: 'Phase Definitions' },
		{ value: 'transition_trigger', label: 'Transition Triggers' },
		{ value: 'objection_response', label: 'Objection Handling' },
		{ value: 'closing_technique', label: 'Closing Techniques' },
		{ value: 'qualification_question', label: 'Qualification Questions' },
		{ value: 'value_proposition', label: 'Value Propositions' },
		{ value: 'urgency_creator', label: 'Urgency Creators' },
		{ value: 'trust_builder', label: 'Trust Builders' }
	];

	const salesPhases: Array<{ value: SalesPhase; label: string }> = [
		{ value: 'greeting', label: 'Greeting' },
		{ value: 'qualification', label: 'Qualification' },
		{ value: 'presentation', label: 'Presentation' },
		{ value: 'negotiation', label: 'Negotiation' },
		{ value: 'closing', label: 'Closing' },
		{ value: 'post_sale', label: 'Post-Sale' }
	];

	const emotions: Array<{ value: EmotionalResonance; label: string }> = [
		{ value: 'neutral', label: 'Neutral' },
		{ value: 'excitement', label: 'Excitement' },
		{ value: 'concern', label: 'Concern' },
		{ value: 'skepticism', label: 'Skepticism' },
		{ value: 'confusion', label: 'Confusion' },
		{ value: 'urgency', label: 'Urgency' },
		{ value: 'hesitation', label: 'Hesitation' },
		{ value: 'frustration', label: 'Frustration' }
	];
</script>

<form
	method="POST"
	{action}
	use:enhance={() => {
		isSubmitting = true;
		onSubmitStart?.();
		return async ({ update }) => {
			await update();
			isSubmitting = false;
			onSubmitEnd?.();
		};
	}}
	class="space-y-4"
>
	{#if methodology?.id}
		<input type="hidden" name="id" value={methodology.id} />
	{/if}

	<div class="grid gap-4 sm:grid-cols-2">
		<div class="space-y-2">
			<Label for="title">Title *</Label>
			<Input
				id="title"
				name="title"
				placeholder="e.g., Handle Price Objection"
				value={methodology?.title ?? ''}
				required
			/>
		</div>

		{#if !methodology}
			<div class="space-y-2">
				<Label for="methodologyType">Type *</Label>
				<select
					id="methodologyType"
					name="methodologyType"
					class="flex h-10 w-full rounded-md border border-input bg-background px-3 py-2 text-sm ring-offset-background focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring"
					required
				>
					{#each methodologyTypes as type}
						<option value={type.value} selected={type.value === defaultType}>
							{type.label}
						</option>
					{/each}
				</select>
			</div>
		{/if}
	</div>

	<div class="space-y-2">
		<Label for="summary">Summary (optional)</Label>
		<Input
			id="summary"
			name="summary"
			placeholder="Brief one-line description"
			value={methodology?.summary ?? ''}
		/>
	</div>

	<div class="space-y-2">
		<Label for="content">Content *</Label>
		<Textarea
			id="content"
			name="content"
			placeholder="Write the detailed technique, script, or guidance. Be specific about what to say, how to say it, and when to use it."
			rows={6}
			value={methodology?.content ?? ''}
			required
		/>
	</div>

	<div class="grid gap-4 sm:grid-cols-2">
		<div class="space-y-2">
			<Label for="priority">Priority (1 = highest)</Label>
			<Input
				id="priority"
				name="priority"
				type="number"
				value={methodology?.priority ?? 1}
				min={1}
				max={10}
			/>
		</div>

		<div class="space-y-2">
			<Label for="triggerPhrases">Trigger Phrases</Label>
			<Input
				id="triggerPhrases"
				name="triggerPhrases"
				placeholder="price, expensive, cost (comma-separated)"
				value={(methodology?.triggerPhrases ?? []).join(', ')}
			/>
		</div>
	</div>

	<div class="space-y-2">
		<Label>Applicable Phases</Label>
		<div class="flex flex-wrap gap-3">
			{#each salesPhases as phase}
				<label class="flex items-center gap-1.5 text-sm">
					<input
						type="checkbox"
						name="salesPhase"
						value={phase.value}
						checked={(methodology?.salesPhase ?? []).includes(phase.value)}
						class="h-4 w-4 rounded border-input"
					/>
					{phase.label}
				</label>
			{/each}
		</div>
	</div>

	<div class="space-y-2">
		<Label>Customer Emotions</Label>
		<div class="flex flex-wrap gap-3">
			{#each emotions as emotion}
				<label class="flex items-center gap-1.5 text-sm">
					<input
						type="checkbox"
						name="applicableEmotions"
						value={emotion.value}
						checked={(methodology?.applicableEmotions ?? []).includes(emotion.value)}
						class="h-4 w-4 rounded border-input"
					/>
					{emotion.label}
				</label>
			{/each}
		</div>
	</div>

	<div class="flex justify-end gap-2 pt-4">
		<Button type="button" variant="outline" onclick={onCancel}>
			Cancel
		</Button>
		<Button type="submit" disabled={isSubmitting}>
			{isSubmitting ? 'Saving...' : methodology ? 'Save Changes' : 'Create Technique'}
		</Button>
	</div>
</form>
