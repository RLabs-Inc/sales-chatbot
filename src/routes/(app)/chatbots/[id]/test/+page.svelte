<script lang="ts">
	import type { PageData } from './$types';
	import type { MessageDebugInfo } from '$lib/server/chatbot/types';
	import { PageHeader } from '$lib/components/ui/page-header';
	import { EmptyState } from '$lib/components/ui/empty-state';
	import { MessageDebugPanel } from '$lib/components/domain';
	import * as Chat from '$lib/components/ui/chat';
	import * as Card from '$lib/components/ui/card';
	import * as Alert from '$lib/components/ui/alert';
	import { Button } from '$lib/components/ui/button';
	import { Textarea } from '$lib/components/ui/textarea';
	import { Badge } from '$lib/components/ui/badge';
	import SvelteMarkdown from 'svelte-markdown';
	import MessageSquareIcon from '@lucide/svelte/icons/message-square';
	import SendIcon from '@lucide/svelte/icons/send';
	import RotateCcwIcon from '@lucide/svelte/icons/rotate-ccw';
	import AlertTriangleIcon from '@lucide/svelte/icons/alert-triangle';
	import FileTextIcon from '@lucide/svelte/icons/file-text';

	let { data } = $props<{ data: PageData }>();

	// Message with optional debug info
	type ChatMessage = {
		role: 'user' | 'assistant';
		content: string;
		debugInfo?: MessageDebugInfo;
	};

	// Chat state
	let messages = $state<ChatMessage[]>([]);
	let inputValue = $state('');
	let isStreaming = $state(false);
	let conversationId = $state<string | null>(null);
	let currentPhase = $state<string>('greeting');
	let detectedEmotion = $state<string>('neutral');

	async function sendMessage() {
		if (!inputValue.trim() || isStreaming) return;

		const userMessage = inputValue.trim();
		inputValue = '';
		messages = [...messages, { role: 'user', content: userMessage }];

		isStreaming = true;
		let assistantMessage = '';
		let currentDebugInfo: MessageDebugInfo | undefined;
		messages = [...messages, { role: 'assistant', content: '' }];

		try {
			const response = await fetch(`/api/chatbots/${data.chatbot.id}/chat`, {
				method: 'POST',
				headers: { 'Content-Type': 'application/json' },
				body: JSON.stringify({ message: userMessage, conversationId })
			});

			if (!response.ok) throw new Error('Chat request failed');

			const reader = response.body?.getReader();
			if (!reader) throw new Error('No reader available');

			const decoder = new TextDecoder();

			while (true) {
				const { done, value } = await reader.read();
				if (done) break;

				const chunk = decoder.decode(value);
				const lines = chunk.split('\n');

				for (const line of lines) {
					if (line.startsWith('data: ')) {
						try {
							const eventData = JSON.parse(line.slice(6));
							if (eventData.type === 'conversation_id') {
								conversationId = eventData.id;
							} else if (eventData.type === 'chunk') {
								assistantMessage += eventData.content;
								messages = [
									...messages.slice(0, -1),
									{ role: 'assistant', content: assistantMessage, debugInfo: currentDebugInfo }
								];
							} else if (eventData.type === 'debug') {
								currentDebugInfo = eventData.debugInfo;
								messages = [
									...messages.slice(0, -1),
									{ role: 'assistant', content: assistantMessage, debugInfo: currentDebugInfo }
								];
							} else if (eventData.type === 'done') {
								currentPhase = eventData.phase || currentPhase;
								detectedEmotion = eventData.emotion || detectedEmotion;
							}
						} catch {
							/* Ignore parse errors */
						}
					}
				}
			}
		} catch (err) {
			console.error('Chat error:', err);
			messages = [
				...messages.slice(0, -1),
				{ role: 'assistant', content: 'Sorry, I encountered an error. Please try again.' }
			];
		} finally {
			isStreaming = false;
		}
	}

	function handleKeyDown(e: KeyboardEvent) {
		if (e.key === 'Enter' && !e.shiftKey) {
			e.preventDefault();
			sendMessage();
		}
	}

	function resetConversation() {
		messages = [];
		conversationId = null;
		currentPhase = 'greeting';
		detectedEmotion = 'neutral';
	}

	const phaseLabels: Record<string, string> = {
		greeting: 'Greeting',
		qualification: 'Understanding Needs',
		presentation: 'Presenting Solution',
		negotiation: 'Negotiating',
		closing: 'Closing',
		post_sale: 'Support'
	};

	const emotionLabels: Record<string, string> = {
		neutral: 'Neutral',
		excitement: 'Excited',
		concern: 'Concerned',
		skepticism: 'Skeptical',
		confusion: 'Confused',
		urgency: 'Urgent',
		hesitation: 'Hesitant',
		frustration: 'Frustrated'
	};
</script>

<svelte:head>
	<title>Test Chat - {data.chatbot.name}</title>
</svelte:head>

