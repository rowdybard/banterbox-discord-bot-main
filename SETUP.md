# BanterBox Setup Guide

Complete guide to get your BanterBox Discord bot up and running.

## What is BanterBox?

BanterBox is an AI-powered Discord bot that:
- Generates witty, contextual responses when users mention "banterbox" in chat
- Converts responses to speech using OpenAI TTS or ElevenLabs
- Plays audio directly in Discord voice channels
- Provides a stream overlay for OBS/streaming software
- Supports custom AI personalities and voice settings

---

## Prerequisites

### Required
- **Node.js 18+** - [Download](https://nodejs.org/)
- **PostgreSQL Database** - Local or hosted (Neon, Supabase, Railway, etc.)
- **Discord Bot Application** - [Create one](https://discord.com/developers/applications)
- **OpenAI API Key** - [Get one](https://platform.openai.com/api-keys)

### Optional but Recommended
- **ElevenLabs API Key** - For better voice quality [Get one](https://elevenlabs.io/)
- **Twitch Account** - For stream integration

---

## Step 1: Clone & Install

```bash
# Navigate to project directory
cd banterbox-discord-bot-main

# Install dependencies
npm install
```

---

## Step 2: Database Setup

### Option A: Local PostgreSQL
```bash
# Install PostgreSQL locally
# Create a database
createdb banterbox

# Your DATABASE_URL will be:
# postgresql://postgres:password@localhost:5432/banterbox
```

### Option B: Hosted Database (Recommended)
Use a free tier from:
- **Neon** - https://neon.tech (Recommended, free tier available)
- **Supabase** - https://supabase.com
- **Railway** - https://railway.app
- **Render** - https://render.com

Copy the connection string they provide.

---

## Step 3: Discord Bot Setup

1. **Create Discord Application**
   - Go to https://discord.com/developers/applications
   - Click "New Application"
   - Name it "BanterBox" (or whatever you prefer)

2. **Get Bot Token**
   - Go to "Bot" section
   - Click "Reset Token" and copy it
   - Enable these Privileged Gateway Intents:
     - ✅ Server Members Intent
     - ✅ Message Content Intent
     - ✅ Presence Intent

3. **Get Application Details**
   - Go to "General Information"
   - Copy "Application ID" and "Public Key"
   
4. **OAuth2 Setup**
   - Go to "OAuth2" section
   - Copy "Client ID" and "Client Secret"
   - Add redirect URL: `http://localhost:5000/api/auth/discord/callback`

5. **Enable Slash Commands**
   - Go to "General Information"
   - Under "Interactions Endpoint URL", you'll set this AFTER deployment:
     - For local dev: Leave blank for now
     - For production: `https://your-domain.com/api/discord/interactions`

6. **Invite Bot to Server**
   - Go to "OAuth2" > "URL Generator"
   - Select scopes: `bot`, `applications.commands`
   - Select permissions:
     - ✅ Read Messages/View Channels
     - ✅ Send Messages
     - ✅ Connect (voice)
     - ✅ Speak (voice)
     - ✅ Use Slash Commands
   - Copy the generated URL and open it to invite the bot

---

## Step 4: Environment Configuration

```bash
# Copy the example environment file
cp .env.example .env

# Edit .env with your actual values
```

**Required variables:**
```env
DATABASE_URL=postgresql://user:pass@host:5432/dbname
DISCORD_APPLICATION_ID=your_app_id
DISCORD_BOT_TOKEN=your_bot_token
DISCORD_CLIENT_ID=your_client_id
DISCORD_CLIENT_SECRET=your_client_secret
DISCORD_PUBLIC_KEY=your_public_key
OPENAI_API_KEY=sk-your_key
SESSION_SECRET=random_string_change_this
```

**Optional but recommended:**
```env
ELEVENLABS_API_KEY=your_elevenlabs_key
```

---

## Step 5: Database Migration

```bash
# Push database schema
npm run db:push

# This creates all necessary tables in your PostgreSQL database
```

---

## Step 6: Start the Application

### Development Mode
```bash
npm run dev
```

### Production Mode
```bash
# Build the application
npm run build

# Start production server
npm start
```

The server will start on `http://localhost:5000`

---

## Step 7: Link Discord Server

1. **Open the web dashboard**
   - Go to `http://localhost:5000`
   - Create an account or sign in

2. **In your Discord server, run:**
   ```
   /link
   ```
   - The bot will generate a link code
   - Enter this code in the BanterBox dashboard to connect

3. **Verify connection:**
   ```
   /status
   ```

---

## Usage

### Discord Commands
- `/link` - Connect Discord server to BanterBox
- `/unlink` - Disconnect server
- `/status` - Check connection status
- `/config` - View server configuration

### Triggering Banter
1. Join a voice channel in Discord
2. Send a message containing "banterbox" in any text channel
3. The bot will:
   - Generate an AI response
   - Convert it to speech
   - Play it in the voice channel you're in

### Web Dashboard
- Access at `http://localhost:5000`
- Configure AI personality
- Select voice provider (OpenAI or ElevenLabs)
- Customize overlay settings
- View usage statistics

### Stream Overlay
- Add Browser Source in OBS
- URL: `http://localhost:5000/overlay`
- Recommended size: 1920x1080
- Banter will appear with audio playback

---

## Deployment

### Important: Discord Voice Limitations
⚠️ Discord voice connections require UDP networking. **Do NOT deploy to Replit** as it doesn't support this properly.

### Recommended Platforms
1. **Railway** (Recommended)
   - Connect GitHub repo
   - Add PostgreSQL service
   - Set environment variables
   - Auto-deploys on push

2. **Render**
   - Connect GitHub repo
   - Add PostgreSQL database
   - Set environment variables
   - Auto-deploys on push

3. **VPS** (DigitalOcean, Linode, etc.)
   - Full control
   - Install Node.js and PostgreSQL
   - Use PM2 for process management

### Post-Deployment
1. Update Discord Interactions Endpoint:
   - Go to Discord Developer Portal
   - Set to: `https://your-domain.com/api/discord/interactions`

2. Update redirect URIs in `.env`:
   ```env
   DISCORD_REDIRECT_URI=https://your-domain.com/api/auth/discord/callback
   ```

---

## Troubleshooting

### Bot not responding
- Check bot is online in Discord
- Verify `/link` was run and successful
- Check console for errors
- Ensure Message Content Intent is enabled

### Voice not working
- Verify bot has voice permissions
- Check you're in a voice channel
- Ensure not deployed on Replit
- Check OPENAI_API_KEY is valid

### Database errors
- Verify DATABASE_URL is correct
- Run `npm run db:push` again
- Check database is accessible

### Build errors
- Delete `node_modules` and `package-lock.json`
- Run `npm install` again
- Check Node.js version is 18+

---

## Project Structure

```
banterbox-discord-bot-main/
├── client/           # React frontend
├── server/           # Express backend
│   ├── discord/      # Discord bot logic
│   ├── index.ts      # Server entry point
│   ├── routes.ts     # API routes
│   └── discord.ts    # Discord integration
├── shared/           # Shared types & schema
│   └── schema.ts     # Database schema
├── .env              # Environment variables (create this)
├── package.json      # Dependencies
└── README.md         # Project overview
```

---

## Support

For issues or questions:
1. Check the console logs for error messages
2. Verify all environment variables are set correctly
3. Ensure Discord bot has proper permissions
4. Check database connection is working

---

## Next Steps

1. ✅ Get the bot running locally
2. ✅ Link your Discord server
3. ✅ Test banter generation
4. ✅ Customize personality and voice
5. ✅ Set up stream overlay
6. ✅ Deploy to production

**Happy streaming! 🎉**
