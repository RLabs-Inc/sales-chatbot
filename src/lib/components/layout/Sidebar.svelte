<script lang="ts">
	import { page } from '$app/state';

	interface ChatbotData {
		id: string;
		name: string;
		productName: string;
		status: string;
	}

	interface UserData {
		id: string;
		username: string;
	}

	interface TestSession {
		id: string;
		startedAt: number;
		lastMessageAt: number;
		messageCount: number;
		currentPhase: string;
		status: string;
	}

	let { user, chatbots = [], currentChatbot = null, testSessions = [] } = $props<{
		user: UserData;
		chatbots?: ChatbotData[];
		currentChatbot?: ChatbotData | null;
		testSessions?: TestSession[];
	}>();

	let isCollapsed = $state(false);
	let showChatbotMenu = $state(false);
	let showTestSessions = $state(true);

	// Determine active route - using $app/state (reactive without $ prefix)
	let currentPath = $derived(page.url.pathname);
	let currentSessionId = $derived(page.url.searchParams.get('session'));
	let isOnDashboard = $derived(currentPath === '/dashboard');
	let isOnChatbotPage = $derived(currentPath.startsWith('/chatbots/'));
	let isOnTestPage = $derived(currentPath.endsWith('/test'));
	let chatbotId = $derived(currentChatbot?.id || page.params.id);

	// Format timestamp for display
	function formatSessionTime(timestamp: number): string {
		const date = new Date(timestamp);
		const now = new Date();
		const isToday = date.toDateString() === now.toDateString();
		const isYesterday = new Date(now.getTime() - 86400000).toDateString() === date.toDateString();

		if (isToday) {
			return date.toLocaleTimeString('en-US', { hour: 'numeric', minute: '2-digit' });
		} else if (isYesterday) {
			return 'Yesterday';
		} else {
			return date.toLocaleDateString('en-US', { month: 'short', day: 'numeric' });
		}
	}
</script>

