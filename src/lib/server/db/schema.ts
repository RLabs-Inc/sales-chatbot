import { integer, sqliteTable, text } from 'drizzle-orm/sqlite-core';

// ============================================================================
// AUTH & USERS
// ============================================================================

export const user = sqliteTable('user', {
	id: text('id').primaryKey(),
	username: text('username').notNull().unique(),
	email: text('email').notNull().unique(),
	name: text('name').notNull(),
	passwordHash: text('password_hash').notNull(),
	createdAt: integer('created_at', { mode: 'timestamp' }).notNull(),
	updatedAt: integer('updated_at', { mode: 'timestamp' }).notNull()
});

export const session = sqliteTable('session', {
	id: text('id').primaryKey(),
	userId: text('user_id')
		.notNull()
		.references(() => user.id),
	expiresAt: integer('expires_at', { mode: 'timestamp' }).notNull()
});

// ============================================================================
// CHATBOTS (app-level metadata, actual data lives in fsDB per chatbot)
// ============================================================================

export const chatbot = sqliteTable('chatbot', {
	id: text('id').primaryKey(),
	userId: text('user_id')
		.notNull()
		.references(() => user.id),

	// Identity
	name: text('name').notNull(),
	description: text('description'),
	avatar: text('avatar'), // URL or base64

	// Product/Service this chatbot specializes in
	productName: text('product_name').notNull(),
	productType: text('product_type').notNull(), // 'product' | 'service'
	industry: text('industry'), // 'financial' | 'home_services' | 'healthcare' | etc.

	// Personality & behavior
	personality: text('personality'), // JSON string with tone, style, etc.
	welcomeMessage: text('welcome_message'),
	fallbackMessage: text('fallback_message'),

	// Status
	status: text('status').notNull().default('draft'), // 'draft' | 'testing' | 'active' | 'paused'

	// Stats (denormalized for quick access)
	totalConversations: integer('total_conversations').notNull().default(0),
	totalMessages: integer('total_messages').notNull().default(0),
	conversionsCount: integer('conversions_count').notNull().default(0),

	// Timestamps
	createdAt: integer('created_at', { mode: 'timestamp' }).notNull(),
	updatedAt: integer('updated_at', { mode: 'timestamp' }).notNull()
});

// ============================================================================
// CHANNELS (deployment targets for chatbots)
// ============================================================================

export const channel = sqliteTable('channel', {
	id: text('id').primaryKey(),
	chatbotId: text('chatbot_id')
		.notNull()
		.references(() => chatbot.id),

	// Channel type
	type: text('type').notNull(), // 'web_widget' | 'whatsapp' | 'telegram' | 'api'

	// Channel-specific config (JSON)
	config: text('config'), // Widget colors, WhatsApp number, API keys, etc.

	// Status
	status: text('status').notNull().default('inactive'), // 'inactive' | 'active'

	// Timestamps
	createdAt: integer('created_at', { mode: 'timestamp' }).notNull(),
	updatedAt: integer('updated_at', { mode: 'timestamp' }).notNull()
});

// ============================================================================
// TYPES
// ============================================================================

export type Session = typeof session.$inferSelect;
export type User = typeof user.$inferSelect;
export type Chatbot = typeof chatbot.$inferSelect;
export type Channel = typeof channel.$inferSelect;

export type NewUser = typeof user.$inferInsert;
export type NewChatbot = typeof chatbot.$inferInsert;
export type NewChannel = typeof channel.$inferInsert;
