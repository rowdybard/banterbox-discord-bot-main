import OpenAI from "openai";
import { logger } from "../logger";

let _client: OpenAI | null = null;
function getClient(): OpenAI {
  if (!_client) _client = new OpenAI({ apiKey: process.env.OPENAI_API_KEY });
  return _client;
}

/**
 * Generates speech from text using OpenAI TTS.
 * Returns an MP3 buffer.
 * Fallback TTS when ElevenLabs is unavailable.
 */
export async function generateOpenAITTS(text: string): Promise<Buffer> {
  const start = Date.now();

  const response = await getClient().audio.speech.create({
    model: "tts-1",
    voice: "alloy",
    input: text,
    response_format: "mp3",
  });

  const arrayBuffer = await response.arrayBuffer();
  const buf = Buffer.from(arrayBuffer);

  logger.info("OpenAI TTS complete", {
    provider: "openai-tts",
    latencyMs: Date.now() - start,
    ttsSizeBytes: buf.length,
  });

  return buf;
}
