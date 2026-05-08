import { spawn } from "child_process";
import { Readable } from "stream";
import { createRequire } from "module";
import { logger } from "../logger";

// prism-media is a CJS package. createRequire lets us load it from ESM.
// Requires one of these peer deps for Opus decoding:
//   npm install @discordjs/opus   ← recommended (native, fast)
//   npm install mediaplex         ← alternative
const _require = createRequire(import.meta.url);
const prism = _require("prism-media") as typeof import("prism-media");

/**
 * Decodes a raw Discord Opus audio stream to an MP3 buffer at 16 kHz mono.
 * Pipeline: Discord Opus packets → prism Opus decoder → PCM → ffmpeg → MP3
 *
 * ffmpeg must be available on PATH.
 */
export function decodeAudioStream(opusStream: Readable): Promise<Buffer> {
  return new Promise((resolve, reject) => {
    let settled = false;
    const done = (err?: Error, result?: Buffer) => {
      if (settled) return;
      settled = true;
      err ? reject(err) : resolve(result!);
    };

    // Decode Opus frames → signed 16-bit LE PCM (48 kHz, stereo)
    const opusDecoder = new prism.opus.Decoder({
      rate: 48000,
      channels: 2,
      frameSize: 960,
    });

    // Transcode PCM → MP3 at 16 kHz mono (optimal for Whisper / ElevenLabs Scribe)
    const ffmpeg = spawn(
      "ffmpeg",
      [
        "-f", "s16le",       // input: raw PCM signed 16-bit little-endian
        "-ar", "48000",      // input sample rate
        "-ac", "2",          // input stereo
        "-i", "pipe:0",      // read from stdin
        "-ar", "16000",      // output 16 kHz
        "-ac", "1",          // output mono
        "-f", "mp3",         // output format
        "-loglevel", "error",
        "pipe:1",            // write to stdout
      ],
      { stdio: ["pipe", "pipe", "pipe"] },
    );

    const chunks: Buffer[] = [];

    opusStream.pipe(opusDecoder).pipe(ffmpeg.stdin);

    ffmpeg.stdout.on("data", (chunk: Buffer) => chunks.push(chunk));
    ffmpeg.stdout.on("end", () => done(undefined, Buffer.concat(chunks)));

    ffmpeg.stderr.on("data", (data: Buffer) => {
      logger.debug("ffmpeg stderr", { msg: data.toString().trim() });
    });

    ffmpeg.on("error", (err) => {
      logger.error("ffmpeg spawn error", { errorMessage: err.message });
      done(err);
    });

    ffmpeg.on("close", (code) => {
      if (code !== 0 && !settled) {
        done(new Error(`ffmpeg exited with code ${code}`));
      }
    });

    opusStream.on("error", (err) => { ffmpeg.kill("SIGKILL"); done(err); });
    opusDecoder.on("error", (err) => { ffmpeg.kill("SIGKILL"); done(err); });
  });
}
