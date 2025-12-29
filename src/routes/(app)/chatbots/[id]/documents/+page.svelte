<script lang="ts">
	import { enhance } from '$app/forms';
	import { invalidateAll } from '$app/navigation';
	import type { PageData, ActionData } from './$types';
	import { PageHeader } from '$lib/components/ui/page-header';
	import { EmptyState } from '$lib/components/ui/empty-state';
	import { DocumentCard } from '$lib/components/domain';
	import { Button } from '$lib/components/ui/button';
	import * as Card from '$lib/components/ui/card';
	import * as Dialog from '$lib/components/ui/dialog';
	import * as Alert from '$lib/components/ui/alert';
	import { Progress } from '$lib/components/ui/progress';
	import UploadIcon from '@lucide/svelte/icons/upload';
	import FileIcon from '@lucide/svelte/icons/file-plus';
	import CheckCircleIcon from '@lucide/svelte/icons/check-circle';
	import AlertCircleIcon from '@lucide/svelte/icons/alert-circle';
	import FileTextIcon from '@lucide/svelte/icons/file-text';
	import MessageSquareTextIcon from '@lucide/svelte/icons/message-square-text';
	import TargetIcon from '@lucide/svelte/icons/target';

	let { data, form } = $props<{ data: PageData; form: ActionData }>();

	// Upload state
	let files = $state<FileList | null>(null);
	let isDragging = $state(false);
	let isUploading = $state(false);
	let uploadProgress = $state(0);
	let uploadError = $state<string | null>(null);
	let uploadSuccess = $state<{ name: string; capsules: number } | null>(null);

	// Delete state
	let deletingDocument = $state<string | null>(null);
	let showDeleteConfirm = $state(false);
	let documentToDelete = $state<string | null>(null);

	let fileInput: HTMLInputElement;

	const acceptedTypes = '.pdf,.docx,.xlsx,.xls,.csv,.txt,.md,.png,.jpg,.jpeg,.gif,.webp';
	const maxFileSize = 10 * 1024 * 1024;

	function handleDragOver(e: DragEvent) {
		e.preventDefault();
		isDragging = true;
	}

	function handleDragLeave(e: DragEvent) {
		e.preventDefault();
		isDragging = false;
	}

	function handleDrop(e: DragEvent) {
		e.preventDefault();
		isDragging = false;
		if (e.dataTransfer?.files) {
			files = e.dataTransfer.files;
			uploadFiles();
		}
	}

	function handleFileSelect(e: Event) {
		const target = e.target as HTMLInputElement;
		if (target.files && target.files.length > 0) {
			files = target.files;
			uploadFiles();
		}
	}

	async function uploadFiles() {
		if (!files || files.length === 0) return;

		for (const file of Array.from(files)) {
			if (file.size > maxFileSize) {
				uploadError = `File "${file.name}" is too large. Maximum size is 10MB.`;
				files = null;
				return;
			}
		}

		isUploading = true;
		uploadError = null;
		uploadSuccess = null;
		uploadProgress = 0;

		const progressInterval = setInterval(() => {
			if (uploadProgress < 80) {
				uploadProgress += Math.random() * 15;
			}
		}, 300);

		try {
			for (const file of Array.from(files)) {
				const formData = new FormData();
				formData.append('file', file);

				const response = await fetch(`/api/chatbots/${data.chatbot.id}/documents`, {
					method: 'POST',
					body: formData
				});

				if (!response.ok) {
					const errorData = await response.json().catch(() => ({}));
					throw new Error(errorData.message || `Upload failed: ${response.statusText}`);
				}

				const result = await response.json();
				uploadSuccess = { name: file.name, capsules: result.capsulesCreated };
			}

			uploadProgress = 100;
			await invalidateAll();

			setTimeout(() => {
				uploadSuccess = null;
				uploadProgress = 0;
			}, 3000);
		} catch (err) {
			uploadError = err instanceof Error ? err.message : 'Upload failed';
		} finally {
			clearInterval(progressInterval);
			isUploading = false;
			files = null;
			if (fileInput) fileInput.value = '';
		}
	}

	function confirmDelete(documentName: string) {
		documentToDelete = documentName;
		showDeleteConfirm = true;
	}

	function cancelDelete() {
		showDeleteConfirm = false;
		documentToDelete = null;
	}
</script>

<svelte:head>
	<title>Documents - {data.chatbot.name}</title>
</svelte:head>

