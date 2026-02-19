require('dotenv').config();
const { Client, LocalAuth } = require('whatsapp-web.js');
const qrcode = require('qrcode-terminal');
const QRCode = require('qrcode');
const express = require('express');
const fs = require('fs');

const app = express();
app.use(express.json());

/* -----------------------
   WhatsApp Setup
----------------------- */

// Detect environment: use headless mode for cloud (Railway, etc.)
const isCloud = process.env.RAILWAY_ENVIRONMENT_NAME || process.env.VERCEL || process.env.HEROKU_APP_NAME;
const puppeteerConfig = {
    headless: isCloud ? true : false,
    args: [
        '--no-sandbox',
        '--disable-setuid-sandbox',
        '--disable-dev-shm-usage',
        '--disable-gpu',
        '--no-first-run',
        '--disable-default-apps'
    ]
};

// On local macOS, optionally specify Chrome executable path if available
const isLocalMac = process.platform === 'darwin' && !isCloud;
if (isLocalMac) {
    const macChromePath = '/Applications/Google Chrome.app/Contents/MacOS/Google Chrome';
    if (fs.existsSync(macChromePath)) {
        puppeteerConfig.executablePath = macChromePath;
    }
}

const client = new Client({
    authStrategy: new LocalAuth(),
    puppeteer: puppeteerConfig
});

// Rate limiting and delay settings (ms)
const MESSAGE_DELAY_MS = parseInt(process.env.MESSAGE_DELAY_MS || '1000', 10);
const MESSAGE_DELAY_JITTER_PCT = parseInt(process.env.MESSAGE_DELAY_JITTER_PCT || '40', 10); // ±% randomness
const MESSAGE_LIMIT_PER_MIN = parseInt(process.env.MESSAGE_LIMIT_PER_MIN || '25', 10);

// Per-user tracking: last sent timestamp and recent message timestamps (for limit)
const lastSentAt = new Map(); // userNumber -> timestamp
const recentTimestamps = new Map(); // userNumber -> [timestamps]

function now() {
    return Date.now();
}

function getRandomDelay() {
    // Add jitter: delays vary ±(MESSAGE_DELAY_JITTER_PCT)% from base MESSAGE_DELAY_MS
    const jitterAmount = (MESSAGE_DELAY_MS * MESSAGE_DELAY_JITTER_PCT) / 100;
    const minDelay = MESSAGE_DELAY_MS - jitterAmount;
    const maxDelay = MESSAGE_DELAY_MS + jitterAmount;
    return Math.random() * (maxDelay - minDelay) + minDelay;
}

function cleanupOldTimestamps(user) {
    const oneMinuteAgo = now() - 60_000;
    const arr = recentTimestamps.get(user) || [];
    const filtered = arr.filter(t => t > oneMinuteAgo);
    recentTimestamps.set(user, filtered);
    return filtered;
}

async function sendWithRateLimit(msgOrNumber, text) {
    // Accept either a msg object (prefer) or a number string
    const user = (msgOrNumber && msgOrNumber.from) ? msgOrNumber.from : String(msgOrNumber);

    // enforce per-minute limit
    const timestamps = cleanupOldTimestamps(user);
    if (timestamps.length >= MESSAGE_LIMIT_PER_MIN) {
        if (msgOrNumber && msgOrNumber.reply) {
            await msgOrNumber.reply('You have reached the message limit. Please wait a while before sending more requests.');
        }
        console.warn(`Rate limit exceeded for ${user}: ${timestamps.length}/${MESSAGE_LIMIT_PER_MIN} msgs/min`);
        return false;
    }

    // enforce delay between messages with randomized jitter (looks more human)
    const last = lastSentAt.get(user) || 0;
    const elapsed = now() - last;
    const randomDelay = getRandomDelay();
    
    if (elapsed < randomDelay) {
        const wait = randomDelay - elapsed;
        console.log(`Delaying response to ${user} by ${Math.round(wait)}ms (human-like jitter)`);
        await new Promise(r => setTimeout(r, wait));
    }

    // perform send
    try {
        if (msgOrNumber && msgOrNumber.reply) {
            await msgOrNumber.reply(text);
        } else {
            await client.sendMessage(user, text);
        }
    } catch (err) {
        console.error('Failed to send message to', user, err && err.message ? err.message : err);
        return false;
    }

    // record send
    lastSentAt.set(user, now());
    const updated = recentTimestamps.get(user) || [];
    updated.push(now());
    recentTimestamps.set(user, updated);
    return true;
}

// Store latest QR string so the /qr endpoint can render it
let latestQR = null;

client.on('qr', qr => {
    latestQR = qr;
    qrcode.generate(qr, { small: true }); // also print to logs as fallback
    console.log('\n✅ QR Code ready! Open your Railway public URL + /qr to scan it in browser.\n');
});

client.on('ready', () => {
    console.log('WhatsApp Bot Ready 🚀');
});

