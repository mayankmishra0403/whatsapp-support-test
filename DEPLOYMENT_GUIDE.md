# WhatsApp Ritam Bharat Support Bot - Deployment Guide

## Current Status ✅

Your WhatsApp support bot is now **ready for production deployment**. The bot features:
- **5 Dynamic Menu Options** (About, Services, How It Works, Contact, Talk to Executive)
- **Anti-Ban Protection** (1-2 second randomized delays between messages, 25 msgs/min per user)
- **Railway-Ready Docker Setup** (Chromium pre-installed, health checks, environment-based config)
- **Session Persistence** (no need to re-scan QR after restart)
- **Appwrite Integration** (optional message logging)

## Step 1: Test Locally (QR Code Scanning)

Your bot is already running! A QR code is displayed in your terminal.

### How to scan:
1. Open WhatsApp on your phone (preferably Business account)
2. Go to **Settings > Linked Devices**
3. Scan the QR code from the terminal using your phone camera
4. Once linked, you'll see: `✅ WhatsApp Bot Ready 🚀`

### Test the bot:
- Send: `hi`, `hello`, `start`, or `0` → Displays 5-option menu
- Send: `1`, `2`, `3`, `4`, or `5` → Gets corresponding response

---

## Step 2: Deploy to Railway

### Prerequisites:
- GitHub account (repo already created: https://github.com/mayankmishra0403/whatsapp-support-test)
- Railway account (free tier available at https://railway.app)

### Deployment Steps:

1. **Go to Railway Dashboard**
   - Visit https://railway.app
   - Log in or sign up

2. **Create New Project**
   - Click "New Project"
   - Select "Deploy from GitHub"
   - Connect your GitHub account
   - Select repository: `whatsapp-support-test`

3. **Configure Environment Variables**
   Once the project is created, go to the Service Settings and add these variables:

   ```
   MESSAGE_DELAY_MS=1000
   MESSAGE_DELAY_JITTER_PCT=40
   MESSAGE_LIMIT_PER_MIN=25
   APPWRITE_ENDPOINT=https://cloud.appwrite.io/v1
   APPWRITE_PROJECT_ID=your_project_id
   APPWRITE_API_KEY=your_api_key
   APPWRITE_DATABASE_ID=your_database_id
   ```

   **Note**: APPWRITE variables are optional. If not provided, message logging will be skipped.

4. **Trigger Deployment**
   - Railway auto-deploys on push
   - Monitor logs in Railway dashboard
   - Look for QR code in logs (same format as local)

5. **Scan QR Code on Railway**
   - Once logs show the QR code, scan it with your WhatsApp Business account
   - The bot will show: `✅ WhatsApp Bot Ready 🚀`

---

## Environment Variable Reference

### Required Variables
| Variable | Default | Purpose |
|----------|---------|---------|
| `MESSAGE_DELAY_MS` | 1000 | Base delay between messages (milliseconds) |
| `MESSAGE_DELAY_JITTER_PCT` | 40 | Random variation ±40% (prevents detection as bot) |
| `MESSAGE_LIMIT_PER_MIN` | 25 | Max messages per user per minute |

### Optional Variables (Appwrite)
| Variable | Purpose |
|----------|---------|
| `APPWRITE_ENDPOINT` | Appwrite API endpoint |
| `APPWRITE_PROJECT_ID` | Your Appwrite project ID |
| `APPWRITE_API_KEY` | Your Appwrite API key |
| `APPWRITE_DATABASE_ID` | Your Appwrite database ID |

---

## File Structure

```
whatsapp-support-test/
├── server.js              # Main bot logic (WhatsApp + Express)
├── package.json          # Dependencies & start script
├── Dockerfile            # Production container definition
├── .env                  # Local environment variables (not in git)
├── .env.example          # Template for .env
├── .gitignore            # Prevents committing secrets
├── README.md             # Quick start guide
├── DEPLOYMENT_GUIDE.md   # This file
└── .wwebjs_auth/         # Session data (auto-created, not in git)
```

---

## Menu Options (Ritam Bharat Content)

When users select an option, they receive:

1. **Option 1 - About Ritam Bharat**
   - Hotel company information & services overview

2. **Option 2 - Our Services**
   - Accommodation, dining, spa, events, etc.

3. **Option 3 - How It Works**
   - Booking process & customer support flow

4. **Option 4 - Contact Us**
   - Phone, email, address, website

5. **Option 5 - Talk to Executive**
   - Connect with live support team

---

## Troubleshooting

### Bot not responding to messages
- Check if session is established (look for "✅ WhatsApp Bot Ready 🚀" in logs)
- Ensure the linked device is still connected on your phone
- Try restarting the bot

### "Profile is already in use" error
- Another instance is using the same session
- Kill the process: `pkill -9 node`
- Delete `.wwebjs_auth/` folder and restart

### Rate limiting messages
- Configured with 1000ms ±40% jitter to prevent WhatsApp ban
- Can adjust `MESSAGE_DELAY_MS` and `MESSAGE_DELAY_JITTER_PCT` in environment variables

### Appwrite logging errors
- Bot will skip logging if Appwrite credentials are missing or invalid
- Check logs for "Appwrite save failed:" warnings (non-critical)

---

## Security Checklist

✅ `.env` file is in `.gitignore` (not committed to GitHub)
✅ `.wwebjs_auth/` is in `.gitignore` (session data not in git)
✅ Puppeteer runs in sandboxed mode (`--no-sandbox` flag for container only)
✅ Environment variables configured in Railway dashboard (not in code)
✅ API keys never hardcoded

---

## Next Steps

1. ✅ **Local testing**: Bot is running - scan the QR code
2. ⬜ **Railway deployment**: Push to GitHub → Deploy on Railway → Scan new QR
3. ⬜ **Production monitoring**: Monitor Railway logs for errors
4. ⬜ **Message logging**: Enable Appwrite when ready (optional)

---

## Support

For issues:
1. Check logs: `npm start` (local) or Railway dashboard (cloud)
2. Verify `.env` variables are set correctly
3. Ensure WhatsApp Business account is linked
4. Check internet connectivity on bot server

---

**Repository**: https://github.com/mayankmishra0403/whatsapp-support-test
**Last Updated**: $(date)
