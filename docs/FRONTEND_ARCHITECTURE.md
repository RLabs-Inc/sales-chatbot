# SalesBot Frontend Architecture

## Overview

This document captures the complete frontend architecture plan for SalesBot, including technology stack decisions, component patterns, and integration strategies. Created after comprehensive research of Svelte 5, SvelteKit, shadcn-svelte, Tailwind CSS 4, and our custom fsDB reactive database.

---

## Technology Stack

| Layer | Technology | Version | Purpose |
|-------|------------|---------|---------|
| Framework | SvelteKit | 2.49+ | Full-stack framework |
| UI Library | Svelte 5 | 5.45+ | Reactive components with runes |
| Components | shadcn-svelte | Latest | Pre-built accessible components |
| Styling | Tailwind CSS | 4.x | CSS-first utility framework |
| Database (App) | SQLite + Drizzle | - | Users, chatbots, channels |
| Database (Chatbot) | fsDB | 1.0.1 | Per-chatbot isolated storage |
| AI Providers | Vercel AI SDK | 6.x | Flexible provider switching |

---

## Svelte 5 Runes Reference

### Core Runes

```svelte
<script>
  // Reactive state
  let count = $state(0);

  // Computed values (auto-recalculates)
  let doubled = $derived(count * 2);

  // Complex derived with body
  let summary = $derived.by(() => {
    // Multi-line computation
    return `Count is ${count}, doubled is ${doubled}`;
  });

  // Side effects (DOM, API calls)
  $effect(() => {
    console.log('Count changed:', count);
    // Return cleanup function
    return () => cleanup();
  });

  // Component props
  let { name, value = 'default' } = $props();

  // Two-way bindable props
  let { selected = $bindable() } = $props();
</script>
```

### Key Patterns

1. **Use `$derived` for computed values** - NOT `$effect`
2. **Use `$effect` only for side effects** - DOM manipulation, API calls, analytics
3. **Snippets replace slots** - Use `{#snippet}` and `{@render}`
4. **Deep reactivity** - Objects/arrays in `$state` are deeply reactive proxies

---

## fsDB Integration with Svelte 5

### The Father State Pattern

fsDB uses parallel arrays indexed by registry for O(1) access:
- Each field is a `WritableSignal<unknown[]>`
- Registry maps ID → index with `ReactiveMap`
- Changes trigger fine-grained signal updates

### NO Double-Wrapping Required

fsDB already uses `@rlabs-inc/signals` for reactivity. Connect directly:

```svelte
<script>
  import { getChatbotDatabase } from '$lib/server/chatbot/database';
  import { query } from '@rlabs-inc/fsdb';
  import { effect } from '@rlabs-inc/signals';

  let { chatbotId } = $props();

  // fsDB collection (already reactive)
  const db = await getChatbotDatabase(chatbotId);

  // Reactive query (returns DerivedSignal)
  const activeConversations = query(
    db.conversations,
    r => r.status === 'active'
  );

  // Bridge to Svelte's reactivity
  let count = $derived(activeConversations.value.count);
  let records = $derived(activeConversations.value.records);
</script>

<p>Active conversations: {count}</p>
{#each records as conv}
  <ConversationCard {conv} />
{/each}
```

### fsDB Reactive Queries Available

```typescript
import { query, querySorted, queryCount, queryFirst, queryGroupBy } from '@rlabs-inc/fsdb';

// Filter query (auto-updates)
const active = query(collection, r => r.active);

// Sorted query
const topScores = querySorted(collection, r => r.score > 0, 'score', true);

// Count only (lighter)
const count = queryCount(collection, r => r.active);

// First match
const admin = queryFirst(collection, r => r.role === 'admin');

// Group by field
const byStatus = queryGroupBy(collection, 'status');
```

### File Change Monitoring

```typescript
// Start watching for external file changes
collection.startWatching();

// Subscribe to changes
const unsubscribe = collection.onFileChange((event) => {
  if (event.type === 'create') { /* new record */ }
  if (event.type === 'update') { /* updated record */ }
  if (event.type === 'delete') { /* deleted record */ }
  if (event.stale) { /* embedding needs refresh */ }
});

// Cleanup
onDestroy(() => {
  unsubscribe();
  collection.stopWatching();
});
```

---

## Tailwind CSS 4 Configuration

### Zero-Config Setup

