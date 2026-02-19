# Ritam Bharat WhatsApp Support Bot

A WhatsApp support bot for Ritam Bharat (Hotel Operating System) with automatic message replies, rate limiting, and deployment-ready configuration.

## Features

- ✅ Auto-reply on WhatsApp messages
- ✅ Multi-option menu system (5 support options)
- ✅ Per-user rate limiting (prevent spam / WhatsApp bans)
- ✅ Configurable message delays (safety against detection)
- ✅ Appwrite integration for message logging
- ✅ Health check endpoint (`/health`)
- ✅ Railway / cloud-ready (headless Chromium support)
- ✅ Session persistence (local or S3-backed)

## Quick Start (Local)

### Prerequisites
- Node.js >= 18
- Chrome/Chromium browser installed
- `.env` file with Appwrite credentials (optional)

### Setup

1. **Clone/download the repo:**
   ```bash
   cd whatsapp-support-test
   ```

2. **Install dependencies:**
   ```bash
   npm install
   ```

3. **Create `.env` file** (copy from `.env.example`):
   ```bash
   cp .env.example .env
   ```
   Edit `.env` and fill in your Appwrite details (optional).

4. **Run the bot:**
   ```bash
   npm start
   ```
   - You'll see a QR code in the terminal
   - Scan the QR with your WhatsApp phone (Business Account recommended)
   - Bot will show "WhatsApp Bot Ready 🚀"

5. **Test it:**
   - Send `hi` to the bot's WhatsApp number
   - You'll receive the main menu
   - Reply with `1`–`5` to see different options

## Configuration

Edit `.env` to customize:

```bash
# Message delay between replies (ms) — higher = safer
MESSAGE_DELAY_MS=2500

# Max messages per user per minute (limit)
MESSAGE_LIMIT_PER_MIN=30

# Server port
PORT=3000

# Appwrite (optional, for logging)
APPWRITE_ENDPOINT=...
APPWRITE_PROJECT_ID=...
APPWRITE_API_KEY=...
APPWRITE_DATABASE_ID=...
APPWRITE_COLLECTION_ID=...
```

## Deployment to Railway

### Steps

1. **Create a Railway project:** https://railway.app
2. **Connect your GitHub repository** or push code directly
3. **Set environment variables** in Railway dashboard:
   - Copy values from `.env.example`
   - Paste into Railway > Variables
   - Ensure `PORT` is set (Railway uses dynamic port allocation)
4. **Add Dockerfile** (already included in repo)
5. **Deploy:** Railway will auto-detect Dockerfile and deploy
6. **Monitor:** Check logs in Railway dashboard; visit `https://your-railway-url/health` to verify the bot is running

### Why Dockerfile matters

- **Chromium included:** Railway containers are ephemeral (no Chrome). Dockerfile installs Chromium.
- **Headless mode:** Bot runs in headless mode automatically on Railway (no GUI).
- **Health check:** Railway monitors the `/health` endpoint to restart if bot crashes.

## Session Persistence (Optional S3 Backup)

For production on Railway, consider backing up the WhatsApp session to S3 so it persists across deployments:

1. **Add AWS credentials to `.env`:**
   ```bash
   AWS_ACCESS_KEY_ID=...
   AWS_SECRET_ACCESS_KEY=...
   S3_BUCKET=your-bucket
   S3_REGION=us-east-1
   SESSION_S3_KEY=whatsapp/session.zip
   ```

2. *(Advanced)* The bot will automatically:
   - Download session from S3 on startup (if available)
   - Upload session to S3 periodically or on graceful shutdown

Currently, S3 sync is optional; bot works fine with local sessions on Railway (sessions survive within a deployment; reset only on new deploys).

## Menu Structure

When a user sends `hi`:

```
🟢 Welcome to Ritam Bharat Support

1️⃣ About Ritam Bharat
2️⃣ Our Services
3️⃣ How It Works
4️⃣ Contact Our Team
5️⃣ Talk to Support Executive

Type 0 to return to main menu.
```

Each option provides info; users can type `0` to return to main menu.

## Troubleshooting

### "Browser is already running" error
- **Cause:** Another WhatsApp bot instance is still running
- **Fix:** Kill the process or restart your machine
- **Prevention:** Use separate `puppeteer_profile` directories per instance

### Bot doesn't reply
- Check server logs: `npm start` should show "WhatsApp Bot Ready 🚀"
- Verify the phone number has WhatsApp installed
- Ensure internet connection is stable

### WhatsApp blocks / bans the bot number
- **Cause:** Sending too many messages too fast
- **Fix:** Increase `MESSAGE_DELAY_MS` in `.env` (try 3000–5000 ms)
- **Tip:** Use a Business WhatsApp account; avoid automating personal accounts excessively

### Appwrite errors in logs
- Ensure credentials in `.env` are correct
- Appwrite service should be running and accessible
- If you don't need logging, remove/comment out Appwrite code in `server.js`

## Project Structure

```
whatsapp-support-test/
├── server.js              # Main bot logic
├── package.json           # Dependencies & scripts
├── Dockerfile             # For Railway deployment
├── .env                   # Local configuration (not in repo)
├── .env.example           # Template for .env
├── .wwebjs_auth/          # WhatsApp session data (created at runtime)
│   └── puppeteer_profile/ # Chromium profile for Puppeteer
└── README.md              # This file
```

## Important Notes

⚠️ **WhatsApp Terms of Service:**
- Automating WhatsApp is against ToS for personal accounts
- Use a **Business WhatsApp account** for bots when possible
- For production, consider **WhatsApp Cloud API** (official, recommended)
- Excessive bot activity may result in account bans

⚠️ **Rate Limiting:**
- Default: 2500 ms delay between messages, 30 messages/minute per user
- These limits are **safety defaults** to avoid WhatsApp detection
- Adjust based on your use case (increase delays for safer operation)

## Support & Contributing

For issues or suggestions, check the bot logs and ensure `.env` is correctly configured.

---

**Last Updated:** Feb 2026  
**Bot Version:** 1.0.0 (Ritam Bharat)
