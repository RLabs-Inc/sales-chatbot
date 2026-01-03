import type { Handle, HandleServerError } from '@sveltejs/kit';
import * as auth from '$lib/server/auth';

const handleAuth: Handle = async ({ event, resolve }) => {
	const sessionToken = event.cookies.get(auth.sessionCookieName);

	if (!sessionToken) {
		event.locals.user = null;
		event.locals.session = null;

		return resolve(event);
	}

	const { session, user } = await auth.validateSessionToken(sessionToken);

	if (session) {
		auth.setSessionTokenCookie(event, sessionToken, session.expiresAt);
	} else {
		auth.deleteSessionTokenCookie(event);
	}

	event.locals.user = user;
	event.locals.session = session;

	return resolve(event);
};

export const handle: Handle = handleAuth;

// Centralized error handling for better debugging and user experience
export const handleError: HandleServerError = async ({ error, event, status, message }) => {
	// Log the full error for debugging (in production, send to error tracking service)
	console.error(`[${event.request.method}] ${event.url.pathname}:`, error);

	// Return user-friendly error message
	return {
		message: status === 404 ? 'Page not found' : message || 'An unexpected error occurred'
	};
};