```css
/* src/app.css */
@import 'tailwindcss';

@theme {
  /* Custom design tokens */
  --color-brand: oklch(0.7 0.15 250);
  --color-brand-foreground: oklch(1 0 0);
  --spacing-dashboard: 1.5rem;
}
```

### Key v4 Features

1. **CSS Variables Everywhere**: `var(--color-red-500)`
2. **Container Queries**: `@sm:flex @md:grid` (responds to container, not viewport)
3. **No tailwind.config.js needed**: Define everything in CSS
4. **OKLCH Color Space**: Perceptually uniform colors
5. **5x Faster Builds**: New engine

### Theming (shadcn-svelte)

```css
:root {
  --background: oklch(1 0 0);
  --foreground: oklch(0.145 0 0);
  --primary: oklch(0.205 0 0);
  --primary-foreground: oklch(0.985 0 0);
  --secondary: oklch(0.97 0 0);
  --muted: oklch(0.97 0 0);
  --accent: oklch(0.97 0 0);
  --destructive: oklch(0.577 0.245 27.325);
  --border: oklch(0.922 0 0);
  --ring: oklch(0.708 0 0);

  /* Sidebar specific */
  --sidebar: oklch(0.985 0 0);
  --sidebar-primary: oklch(0.205 0 0);
}

.dark {
  /* Dark mode overrides */
}
```

---

## SvelteKit Routing Structure

### Protected Dashboard Routes

```
src/routes/
├── (auth)/                    # Public auth routes
│   ├── login/
│   │   ├── +page.svelte
│   │   └── +page.server.ts    # login action
│   ├── register/
│   │   └── +page.server.ts    # register action
│   └── +layout.svelte         # Minimal layout
│
├── (app)/                     # Protected routes
│   ├── +layout.server.ts      # AUTH GUARD (all children protected)
│   ├── +layout.svelte         # Dashboard shell with sidebar
│   │
│   ├── dashboard/
│   │   ├── +page.svelte       # Overview
│   │   └── +page.server.ts    # Load stats
│   │
│   ├── chatbots/
│   │   ├── +page.svelte       # List chatbots
│   │   ├── +page.server.ts    # Load + create action
│   │   ├── new/
│   │   │   └── +page.svelte   # Create form
│   │   └── [id]/
│   │       ├── +page.svelte   # Chatbot detail
│   │       ├── +page.server.ts
│   │       ├── documents/
│   │       │   └── +page.svelte
│   │       ├── methodology/
│   │       │   └── +page.svelte
│   │       ├── test/
│   │       │   └── +page.svelte  # Chat testing
│   │       └── analytics/
│   │           └── +page.svelte
│   │
│   └── settings/
│       └── +page.svelte
│
├── api/                       # API endpoints
│   ├── chatbots/
│   │   ├── +server.ts         # GET list, POST create
│   │   └── [id]/
│   │       ├── +server.ts     # GET, PUT, DELETE
│   │       ├── documents/
│   │       │   └── +server.ts
│   │       ├── chat/
│   │       │   └── +server.ts # Streaming chat
│   │       ├── config/
│   │       │   └── +server.ts
│   │       └── stats/
│   │           └── +server.ts
│   └── widget/
│       └── [channelId]/
│           └── chat/
│               └── +server.ts  # Public chat endpoint
│
└── widget/
    └── [channelId]/
        └── +page.svelte        # Embeddable widget
```

### Auth Guard Pattern

```typescript
// src/routes/(app)/+layout.server.ts
import { error } from '@sveltejs/kit';
import type { LayoutServerLoad } from './$types';

export const load: LayoutServerLoad = async ({ locals }) => {
  if (!locals.user) {
    error(401, 'Please log in to continue');
  }

  return {
    user: locals.user
  };
};
```

### Server Load Pattern

```typescript
// src/routes/(app)/chatbots/+page.server.ts
import { db } from '$lib/server/db';
import { chatbot } from '$lib/server/db/schema';
import { eq } from 'drizzle-orm';
import type { PageServerLoad, Actions } from './$types';

export const load: PageServerLoad = async ({ locals }) => {
  const chatbots = await db.select()
    .from(chatbot)
    .where(eq(chatbot.userId, locals.user.id));

  return { chatbots };
};

export const actions: Actions = {
  create: async ({ request, locals }) => {
    const formData = await request.formData();
    // Create chatbot...
    return { success: true };
  }
};
```

### API Route Pattern

