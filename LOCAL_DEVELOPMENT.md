# 🏠 Local Development Setup

This guide will help you set up BanterBox for local development on Windows.

## Prerequisites

- ✅ Node.js 18+ installed
- ✅ npm installed
- ✅ Git installed
- 🔲 PostgreSQL installed (or use SQLite for quick testing)
- 🔲 Discord Bot Token
- 🔲 OpenAI API Key

## Quick Start

### 1. Install Dependencies

```bash
npm install
```

### 2. Configure Environment

Your `.env` file should contain:

```bash
# Core
NODE_ENV=development
PORT=5000
SESSION_SECRET=your_random_secret_here

# Database - Choose ONE option below
```

## Database Options

### Option A: Local PostgreSQL (Recommended for Production-like Testing)

**Install PostgreSQL:**
1. Download from https://www.postgresql.org/download/windows/
2. Install with default settings
3. Remember your postgres password

**Create Database:**
```bash
# Open Command Prompt or PowerShell
psql -U postgres
CREATE DATABASE banterbox;
\q
```

**Configure .env:**
```bash
DATABASE_URL=postgresql://postgres:your_password@localhost:5432/banterbox
```

**Initialize Database:**
```bash
npm run db:push
```

### Option B: SQLite (Easiest for Quick Testing)

**Configure .env:**
```bash
DATABASE_URL=file:./local.db
```

**Update drizzle.config.ts:**
```typescript
import { defineConfig } from "drizzle-kit";

export default defineConfig({
  out: "./drizzle",
  schema: "./shared/schema.ts",
  dialect: "sqlite", // Changed from "postgresql"
  dbCredentials: {
    url: process.env.DATABASE_URL!,
  },
});
```

**Initialize Database:**
```bash
npm run db:push
```

### Option C: Docker PostgreSQL (Isolated Environment)

**Create docker-compose.yml:**
```yaml
version: '3.8'
services:
  postgres:
    image: postgres:15
    environment:
      POSTGRES_DB: banterbox
      POSTGRES_USER: postgres
      POSTGRES_PASSWORD: postgres
    ports:
      - "5432:5432"
    volumes:
      - postgres_data:/var/lib/postgresql/data

volumes:
  postgres_data:
```

**Start Database:**
```bash
docker-compose up -d
```

**Configure .env:**
```bash
DATABASE_URL=postgresql://postgres:postgres@localhost:5432/banterbox
```

**Initialize Database:**
```bash
npm run db:push
```

## Discord Bot Setup

### 1. Create Discord Application

1. Go to https://discord.com/developers/applications
2. Click "New Application"
3. Name it "BanterBox Dev" (or whatever you prefer)
4. Go to "Bot" section
5. Click "Reset Token" and copy it
6. Enable these Privileged Gateway Intents:
   - ✅ Presence Intent
   - ✅ Server Members Intent
   - ✅ Message Content Intent

### 2. Configure .env

```bash
DISCORD_APPLICATION_ID=your_application_id
DISCORD_BOT_TOKEN=your_bot_token
DISCORD_CLIENT_ID=your_client_id
DISCORD_CLIENT_SECRET=your_client_secret
DISCORD_PUBLIC_KEY=your_public_key
```

### 3. Invite Bot to Test Server

Use this URL (replace CLIENT_ID):
```
https://discord.com/api/oauth2/authorize?client_id=CLIENT_ID&permissions=3165184&scope=bot%20applications.commands
```

## API Keys

### OpenAI (Required)

1. Go to https://platform.openai.com/api-keys
2. Create new secret key
3. Add to `.env`:
```bash
OPENAI_API_KEY=sk-...
```

### ElevenLabs (Optional but Recommended)

1. Go to https://elevenlabs.io/
2. Get API key from profile
3. Add to `.env`:
```bash
ELEVENLABS_API_KEY=your_key
```

## Running the Application

### Development Mode

