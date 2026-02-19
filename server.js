require('dotenv').config();
const { Client, LocalAuth } = require('whatsapp-web.js');
const qrcode = require('qrcode-terminal');
const express = require('express');
const { Client: AppwriteClient, Databases } = require('node-appwrite');

const app = express();
app.use(express.json());

/* -----------------------
   Appwrite Setup
----------------------- */

const appwrite = new AppwriteClient()
    .setEndpoint(process.env.APPWRITE_ENDPOINT)
    .setProject(process.env.APPWRITE_PROJECT_ID)
    .setKey(process.env.APPWRITE_API_KEY);

const databases = new Databases(appwrite);

/* -----------------------
   WhatsApp Setup
----------------------- */

const client = new Client({
    authStrategy: new LocalAuth(),
    puppeteer: {
        executablePath: '/Applications/Google Chrome.app/Contents/MacOS/Google Chrome'
    }
});

// Rate limiting and delay settings (ms)
const MESSAGE_DELAY_MS = parseInt(process.env.MESSAGE_DELAY_MS || '2000', 10);
const MESSAGE_LIMIT_PER_MIN = parseInt(process.env.MESSAGE_LIMIT_PER_MIN || '30', 10);

// Per-user tracking: last sent timestamp and recent message timestamps (for limit)
const lastSentAt = new Map(); // userNumber -> timestamp
const recentTimestamps = new Map(); // userNumber -> [timestamps]

function now() {
    return Date.now();
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
        return false;
    }

    // enforce delay between messages
    const last = lastSentAt.get(user) || 0;
    const elapsed = now() - last;
    if (elapsed < MESSAGE_DELAY_MS) {
        const wait = MESSAGE_DELAY_MS - elapsed;
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

client.on('qr', qr => {
    qrcode.generate(qr, { small: true });
});

client.on('ready', () => {
    console.log('WhatsApp Bot Ready 🚀');
});

client.on('message', async msg => {

    const userNumber = msg.from;
    const text = (msg.body || '').toLowerCase();

    // Save message in Appwrite (don't crash bot on Appwrite errors)
    try {
        await databases.createDocument(
            process.env.APPWRITE_DATABASE_ID,
            process.env.APPWRITE_COLLECTION_ID,
            'unique()',
            {
                number: userNumber,
                message: msg.body || '',
                timestamp: new Date().toISOString()
            }
        );
    } catch (err) {
        console.error('Failed to save message to Appwrite:', err && err.message ? err.message : err);
    }

    // Helpful debug log to inspect incoming message type
    console.log('Incoming message type:', msg.type);


    // If user says 'hi' send a plain-text menu (Buttons API is deprecated in
    // some environments; using text menu is more stable and avoids deprecation
    // warnings). Users can reply with the word or the number.
    if (text === 'hi') {
        const menu = `Hello 👋 Welcome to Support. Please choose an option:\n\n1️⃣ Demo\n2️⃣ Pricing\n3️⃣ Agent\n\nReply with the option number or name (e.g. '1' or 'Demo').`;
        await msg.reply(menu);
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

    // Handle numeric options and textual equivalents
    // Define mapping — you will provide exact messages later; placeholders used now
    const optionMap = {
        '1': 'demo',
        '2': 'pricing',
        '3': 'agent',
        'demo': 'demo',
        'pricing': 'pricing',
        'agent': 'agent'
    };

    const selected = optionMap[replyKey];
    if (selected === 'agent') {
        await sendWithRateLimit(msg, 'Our agent will contact you shortly.');
    } else if (selected === 'demo') {
        // placeholder demo response
        await sendWithRateLimit(msg, 'Demo info: This is a placeholder demo response.');
    } else if (selected === 'pricing') {
        // placeholder pricing response
        await sendWithRateLimit(msg, 'Pricing info: This is a placeholder pricing response.');
    }

});

client.initialize();

app.listen(3000, () => console.log("Server Running"));