```typescript
// src/routes/api/chatbots/+server.ts
import { json, error } from '@sveltejs/kit';
import type { RequestHandler } from './$types';

export const GET: RequestHandler = async ({ locals }) => {
  if (!locals.user) error(401, 'Unauthorized');

  const chatbots = await getChatbots(locals.user.id);
  return json(chatbots);
};

export const POST: RequestHandler = async ({ request, locals }) => {
  if (!locals.user) error(401, 'Unauthorized');

  const data = await request.json();
  const chatbot = await createChatbot(locals.user.id, data);
  return json(chatbot, { status: 201 });
};
```

---

## shadcn-svelte Components

### Available from shadcn-svelte-extras

| Component | Purpose | Key Features |
|-----------|---------|--------------|
| **Chat** | Chat interface | Auto-scroll, typing indicator, avatars |
| **Sidebar** | Navigation | Collapsible, mobile drawer, keyboard shortcut |
| **Card** | Content container | Header, content, footer, actions |
| **Drawer** | Mobile panels | Drag-to-dismiss, snap points |
| **Tabs** | Content organization | Keyboard navigation |
| **Progress** | Upload/processing | Animated indicator |
| **Skeleton** | Loading states | Pulse animation |
| **Input** | Form inputs | File upload support |
| **NumberField** | Numeric inputs | Hold-to-repeat |
| **ConfirmDeleteDialog** | Destructive actions | Text confirmation |

### Chat Components Usage

```svelte
<script>
  import * as Chat from '$lib/components/ui/chat';
</script>

<Chat.List bind:ref={chatListRef} class="h-96">
  {#each messages as msg}
    <Chat.Bubble variant={msg.role === 'user' ? 'sent' : 'received'}>
      <Chat.BubbleAvatar>
        <Chat.BubbleAvatarFallback>
          {msg.role === 'user' ? 'U' : 'B'}
        </Chat.BubbleAvatarFallback>
      </Chat.BubbleAvatar>
      <Chat.BubbleMessage typing={msg.isLoading}>
        {msg.content}
      </Chat.BubbleMessage>
    </Chat.Bubble>
  {/each}
</Chat.List>
```

### Sidebar Usage

```svelte
<script>
  import * as Sidebar from '$lib/components/ui/sidebar';
  import { page } from '$app/stores';
</script>

<Sidebar.Provider>
  <Sidebar.Root side="left" collapsible="offcanvas">
    <Sidebar.Header>
      <Logo />
    </Sidebar.Header>

    <Sidebar.Content>
      <Sidebar.Menu>
        <Sidebar.MenuItem>
          <Sidebar.MenuButton
            isActive={$page.route.id === '/dashboard'}
            tooltipContent="Dashboard"
          >
            <DashboardIcon />
            <span>Dashboard</span>
          </Sidebar.MenuButton>
        </Sidebar.MenuItem>

        <Sidebar.MenuItem>
          <Sidebar.MenuButton>
            <ChatbotIcon />
            <span>Chatbots</span>
            <Sidebar.MenuBadge>{chatbotCount}</Sidebar.MenuBadge>
          </Sidebar.MenuButton>
        </Sidebar.MenuItem>
      </Sidebar.Menu>
    </Sidebar.Content>

    <Sidebar.Footer>
      <UserMenu />
    </Sidebar.Footer>
  </Sidebar.Root>

  <Sidebar.Inset>
    <slot />
  </Sidebar.Inset>
</Sidebar.Provider>
```

### Form Field Component (New Pattern)

```svelte
<script>
  import * as Field from '$lib/components/ui/field';
  import { Input } from '$lib/components/ui/input';
  import { Switch } from '$lib/components/ui/switch';
</script>

<Field.Set>
  <Field.Legend>Chatbot Configuration</Field.Legend>
  <Field.Group>
    <Field.Field>
      <Field.Label for="name">Chatbot Name</Field.Label>
      <Input id="name" bind:value={name} />
      <Field.Description>A friendly name for your chatbot</Field.Description>
    </Field.Field>

    <Field.Field orientation="horizontal">
      <Field.Label for="active">Active</Field.Label>
      <Switch id="active" bind:checked={isActive} />
    </Field.Field>

    <Field.Separator />

    <Field.Field>
      <Field.Label for="welcome">Welcome Message</Field.Label>
      <Textarea id="welcome" bind:value={welcomeMessage} />
    </Field.Field>
  </Field.Group>
</Field.Set>
```

