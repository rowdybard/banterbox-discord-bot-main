import { generateElevenLabsTTS } from "./elevenlabs";
import { generateOpenAITTS } from "./openai";
import { getCached, setCached } from "./cache";
import { logger } from "../logger";

export type TTSProvider = "elevenlabs" | "openai";

/**
 * Generates TTS audio for the given text, returning an MP3 buffer.
 *
 * Provider selection:
 *   1. If ELEVENLABS_API_KEY is set → ElevenLabs (higher quality)
 *   2. Otherwise → OpenAI TTS (fallback)
 *   3. If ElevenLabs fails at runtime → retry with OpenAI TTS
 *
 * Results are cached in-memory for 10 minutes (max 50 entries).
 */
export async function generateTTS(
  text: string,
  voiceId?: string,
): Promise<{ buffer: Buffer; provider: TTSProvider }> {
  const cacheKey = `${voiceId ?? ""}|${text}`;
  const cached = getCached(cacheKey);
  if (cached) {
    return { buffer: cached.buffer, provider: cached.provider as TTSProvider };
  }

  const useElevenLabs = !!process.env.ELEVENLABS_API_KEY;

  try {
    const provider: TTSProvider = useElevenLabs ? "elevenlabs" : "openai";
    const buffer = useElevenLabs
      ? await generateElevenLabsTTS(text, voiceId)
      : await generateOpenAITTS(text);

    setCached(cacheKey, buffer, provider);
    return { buffer, provider };
  } catch (err) {
    if (useElevenLabs) {
      logger.warn("ElevenLabs TTS failed — falling back to OpenAI TTS", {
        errorMessage: err instanceof Error ? err.message : String(err),
      });
      const buffer = await generateOpenAITTS(text);
      setCached(cacheKey, buffer, "openai");
      return { buffer, provider: "openai" };
    }
    throw err;
  }
}

export { cacheStats } from "./cache";
