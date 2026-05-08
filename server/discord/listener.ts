import { Readable } from "stream";
import { VoiceConnection, EndBehaviorType } from "@discordjs/voice";
import { transcribe } from "../stt/index";
import { detectWakeWord } from "../stt/wakeWord";
import { checkPromptSafety } from "../banter/safety";
import { generateBanter } from "../banter/generate";
import { generateTTS } from "../tts/index";
import {
  getGuildSettings,
  checkAndIncrementUsage,
  getRecentContext,
  saveContext,
  logBanter,
} from "../storage/repositories";
import { checkCooldown, setCooldown } from "./rateLimit";
import { apiSemaphore } from "../util/semaphore";
import { config } from "../config";
import { logger } from "../logger";
import type { VoiceManager } from "./voice";

// Maximum number of concurrent per-user streams per guild (avoids N+1 ffmpeg processes)
const MAX_CONCURRENT_STREAMS = 3;

interface ConnectionHandler {
  connection: VoiceConnection;
  handler: (userId: string) => void;
}

export class VoiceListener {
  private activeStreams = new Map<string, Set<string>>(); // guildId → Set<userId>
  private connectionHandlers = new Map<string, ConnectionHandler>(); // guildId → handler ref

  startListening(
    connection: VoiceConnection,
    guildId: string,
    voiceManager: VoiceManager,
  ): void {
    // If already listening on this exact connection, skip re-registration
    const existing = this.connectionHandlers.get(guildId);
    if (existing) {
      if (existing.connection === connection) return;
      existing.connection.receiver.speaking.removeListener("start", existing.handler);
    }

    if (!this.activeStreams.has(guildId)) {
      this.activeStreams.set(guildId, new Set());
    }

    const handler = (userId: string) => {
      const streams = this.activeStreams.get(guildId)!;

      // Guards: no self-listen, no concurrent overload, not already processing this user
      if (streams.has(userId)) return;
      if (streams.size >= MAX_CONCURRENT_STREAMS) return;

      streams.add(userId);

      const opusStream = connection.receiver.subscribe(userId, {
        end: { behavior: EndBehaviorType.AfterSilence, duration: 1000 },
      });

      this.processStream(opusStream as any, guildId, userId, voiceManager).finally(() => {
        streams.delete(userId);
      });
    };

    connection.receiver.speaking.on("start", handler);
    this.connectionHandlers.set(guildId, { connection, handler });

    logger.info("Voice listener started", { guildId });
  }

  stopListening(guildId: string): void {
    const existing = this.connectionHandlers.get(guildId);
    if (existing) {
      existing.connection.receiver.speaking.removeListener("start", existing.handler);
      this.connectionHandlers.delete(guildId);
    }
    this.activeStreams.delete(guildId);
    logger.info("Voice listener stopped", { guildId });
  }

  private async processStream(
    opusStream: NodeJS.ReadableStream,
    guildId: string,
    userId: string,
    voiceManager: VoiceManager,
  ): Promise<void> {
    try {
      // Buffer the raw Opus packets — must consume the stream to release the
      // subscription, and buffering lets us gate on duration before paying for STT.
      const chunks: Buffer[] = [];
      for await (const chunk of opusStream) {
        chunks.push(chunk as Buffer);
      }
      const totalBytes = chunks.reduce((n, c) => n + c.length, 0);

      // Guard: don't process if bot is already speaking (avoids self-trigger)
      if (voiceManager.isSpeaking(guildId)) return;

      // Audio duration gate — skip noise spikes (too short) and very long
      // monologues that can't have the wake word near the start anyway.
      // Discord Opus @ 48 kHz: ~1 s of speech ≈ 8–16 KB encoded.
      const MIN_AUDIO_BYTES = 2_000;
      const MAX_AUDIO_BYTES = 200_000; // ~25–40 s
      if (totalBytes < MIN_AUDIO_BYTES || totalBytes > MAX_AUDIO_BYTES) {
        logger.debug("Audio gated — skipping STT", { guildId, userId, bytes: totalBytes });
        return;
      }

      // Reconstruct stream from buffered chunks (preserves original Opus framing)
      const transcript = await transcribe(Readable.from(chunks) as any);
      if (!transcript) return;

      const settings = await getGuildSettings(guildId);
      if (settings.optedOut) return;

      // P1: manual mode — wake-word path is disabled; /banter say still works
      if ((settings.mode ?? "auto") !== "auto") return;

      const wakeWord = settings.wakeWord ?? "hey banter";
      const { triggered, prompt } = detectWakeWord(transcript, wakeWord);

      logger.info("STT transcript", { guildId, userId, transcript, wakeWord, triggered });

      if (!triggered) return;

      logger.info("Wake word triggered", { guildId, userId, command: wakeWord });

      // Cooldown check
      const cooldownSecs = settings.cooldownSeconds ?? 30;
      const cooldown = checkCooldown(guildId, userId, cooldownSecs);
      if (!cooldown.allowed) {
        logger.debug("Cooldown active — skipping", {
          guildId,
          userId,
          latencyMs: cooldown.remainingMs,
        });
        return;
      }

      // Safety check
      if (prompt) {
        const safety = checkPromptSafety(prompt);
        if (!safety.safe) {
          logger.warn("Prompt blocked by safety filter", {
            guildId,
            userId,
            errorMessage: safety.reason,
          });
          return;
        }
      }

      // P3: daily usage limit — check before any expensive API calls
      const limit = settings.maxDailyBanters ?? 100;
      const usage = await checkAndIncrementUsage(guildId, limit);
      if (!usage.allowed) {
        logger.info("Daily banter limit reached — skipping wake-word response", {
          guildId,
          count: usage.count,
          limit,
        });
        return;
      }

      const finalPrompt = prompt || "say something funny";

      // P4: fetch recent context for this guild
      const recentContext = await getRecentContext(guildId, 3);
      const contextLines = recentContext.map((c) => c.summary);

      // Semaphore: cap concurrent GPT + TTS calls across all guilds
      const { text, buffer, provider } = await apiSemaphore.run(async () => {
        const t = await generateBanter(
          finalPrompt,
          settings.personality ?? "default",
          contextLines,
          config.MAX_BANTER_WORDS,
        );
        const tts = await generateTTS(t, settings.voiceId ?? undefined);
        return { text: t, buffer: tts.buffer, provider: tts.provider };
      });

      // Set cooldown before playing (prevents double-trigger)
      setCooldown(guildId, userId, cooldownSecs);

      // Play in voice channel
      await voiceManager.playBuffer(guildId, buffer);

      logger.info("Banter played", { guildId, userId, provider });

      // P4: persist context + history (best-effort)
      const summary = `User ${userId} asked: ${finalPrompt}; BanterBox replied: ${text}`;
      await saveContext(guildId, summary, 2).catch(() => {});
      await logBanter({ guildId, userId, prompt: finalPrompt, response: text, ttsProvider: provider }).catch(() => {});
    } catch (err) {
      logger.error("Voice pipeline error", {
        guildId,
        userId,
        errorClass: err instanceof Error ? err.constructor.name : "Unknown",
        errorMessage: err instanceof Error ? err.message : String(err),
      });
    }
  }
}
