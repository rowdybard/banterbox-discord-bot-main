import {
  Client,
  Events,
  GatewayIntentBits,
  ChatInputCommandInteraction,
} from "discord.js";
import { registerCommands } from "./commands";
import { handleInteraction } from "./interactions";
import { VoiceManager } from "./voice";
import { VoiceListener } from "./listener";
import { clearCooldowns } from "./rateLimit";
import { logger } from "../logger";

export const voiceManager = new VoiceManager();
export const voiceListener = new VoiceListener();

let _client: Client | null = null;

export function getClient(): Client | null {
  return _client;
}

export async function startBot(): Promise<Client> {
  const token = process.env.DISCORD_BOT_TOKEN;
  if (!token) {
    throw new Error("DISCORD_BOT_TOKEN is not set — cannot start Discord bot");
  }

  const client = new Client({
    intents: [
      GatewayIntentBits.Guilds,
      GatewayIntentBits.GuildVoiceStates,
      GatewayIntentBits.GuildMessages,
      GatewayIntentBits.MessageContent,
    ],
  });

  client.once(Events.ClientReady, async (ready) => {
    logger.info("Discord bot ready", { command: ready.user.tag });
    await registerCommands().catch((err) =>
      logger.warn("Slash command registration failed", {
        errorMessage: err instanceof Error ? err.message : String(err),
      }),
    );
  });

  client.on(Events.InteractionCreate, async (interaction) => {
    if (!interaction.isChatInputCommand()) return;
    if (interaction.commandName !== "banter") return;

    await handleInteraction(
      interaction as ChatInputCommandInteraction,
      voiceManager,
      voiceListener,
    );
  });

  client.on(Events.GuildDelete, (guild) => {
    voiceManager.leave(guild.id);
    voiceListener.stopListening(guild.id);
    clearCooldowns(guild.id);
    logger.info("Bot removed from guild — cleaned up resources", { guildId: guild.id });
  });

  client.on(Events.VoiceStateUpdate, (oldState, newState) => {
    // If bot was disconnected externally (e.g. kicked from VC), clean up
    if (
      oldState.member?.id === client.user?.id &&
      oldState.channelId &&
      !newState.channelId
    ) {
      voiceListener.stopListening(oldState.guild.id);
      voiceManager.leave(oldState.guild.id);
      logger.info("Bot disconnected from voice externally", {
        guildId: oldState.guild.id,
      });
    }
  });

  client.on(Events.Error, (err) => {
    logger.error("Discord client error", {
      errorClass: err.constructor.name,
      errorMessage: err.message,
    });
  });

  await client.login(token);
  _client = client;
  return client;
}

export async function stopBot(): Promise<void> {
  if (_client) {
    _client.destroy();
    _client = null;
    logger.info("Discord bot stopped");
  }
}
