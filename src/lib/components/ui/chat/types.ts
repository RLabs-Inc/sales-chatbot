import type { HTMLAttributes } from 'svelte/elements';
import type { Snippet } from 'svelte';

export type ChatListProps = {
	ref?: HTMLDivElement | null;
	children?: Snippet;
	class?: string;
} & Omit<HTMLAttributes<HTMLDivElement>, 'children'>;

export type ChatBubbleVariant = 'sent' | 'received';

export type ChatBubbleProps = {
	ref?: HTMLDivElement | null;
	variant: ChatBubbleVariant;
	children?: Snippet;
} & Omit<HTMLAttributes<HTMLDivElement>, 'children'>;

export type ChatBubbleMessageProps = {
	ref?: HTMLDivElement | null;
	typing?: boolean;
	markdown?: boolean;
	children?: Snippet;
	class?: string;
} & Omit<HTMLAttributes<HTMLDivElement>, 'children'>;