### Dialog Pattern

```svelte
<script>
  import * as Dialog from '$lib/components/ui/dialog';
  import { Button } from '$lib/components/ui/button';
</script>

<Dialog.Root bind:open={showDialog}>
  <Dialog.Trigger>
    <Button>Create Chatbot</Button>
  </Dialog.Trigger>

  <Dialog.Content>
    <Dialog.Header>
      <Dialog.Title>Create New Chatbot</Dialog.Title>
      <Dialog.Description>
        Set up a new specialist chatbot for your product or service.
      </Dialog.Description>
    </Dialog.Header>

    <form onsubmit={handleCreate}>
      <!-- Form fields -->
    </form>

    <Dialog.Footer>
      <Dialog.Close>Cancel</Dialog.Close>
      <Button type="submit">Create</Button>
    </Dialog.Footer>
  </Dialog.Content>
</Dialog.Root>
```

---

## Component Architecture

### Directory Structure

```
src/lib/components/
├── ui/                        # shadcn-svelte base components
│   ├── button/
│   ├── card/
│   ├── chat/
│   ├── dialog/
│   ├── drawer/
│   ├── field/
│   ├── input/
│   ├── progress/
│   ├── sidebar/
│   ├── skeleton/
│   ├── table/
│   └── tabs/
│
├── chatbot/                   # Chatbot-specific components
│   ├── ChatbotCard.svelte
│   ├── ChatbotStatus.svelte
│   ├── ChatbotMetrics.svelte
│   ├── ChatbotForm.svelte
│   └── ChatbotList.svelte
│
├── documents/                 # Document management
│   ├── DocumentUploader.svelte
│   ├── DocumentList.svelte
│   ├── DocumentCard.svelte
│   └── ProcessingStatus.svelte
│
├── chat/                      # Chat interface
│   ├── ChatWindow.svelte
│   ├── ChatInput.svelte
│   ├── MessageList.svelte
│   └── TypingIndicator.svelte
│
├── methodology/               # Sales methodology
│   ├── MethodologyForm.svelte
│   ├── PhaseEditor.svelte
│   └── ObjectionBuilder.svelte
│
├── analytics/                 # Stats and charts
│   ├── StatsCard.svelte
│   ├── ConversionChart.svelte
│   └── ConversationList.svelte
│
└── layout/                    # Layout components
    ├── DashboardShell.svelte
    ├── PageHeader.svelte
    └── EmptyState.svelte
```

### Component Composition Pattern

```svelte
<!-- ChatbotCard.svelte -->
<script>
  import * as Card from '$lib/components/ui/card';
  import { Badge } from '$lib/components/ui/badge';
  import { Button } from '$lib/components/ui/button';
  import ChatbotStatus from './ChatbotStatus.svelte';
  import ChatbotMetrics from './ChatbotMetrics.svelte';

  let { chatbot, onEdit, onDelete } = $props();
</script>

<Card.Root>
  <Card.Header>
    <div class="flex items-center justify-between">
      <Card.Title>{chatbot.name}</Card.Title>
      <ChatbotStatus status={chatbot.status} />
    </div>
    <Card.Description>{chatbot.productName}</Card.Description>
  </Card.Header>

  <Card.Content>
    <ChatbotMetrics {chatbot} />
  </Card.Content>

  <Card.Footer>
    <Button variant="outline" onclick={() => onEdit(chatbot)}>
      Edit
    </Button>
    <Button variant="ghost" onclick={() => onDelete(chatbot)}>
      Delete
    </Button>
  </Card.Footer>
</Card.Root>
```

---

## API Routes Reference

### Chatbot CRUD

| Method | Endpoint | Purpose |
|--------|----------|---------|
| GET | `/api/chatbots` | List user's chatbots |
| POST | `/api/chatbots` | Create chatbot |
| GET | `/api/chatbots/[id]` | Get chatbot details |
| PUT | `/api/chatbots/[id]` | Update chatbot |
| DELETE | `/api/chatbots/[id]` | Delete chatbot |

### Documents

| Method | Endpoint | Purpose |
|--------|----------|---------|
| GET | `/api/chatbots/[id]/documents` | List documents |
| POST | `/api/chatbots/[id]/documents` | Upload document |
| DELETE | `/api/chatbots/[id]/documents/[docId]` | Delete document |

### Chat

