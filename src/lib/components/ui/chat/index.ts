import List from './chat-list.svelte';
import Bubble from './chat-bubble.svelte';
import BubbleMessage from './chat-bubble-message.svelte';
import BubbleAvatar from './chat-bubble-avatar.svelte';
import LoadingDots from './loading-dots.svelte';

// Re-export Avatar parts for use in chat bubbles
export { Image as BubbleAvatarImage, Fallback as BubbleAvatarFallback } from '$lib/components/ui/avatar';

export {
	List,
	Bubble,
	BubbleMessage,
	BubbleAvatar,
	LoadingDots
};

export type * from './types';
