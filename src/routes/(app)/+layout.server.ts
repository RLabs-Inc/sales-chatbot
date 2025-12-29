// ============================================================================
// PROTECTED ROUTES LAYOUT - Auth guard for all (app) routes
// Loads user data and chatbots for sidebar navigation
// ============================================================================

import { redirect } from '@sveltejs/kit';
import { eq } from 'drizzle-orm';
import { db } from '$lib/server/db';
import { chatbot } from '$lib/server/db/schema';
import type { LayoutServerLoad } from './$types';

export const load: LayoutServerLoad = async ({ locals, url, params }) => {
	if (!locals.user) {
		throw redirect(302, `/login?redirect=${encodeURIComponent(url.pathname)}`);
	}

	// Load all user's chatbots for sidebar
	const chatbots = await db
		.select()
		.from(chatbot)
		.where(eq(chatbot.userId, locals.user.id))
		.orderBy(chatbot.updatedAt);

	// If we're on a chatbot page, load the current chatbot
	let currentChatbot = null;
	if (params.id) {
		currentChatbot = chatbots.find((c) => c.id === params.id) || null;
	}

	return {
		user: locals.user,
		chatbots,
		currentChatbot
	};
};