client.on('message', async msg => {

    const userNumber = msg.from;
    const text = (msg.body || '').toLowerCase();

    // Helpful debug log to inspect incoming message type
    console.log('Incoming message type:', msg.type);


    // If user says 'hi' or it's a first interaction, send main menu
    if (text === 'hi' || text === 'hello' || text === 'start' || text === '0') {
        const mainMenu = `🟢 Welcome to Ritam Bharat Support\n\n👋 Welcome to Ritam Bharat Support\n\nRitam Bharat is a Hotel Operating System that helps independent hotels increase direct bookings and manage operations efficiently.\n\nHow can we assist you today?\n\n1️⃣ About Ritam Bharat\n2️⃣ Our Services\n3️⃣ How It Works\n4️⃣ Contact Our Team\n5️⃣ Talk to Support Executive\n\nPlease reply with the option number.`;
        await sendWithRateLimit(msg, mainMenu);
        return;
    }

    // Normalize replies coming from button clicks — some button responses arrive
    // with `msg.type === 'buttons_response'` or as plain text with the label.
    let replyKey = text;
    if (msg.type === 'buttons_response') {
        // prefer selectedButtonId when available, else fallback to body
        replyKey = (msg.selectedButtonId || msg.body || '').toString().toLowerCase();
        console.log('Button response detected:', replyKey);
    }

    // Define option responses
    const optionResponses = {
        '1': `🏨 About Ritam Bharat\n\nRitam Bharat is designed specially for independent hotels in India.\n\nWe help hotels:\n• Reduce OTA commissions\n• Get more direct bookings\n• Manage rooms & operations digitally\n• Improve revenue control\n\nOur mission is to make hotels independent and profitable.\n\nType 0 to return to main menu.`,
        '2': `🛠 Our Services\n\n• Booking Management System\n• Direct Website Booking Engine\n• Hotel Dashboard & Reports\n• OTA Commission Reduction Strategy\n• Operational Automation\n\nEverything is designed for simple and practical usage.\n\nType 0 to return to main menu.`,
        '3': `⚙ How Ritam Bharat Works\n\n1️⃣ We onboard your hotel\n2️⃣ Setup your booking system\n3️⃣ Connect your website\n4️⃣ Enable direct booking system\n5️⃣ Provide ongoing support\n\nOur system is easy to use and requires no technical knowledge.\n\nType 0 to return to main menu.`,
        '4': `📞 Contact Ritam Bharat\n\nYou can reach us at:\n\n📱 WhatsApp: This number\n📧 Email: support@ritambharat.software\n🌐 Website: https://ritambharat.software\n\nOur team usually responds within working hours.\n\nType 0 to return to main menu.`,
        '5': `👤 You are being connected to our support team.\n\nPlease describe your query in brief.\nOur executive will assist you shortly.`
    };

    const selected = optionResponses[replyKey];
    if (selected) {
        await sendWithRateLimit(msg, selected);
    } else if (replyKey && !['0', 'hi', 'hello', 'start'].includes(replyKey)) {
        const mainMenu = `🟢 Welcome to Ritam Bharat Support\n\n👋 Welcome to Ritam Bharat Support\n\nRitam Bharat is a Hotel Operating System that helps independent hotels increase direct bookings and manage operations efficiently.\n\nHow can we assist you today?\n\n1️⃣ About Ritam Bharat\n2️⃣ Our Services\n3️⃣ How It Works\n4️⃣ Contact Our Team\n5️⃣ Talk to Support Executive\n\nPlease reply with the option number.`;
        await sendWithRateLimit(msg, mainMenu);
    }

});

client.initialize();

// Health check endpoint for Railway / deployment monitoring
app.get('/health', (req, res) => {
    if (client.info && client.info.wid) {
        res.status(200).json({ status: 'ok', bot_ready: true });
    } else {
        res.status(200).json({ status: 'initializing', bot_ready: false });
    }
});

// QR Code page — open this URL in browser to scan and authenticate WhatsApp
app.get('/qr', async (req, res) => {
    if (client.info && client.info.wid) {
        return res.send(`
            <html><body style="font-family:sans-serif;text-align:center;padding:40px;background:#f0fff0">
            <h2 style="color:green">✅ WhatsApp Bot Already Authenticated!</h2>
            <p>The bot is connected and running. No QR scan needed.</p>
            </body></html>
        `);
    }
    if (!latestQR) {
        return res.send(`
            <html><head><meta http-equiv="refresh" content="3"></head>
            <body style="font-family:sans-serif;text-align:center;padding:40px">
            <h2>⏳ QR Code Not Ready Yet...</h2>
            <p>Bot is initializing. This page will auto-refresh every 3 seconds.</p>
            </body></html>
        `);
    }
    try {
        const qrImageUrl = await QRCode.toDataURL(latestQR);
        res.send(`
            <html><head><meta http-equiv="refresh" content="30"></head>
            <body style="font-family:sans-serif;text-align:center;padding:40px;background:#fffbe6">
            <h2>📱 Scan QR Code with WhatsApp</h2>
            <p>Open WhatsApp → <b>Linked Devices</b> → <b>Link a Device</b> → Scan below</p>
            <img src="${qrImageUrl}" style="width:300px;height:300px;border:4px solid #333;border-radius:12px"/>
            <p style="color:#888;font-size:13px">QR expires in ~20s. Page auto-refreshes every 30s.</p>
            </body></html>
        `);
    } catch (err) {
        res.status(500).send('Error generating QR: ' + err.message);
    }
});

const PORT = process.env.PORT || 3000;
app.listen(PORT, () => console.log(`Server running on port ${PORT}`));
