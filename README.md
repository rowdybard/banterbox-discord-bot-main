# BanterBox 🎙️

A Discord voice bot that listens for a wake word, generates a short AI one-liner, and plays it back via TTS — all in a few seconds.

---

## How it works

1. Bot joins a voice channel (`/banter join`)
2. Listens for the wake word (default: **"hey banter"**)
3. Transcribes what was said after it (ElevenLabs Scribe → Whisper fallback)
4. Generates a punchy one-liner via GPT-4o-mini
5. Converts it to speech (ElevenLabs TTS → OpenAI TTS fallback)
6. Plays the audio back in the channel

---

## Quick start

### Prerequisites

- Node.js 20+
- `ffmpeg` on PATH (required for Opus → MP3 decode)
- A Discord app with a bot token ([Discord Developer Portal](https://discord.com/developers/applications))
- An OpenAI API key

### 1. Clone and install

```bash
git clone <repo-url>
cd banterbox-discord-bot-main
npm install
```

### 2. Configure environment

```bash
cp .env.example .env
```

Edit `.env` — required keys:

| Variable | Description |
|---|---|
| `DISCORD_BOT_TOKEN` | Bot token from Discord Developer Portal |
| `DISCORD_APPLICATION_ID` | Application ID (for slash command registration) |
| `OPENAI_API_KEY` | Used for GPT-4o-mini (banter) + Whisper (STT fallback) + OpenAI TTS fallback |

Optional but recommended:

| Variable | Description |
|---|---|
| `ELEVENLABS_API_KEY` | Enables ElevenLabs Scribe STT + higher-quality TTS |
| `ELEVENLABS_VOICE_ID` | Voice to use (defaults to "George") |
| `DATABASE_URL` | PostgreSQL connection string — bot works fully in-memory without it |

### 3. Run

```bash
# Development
npm run dev

# Production
npm run build
npm start
```

### 4. Invite the bot

Visit `http://localhost:5000/api/invite` after starting — it returns the OAuth URL with correct permissions.

---

## Commands

| Command | Permission | Description |
|---|---|---|
| `/banter join [channel]` | Everyone | Join a voice channel and start listening |
| `/banter leave` | Everyone | Leave the voice channel |
| `/banter say <prompt>` | Everyone | Manually trigger a response (text fallback) |
| `/banter status` | Everyone | Show current settings and cooldown state |
| `/banter config mode <auto\|manual>` | Manage Guild | `auto` = wake-word listening, `manual` = `/banter say` only |
| `/banter config personality <preset>` | Manage Guild | Switch personality |
| `/banter config wakeword <phrase>` | Manage Guild | Change the wake word |
| `/banter config cooldown <seconds>` | Manage Guild | Set cooldown between responses (5–300s) |
| `/banter config optout <true/false>` | Manage Guild | Opt server out of all banter |

### Personalities

| Key | Name | Vibe |
|---|---|---|
| `default` | BanterBot | Sharp, quick-witted |
| `dry` | Deadpan | British, disappointed in everyone |
| `hype` | Hype Machine | Over-the-top, everything is amazing |
| `chill` | Chill Guy | Surfer zen energy |
| `roast-light` | Roaster | Friendly PG-13 stand-up |
| `dungeon-party` | Dungeon Master | D&D tavern narrator |
| `racing-chaos` | Race Commentator | Overdramatic motorsport |

---

## Architecture

```
server/
  index.ts               Express entry point + bot bootstrap
  config.ts              Zod env validation (fail-fast)
  logger.ts              Structured JSON logger

  discord/
    bot.ts               Discord.js client, event wiring
    commands.ts          /banter slash command definitions (discord.js builders)
    interactions.ts      Subcommand handlers (join/leave/say/status/config)
    voice.ts             VoiceManager — join, leave, playBuffer
    listener.ts          VoiceListener — Opus receive → full STT→banter→TTS pipeline
    permissions.ts       hasManageGuild(), isGuildInteraction()
    rateLimit.ts         Per-guild + per-user cooldown maps

  stt/
    decode.ts            Discord Opus stream → MP3 via prism-media + ffmpeg
    elevenlabs.ts        ElevenLabs Scribe STT
    whisper.ts           OpenAI Whisper fallback
    wakeWord.ts          Wake word detection + normalisation
    index.ts             Provider selector with automatic fallback

  banter/
    prompts.ts           7 personality presets
    safety.ts            Prompt + response safety filters
    generate.ts          GPT-4o-mini banter generation

  tts/
    elevenlabs.ts        ElevenLabs Turbo v2 TTS
    openai.ts            OpenAI TTS fallback
    cache.ts             In-memory LRU cache (50 entries, 10 min TTL)
    index.ts             Provider selector with fallback + cache-first

  storage/
    db.ts                Drizzle + postgres-js connection (null if no DATABASE_URL)
    schema.ts            Re-exports from shared/schema
    repositories.ts      getGuildSettings, upsertGuildSettings, logBanter,
                         checkAndIncrementUsage, saveContext, getRecentContext

shared/
  schema.ts              Drizzle schema: guild_settings, banter_history,
                         usage_counters, context_memory

client/src/
  App.tsx                Single route → Landing
  pages/landing.tsx      Dark landing page with feature cards + command reference
```

---

## Database

Postgres is **optional** — the bot works fully in-memory without `DATABASE_URL`.

With a database, it persists guild settings, banter history, usage counters, and context memory. Without it, all settings reset on restart and there's no usage tracking.

To push the schema to your database:

```bash
npm run db:push
```

---

## Requirements for voice receive

Opus decoding requires one native peer dependency. `@discordjs/opus` is already listed in `package.json`:

```bash
npm install   # installs @discordjs/opus automatically
```

If the native build fails on your platform, try:

```bash
npm install mediaplex   # pure-JS alternative
```

---

## Environment variables

See `.env.example` for the full reference. The server will start without most optional variables — missing keys are logged as warnings, not crashes.
