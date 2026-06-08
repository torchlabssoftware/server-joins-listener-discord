import "dotenv/config";
import { Client, GatewayIntentBits, GuildMember, Events } from "discord.js";
import {
  ensureTableExists,
  insertMemberJoin,
  MemberJoinRow,
  MemberMetadata,
} from "./bigquery";

const client = new Client({
  intents: [GatewayIntentBits.Guilds, GatewayIntentBits.GuildMembers],
});

client.once(Events.ClientReady, async (readyClient) => {
  console.log(`Logged in as ${readyClient.user.tag}`);
  try {
    await ensureTableExists();
    console.log("BigQuery table ready.");
  } catch (err) {
    console.error("Failed to ensure BigQuery table exists:", err);
    process.exit(1);
  }
});

client.on(Events.GuildMemberAdd, async (member: GuildMember) => {
  const { user, guild } = member;

  const metadata: MemberMetadata = {
    username: user.username,
    display_name: member.displayName,
    discriminator: user.discriminator,
    avatar_url: user.displayAvatarURL({ size: 256 }),
    is_bot: user.bot,
    account_created_at: user.createdAt.toISOString(),
    joined_server_at: (member.joinedAt ?? new Date()).toISOString(),
    server_id: guild.id,
    server_name: guild.name,
    role_ids: member.roles.cache
      .filter((r) => r.id !== guild.id)
      .map((r) => r.id),
  };

  const row: MemberJoinRow = {
    discord_id: user.id,
    metadata: JSON.stringify(metadata),
    updated_at: new Date().toISOString(),
  };

  try {
    await insertMemberJoin(row);
    console.log(`[${guild.name}] New member: ${user.username} → BigQuery ✓`);
  } catch (err) {
    console.error(`Failed to insert row for ${user.username}:`, err);
  }
});

const token = process.env.DISCORD_BOT_TOKEN;
if (!token) {
  console.error("DISCORD_BOT_TOKEN is not set in .env");
  process.exit(1);
}

client.login(token);
