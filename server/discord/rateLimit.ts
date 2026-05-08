interface CooldownEntry {
  expiresAt: number;
}

// Per-guild cooldown: key = guildId
const guildCooldowns = new Map<string, CooldownEntry>();
// Per-user cooldown: key = `${guildId}:${userId}`
const userCooldowns = new Map<string, CooldownEntry>();

export interface CooldownResult {
  allowed: boolean;
  remainingMs: number;
}

/**
 * Checks whether a response is allowed given per-guild and per-user cooldowns.
 * Does NOT set the cooldown — call `setCooldown` after a successful response.
 */
export function checkCooldown(
  guildId: string,
  userId: string,
  cooldownSeconds: number,
): CooldownResult {
  const now = Date.now();

  const guildEntry = guildCooldowns.get(guildId);
  if (guildEntry && now < guildEntry.expiresAt) {
    return { allowed: false, remainingMs: guildEntry.expiresAt - now };
  }

  const userKey = `${guildId}:${userId}`;
  const userEntry = userCooldowns.get(userKey);
  if (userEntry && now < userEntry.expiresAt) {
    return { allowed: false, remainingMs: userEntry.expiresAt - now };
  }

  return { allowed: true, remainingMs: 0 };
}

/**
 * Sets both per-guild and per-user cooldowns after a successful response.
 */
export function setCooldown(
  guildId: string,
  userId: string,
  cooldownSeconds: number,
): void {
  const expiresAt = Date.now() + cooldownSeconds * 1000;
  guildCooldowns.set(guildId, { expiresAt });
  userCooldowns.set(`${guildId}:${userId}`, { expiresAt });
}

/**
 * Clears all cooldowns for a guild (e.g. on bot leave or admin reset).
 */
export function clearCooldowns(guildId: string): void {
  guildCooldowns.delete(guildId);
  Array.from(userCooldowns.keys()).forEach((key) => {
    if (key.startsWith(`${guildId}:`)) userCooldowns.delete(key);
  });
}

/** Purge expired entries to prevent unbounded memory growth. */
export function purgeExpiredCooldowns(): void {
  const now = Date.now();
  Array.from(guildCooldowns.entries()).forEach(([k, v]) => {
    if (now >= v.expiresAt) guildCooldowns.delete(k);
  });
  Array.from(userCooldowns.entries()).forEach(([k, v]) => {
    if (now >= v.expiresAt) userCooldowns.delete(k);
  });
}

// Sweep every 5 minutes
setInterval(purgeExpiredCooldowns, 5 * 60 * 1000).unref();
