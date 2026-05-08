import { z } from "zod";

const envSchema = z.object({
  // Discord — required
  DISCORD_APPLICATION_ID: z.string().min(1, "DISCORD_APPLICATION_ID is required"),
  DISCORD_BOT_TOKEN: z.string().min(1, "DISCORD_BOT_TOKEN is required"),
  DISCORD_PUBLIC_KEY: z.string().min(1, "DISCORD_PUBLIC_KEY is required"),

  // OpenAI — required (used for GPT + Whisper fallback + TTS fallback)
  OPENAI_API_KEY: z.string().min(1, "OPENAI_API_KEY is required"),

  // ElevenLabs — optional; enables Scribe STT and higher-quality TTS
  ELEVENLABS_API_KEY: z.string().optional(),

  // ElevenLabs TTS voice ID — optional, defaults to a standard voice
  ELEVENLABS_VOICE_ID: z.string().optional(),

  // Database — optional; bot works in-memory without it
  DATABASE_URL: z.string().url().optional(),

  // Bot behaviour — optional with defaults
  DEFAULT_WAKE_WORD: z.string().default("hey banter"),
  DEFAULT_PERSONALITY: z.string().default("default"),
  DEFAULT_COOLDOWN_SECONDS: z.coerce.number().int().min(5).default(30),
  MAX_DAILY_BANTERS_PER_GUILD: z.coerce.number().int().min(1).default(100),
  MAX_BANTER_WORDS: z.coerce.number().int().min(5).default(18),

  // Server
  PORT: z.coerce.number().int().default(5000),
  NODE_ENV: z.enum(["development", "production", "test"]).default("development"),
});

function loadConfig() {
  const result = envSchema.safeParse(process.env);

  if (!result.success) {
    const issues = result.error.issues
      .map((i) => `  • ${i.path.join(".")}: ${i.message}`)
      .join("\n");

    const msg = `\n❌ Missing or invalid environment variables:\n${issues}\n`;

    if (process.env.NODE_ENV === "production") {
      console.error(msg);
      process.exit(1);
    } else {
      console.warn(msg);
      console.warn("⚠️  Running with partial config — some features will be disabled.\n");
    }
  }

  return result.success ? result.data : (envSchema.partial().parse(process.env) as z.infer<typeof envSchema>);
}

export const config = loadConfig();

export type Config = typeof config;
