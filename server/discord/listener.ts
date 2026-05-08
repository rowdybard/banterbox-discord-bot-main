import { VoiceConnection, EndBehaviorType } from "@discordjs/voice";
import { transcribe } from "../stt/index";
import { detectWakeWord } from "../stt/wakeWord";
import { checkPromptSafety } from "../banter/safety";
import { generateBanter } from "../banter/generate";
import { generateTTS } from "../tts/index";
import { getGuildSettings } from "../storage/repositories";
import { checkCooldown, setCooldown } from "./rateLimit";
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
      // Guard: don't transcribe if bot is already speaking (avoids self-trigger)
      if (voiceManager.isSpeaking(guildId)) return;

      const transcript = await transcribe(opusStream as any);
      if (!transcript) return;

      const settings = await getGuildSettings(guildId);
      if (settings.optedOut) return;

      const wakeWord = settings.wakeWord ?? "hey banter";
      const { triggered, prompt } = detectWakeWord(transcript, wakeWord);

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

      const finalPrompt = prompt || "say something funny";

      // Generate banter text
      const text = await generateBanter(
        finalPrompt,
        settings.personality ?? "default",
        [],
        config.MAX_BANTER_WORDS,
      );

      // Generate TTS audio
      const { buffer, provider } = await generateTTS(text, settings.voiceId ?? undefined);

      // Set cooldown before playing (prevents double-trigger)
      setCooldown(guildId, userId, cooldownSecs);

      // Play in voice channel
      await voiceManager.playBuffer(guildId, buffer);

      logger.info("Banter played", { guildId, userId, provider });
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
