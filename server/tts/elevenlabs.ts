import { logger } from "../logger";

const TTS_ENDPOINT = "https://api.elevenlabs.io/v1/text-to-speech";
const DEFAULT_MODEL = "eleven_turbo_v2";
const DEFAULT_VOICE_ID = "JBFqnCBsd6RMkjVDRZzb"; // ElevenLabs "George" — change via ELEVENLABS_VOICE_ID

/**
 * Generates speech from text using ElevenLabs TTS.
 * Returns an MP3 buffer.
 * Requires ELEVENLABS_API_KEY to be set.
 */
export async function generateElevenLabsTTS(
  text: string,
  voiceId?: string,
): Promise<Buffer> {
  const apiKey = process.env.ELEVENLABS_API_KEY;
  if (!apiKey) throw new Error("ELEVENLABS_API_KEY is not set");

  const voice = voiceId ?? process.env.ELEVENLABS_VOICE_ID ?? DEFAULT_VOICE_ID;
  const start = Date.now();

  const res = await fetch(`${TTS_ENDPOINT}/${voice}`, {
    method: "POST",
    headers: {
      "xi-api-key": apiKey,
      "Content-Type": "application/json",
      Accept: "audio/mpeg",
    },
    body: JSON.stringify({
      text,
      model_id: DEFAULT_MODEL,
      voice_settings: {
        stability: 0.5,
        similarity_boost: 0.75,
        style: 0.0,
        use_speaker_boost: true,
      },
    }),
  });

  if (!res.ok) {
    const errText = await res.text().catch(() => "(no body)");
    logger.error("ElevenLabs TTS error", {
      provider: "elevenlabs-tts",
      errorMessage: `${res.status} ${res.statusText}: ${errText}`,
    });
    throw new Error(`ElevenLabs TTS failed: ${res.status} ${res.statusText}`);
  }

  const arrayBuffer = await res.arrayBuffer();
  const buf = Buffer.from(arrayBuffer);

  logger.info("ElevenLabs TTS complete", {
    provider: "elevenlabs-tts",
    latencyMs: Date.now() - start,
    ttsSizeBytes: buf.length,
  });

  return buf;
}
