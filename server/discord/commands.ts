import { REST, Routes, SlashCommandBuilder, SlashCommandSubcommandsOnlyBuilder } from "discord.js";
import { listPersonalities } from "../banter/prompts";
import { logger } from "../logger";

// Permissions integer: Connect + Speak + SendMessages + UseSlashCommands + ViewChannel + ReadMessageHistory
const BOT_PERMISSIONS = "277025394688";

function buildCommands(): SlashCommandSubcommandsOnlyBuilder[] {
  const personalities = listPersonalities().map((p) => ({ name: p.name, value: p.key }));

  const banter = new SlashCommandBuilder()
    .setName("banter")
    .setDescription("BanterBox voice bot commands")
    .addSubcommand((sub) =>
      sub
        .setName("join")
        .setDescription("Join a voice channel and start listening for the wake word")
        .addChannelOption((opt) =>
          opt
            .setName("channel")
            .setDescription("Voice channel to join (defaults to your current channel)")
            .setRequired(false),
        ),
    )
    .addSubcommand((sub) =>
      sub.setName("leave").setDescription("Leave the voice channel and stop listening"),
    )
    .addSubcommand((sub) =>
      sub
        .setName("say")
        .setDescription("Manually trigger a banter response (text fallback)")
        .addStringOption((opt) =>
          opt
            .setName("prompt")
            .setDescription("What to banter about")
            .setRequired(true)
            .setMaxLength(200),
        ),
    )
    .addSubcommand((sub) =>
      sub.setName("status").setDescription("Show current bot settings and cooldown state"),
    )
    .addSubcommandGroup((group) =>
      group
        .setName("config")
        .setDescription("Configure bot settings for this server (requires Manage Guild)")
        .addSubcommand((sub) =>
          sub
            .setName("personality")
            .setDescription("Set the bot's personality")
            .addStringOption((opt) =>
              opt
                .setName("preset")
                .setDescription("Which personality to use")
                .setRequired(true)
                .addChoices(...personalities),
            ),
        )
        .addSubcommand((sub) =>
          sub
            .setName("wakeword")
            .setDescription("Set the wake word (default: hey banter)")
            .addStringOption((opt) =>
              opt
                .setName("phrase")
                .setDescription("Phrase that triggers the bot")
                .setRequired(true)
                .setMinLength(3)
                .setMaxLength(40),
            ),
        )
        .addSubcommand((sub) =>
          sub
            .setName("cooldown")
            .setDescription("Set seconds between responses (default: 30)")
            .addIntegerOption((opt) =>
              opt
                .setName("seconds")
                .setDescription("Cooldown in seconds")
                .setRequired(true)
                .setMinValue(5)
                .setMaxValue(300),
            ),
        )
        .addSubcommand((sub) =>
          sub
            .setName("optout")
            .setDescription("Toggle whether this server opts out of all banter")
            .addBooleanOption((opt) =>
              opt.setName("value").setDescription("true = opted out").setRequired(true),
            ),
        ),
    ) as unknown as SlashCommandSubcommandsOnlyBuilder;

  return [banter as unknown as SlashCommandSubcommandsOnlyBuilder];
}

export async function registerCommands(): Promise<void> {
  const appId = process.env.DISCORD_APPLICATION_ID;
  const token = process.env.DISCORD_BOT_TOKEN;

  if (!appId || !token) {
    logger.warn("Cannot register commands — DISCORD_APPLICATION_ID or DISCORD_BOT_TOKEN missing");
    return;
  }

  const rest = new REST({ version: "10" }).setToken(token);
  const commands = buildCommands().map((c) => c.toJSON());

  try {
    await rest.put(Routes.applicationCommands(appId), { body: commands });
    logger.info("Discord slash commands registered", { command: "/banter" });
  } catch (err) {
    logger.error("Failed to register Discord commands", {
      errorClass: err instanceof Error ? err.constructor.name : "Unknown",
      errorMessage: err instanceof Error ? err.message : String(err),
    });
  }
}

export function getBotInviteUrl(): string {
  const appId = process.env.DISCORD_APPLICATION_ID;
  if (!appId) throw new Error("DISCORD_APPLICATION_ID not set");

  const params = new URLSearchParams({
    client_id: appId,
    scope: "bot applications.commands",
    permissions: BOT_PERMISSIONS,
  });

  return `https://discord.com/api/oauth2/authorize?${params.toString()}`;
}