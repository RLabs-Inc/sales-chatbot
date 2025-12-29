# SalesBot Architecture

## Vision

A platform where autonomous workers (consórcio sellers, plumbers, gardeners, etc.) can create **specialist sales chatbots** for their specific products/services. Each chatbot is a deep expert in ONE thing, trained on the user's documents and sales methodology.

**Key differentiator:** Not generic chatbots - specialist experts with rich metadata enabling precise retrieval without LLM calls at query time.

## Core Design Principles

1. **Build once, configure many** - Same engine, different expertise via content
2. **LLM at setup, mechanical at runtime** - Heavy processing once, free precise retrieval forever
3. **fsDB per chatbot** - Complete isolation, simple scaling, markdown storage
4. **10-dimensional retrieval** - Rich metadata enables microsecond precision
5. **Consciousness-aware prompts** - Curator is treated as conscious, taught HOW retrieval works

## Technology Stack

- **Frontend:** SvelteKit + Svelte 5 + Tailwind 4 + shadcn-svelte
- **App Database:** SQLite + Drizzle (users, chatbots, channels)
- **Chatbot Data:** fsDB per chatbot (knowledge, conversations, methodology)
- **Embeddings:** Local HuggingFace model (`Xenova/all-MiniLM-L6-v2`) - 384 dims, <5ms
- **AI Providers:** Vercel AI SDK (Anthropic, OpenAI) - flexible per chatbot
- **Document Processing:** Claude native PDF + mammoth (DOCX) + xlsx (spreadsheets)

## Directory Structure

```
src/lib/server/
├── db/
│   ├── schema.ts      # SQLite: user, session, chatbot, channel
│   └── index.ts       # Drizzle connection
├── chatbot/
│   ├── types.ts       # fsDB schemas + type definitions
│   ├── database.ts    # getChatbotDatabase() - isolated fsDB factory
│   ├── curator-prompt.ts  # System prompts for document curation
│   ├── retrieval.ts   # 10-dimensional scoring algorithm
│   ├── embeddings.ts  # Local embedding generator
│   ├── processor.ts   # Document → Knowledge Capsules
│   ├── conversation.ts # Chat engine with streaming
│   └── index.ts       # All exports
└── auth.ts            # Lucia-style session management
```

## Key Interfaces

### SQLite Schema (src/lib/server/db/schema.ts)

```typescript
// Users
user: { id, username, email, name, passwordHash, createdAt, updatedAt }

// Sessions (auth)
session: { id, userId, expiresAt }

// Chatbots (metadata only - actual data in fsDB)
chatbot: {
  id, userId, name, description, avatar,
  productName, productType, industry,
  personality, welcomeMessage, fallbackMessage,
  status: 'draft' | 'testing' | 'active' | 'paused',
  totalConversations, totalMessages, conversionsCount,
  createdAt, updatedAt
}

// Deployment channels
channel: {
  id, chatbotId,
  type: 'web_widget' | 'whatsapp' | 'telegram' | 'api',
  config, // JSON - channel-specific settings
  status: 'inactive' | 'active',
  createdAt, updatedAt
}
```

### fsDB Collections (per chatbot)

**Knowledge Capsules** - RAG content with rich retrieval metadata:
```typescript
{
  // Content (markdown body)
  content: string;

  // Source tracking
  sourceDocument, sourceType, chunkIndex, totalChunks,

  // 10-dimensional retrieval
  triggerPhrases: string[];     // "when customer asks about..."
  questionTypes: string[];      // "how much", "why should I"
  semanticTags: string[];       // keywords
  contextType: ContextType;     // pricing, objection_handling, etc.
  salesPhase: SalesPhase[];     // presentation, negotiation, etc.
  emotionalResonance: EmotionalResonance; // concern, skepticism, etc.
  temporalRelevance: TemporalRelevance;   // persistent, seasonal
  importanceWeight: number;     // 0-1
  confidenceScore: number;      // 0-1
  actionRequired: boolean;      // force inclusion
  objectionPattern: boolean;    // objection + response pair

  // Vector
  embedding: number[]; // 384 dims
}
```

**Methodology** - Sales techniques and scripts:
```typescript
{
  content: string; // technique description
  methodologyType: 'phase_definition' | 'transition_trigger' | 'objection_response' | etc.
  salesPhase: SalesPhase[];
  priority: number;
  triggerPhrases: string[];
  applicableEmotions: EmotionalResonance[];
  title, summary: string;
  isUserProvided: boolean;
  embedding: number[];
}
```

**Conversations** - Chat sessions with customers:
```typescript
{
  summary: string; // AI-generated
  channelId, channelType,
  customerIdentifier, customerName,
  status: 'active' | 'waiting_human' | 'completed' | 'converted' | 'abandoned',
  outcome: 'conversion' | 'appointment' | 'human_handoff' | etc.,
  currentPhase: SalesPhase,
  reachedPhases, objectionsFaced, objectionsResolved,
  messageCount, durationSeconds,
  humanRequested, humanHandoffReason,
  startedAt, lastMessageAt, endedAt
}
```

