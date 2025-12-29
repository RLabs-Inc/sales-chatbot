<script lang="ts">
	import { page } from '$app/stores';

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

	let { user, chatbots = [], currentChatbot = null } = $props<{
		user: UserData;
		chatbots?: ChatbotData[];
		currentChatbot?: ChatbotData | null;
	}>();

	let isCollapsed = $state(false);
	let showChatbotMenu = $state(false);

	// Determine active route
	let currentPath = $derived($page.url.pathname);
	let isOnDashboard = $derived(currentPath === '/dashboard');
	let isOnChatbotPage = $derived(currentPath.startsWith('/chatbots/'));
	let chatbotId = $derived(currentChatbot?.id || $page.params.id);
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
			</div>
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
		background: #fef2f2;
		color: #dc2626;
	}

	.collapsed .user-section {
		justify-content: center;
		padding: 0.5rem;
	}

	/* Mobile */
	@media (max-width: 768px) {
		.sidebar {
			transform: translateX(-100%);
		}

		.sidebar.open {
			transform: translateX(0);
		}
	}
</style>
