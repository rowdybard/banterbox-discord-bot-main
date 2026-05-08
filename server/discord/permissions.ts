import {
  ChatInputCommandInteraction,
  PermissionsBitField,
  GuildMember,
} from "discord.js";

/**
 * Returns true only if the interaction member has the MANAGE_GUILD permission.
 * This is a real bitfield check — not a stub.
 */
export function hasManageGuild(interaction: ChatInputCommandInteraction): boolean {
  // Prefer raw bitfield — available even when member object is partial (common in slash commands)
  if (interaction.memberPermissions) {
    return interaction.memberPermissions.has(PermissionsBitField.Flags.ManageGuild);
  }
  // Fallback for edge cases where memberPermissions is null
  const member = interaction.member;
  if (!member || !(member instanceof GuildMember)) return false;
  return member.permissions.has(PermissionsBitField.Flags.ManageGuild);
}

/**
 * Returns true if the interaction originated from a guild (not a DM).
 */
export function isGuildInteraction(interaction: ChatInputCommandInteraction): boolean {
  return interaction.guildId !== null && interaction.guild !== null;
}