<div class="flex min-h-screen flex-col">
	<PageHeader title="Training Documents" badge={data.chatbot.name}>
		{#snippet stats()}
			<span><strong class="text-foreground">{data.documents.length}</strong> documents</span>
			<span><strong class="text-foreground">{data.totalCapsules}</strong> knowledge pieces</span>
		{/snippet}
	</PageHeader>

	<main class="flex-1 p-4 sm:p-6">
		<div class="mx-auto max-w-5xl">
			<div class="grid gap-6 lg:grid-cols-5">
				<!-- Upload Section -->
				<div class="lg:col-span-2">
					<Card.Root>
						<Card.Header>
							<Card.Title class="font-display">Upload Documents</Card.Title>
							<Card.Description>Train your chatbot with your product knowledge</Card.Description>
						</Card.Header>
						<Card.Content class="space-y-4">
							<!-- Drop Zone -->
							<div
								class="cursor-pointer rounded-xl border-2 border-dashed p-6 text-center transition-all {isDragging
									? 'border-primary bg-primary/5 scale-[1.02]'
									: 'border-border hover:border-primary/50 hover:bg-accent/30'} {isUploading ? 'pointer-events-none opacity-75' : ''}"
								role="button"
								tabindex="0"
								ondragover={handleDragOver}
								ondragleave={handleDragLeave}
								ondrop={handleDrop}
								onclick={() => fileInput?.click()}
								onkeydown={(e) => e.key === 'Enter' && fileInput?.click()}
							>
								<input
									type="file"
									bind:this={fileInput}
									onchange={handleFileSelect}
									accept={acceptedTypes}
									multiple
									hidden
									aria-label="Upload files"
								/>

								{#if isUploading}
									<div class="space-y-3">
										<div class="mx-auto h-10 w-10 animate-spin rounded-full border-2 border-primary border-t-transparent"></div>
										<p class="text-sm font-medium">Processing your document...</p>
										<Progress value={uploadProgress} class="h-1.5" />
										<span class="text-xs text-muted-foreground">{Math.round(uploadProgress)}%</span>
									</div>
								{:else}
									<div class="flex flex-col items-center gap-2">
										<div class="flex h-14 w-14 items-center justify-center rounded-full bg-accent/50 text-primary">
											<UploadIcon class="h-6 w-6" />
										</div>
										<p class="text-sm">
											<span class="font-medium text-primary">Drop files here</span> or click to browse
										</p>
										<p class="text-xs text-muted-foreground">PDF, DOCX, XLSX, TXT, MD, or images (max 10MB)</p>
									</div>
								{/if}
							</div>

							<!-- Upload Messages -->
							{#if uploadError}
								<Alert.Root variant="destructive">
									<AlertCircleIcon class="h-4 w-4" />
									<Alert.Description>{uploadError}</Alert.Description>
								</Alert.Root>
							{/if}

							{#if uploadSuccess}
								<Alert.Root class="border-green-200 bg-green-50 text-green-800 dark:border-green-800 dark:bg-green-900/20 dark:text-green-300">
									<CheckCircleIcon class="h-4 w-4" />
									<Alert.Description>
										Uploaded "{uploadSuccess.name}" — {uploadSuccess.capsules} knowledge pieces created
									</Alert.Description>
								</Alert.Root>
							{/if}

							<!-- Tips -->
							<div class="space-y-2 border-t pt-4">
								<h4 class="text-xs font-medium uppercase tracking-wide text-muted-foreground">Tips for better training</h4>
								<ul class="space-y-1.5 text-sm text-muted-foreground">
									<li class="flex items-center gap-2">
										<FileTextIcon class="h-4 w-4 shrink-0 text-primary" />
										<span>Product brochures, FAQs, pricing sheets</span>
									</li>
									<li class="flex items-center gap-2">
										<MessageSquareTextIcon class="h-4 w-4 shrink-0 text-primary" />
										<span>Common customer questions and answers</span>
									</li>
									<li class="flex items-center gap-2">
										<TargetIcon class="h-4 w-4 shrink-0 text-primary" />
										<span>Competitor comparisons, objection handling</span>
									</li>
								</ul>
							</div>
						</Card.Content>
					</Card.Root>
				</div>

				<!-- Documents List -->
				<div class="lg:col-span-3">
					<Card.Root>
						<Card.Header>
							<Card.Title class="font-display">Uploaded Documents</Card.Title>
							<Card.Description>{data.documents.length} document{data.documents.length !== 1 ? 's' : ''}</Card.Description>
						</Card.Header>
						<Card.Content>
							{#if data.documents.length === 0}
								<EmptyState
									title="No documents yet"
									description="Upload your first document to start training your chatbot."
									class="py-8"
								>
									{#snippet icon()}
										<FileIcon class="h-8 w-8" />
									{/snippet}
								</EmptyState>
							{:else}
								<div class="space-y-2">
									{#each data.documents as doc (doc.name)}
										<DocumentCard
											name={doc.name}
											type={doc.type}
											capsuleCount={doc.capsuleCount}
											onDelete={() => confirmDelete(doc.name)}
											isDeleting={deletingDocument === doc.name}
										/>
									{/each}
								</div>
							{/if}
						</Card.Content>
					</Card.Root>
				</div>
			</div>
		</div>
	</main>
</div>

<!-- Delete Confirmation Dialog -->
<Dialog.Root bind:open={showDeleteConfirm}>
	<Dialog.Content class="sm:max-w-md">
		<Dialog.Header>
			<Dialog.Title>Delete Document?</Dialog.Title>
			<Dialog.Description>
				This will permanently remove <strong class="text-foreground">{documentToDelete}</strong> and all its knowledge pieces.
			</Dialog.Description>
		</Dialog.Header>
		<form
			method="POST"
			action="?/delete"
			use:enhance={() => {
				deletingDocument = documentToDelete;
				showDeleteConfirm = false;
				return async ({ result }) => {
					if (result.type === 'success') {
						await invalidateAll();
					}
					deletingDocument = null;
				};
			}}
		>
			<input type="hidden" name="documentName" value={documentToDelete} />
			<Dialog.Footer class="gap-2 sm:gap-0">
				<Button type="button" variant="outline" onclick={cancelDelete}>Cancel</Button>
				<Button type="submit" variant="destructive">Delete Document</Button>
			</Dialog.Footer>
		</form>
	</Dialog.Content>
</Dialog.Root>
