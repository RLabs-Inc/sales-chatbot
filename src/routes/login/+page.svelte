<script lang="ts">
	import { enhance } from '$app/forms';
	import type { ActionData, PageData } from './$types';

	let { data, form } = $props<{ data: PageData; form: ActionData }>();

	let isRegistering = $state(false);
</script>

<svelte:head>
	<title>{isRegistering ? 'Create Account' : 'Sign In'} - SalesBot</title>
</svelte:head>

<div class="login-page">
	<!-- Ambient background -->
	<div class="ambient-bg"></div>

	<main class="login-container">
		<!-- Brand -->
		<div class="brand">
			<h1>SalesBot</h1>
			<p class="tagline">Your expertise, always available</p>
		</div>

		<!-- Auth card -->
		<div class="auth-card">
			<div class="card-header">
				<h2>{isRegistering ? 'Create Account' : 'Welcome Back'}</h2>
				<p>
					{isRegistering
						? 'Start building your expert chatbot'
						: 'Sign in to manage your chatbots'}
				</p>
			</div>

			{#if form?.message}
				<div class="error-message" role="alert">
					{form.message}
				</div>
			{/if}

			<form method="POST" action={isRegistering ? '?/register' : '?/login'} use:enhance>
				{#if data.redirect}
					<input type="hidden" name="redirect" value={data.redirect} />
				{/if}

				{#if isRegistering}
					<div class="form-field">
						<label for="name">Your Name</label>
						<input
							type="text"
							id="name"
							name="name"
							placeholder="How should we call you?"
							autocomplete="name"
						/>
					</div>
				{/if}

				<div class="form-field">
					<label for="username">Username</label>
					<input
						type="text"
						id="username"
						name="username"
						placeholder="Choose a username"
						autocomplete="username"
						required
					/>
				</div>

				<div class="form-field">
					<label for="password">Password</label>
					<input
						type="password"
						id="password"
						name="password"
						placeholder="Enter your password"
						autocomplete={isRegistering ? 'new-password' : 'current-password'}
						required
					/>
				</div>

				<button type="submit" class="submit-btn">
					{isRegistering ? 'Create Account' : 'Sign In'}
				</button>
			</form>

			<div class="card-footer">
				<p>
					{isRegistering ? 'Already have an account?' : "Don't have an account?"}
					<button type="button" class="toggle-btn" onclick={() => (isRegistering = !isRegistering)}>
						{isRegistering ? 'Sign in' : 'Create one'}
					</button>
				</p>
			</div>
		</div>

		<!-- Value prop -->
		<div class="value-props">
			<div class="prop">
				<svg width="24" height="24" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2">
					<path d="M22 11.08V12a10 10 0 1 1-5.93-9.14" />
					<polyline points="22 4 12 14.01 9 11.01" />
				</svg>
				<span>Never miss a customer while working</span>
			</div>
			<div class="prop">
				<svg width="24" height="24" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2">
					<path d="M21 15a2 2 0 0 1-2 2H7l-4 4V5a2 2 0 0 1 2-2h14a2 2 0 0 1 2 2z" />
				</svg>
				<span>Your expertise answering 24/7</span>
			</div>
			<div class="prop">
				<svg width="24" height="24" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2">
					<circle cx="12" cy="12" r="10" />
					<path d="M16 8l-4 4-4-4" />
					<path d="M12 16V12" />
				</svg>
				<span>Train with your own documents</span>
			</div>
		</div>
	</main>
</div>

<style>
	/* ============================================================================
	   PAGE - Uses global theme from layout.css
	   ============================================================================ */
	.login-page {
		min-height: 100vh;
		background: var(--color-surface);
		font-family: var(--font-body);
		color: var(--color-text);
		position: relative;
		display: flex;
		align-items: center;
		justify-content: center;
		padding: 2rem;
	}

	.ambient-bg {
		position: fixed;
		inset: 0;
		background:
			radial-gradient(ellipse 80% 50% at 20% 0%, var(--amber-light) 0%, transparent 50%),
			radial-gradient(ellipse 60% 40% at 90% 90%, oklch(from var(--amber) l c h / 0.3) 0%, transparent 50%);
		pointer-events: none;
	}

	.login-container {
		position: relative;
		z-index: 1;
		width: 100%;
		max-width: 420px;
	}

	/* ============================================================================
	   BRAND
	   ============================================================================ */
	.brand {
		text-align: center;
		margin-bottom: 2rem;
	}

	.brand h1 {
		font-family: var(--font-display);
		font-size: 2.5rem;
		font-weight: 600;
		margin: 0;
		color: var(--color-accent);
	}

	.tagline {
		font-size: 1rem;
		color: var(--color-text-muted);
		margin: 0.5rem 0 0;
	}

	/* ============================================================================
	   AUTH CARD
	   ============================================================================ */
	.auth-card {
		background: var(--color-surface-elevated);
		border-radius: 20px;
		padding: 2.5rem;
		box-shadow: var(--shadow-lg);
	}

	.card-header {
		text-align: center;
		margin-bottom: 2rem;
	}

	.card-header h2 {
		font-family: var(--font-display);
		font-size: 1.5rem;
		font-weight: 500;
		margin: 0 0 0.5rem;
	}

	.card-header p {
		color: var(--color-text-muted);
		margin: 0;
	}

	.error-message {
		background: oklch(from var(--destructive) l c h / 0.1);
		border: 1px solid oklch(from var(--destructive) l c h / 0.3);
		color: var(--destructive);
		padding: 0.75rem 1rem;
		border-radius: 8px;
		margin-bottom: 1.5rem;
		font-size: 0.875rem;
	}

	/* ============================================================================
	   FORM
	   ============================================================================ */
	.form-field {
		margin-bottom: 1.25rem;
	}

	.form-field label {
		display: block;
		font-size: 0.875rem;
		font-weight: 500;
		margin-bottom: 0.5rem;
		color: var(--color-text);
	}

	.form-field input {
		width: 100%;
		padding: 0.75rem 1rem;
		border: 1px solid var(--border);
		border-radius: 10px;
		font-family: var(--font-body);
		font-size: 1rem;
		color: var(--foreground);
		background: var(--background);
		transition: border-color 0.2s, box-shadow 0.2s;
	}

	.form-field input::placeholder {
		color: var(--color-text-muted);
	}

	.form-field input:focus {
		outline: none;
		border-color: var(--color-accent);
		box-shadow: 0 0 0 3px var(--color-accent-soft);
	}

	.submit-btn {
		width: 100%;
		padding: 0.875rem;
		border: none;
		border-radius: 10px;
		background: var(--color-accent);
		color: white;
		font-family: var(--font-body);
		font-size: 1rem;
		font-weight: 500;
		cursor: pointer;
		transition: all 0.2s;
		margin-top: 0.5rem;
	}

	.submit-btn:hover {
		background: var(--sienna-light);
		transform: translateY(-1px);
	}

	.submit-btn:active {
		transform: translateY(0);
	}

	/* ============================================================================
	   FOOTER
	   ============================================================================ */
	.card-footer {
		text-align: center;
		margin-top: 1.5rem;
		padding-top: 1.5rem;
		border-top: 1px solid var(--border);
	}

	.card-footer p {
		margin: 0;
		color: var(--color-text-muted);
		font-size: 0.875rem;
	}

	.toggle-btn {
		background: none;
		border: none;
		color: var(--color-accent);
		font-family: var(--font-body);
		font-size: 0.875rem;
		font-weight: 500;
		cursor: pointer;
		text-decoration: underline;
		text-underline-offset: 2px;
	}

	.toggle-btn:hover {
		color: var(--sienna-light);
	}

	/* ============================================================================
	   VALUE PROPS
	   ============================================================================ */
	.value-props {
		margin-top: 2rem;
		display: flex;
		flex-direction: column;
		gap: 0.75rem;
	}

	.prop {
		display: flex;
		align-items: center;
		gap: 0.75rem;
		font-size: 0.875rem;
		color: var(--color-text-muted);
	}

	.prop svg {
		color: var(--color-accent);
		flex-shrink: 0;
	}

	/* ============================================================================
	   RESPONSIVE
	   ============================================================================ */
	@media (max-width: 480px) {
		.login-page {
			padding: 1rem;
			align-items: flex-start;
			padding-top: 3rem;
		}

		.auth-card {
			padding: 1.5rem;
		}

		.brand h1 {
			font-size: 2rem;
		}
	}
</style>
