import { Readable } from "stream";
import { decodeAudioStream } from "./decode";
import { transcribeElevenLabs } from "./elevenlabs";
import { transcribeWhisper } from "./whisper";
import { logger } from "../logger";

/**
 * Full transcription pipeline: Discord Opus stream → MP3 → text.
 * Uses ElevenLabs Scribe if ELEVENLABS_API_KEY is set, otherwise Whisper.
 */
export async function transcribe(opusStream: Readable): Promise<string> {
  const sttPref = (process.env.STT_PROVIDER ?? "").toLowerCase();
  const provider =
    sttPref === "whisper" || (!sttPref && !process.env.ELEVENLABS_API_KEY)
      ? "whisper"
      : "elevenlabs-stt";
  const start = Date.now();

  let audioBuffer: Buffer;
  try {
    audioBuffer = await decodeAudioStream(opusStream);
  } catch (err) {
    logger.error("Audio decode failed", {
      provider,
      errorClass: err instanceof Error ? err.constructor.name : "Unknown",
      errorMessage: err instanceof Error ? err.message : String(err),
    });
    throw err;
  }

  if (audioBuffer.length < 1000) {
    logger.debug("Audio buffer too short — skipping transcription", {
      provider,
      ttsSizeBytes: audioBuffer.length,
    });
    return "";
  }

  try {
    const text =
      provider === "elevenlabs-stt"
        ? await transcribeElevenLabs(audioBuffer)
        : await transcribeWhisper(audioBuffer);

    logger.info("STT complete", {
      provider,
      latencyMs: Date.now() - start,
    });

    return text;
  } catch (err) {
    // If ElevenLabs fails, fall back to Whisper
    if (provider === "elevenlabs-stt") {
      logger.warn("ElevenLabs STT failed — falling back to Whisper", {
        errorMessage: err instanceof Error ? err.message : String(err),
      });
      return transcribeWhisper(audioBuffer);
    }
    throw err;
  }
}