<div class="flex min-h-screen flex-col">
	<PageHeader title={data.chatbot.name} badge={data.chatbot.productName}>
		{#snippet stats()}
			<span><strong class="text-foreground">{data.documentCount}</strong> docs</span>
			<span><strong class="text-foreground">{data.capsuleCount}</strong> pieces</span>
			<span><strong class="text-foreground">{data.methodologyCount || 0}</strong> techniques</span>
		{/snippet}
	</PageHeader>

	<main class="flex flex-1 flex-col gap-4 p-4 sm:p-6 lg:flex-row">
		<!-- Metadata Sidebar -->
		<aside class="order-1 lg:order-none lg:w-64 lg:shrink-0">
			<Card.Root class="sticky top-20">
				<Card.Header class="pb-3">
					<Card.Title class="font-display text-base">Conversation Insight</Card.Title>
					<Card.Description>Glass-box view of AI reasoning</Card.Description>
				</Card.Header>
				<Card.Content class="space-y-4">
					<div>
						<p class="mb-1.5 text-xs font-medium uppercase tracking-wide text-muted-foreground">
							Sales Phase
						</p>
						<div class="flex items-center gap-2">
							<span class="relative flex h-2 w-2">
								<span
									class="absolute inline-flex h-full w-full animate-ping rounded-full bg-primary opacity-75"
								></span>
								<span class="relative inline-flex h-2 w-2 rounded-full bg-primary"></span>
							</span>
							<span class="text-sm font-medium">{phaseLabels[currentPhase] || currentPhase}</span>
						</div>
					</div>

					<div>
						<p class="mb-1.5 text-xs font-medium uppercase tracking-wide text-muted-foreground">
							Customer Emotion
						</p>
						<span class="text-sm font-medium"
							>{emotionLabels[detectedEmotion] || detectedEmotion}</span
						>
					</div>

					<div>
						<p class="mb-1.5 text-xs font-medium uppercase tracking-wide text-muted-foreground">
							Conversation
						</p>
						<div class="flex items-center gap-2">
							{#if conversationId}
								<Badge
									variant="outline"
									class="bg-meth-closing/10 text-meth-closing border-meth-closing/30"
									>Active</Badge
								>
								<Button
									variant="ghost"
									size="sm"
									class="h-7 px-2 text-xs"
									onclick={resetConversation}
								>
									<RotateCcwIcon class="mr-1 h-3 w-3" />
									Reset
								</Button>
							{:else}
								<span class="text-sm text-muted-foreground">Start a conversation below</span>
							{/if}
						</div>
					</div>

					{#if data.documentCount === 0}
						<Alert.Root
							class="border-meth-urgency/30 bg-meth-urgency/10 text-meth-urgency"
						>
							<AlertTriangleIcon class="h-4 w-4" />
							<Alert.Description>
								<p class="mb-1">No documents uploaded yet.</p>
								<a
									href="/chatbots/{data.chatbot.id}/documents"
									class="inline-flex items-center gap-1 text-xs font-medium underline underline-offset-2"
								>
									<FileTextIcon class="h-3 w-3" />
									Upload documents
								</a>
							</Alert.Description>
						</Alert.Root>
					{/if}
				</Card.Content>
			</Card.Root>
		</aside>

		<!-- Chat Window -->
		<Card.Root class="flex min-h-[500px] flex-1 flex-col lg:min-h-0">
			<div class="flex-1 overflow-y-auto">
				{#if messages.length === 0}
					<div class="flex h-full items-center justify-center p-6">
						<EmptyState
							title="Test Your Expert"
							description="Start a conversation to see how your chatbot handles customer questions about {data
								.chatbot.productName}. Each response shows glass-box debug info."
						>
							{#snippet icon()}
								<MessageSquareIcon class="h-8 w-8" />
							{/snippet}
						</EmptyState>
					</div>
				{:else}
					<Chat.List class="p-4">
						{#each messages as message, i (i)}
							<div class="mb-4">
								<Chat.Bubble variant={message.role === 'user' ? 'sent' : 'received'}>
									{#if message.role === 'assistant'}
										<Chat.BubbleAvatar class="bg-primary text-primary-foreground">
											<Chat.BubbleAvatarFallback class="text-xs font-medium">
												{data.chatbot.name.charAt(0)}
											</Chat.BubbleAvatarFallback>
										</Chat.BubbleAvatar>
									{/if}
									<Chat.BubbleMessage
										typing={isStreaming && i === messages.length - 1 && !message.content}
										class={message.role === 'assistant'
											? 'prose prose-sm max-w-none dark:prose-invert prose-p:my-1 prose-headings:my-2'
											: ''}
									>
										{#if message.content}
											{#if message.role === 'assistant'}
												<SvelteMarkdown source={message.content} />
											{:else}
												{message.content}
											{/if}
										{/if}
									</Chat.BubbleMessage>
								</Chat.Bubble>

								{#if message.role === 'assistant' && message.debugInfo}
									<div class="ml-12 mt-1">
										<MessageDebugPanel debugInfo={message.debugInfo} />
									</div>
								{/if}
							</div>
						{/each}
					</Chat.List>
				{/if}
			</div>

			<!-- Input Area -->
			<div class="border-t bg-muted/30 p-3 sm:p-4">
				<div class="flex items-end gap-2">
					<Textarea
						bind:value={inputValue}
						onkeydown={handleKeyDown}
						placeholder="Type a message as a customer would..."
						rows={1}
						disabled={isStreaming}
						class="min-h-[40px] max-h-[120px] resize-none"
					/>
					<Button
						onclick={sendMessage}
						disabled={!inputValue.trim() || isStreaming}
						size="icon"
						class="h-10 w-10 shrink-0"
					>
						<SendIcon class="h-4 w-4" />
					</Button>
				</div>
				<p class="mt-2 text-center text-xs text-muted-foreground">
					Press Enter to send · Click "Glass Box" on responses to see AI reasoning
				</p>
			</div>
		</Card.Root>
	</main>
</div>
