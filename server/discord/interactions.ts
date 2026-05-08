import {
  ChatInputCommandInteraction,
  VoiceChannel,
  ChannelType,
  EmbedBuilder,
  Colors,
} from "discord.js";
import { hasManageGuild, isGuildInteraction } from "./permissions";
import { checkCooldown, setCooldown } from "./rateLimit";
import { checkPromptSafety } from "../banter/safety";
import { generateBanter } from "../banter/generate";
import { generateTTS } from "../tts/index";
import {
  getGuildSettings,
  upsertGuildSettings,
  checkAndIncrementUsage,
  getRecentContext,
  saveContext,
  logBanter,
} from "../storage/repositories";
import { normaliseWakeWord } from "../stt/wakeWord";
import { listPersonalities } from "../banter/prompts";
import { logger } from "../logger";
import type { VoiceManager } from "./voice";
import type { VoiceListener } from "./listener";

export async function handleInteraction(
  interaction: ChatInputCommandInteraction,
  voiceManager: VoiceManager,
  voiceListener: VoiceListener,
): Promise<void> {
  if (!isGuildInteraction(interaction)) {
    await interaction.reply({ content: "This command only works inside a server.", ephemeral: true });
    return;
  }

  const sub = interaction.options.getSubcommand(false);
  const group = interaction.options.getSubcommandGroup(false);
  const guildId = interaction.guildId!;

  try {
    if (group === "config") {
      await handleConfig(interaction, guildId, sub!);
      return;
    }

    switch (sub) {
      case "join":   return await handleJoin(interaction, guildId, voiceManager, voiceListener);
      case "leave":  return await handleLeave(interaction, guildId, voiceManager, voiceListener);
      case "say":    return await handleSay(interaction, guildId, voiceManager);
      case "status": return await handleStatus(interaction, guildId, voiceManager);
      default:
        await interaction.reply({ content: "Unknown subcommand.", ephemeral: true });
    }
  } catch (err) {
    logger.error("Interaction handler error", {
      guildId,
      errorClass: err instanceof Error ? err.constructor.name : "Unknown",
      errorMessage: err instanceof Error ? err.message : String(err),
    });
    const msg = "Something went wrong. Try again in a moment.";
    if (interaction.deferred && !interaction.replied) {
      await interaction.editReply(msg).catch(() => {});
    } else if (interaction.replied || interaction.deferred) {
      await interaction.followUp({ content: msg, ephemeral: true }).catch(() => {});
    } else {
      await interaction.reply({ content: msg, ephemeral: true }).catch(() => {});
    }
  }
}

// ---------------------------------------------------------------------------
// Sub-handlers
// ---------------------------------------------------------------------------

async function handleJoin(
  interaction: ChatInputCommandInteraction,
  guildId: string,
  voiceManager: VoiceManager,
  voiceListener: VoiceListener,
): Promise<void> {
  await interaction.deferReply({ ephemeral: true });
  await interaction.editReply("Joining voice channel...");

  const channelOption = interaction.options.getChannel("channel");

  // Determine target voice channel
  let targetChannel: VoiceChannel | null = null;
  if (channelOption?.type === ChannelType.GuildVoice) {
    targetChannel = channelOption as VoiceChannel;
  } else {
    const member = await interaction.guild!.members.fetch(interaction.user.id);
    const voiceState = member.voice;
    if (voiceState.channel?.type === ChannelType.GuildVoice) {
      targetChannel = voiceState.channel as VoiceChannel;
    }
  }

  if (!targetChannel) {
    await interaction.editReply("Join a voice channel first, or pass a channel to `/banter join`.");
    return;
  }

  const connection = await voiceManager.join(targetChannel);
  voiceListener.startListening(connection, guildId, voiceManager);
  const settings = await getGuildSettings(guildId);

  const modeNote =
    (settings.mode ?? "auto") === "manual"
      ? "Mode is **manual** — use `/banter say` to trigger responses."
      : `Listening for **"${settings.wakeWord ?? "hey banter"}"**. Say the wake word to trigger.`;

  await interaction.editReply(`Joined **${targetChannel.name}**. ${modeNote}`);
}

async function handleLeave(
  interaction: ChatInputCommandInteraction,
  guildId: string,
  voiceManager: VoiceManager,
  voiceListener: VoiceListener,
): Promise<void> {
  if (!voiceManager.isConnected(guildId)) {
    await interaction.reply({ content: "I'm not in a voice channel.", ephemeral: true });
    return;
  }
  voiceListener.stopListening(guildId);
  voiceManager.leave(guildId);
  await interaction.reply({ content: "Left the voice channel.", ephemeral: true });
}

