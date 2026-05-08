import { logger } from "../logger";

const SCRIBE_ENDPOINT = "https://api.elevenlabs.io/v1/speech-to-text";

/**
 * Transcribes an MP3 audio buffer using ElevenLabs Scribe STT.
 * Requires ELEVENLABS_API_KEY to be set.
 */
export async function transcribeElevenLabs(audioBuffer: Buffer): Promise<string> {
  const apiKey = process.env.ELEVENLABS_API_KEY;
  if (!apiKey) throw new Error("ELEVENLABS_API_KEY is not set");

  const form = new FormData();
  form.append(
    "file",
    new Blob([new Uint8Array(audioBuffer)], { type: "audio/mpeg" }),
    "audio.mp3",
  );
  form.append("model_id", "scribe_v1");

  const res = await fetch(SCRIBE_ENDPOINT, {
    method: "POST",
    headers: { "xi-api-key": apiKey },
    body: form,
  });

  if (!res.ok) {
    const text = await res.text().catch(() => "(no body)");
    logger.error("ElevenLabs STT error", {
      provider: "elevenlabs-stt",
      errorMessage: `${res.status} ${res.statusText}: ${text}`,
    });
    throw new Error(`ElevenLabs STT failed: ${res.status} ${res.statusText}`);
  }

  const data = (await res.json()) as { text?: string };
  return (data.text ?? "").trim();
}
