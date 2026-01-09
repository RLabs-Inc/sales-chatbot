<script lang="ts">
	import { Sidebar } from '$lib/components/layout';
	import type { LayoutProps } from './$types';

	let { data, children }: LayoutProps = $props();
</script>

<div class="app-shell">
	<!-- Ambient Background -->
	<div class="ambient-bg" aria-hidden="true"></div>

	<!-- Sidebar Navigation -->
	<Sidebar
		user={data.user}
		chatbots={data.chatbots}
		currentChatbot={data.currentChatbot}
		testSessions={data.testSessions}
	/>

	<!-- Main Content Area -->
	<main class="main-content">
		{@render children()}
	</main>
</div>

<style>
	.app-shell {
		display: flex;
		min-height: 100vh;
		background: var(--color-surface);
		font-family: var(--font-body);
		color: var(--color-text);
	}

	.ambient-bg {
		position: fixed;
		inset: 0;
		background:
			radial-gradient(ellipse 80% 50% at 50% -20%, var(--amber-light) 0%, transparent 50%),
			radial-gradient(ellipse 60% 40% at 100% 100%, oklch(from var(--amber) l c h / 0.2) 0%, transparent 50%);
		pointer-events: none;
		z-index: 0;
	}

	.main-content {
		flex: 1;
		margin-left: 260px;
		width: calc(100vw - 260px);
		min-height: 100vh;
		position: relative;
		z-index: 1;
		transition: margin-left 0.2s ease, width 0.2s ease;
	}

	/* Handle collapsed sidebar */
	:global(.sidebar.collapsed) ~ .main-content {
		margin-left: 72px;
		width: calc(100vw - 72px);
	}

	/* Mobile responsive */
	@media (max-width: 768px) {
		.main-content {
			margin-left: 0;
			width: 100vw;
		}
	}
</style>
