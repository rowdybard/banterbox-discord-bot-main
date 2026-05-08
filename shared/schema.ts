import { sql } from "drizzle-orm";
import { pgTable, text, varchar, timestamp, boolean, integer, index } from "drizzle-orm/pg-core";
import { createInsertSchema } from "drizzle-zod";
import { z } from "zod";

// Per-guild bot configuration
export const guildSettings = pgTable("guild_settings", {
  guildId: varchar("guild_id").primaryKey(),
  mode: text("mode").default("auto"), // 'auto' = wake word listening | 'manual' = /banter say only
  personality: varchar("personality").default("default"),
  voiceProvider: varchar("voice_provider").default("elevenlabs"), // 'elevenlabs' | 'openai'
  voiceId: varchar("voice_id"), // ElevenLabs voice ID override
  cooldownSeconds: integer("cooldown_seconds").default(30),
  wakeWord: varchar("wake_word").default("hey banter"),
  maxDailyBanters: integer("max_daily_banters").default(100),
  optedOut: boolean("opted_out").default(false),
  updatedAt: timestamp("updated_at").defaultNow(),
});

// Banter history log
export const banterHistory = pgTable(
  "banter_history",
  {
    id: varchar("id").primaryKey().default(sql`gen_random_uuid()`),
    guildId: varchar("guild_id").notNull(),
    userId: varchar("user_id").notNull(),
    prompt: text("prompt").notNull(),
    response: text("response").notNull(),
    ttsProvider: varchar("tts_provider").notNull(), // 'elevenlabs' | 'openai'
    createdAt: timestamp("created_at").defaultNow(),
  },
  (table) => [index("idx_banter_history_guild").on(table.guildId)],
);

// Daily usage counters (for per-guild rate limiting)
export const usageCounters = pgTable(
  "usage_counters",
  {
    id: varchar("id").primaryKey().default(sql`gen_random_uuid()`),
    guildId: varchar("guild_id").notNull(),
    userId: varchar("user_id"), // nullable — null = guild-level counter
    date: varchar("date").notNull(), // YYYY-MM-DD
    count: integer("count").default(0),
  },
  (table) => [index("idx_usage_counters_guild_date").on(table.guildId, table.date)],
);

// Short-lived context memory for AI prompt enrichment
export const contextMemory = pgTable(
  "context_memory",
  {
    id: varchar("id").primaryKey().default(sql`gen_random_uuid()`),
    guildId: varchar("guild_id").notNull(),
    summary: text("summary").notNull(), // Human-readable summary injected into AI prompt
    expiresAt: timestamp("expires_at").notNull(),
    createdAt: timestamp("created_at").defaultNow(),
  },
  (table) => [index("idx_context_memory_guild").on(table.guildId)],
);

// Insert schemas
export const insertGuildSettingsSchema = createInsertSchema(guildSettings);

export const insertBanterHistorySchema = createInsertSchema(banterHistory).omit({
  id: true,
  createdAt: true,
});

export const insertUsageCounterSchema = createInsertSchema(usageCounters).omit({
  id: true,
});

export const insertContextMemorySchema = createInsertSchema(contextMemory).omit({
  id: true,
  createdAt: true,
});

// Types
export type GuildSettings = typeof guildSettings.$inferSelect;
export type InsertGuildSettings = z.infer<typeof insertGuildSettingsSchema>;

export type BanterHistory = typeof banterHistory.$inferSelect;
export type InsertBanterHistory = z.infer<typeof insertBanterHistorySchema>;

export type UsageCounter = typeof usageCounters.$inferSelect;
export type InsertUsageCounter = z.infer<typeof insertUsageCounterSchema>;

export type ContextMemory = typeof contextMemory.$inferSelect;
export type InsertContextMemory = z.infer<typeof insertContextMemorySchema>;
