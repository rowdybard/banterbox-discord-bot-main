type LogLevel = "info" | "warn" | "error" | "debug";

interface LogMeta {
  guildId?: string;
  userId?: string;
  command?: string;
  provider?: string;
  latencyMs?: number;
  ttsSizeBytes?: number;
  errorClass?: string;
  errorMessage?: string;
  [key: string]: unknown;
}

function redact(value: string): string {
  if (value.length <= 8) return "[REDACTED]";
  return value.slice(0, 4) + "..." + value.slice(-4);
}

const SENSITIVE_KEYS = new Set([
  "token", "apiKey", "api_key", "accessToken", "refreshToken",
  "password", "secret", "DATABASE_URL",
]);

function sanitiseMeta(meta: LogMeta): Record<string, unknown> {
  const out: Record<string, unknown> = {};
  for (const [k, v] of Object.entries(meta)) {
    if (SENSITIVE_KEYS.has(k) && typeof v === "string") {
      out[k] = redact(v);
    } else {
      out[k] = v;
    }
  }
  return out;
}

function write(level: LogLevel, message: string, meta?: LogMeta): void {
  const entry: Record<string, unknown> = {
    ts: new Date().toISOString(),
    level,
    msg: message,
    ...(meta ? sanitiseMeta(meta) : {}),
  };

  const line = JSON.stringify(entry);

  if (level === "error") {
    console.error(line);
  } else if (level === "warn") {
    console.warn(line);
  } else {
    console.log(line);
  }
}

export const logger = {
  info: (msg: string, meta?: LogMeta) => write("info", msg, meta),
  warn: (msg: string, meta?: LogMeta) => write("warn", msg, meta),
  error: (msg: string, meta?: LogMeta) => write("error", msg, meta),
  debug: (msg: string, meta?: LogMeta) => {
    if (process.env.NODE_ENV !== "production") write("debug", msg, meta);
  },
};
