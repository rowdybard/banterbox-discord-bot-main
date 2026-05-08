import OpenAI from "openai";
import { logger } from "../logger";

let _client: OpenAI | null = null;
function getClient(): OpenAI {
  if (!_client) _client = new OpenAI({ apiKey: process.env.OPENAI_API_KEY });
  return _client;
}

/**
 * Transcribes an MP3 audio buffer using OpenAI Whisper.
 * Fallback STT when ELEVENLABS_API_KEY is not set.
 */
export async function transcribeWhisper(audioBuffer: Buffer): Promise<string> {
  const client = getClient();

  const file = new File([new Uint8Array(audioBuffer)], "audio.mp3", { type: "audio/mpeg" });

  const result = await client.audio.transcriptions.create({
    file,
    model: "whisper-1",
    language: "en",
    response_format: "text",
  });

  const text = typeof result === "string" ? result : (result as { text: string }).text;

  logger.debug("Whisper transcription complete", {
    provider: "whisper",
    latencyMs: undefined,
  });

  return (text ?? "").trim();
}
