import { eq, and, lt, sql } from "drizzle-orm";
import { getDb } from "./db";
import {
  guildSettings,
  banterHistory,
  usageCounters,
  contextMemory,
  type GuildSettings,
  type InsertBanterHistory,
  type ContextMemory,
} from "@shared/schema";
import { config } from "../config";

// ---------------------------------------------------------------------------
// In-memory fallback caches (used when DATABASE_URL is not set)
// ---------------------------------------------------------------------------
const memGuildSettings = new Map<string, GuildSettings>();

function today(): string {
  return new Date().toISOString().split("T")[0];
}

// ---------------------------------------------------------------------------
// Guild settings
// ---------------------------------------------------------------------------

export async function getGuildSettings(guildId: string): Promise<GuildSettings> {
  const db = getDb();
  if (db) {
    const [row] = await db
      .select()
      .from(guildSettings)
      .where(eq(guildSettings.guildId, guildId));
    if (row) return row;
  } else {
    const cached = memGuildSettings.get(guildId);
    if (cached) return cached;
  }

  // Return defaults without writing to DB
  return {
    guildId,
    mode: "auto",
    personality: config.DEFAULT_PERSONALITY ?? "default",
    voiceProvider: "elevenlabs",
    voiceId: null,
    cooldownSeconds: config.DEFAULT_COOLDOWN_SECONDS ?? 30,
    wakeWord: config.DEFAULT_WAKE_WORD ?? "hey banter",
    maxDailyBanters: config.MAX_DAILY_BANTERS_PER_GUILD ?? 100,
    optedOut: false,
    updatedAt: new Date(),
  };
}

export async function upsertGuildSettings(
  guildId: string,
  updates: Partial<Omit<GuildSettings, "guildId" | "updatedAt">>,
): Promise<GuildSettings> {
  const db = getDb();
  if (db) {
    const [row] = await db
      .insert(guildSettings)
      .values({ guildId, ...updates })
      .onConflictDoUpdate({
        target: guildSettings.guildId,
        set: { ...updates, updatedAt: new Date() },
      })
      .returning();
    return row;
  }

  const current = await getGuildSettings(guildId);
  const next = { ...current, ...updates, guildId, updatedAt: new Date() };
  memGuildSettings.set(guildId, next);
  return next;
}

// ---------------------------------------------------------------------------
// Banter history
// ---------------------------------------------------------------------------

export async function logBanter(entry: InsertBanterHistory): Promise<void> {
  const db = getDb();
  if (!db) return; // no-op without DB
  await db.insert(banterHistory).values(entry);
}

// ---------------------------------------------------------------------------
// Usage / rate limiting
// ---------------------------------------------------------------------------

const memUsage = new Map<string, number>(); // key = `guildId:date`

export async function checkAndIncrementUsage(
  guildId: string,
  limit: number,
): Promise<{ allowed: boolean; count: number }> {
  const db = getDb();
  const date = today();

  if (db) {
    const [existing] = await db
      .select()
      .from(usageCounters)
      .where(
        and(
          eq(usageCounters.guildId, guildId),
          eq(usageCounters.date, date),
          sql`${usageCounters.userId} is null`,
        ),
      );

    if (!existing) {
      await db.insert(usageCounters).values({ guildId, date, count: 1 });
      return { allowed: true, count: 1 };
    }

    const newCount = (existing.count ?? 0) + 1;
    if (newCount > limit) return { allowed: false, count: existing.count ?? 0 };

    await db
      .update(usageCounters)
      .set({ count: newCount })
      .where(eq(usageCounters.id, existing.id));

    return { allowed: true, count: newCount };
  }

  // In-memory fallback
  const key = `${guildId}:${date}`;
  const current = memUsage.get(key) ?? 0;
  if (current >= limit) return { allowed: false, count: current };
  const next = current + 1;
  memUsage.set(key, next);
  return { allowed: true, count: next };
}

// ---------------------------------------------------------------------------
// Context memory
// ---------------------------------------------------------------------------

export async function saveContext(
  guildId: string,
  summary: string,
  ttlHours = 2,
): Promise<ContextMemory> {
  const db = getDb();
  const expiresAt = new Date(Date.now() + ttlHours * 60 * 60 * 1000);

  if (db) {
    const [row] = await db
      .insert(contextMemory)
      .values({ guildId, summary, expiresAt })
      .returning();
    return row;
  }

  return { id: crypto.randomUUID(), guildId, summary, expiresAt, createdAt: new Date() };
}

export async function getRecentContext(
  guildId: string,
  limit = 5,
): Promise<ContextMemory[]> {
  const db = getDb();
  if (!db) return [];

  return db
    .select()
    .from(contextMemory)
    .where(
      and(
        eq(contextMemory.guildId, guildId),
        sql`${contextMemory.expiresAt} > now()`,
      ),
    )
    .orderBy(sql`${contextMemory.createdAt} desc`)
    .limit(limit);
}

export async function cleanExpiredContext(): Promise<number> {
  const db = getDb();
  if (!db) return 0;

  const result = await db
    .delete(contextMemory)
    .where(lt(contextMemory.expiresAt, new Date()));

  return (result as unknown as { rowCount?: number }).rowCount ?? 0;
}