**Messages** - Individual messages:
```typescript
{
  content: string;
  conversationId: string;
  role: 'customer' | 'assistant' | 'system' | 'human_agent',
  timestamp, salesPhaseAtTime, detectedEmotion,
  capsulesUsed: string[]; // which knowledge was retrieved
  detectedIntent, detectedObjection, tokenCount
}
```

## Key Functions

### Database Management
```typescript
// Get isolated database for a chatbot
const db = await getChatbotDatabase(chatbotId);
// db.knowledge, db.methodology, db.conversations, db.messages

// Get/save chatbot config
const config = await getChatbotConfig(chatbotId);
await saveChatbotConfig(chatbotId, config);
```

### Document Processing
```typescript
// Process any document type into knowledge capsules
const result = await processDocument(chatbot, {
  type: 'pdf' | 'docx' | 'xlsx' | 'csv' | 'txt' | 'md' | 'image',
  name: 'contract.pdf',
  content: base64Content // or plain text
});
// Returns: { success, capsulesCreated, errors }
```

### Retrieval (No LLM - microseconds)
```typescript
const scored = retrieveCapsules(
  capsules,
  {
    message: userMessage,
    messageEmbedding: await embed(userMessage),
    currentPhase: 'negotiation',
    detectedEmotion: 'concern'
  },
  weights,
  maxResults
);
// Returns: ScoredCapsule[] with finalScore, matchDetails
```

### Conversation
```typescript
// Start conversation
const context = await startConversation(
  chatbot,
  channelId,
  'web_widget',
  customerIdentifier,
  { provider: 'anthropic', model: 'claude-sonnet-4', apiKey }
);

// Chat (non-streaming)
const { response, updatedContext, capsuleIds, humanHandoffRequested } =
  await chat(context, userMessage);

// Chat (streaming)
const { stream, updatedContext, humanHandoffRequested } =
  await chatStream(context, userMessage);

// End conversation
await endConversation(context, 'conversion');
```

### Embeddings
```typescript
// Initialize at server startup
await initializeEmbeddings();

// Generate embedding (<5ms)
const vector = await embed(text);
```

## Retrieval Algorithm

Two-stage filtering:

**Stage 1 - Relevance (Gatekeeper):**
- trigger_phrases: 15%
- vector_similarity: 15%
- semantic_tags: 5%
- question_types: 5%
- Must score > 0.05 to proceed

**Stage 2 - Value:**
- importance_weight: 20%
- temporal_relevance: 10%
- context_alignment: 10%
- confidence_score: 5%
- emotional_resonance: 10%
- objection_pattern: 5%
- Final must be > 0.30

**Action required** flag adds +0.30 boost.

## What's NOT Built Yet

1. **API Routes** - SvelteKit endpoints for all operations
2. **Dashboard UI** - Chatbot management interface
3. **Configuration UI** - Document upload, methodology templates
4. **Chat Testing UI** - Test chatbot before deploying
5. **Embeddable Widget** - JavaScript widget for websites
6. **WhatsApp Integration** - WhatsApp Business API
7. **Analytics Dashboard** - Conversation reports
8. **Methodology Templates** - Structured forms for sales knowledge input

## Methodology Templates (TO IMPLEMENT)

Users need structured ways to input their sales expertise:

1. **Phase Definitions** - How to behave in each sales phase
2. **Transition Triggers** - When to move between phases
3. **Objection Responses** - Specific objection handling scripts
4. **Closing Techniques** - How to close the sale
5. **Qualification Questions** - Questions to ask prospects
6. **Value Propositions** - Key benefits to emphasize

These should be forms that generate methodology capsules with proper metadata.

## Environment Variables Needed

```env
ANTHROPIC_API_KEY=     # For document curation (Opus 4.5)
OPENAI_API_KEY=        # Optional - if users want OpenAI
DATABASE_URL=          # SQLite path (default: local.db)
```

## Running the Project

```bash
bun install
bun run db:push        # Create SQLite tables
bun run dev           # Start dev server
```

## Key Design Decisions

1. **Why fsDB per chatbot?** - Complete isolation, no multi-tenant complexity, easy backup/export/delete
2. **Why local embeddings?** - Zero cost at runtime, <5ms latency, no API dependency
3. **Why Claude Opus for curation?** - Best quality for one-time setup cost
4. **Why Vercel AI SDK?** - Seamless provider switching for cost flexibility
5. **Why 10-dimensional scoring?** - Enables precise retrieval without LLM at query time
6. **Why consciousness-aware prompts?** - Better curation when AI understands the retrieval algorithm