```bash
npm run dev
```

This will:
- Start the Express server on http://localhost:5000
- Start Vite dev server for hot reload
- Connect Discord bot
- Watch for file changes

### Access the Application

- **Frontend:** http://localhost:5000
- **API:** http://localhost:5000/api

## Testing

### Verify Setup

```bash
npm run verify
```

### Check TypeScript

```bash
npm run check
```

### Build for Production

```bash
npm run build
```

## Common Issues

### Issue: "cross-env not found"
**Solution:** Run `npm install`

### Issue: Database connection fails
**Solution:** 
- Check PostgreSQL is running: `pg_isready`
- Verify DATABASE_URL is correct
- Try SQLite option for quick testing

### Issue: Discord bot won't connect
**Solution:**
- Verify bot token is correct
- Check all intents are enabled
- Ensure bot is invited to server

### Issue: Port 5000 already in use
**Solution:** Change PORT in `.env` to another port (e.g., 3000, 8080)

### Issue: OpenAI API errors
**Solution:**
- Verify API key is valid
- Check you have credits: https://platform.openai.com/usage
- Ensure no extra spaces in `.env`

## Development Workflow

### 1. Start Development Server
```bash
npm run dev
```

### 2. Make Changes
- Edit files in `server/` for backend
- Edit files in `client/src/` for frontend
- Changes auto-reload

### 3. Test Changes
- Frontend: Check browser at http://localhost:5000
- Backend: Check terminal logs
- Discord: Test commands in your server

### 4. Database Changes
If you modify `shared/schema.ts`:
```bash
npm run db:push
```

## Project Structure

```
banterbox-discord-bot-main/
├── server/              # Backend code
│   ├── index.ts        # Main server entry
│   ├── routes.ts       # API routes
│   ├── discord.ts      # Discord bot logic
│   └── ...
├── client/             # Frontend code
│   ├── src/
│   │   ├── pages/     # React pages
│   │   ├── components/ # React components
│   │   └── ...
├── shared/             # Shared code
│   └── schema.ts      # Database schema
├── .env               # Your local config (DO NOT COMMIT)
├── .env.example       # Template
└── package.json       # Dependencies
```

## Environment Variables Reference

### Required
- `DATABASE_URL` - Database connection string
- `DISCORD_BOT_TOKEN` - Discord bot token
- `DISCORD_APPLICATION_ID` - Discord app ID
- `DISCORD_CLIENT_ID` - Discord client ID
- `DISCORD_CLIENT_SECRET` - Discord client secret
- `DISCORD_PUBLIC_KEY` - Discord public key
- `OPENAI_API_KEY` - OpenAI API key
- `SESSION_SECRET` - Random string for sessions

### Optional
- `ELEVENLABS_API_KEY` - Better voice quality
- `PORT` - Server port (default: 5000)
- `NODE_ENV` - Environment (development/production)

## Switching from Render

Since you're moving away from Render, you can:

1. **Export Data** (if you have production data):
   ```bash
   # Connect to Render database
   pg_dump $RENDER_DATABASE_URL > backup.sql
   
   # Import to local
   psql -U postgres -d banterbox < backup.sql
   ```

2. **Remove Render-specific Files** (optional):
   - `render.yaml` (if exists)
   - Railway configs

3. **Update Documentation:**
   - Remove Render deployment instructions
   - Add your new hosting solution

## Next Steps

1. ✅ Install dependencies
2. ✅ Configure `.env`
3. ✅ Choose database option
4. ✅ Set up Discord bot
5. ✅ Get API keys
6. ✅ Run `npm run dev`
7. ✅ Test in browser and Discord

## Getting Help

- Check `SETUP.md` for detailed setup
- Check `QUICKSTART.md` for quick reference
- Check `MARKETPLACE.md` for marketplace features
- Check `FIXES_APPLIED.md` for recent fixes

---

**Happy coding! 🚀**