<aside class="sidebar" class:collapsed={isCollapsed}>
	<!-- Logo / Brand -->
	<div class="sidebar-header">
		<a href="/dashboard" class="brand">
			<div class="brand-icon">
				<svg width="24" height="24" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2">
					<path d="M21 15a2 2 0 0 1-2 2H7l-4 4V5a2 2 0 0 1 2-2h14a2 2 0 0 1 2 2z" />
				</svg>
			</div>
			{#if !isCollapsed}
				<span class="brand-text">SalesBot</span>
			{/if}
		</a>
		<button class="collapse-btn" onclick={() => isCollapsed = !isCollapsed} aria-label={isCollapsed ? 'Expand sidebar' : 'Collapse sidebar'}>
			<svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2">
				{#if isCollapsed}
					<path d="M9 18l6-6-6-6" />
				{:else}
					<path d="M15 18l-6-6 6-6" />
				{/if}
			</svg>
		</button>
	</div>

	<!-- Main Navigation -->
	<nav class="sidebar-nav">
		<div class="nav-section">
			<a href="/dashboard" class="nav-item" class:active={isOnDashboard}>
				<svg width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2">
					<rect x="3" y="3" width="7" height="7" rx="1" />
					<rect x="14" y="3" width="7" height="7" rx="1" />
					<rect x="14" y="14" width="7" height="7" rx="1" />
					<rect x="3" y="14" width="7" height="7" rx="1" />
				</svg>
				{#if !isCollapsed}
					<span>Dashboard</span>
				{/if}
			</a>
		</div>

		<!-- Chatbot Selector -->
		{#if chatbots.length > 0}
			<div class="nav-section">
				{#if !isCollapsed}
					<span class="nav-section-label">Your Chatbots</span>
				{/if}

				<div class="chatbot-selector">
					<button
						class="chatbot-current"
						class:active={isOnChatbotPage}
						onclick={() => showChatbotMenu = !showChatbotMenu}
					>
						{#if currentChatbot}
							<div class="chatbot-avatar">
								{currentChatbot.name.charAt(0).toUpperCase()}
							</div>
							{#if !isCollapsed}
								<span class="chatbot-name">{currentChatbot.name}</span>
								<svg class="chevron" class:open={showChatbotMenu} width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2">
									<path d="M6 9l6 6 6-6" />
								</svg>
							{/if}
						{:else}
							<svg width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2">
								<path d="M21 15a2 2 0 0 1-2 2H7l-4 4V5a2 2 0 0 1 2-2h14a2 2 0 0 1 2 2z" />
							</svg>
							{#if !isCollapsed}
								<span>Select Chatbot</span>
							{/if}
						{/if}
					</button>

					{#if showChatbotMenu && !isCollapsed}
						<div class="chatbot-menu">
							{#each chatbots as bot}
								<a
									href="/chatbots/{bot.id}/test"
									class="chatbot-option"
									class:selected={bot.id === chatbotId}
									onclick={() => showChatbotMenu = false}
								>
									<div class="chatbot-avatar small">
										{bot.name.charAt(0).toUpperCase()}
									</div>
									<div class="chatbot-info">
										<span class="chatbot-name">{bot.name}</span>
										<span class="chatbot-product">{bot.productName}</span>
									</div>
								</a>
							{/each}
						</div>
					{/if}
				</div>
			</div>
		{/if}

		<!-- Chatbot Context Menu -->
		{#if currentChatbot && chatbotId}
			<div class="nav-section chatbot-context">
				{#if !isCollapsed}
					<span class="nav-section-label">Manage</span>
				{/if}

				<a href="/chatbots/{chatbotId}/test" class="nav-item" class:active={currentPath.endsWith('/test')}>
					<svg width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2">
						<path d="M21 15a2 2 0 0 1-2 2H7l-4 4V5a2 2 0 0 1 2-2h14a2 2 0 0 1 2 2z" />
					</svg>
					{#if !isCollapsed}
						<span>Test Chat</span>
					{/if}
				</a>

				<a href="/chatbots/{chatbotId}/documents" class="nav-item" class:active={currentPath.endsWith('/documents')}>
					<svg width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2">
						<path d="M14 2H6a2 2 0 0 0-2 2v16a2 2 0 0 0 2 2h12a2 2 0 0 0 2-2V8z" />
						<polyline points="14 2 14 8 20 8" />
					</svg>
					{#if !isCollapsed}
						<span>Documents</span>
					{/if}
				</a>

				<a href="/chatbots/{chatbotId}/methodology" class="nav-item" class:active={currentPath.endsWith('/methodology')}>
					<svg width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2">
						<path d="M4 19.5A2.5 2.5 0 0 1 6.5 17H20" />
						<path d="M6.5 2H20v20H6.5A2.5 2.5 0 0 1 4 19.5v-15A2.5 2.5 0 0 1 6.5 2z" />
					</svg>
					{#if !isCollapsed}
						<span>Methodology</span>
					{/if}
				</a>

				<a href="/chatbots/{chatbotId}/analytics" class="nav-item" class:active={currentPath.endsWith('/analytics')}>
					<svg width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2">
						<line x1="18" y1="20" x2="18" y2="10" />
						<line x1="12" y1="20" x2="12" y2="4" />
						<line x1="6" y1="20" x2="6" y2="14" />
					</svg>
					{#if !isCollapsed}
						<span>Analytics</span>
					{/if}
				</a>

				<a href="/chatbots/{chatbotId}/settings" class="nav-item" class:active={currentPath.endsWith('/settings')}>
					<svg width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2">
						<circle cx="12" cy="12" r="3" />
						<path d="M19.4 15a1.65 1.65 0 0 0 .33 1.82l.06.06a2 2 0 0 1 0 2.83 2 2 0 0 1-2.83 0l-.06-.06a1.65 1.65 0 0 0-1.82-.33 1.65 1.65 0 0 0-1 1.51V21a2 2 0 0 1-2 2 2 2 0 0 1-2-2v-.09A1.65 1.65 0 0 0 9 19.4a1.65 1.65 0 0 0-1.82.33l-.06.06a2 2 0 0 1-2.83 0 2 2 0 0 1 0-2.83l.06-.06a1.65 1.65 0 0 0 .33-1.82 1.65 1.65 0 0 0-1.51-1H3a2 2 0 0 1-2-2 2 2 0 0 1 2-2h.09A1.65 1.65 0 0 0 4.6 9a1.65 1.65 0 0 0-.33-1.82l-.06-.06a2 2 0 0 1 0-2.83 2 2 0 0 1 2.83 0l.06.06a1.65 1.65 0 0 0 1.82.33H9a1.65 1.65 0 0 0 1-1.51V3a2 2 0 0 1 2-2 2 2 0 0 1 2 2v.09a1.65 1.65 0 0 0 1 1.51 1.65 1.65 0 0 0 1.82-.33l.06-.06a2 2 0 0 1 2.83 0 2 2 0 0 1 0 2.83l-.06.06a1.65 1.65 0 0 0-.33 1.82V9a1.65 1.65 0 0 0 1.51 1H21a2 2 0 0 1 2 2 2 2 0 0 1-2 2h-.09a1.65 1.65 0 0 0-1.51 1z" />
					</svg>
					{#if !isCollapsed}
						<span>Settings</span>
					{/if}
				</a>
			</div>

			<!-- Test Sessions Section -->
			{#if !isCollapsed}
				<div class="nav-section test-sessions-section">
					<button
						class="nav-section-header"
						onclick={() => showTestSessions = !showTestSessions}
					>
						<span class="nav-section-label">Test Sessions</span>
						<svg class="chevron" class:open={showTestSessions} width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2">
							<path d="M6 9l6 6 6-6" />
						</svg>
					</button>

					{#if showTestSessions}
						<!-- New Chat Button -->
						<a href="/chatbots/{chatbotId}/test" class="new-chat-btn">
							<svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2">
								<line x1="12" y1="5" x2="12" y2="19" />
								<line x1="5" y1="12" x2="19" y2="12" />
							</svg>
							<span>New Chat</span>
						</a>

						<!-- Session List -->
						<div class="session-list">
							{#if testSessions.length === 0}
								<p class="no-sessions">No test sessions yet</p>
							{:else}
								{#each testSessions as session (session.id)}
									<a
										href="/chatbots/{chatbotId}/test?session={session.id}"
										class="session-item"
										class:active={currentSessionId === session.id}
									>
										<div class="session-info">
											<span class="session-time">{formatSessionTime(session.lastMessageAt)}</span>
											<span class="session-meta">{session.messageCount} messages</span>
										</div>
									</a>
								{/each}
							{/if}
						</div>
					{/if}
				</div>
			{/if}
		{/if}
	</nav>

	<!-- User Section -->
	<div class="sidebar-footer">
		<div class="user-section">
			<div class="user-avatar">
				{user.username.charAt(0).toUpperCase()}
			</div>
			{#if !isCollapsed}
				<div class="user-info">
					<span class="user-name">{user.username}</span>
				</div>
				<form method="POST" action="/logout">
					<button type="submit" class="logout-btn" aria-label="Logout">
						<svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2">
							<path d="M9 21H5a2 2 0 0 1-2-2V5a2 2 0 0 1 2-2h4" />
							<polyline points="16 17 21 12 16 7" />
							<line x1="21" y1="12" x2="9" y2="12" />
						</svg>
					</button>
				</form>
			{/if}
		</div>
	</div>
</aside>

<style>
	.sidebar {
		width: 260px;
		height: 100vh;
		background: var(--color-surface-elevated);
		border-right: 1px solid var(--sidebar-border);
		display: flex;
		flex-direction: column;
		font-family: var(--font-body);
		position: fixed;
		left: 0;
		top: 0;
		z-index: 100;
		transition: width 0.2s ease;
	}

	.sidebar.collapsed {
		width: 72px;
	}

	/* Header */
	.sidebar-header {
		display: flex;
		align-items: center;
		justify-content: space-between;
		padding: 1rem;
		border-bottom: 1px solid var(--sidebar-border);
	}

	.brand {
		display: flex;
		align-items: center;
		gap: 0.75rem;
		text-decoration: none;
		color: var(--color-text);
	}

	.brand-icon {
		width: 40px;
		height: 40px;
		border-radius: 10px;
		background: var(--color-accent);
		color: white;
		display: flex;
		align-items: center;
		justify-content: center;
		flex-shrink: 0;
	}

	.brand-text {
		font-family: var(--font-display);
		font-size: 1.25rem;
		font-weight: 500;
	}

	.collapse-btn {
		width: 28px;
		height: 28px;
		border-radius: 6px;
		border: none;
		background: transparent;
		color: var(--color-text-muted);
		cursor: pointer;
		display: flex;
		align-items: center;
		justify-content: center;
		transition: all 0.2s;
	}

	.collapse-btn:hover {
		background: var(--cream-dark);
		color: var(--color-text);
	}

	.collapsed .collapse-btn {
		position: absolute;
		right: -14px;
		top: 28px;
		background: var(--color-surface-elevated);
		border: 1px solid var(--sidebar-border);
		box-shadow: var(--shadow-sm);
	}

	/* Navigation */
	.sidebar-nav {
		flex: 1;
		overflow-y: auto;
		padding: 1rem 0;
	}

	.nav-section {
		padding: 0 0.75rem;
		margin-bottom: 1.5rem;
	}

	.nav-section-label {
		display: block;
		font-size: 0.675rem;
		text-transform: uppercase;
		letter-spacing: 0.08em;
		color: var(--color-text-muted);
		padding: 0 0.75rem;
		margin-bottom: 0.5rem;
	}

	.nav-item {
		display: flex;
		align-items: center;
		gap: 0.75rem;
		padding: 0.625rem 0.75rem;
		border-radius: 8px;
		text-decoration: none;
		color: var(--color-text-muted);
		font-size: 0.875rem;
		transition: all 0.15s;
	}

	.nav-item:hover {
		background: var(--cream-dark);
		color: var(--color-text);
	}

	.nav-item.active {
		background: var(--color-accent-soft);
		color: var(--color-accent);
		font-weight: 500;
	}

	.collapsed .nav-item {
		justify-content: center;
		padding: 0.75rem;
	}

	/* Chatbot Selector */
	.chatbot-selector {
		position: relative;
	}

	.chatbot-current {
		width: 100%;
		display: flex;
		align-items: center;
		gap: 0.75rem;
		padding: 0.625rem 0.75rem;
		border-radius: 8px;
		border: 1px solid transparent;
		background: transparent;
		text-align: left;
		cursor: pointer;
		font-family: var(--font-body);
		color: var(--color-text-muted);
		transition: all 0.15s;
	}

	.chatbot-current:hover {
		background: var(--cream-dark);
		color: var(--color-text);
	}

	.chatbot-current.active {
		background: var(--color-accent-soft);
		color: var(--color-accent);
	}

	.collapsed .chatbot-current {
		justify-content: center;
		padding: 0.75rem;
	}

	.chatbot-avatar {
		width: 32px;
		height: 32px;
		border-radius: 8px;
		background: var(--color-accent);
		color: white;
		display: flex;
		align-items: center;
		justify-content: center;
		font-family: var(--font-display);
		font-size: 0.875rem;
		font-weight: 500;
		flex-shrink: 0;
	}

	.chatbot-avatar.small {
		width: 28px;
		height: 28px;
		font-size: 0.75rem;
	}

	.chatbot-name {
		flex: 1;
		font-size: 0.875rem;
		font-weight: 500;
		color: var(--color-text);
		white-space: nowrap;
		overflow: hidden;
		text-overflow: ellipsis;
	}

	.chevron {
		flex-shrink: 0;
		transition: transform 0.2s;
	}

	.chevron.open {
		transform: rotate(180deg);
	}

	.chatbot-menu {
		position: absolute;
		top: 100%;
		left: 0;
		right: 0;
		margin-top: 0.25rem;
		background: var(--color-surface-elevated);
		border: 1px solid var(--sidebar-border);
		border-radius: 8px;
		box-shadow: var(--shadow-md);
		overflow: hidden;
		z-index: 10;
	}

	.chatbot-option {
		display: flex;
		align-items: center;
		gap: 0.75rem;
		padding: 0.75rem;
		text-decoration: none;
		color: var(--color-text);
		transition: background 0.15s;
	}

	.chatbot-option:hover {
		background: var(--cream-dark);
	}

	.chatbot-option.selected {
		background: var(--color-accent-soft);
	}

	.chatbot-info {
		display: flex;
		flex-direction: column;
		gap: 0.125rem;
		min-width: 0;
	}

	.chatbot-info .chatbot-name {
		font-size: 0.875rem;
	}

	.chatbot-product {
		font-size: 0.75rem;
		color: var(--color-text-muted);
		white-space: nowrap;
		overflow: hidden;
		text-overflow: ellipsis;
	}

	/* Chatbot Context */
	.chatbot-context {
		padding-top: 0.5rem;
		border-top: 1px solid var(--sidebar-border);
		margin-top: 0.5rem;
	}

	/* Test Sessions Section */
	.test-sessions-section {
		margin-top: 0.5rem;
		padding-top: 0.5rem;
		border-top: 1px solid var(--sidebar-border);
	}

	.nav-section-header {
		width: 100%;
		display: flex;
		align-items: center;
		justify-content: space-between;
		padding: 0 0.75rem;
		margin-bottom: 0.5rem;
		background: none;
		border: none;
		cursor: pointer;
		color: var(--color-text-muted);
	}

	.nav-section-header:hover {
		color: var(--color-text);
	}

	.nav-section-header .chevron {
		transition: transform 0.2s;
	}

	.nav-section-header .chevron.open {
		transform: rotate(180deg);
	}

	.new-chat-btn {
		display: flex;
		align-items: center;
		gap: 0.5rem;
		padding: 0.5rem 0.75rem;
		margin: 0 0.5rem 0.5rem;
		border-radius: 6px;
		text-decoration: none;
		font-size: 0.8125rem;
		font-weight: 500;
		color: var(--color-accent);
		background: var(--color-accent-soft);
		transition: all 0.15s;
	}

	.new-chat-btn:hover {
		background: var(--color-accent);
		color: white;
	}

	.session-list {
		max-height: 200px;
		overflow-y: auto;
		padding: 0 0.5rem;
	}

	.no-sessions {
		font-size: 0.75rem;
		color: var(--color-text-muted);
		text-align: center;
		padding: 0.75rem;
	}

	.session-item {
		display: block;
		padding: 0.5rem 0.75rem;
		margin-bottom: 0.25rem;
		border-radius: 6px;
		text-decoration: none;
		transition: all 0.15s;
	}

	.session-item:hover {
		background: var(--cream-dark);
	}

	.session-item.active {
		background: var(--color-accent-soft);
	}

	.session-info {
		display: flex;
		justify-content: space-between;
		align-items: center;
	}

	.session-time {
		font-size: 0.8125rem;
		font-weight: 500;
		color: var(--color-text);
	}

	.session-item.active .session-time {
		color: var(--color-accent);
	}

	.session-meta {
		font-size: 0.6875rem;
		color: var(--color-text-muted);
	}

	/* Footer */
	.sidebar-footer {
		border-top: 1px solid var(--sidebar-border);
		padding: 0.75rem;
	}

	.user-section {
		display: flex;
		align-items: center;
		gap: 0.75rem;
		padding: 0.5rem;
		border-radius: 8px;
		background: var(--cream);
	}

	.user-avatar {
		width: 36px;
		height: 36px;
		border-radius: 50%;
		background: var(--color-accent);
		color: white;
		display: flex;
		align-items: center;
		justify-content: center;
		font-family: var(--font-display);
		font-size: 0.875rem;
		font-weight: 500;
		flex-shrink: 0;
	}

	.user-info {
		flex: 1;
		min-width: 0;
	}

	.user-name {
		font-size: 0.875rem;
		font-weight: 500;
		color: var(--color-text);
		white-space: nowrap;
		overflow: hidden;
		text-overflow: ellipsis;
		display: block;
	}

	.logout-btn {
		width: 32px;
		height: 32px;
		border-radius: 6px;
		border: none;
		background: transparent;
		color: var(--color-text-muted);
		cursor: pointer;
		display: flex;
		align-items: center;
		justify-content: center;
		transition: all 0.15s;
	}

	.logout-btn:hover {
		background: oklch(from var(--destructive) l c h / 0.1);
		color: var(--destructive);
	}

	.collapsed .user-section {
		justify-content: center;
		padding: 0.5rem;
	}

	/* Mobile - sidebar hidden by default, would need hamburger menu to show */
	@media (max-width: 768px) {
		.sidebar {
			transform: translateX(-100%);
		}
	}
</style>