| Method | Endpoint | Purpose |
|--------|----------|---------|
| POST | `/api/chatbots/[id]/chat` | Send message (streaming) |
| POST | `/api/chatbots/[id]/chat/start` | Start conversation |
| POST | `/api/chatbots/[id]/chat/end` | End conversation |

### Configuration

| Method | Endpoint | Purpose |
|--------|----------|---------|
| GET | `/api/chatbots/[id]/config` | Get config |
| PUT | `/api/chatbots/[id]/config` | Update config |

### Analytics

| Method | Endpoint | Purpose |
|--------|----------|---------|
| GET | `/api/chatbots/[id]/stats` | Get statistics |
| GET | `/api/chatbots/[id]/conversations` | List conversations |

### Public Widget

| Method | Endpoint | Purpose |
|--------|----------|---------|
| GET | `/api/widget/[channelId]` | Get widget config |
| POST | `/api/widget/[channelId]/chat` | Public chat endpoint |

---

## Streaming Chat Implementation

```typescript
// src/routes/api/chatbots/[id]/chat/+server.ts
import { chatStream, startConversation } from '$lib/server/chatbot';
import type { RequestHandler } from './$types';

export const POST: RequestHandler = async ({ request, params, locals }) => {
  const { message, conversationId } = await request.json();

  // Get or create conversation context
  let context;
  if (conversationId) {
    context = await getConversationContext(conversationId);
  } else {
    context = await startConversation(chatbot, channelId, 'api');
  }

  // Stream response
  const { stream, updatedContext } = await chatStream(context, message);

  // Return streaming response
  return new Response(
    new ReadableStream({
      async start(controller) {
        for await (const chunk of stream) {
          controller.enqueue(new TextEncoder().encode(chunk));
        }
        controller.close();
      }
    }),
    {
      headers: {
        'Content-Type': 'text/event-stream',
        'Cache-Control': 'no-cache',
        'Connection': 'keep-alive'
      }
    }
  );
};
```

---

## Design Philosophy

### For Our Users

Target users are **autonomous workers** in Brazil:
- Consórcio sellers (like Rodrigo's brother-in-law, a musician)
- Plumbers, gardeners, pool cleaners
- People who lose tomorrow's work while doing today's

### UI Principles

1. **Warm Professional** - Approachable but trustworthy
2. **Mobile-First** - These workers are on phones between jobs
3. **Clear, Not Overwhelming** - Functional first, beautiful second
4. **Help, Not Product** - Recognition of underestimated sales experts

### Visual Direction

- **Tone**: Warm professional
- **Key Insight**: Working people, often on mobile, between jobs
- **Differentiation**: Feels like a helpful colleague, not enterprise software
- **Colors**: Warm palette, Brazilian aesthetic sensibility

---

## Implementation Order

1. **API Routes** - Expose backend functionality
2. **Dashboard Layout** - Sidebar + shell
3. **Chatbot Management** - CRUD with cards
4. **Document Upload** - Drag-drop with progress
5. **Chat Testing** - Real-time testing interface
6. **Analytics** - Stats and conversation logs
7. **Embeddable Widget** - JavaScript for customer websites

---

## Key Integration Points

### Backend Already Built

- `getChatbotDatabase()` - Isolated fsDB per chatbot
- `processDocument()` - Document → Knowledge Capsules
- `chat()` / `chatStream()` - Conversation engine
- `retrieveCapsules()` - 10-dimensional scoring
- `embed()` - Local embeddings (<5ms)
- `startConversation()` / `endConversation()` - Session management

### fsDB Collections per Chatbot

```
.data/chatbots/[chatbotId]/
├── knowledge/        # Knowledge capsules
├── methodology/      # Sales techniques
├── conversations/    # Chat sessions
└── messages/         # Individual messages
```

### SQLite Tables (App-Level)

- `user` - User accounts
- `session` - Auth sessions
- `chatbot` - Chatbot metadata
- `channel` - Deployment channels

---

## Commands

```bash
bun install           # Install dependencies
bun run dev          # Start dev server
bun run build        # Production build
bun run check        # TypeScript check
bun run db:push      # Create SQLite tables
bun run db:studio    # Drizzle Studio
```

## Environment Variables

```env
ANTHROPIC_API_KEY=   # For document curation (Opus 4.5)
OPENAI_API_KEY=      # Optional - if users want OpenAI
DATABASE_URL=        # SQLite path (default: local.db)
```