async function handleSay(
  interaction: ChatInputCommandInteraction,
  guildId: string,
  voiceManager: VoiceManager,
): Promise<void> {
  const prompt = interaction.options.getString("prompt", true);

  // Safety check first (fast, no DB)
  const safety = checkPromptSafety(prompt);
  if (!safety.safe) {
    await interaction.reply({ content: `Blocked: ${safety.reason}`, ephemeral: true });
    return;
  }

  // P2: load settings before cooldown so we use the configured cooldown
  const settings = await getGuildSettings(guildId);

  if (settings.optedOut) {
    await interaction.reply({ content: "Banter is opted out for this server.", ephemeral: true });
    return;
  }

  const cooldownSecs = settings.cooldownSeconds ?? 30;
  const cooldown = checkCooldown(guildId, interaction.user.id, cooldownSecs);
  if (!cooldown.allowed) {
    const remaining = Math.ceil(cooldown.remainingMs / 1000);
    await interaction.reply({
      content: `On cooldown — try again in **${remaining}s**.`,
      ephemeral: true,
    });
    return;
  }

  await interaction.deferReply({ ephemeral: true });

  if (!voiceManager.isConnected(guildId)) {
    await interaction.editReply("I'm not in a voice channel. Use `/banter join` first.");
    return;
  }

  // P3: daily usage limit
  const limit = settings.maxDailyBanters ?? 100;
  const usage = await checkAndIncrementUsage(guildId, limit);
  if (!usage.allowed) {
    await interaction.editReply(
      `Daily banter limit reached (**${usage.count}/${limit}** today). Try again tomorrow.`,
    );
    return;
  }

  // P4: fetch recent context
  const recentContext = await getRecentContext(guildId, 3);
  const contextLines = recentContext.map((c) => c.summary);

  const text = await generateBanter(prompt, settings.personality ?? "default", contextLines);
  const { buffer, provider } = await generateTTS(text, settings.voiceId ?? undefined);
  setCooldown(guildId, interaction.user.id, cooldownSecs);
  await voiceManager.playBuffer(guildId, buffer);
  await interaction.editReply(`Playing: *${text}*`);

  // P4: persist context + history (best-effort)
  const summary = `User ${interaction.user.id} asked: ${prompt}; BanterBox replied: ${text}`;
  await saveContext(guildId, summary, 2).catch(() => {});
  await logBanter({ guildId, userId: interaction.user.id, prompt, response: text, ttsProvider: provider }).catch(() => {});
}

async function handleStatus(
  interaction: ChatInputCommandInteraction,
  guildId: string,
  voiceManager: VoiceManager,
): Promise<void> {
  const settings = await getGuildSettings(guildId);

  const embed = new EmbedBuilder()
    .setTitle("BanterBox Status")
    .setColor(Colors.Blurple)
    .addFields(
      { name: "Voice", value: voiceManager.isConnected(guildId) ? "Connected" : "Not connected", inline: true },
      { name: "Personality", value: settings.personality ?? "default", inline: true },
      { name: "Wake Word", value: `"${settings.wakeWord ?? "hey banter"}"`, inline: true },
      { name: "Cooldown", value: `${settings.cooldownSeconds ?? 30}s`, inline: true },
      { name: "Mode", value: settings.mode ?? "auto", inline: true },
      { name: "Opted Out", value: settings.optedOut ? "Yes" : "No", inline: true },
    );

  await interaction.reply({ embeds: [embed], ephemeral: true });
}

async function handleConfig(
  interaction: ChatInputCommandInteraction,
  guildId: string,
  sub: string,
): Promise<void> {
  if (!hasManageGuild(interaction)) {
    await interaction.reply({
      content: "You need **Manage Server** permission to change settings.",
      ephemeral: true,
    });
    return;
  }

  switch (sub) {
    case "personality": {
      const preset = interaction.options.getString("preset", true);
      const valid = listPersonalities().map((p) => p.key);
      if (!valid.includes(preset)) {
        await interaction.reply({ content: "Unknown personality preset.", ephemeral: true });
        return;
      }
      await upsertGuildSettings(guildId, { personality: preset });
      await interaction.reply({ content: `Personality set to **${preset}**.`, ephemeral: true });
      break;
    }
    case "wakeword": {
      const phrase = normaliseWakeWord(interaction.options.getString("phrase", true));
      await upsertGuildSettings(guildId, { wakeWord: phrase });
      await interaction.reply({ content: `Wake word set to **"${phrase}"**.`, ephemeral: true });
      break;
    }
    case "cooldown": {
      const seconds = interaction.options.getInteger("seconds", true);
      await upsertGuildSettings(guildId, { cooldownSeconds: seconds });
      await interaction.reply({ content: `Cooldown set to **${seconds}s**.`, ephemeral: true });
      break;
    }
    case "mode": {
      const value = interaction.options.getString("value", true) as "auto" | "manual";
      await upsertGuildSettings(guildId, { mode: value });
      const desc =
        value === "manual"
          ? "**manual** — only `/banter say` will trigger responses."
          : "**auto** — wake-word listening is active.";
      await interaction.reply({ content: `Mode set to ${desc}`, ephemeral: true });
      break;
    }
    case "optout": {
      const value = interaction.options.getBoolean("value", true);
      await upsertGuildSettings(guildId, { optedOut: value });
      await interaction.reply({
        content: value ? "Opted out — bot will not respond." : "Opted back in — bot is active.",
        ephemeral: true,
      });
      break;
    }
    default:
      await interaction.reply({ content: "Unknown config subcommand.", ephemeral: true });
  }
}

export default {};