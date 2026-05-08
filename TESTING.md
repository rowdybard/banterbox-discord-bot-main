# BanterBox — Local Testing Checklist

## Setup

1. `npm install`
2. Copy `.env.example` to `.env` and fill in at minimum:
   - `DISCORD_BOT_TOKEN`
   - `DISCORD_APPLICATION_ID`
   - `DISCORD_PUBLIC_KEY`
   - `OPENAI_API_KEY`
3. `npm run dev`

## Basic smoke tests

### 4. Health endpoint
```
GET http://localhost:5000/api/health
```
Expected:
```json
{
  "status": "ok",
  "discordReady": true,
  "activeVoiceConnections": 0,
  "databaseMode": "memory",
  "openAiConfigured": true
}
```

### 5. Invite URL
```
GET http://localhost:5000/api/invite
```
Returns OAuth URL — open it to invite the bot to a test server.

---

## Discord command tests

### 6. `/banter status`
- Should return an embed showing current mode, wake word, personality, cooldown.

### 7. `/banter join`
- Join a voice channel yourself first.
- Run `/banter join` — bot should join your channel.
- Reply should include mode note (auto: wake word listed; manual: use /banter say).

### 8. `/banter say hello`
- Bot should generate a one-liner and play it in the voice channel.
- Interaction reply shows the text played.

### 9. Wake word in auto mode
- Ensure mode is auto: `/banter config mode auto`
- Say **"hey banter, say something funny"** in voice.
- Bot should transcribe, detect wake word, generate banter, and speak.
- Check logs for `"STT transcript"` with `"triggered": true`.

### 10. Manual mode ignores wake word
- `/banter config mode manual`
- Say **"hey banter, say something"** in voice.
- Bot should NOT respond (mode check returns early).
- `/banter say test` should still work.

### 11. `/banter leave`
- Bot should leave the voice channel.

---

## Config commands (requires Manage Server)

| Command | What to verify |
|---|---|
| `/banter config mode manual` | Wake word stops working; /banter say still works |
| `/banter config mode auto` | Wake word works again |
| `/banter config wakeword yo bot` | Change wake phrase; say it in voice |
| `/banter config cooldown 60` | After one response, /banter say blocked for 60s |
| `/banter config personality dry` | Replies become deadpan British |
| `/banter config optout true` | Bot stops responding entirely |
| `/banter config optout false` | Bot responds again |

---

## Common failures

### ffmpeg missing
**Symptom:** `Audio decode failed` / `spawn ffmpeg ENOENT`  
**Fix:** Install ffmpeg — `choco install ffmpeg` (Windows) / `brew install ffmpeg` (Mac) / `apt install ffmpeg` (Linux)

### Bot lacks Connect/Speak permissions
**Symptom:** `Voice signalling timed out`  
**Fix:** Go to your Discord server → channel permissions → grant BanterBox Connect + Speak

### Message Content intent disabled
**Symptom:** Some events silently missing  
**Fix:** Discord Developer Portal → your app → Bot → enable **Message Content Intent**

### UDP blocked (hosting issue)
**Symptom:** `Voice UDP handshake timed out`  
**Fix:** Ensure your host allows outbound UDP. Use Railway or Fly.io. Verify bot is NOT behind strict NAT or a proxy that blocks UDP.

### Missing OpenAI key
**Symptom:** `GPT generation failed — using fallback` / bot says canned fallback lines  
**Fix:** Set `OPENAI_API_KEY` in environment variables

### ElevenLabs fallback behaviour
If `ELEVENLABS_API_KEY` is not set: STT falls back to Whisper, TTS falls back to OpenAI TTS.  
If ElevenLabs is set but fails at runtime: same automatic fallback applies.  
Set `STT_PROVIDER=whisper` to always use Whisper even if ElevenLabs key is present.

### Database not connecting
**Symptom:** `DB connect timeout` errors in logs, but bot keeps running  
**Behaviour:** Bot silently falls back to in-memory defaults — guild settings, usage limits, and context are not persisted.  
**Fix:** Verify `DATABASE_URL` uses the Supabase connection pooler URL (port 6543), not the direct connection (port 5432).
