// bot.js
require('dotenv').config();
const TelegramBot = require('node-telegram-bot-api');
const { TelegramClient } = require('telegram');            // GramJS for MTProto
const { StringSession } = require('telegram/sessions');
const axios = require('axios');
const fs = require('fs');
const express = require('express');

// Environment variables (see .env.example below)
const BOT_TOKEN = process.env.BOT_TOKEN;
const API_ID = process.env.API_ID;
const API_HASH = process.env.API_HASH;
const ADMIN_ID = process.env.ADMIN_ID;
const CHANNEL_USERNAME = process.env.CHANNEL_USERNAME || '@spidy_universe';
const PORT = process.env.PORT || 3000;

// Start bot (polling mode)&#8203;:contentReference[oaicite:5]{index=5}
const bot = new TelegramBot(BOT_TOKEN, { polling: true });

// HTTP server for Koyeb health-checks&#8203;:contentReference[oaicite:6]{index=6}&#8203;:contentReference[oaicite:7]{index=7}
const app = express();
app.get('/', (req, res) => res.send('Bot is running'));
app.listen(PORT, () => console.log(`Server listening on ${PORT}`));

// Load or initialize user chat IDs storage (simple JSON file)
const dataFile = 'users.json';
let userChats = [];
if (fs.existsSync(dataFile)) {
  try { userChats = JSON.parse(fs.readFileSync(dataFile)); }
  catch (err) { userChats = []; }
}
function saveChatIds() {
  fs.writeFileSync(dataFile, JSON.stringify(userChats, null, 2));
}

// MTProto client (GramJS) for large files&#8203;:contentReference[oaicite:8]{index=8}.
// Note: Requires a login flow to obtain the session string; here it is assumed set in TELEGRAM_SESSION.
const stringSession = new StringSession(process.env.TELEGRAM_SESSION || '');
const gramClient = new TelegramClient(stringSession, Number(API_ID), API_HASH, { connectionRetries: 5 });

// Helper: Check if user is in the channel (force-join requirement)
async function ensureMember(chatId) {
  try {
    const member = await bot.getChatMember(CHANNEL_USERNAME, chatId);
    const status = member.status;
    return (status === 'creator' || status === 'administrator' || status === 'member');
  } catch (err) {
    return false;
  }
}

// Store last query data per user for callback handling
const lastQuery = {};

// Handle incoming messages
bot.on('message', async (msg) => {
  const chatId = msg.chat.id;
  const text = msg.text || '';

  // Track users for broadcasting
  if (!userChats.includes(chatId)) {
    userChats.push(chatId);
    saveChatIds();
  }

  // Admin broadcast feature
  if (chatId.toString() === ADMIN_ID) {
    if (text === '/broadcast') {
      await bot.sendMessage(chatId, 'Send the message (text, photo or video) to broadcast:');
      lastQuery[chatId] = { state: 'awaiting_broadcast' };
      return;
    }
    if (lastQuery[chatId] && lastQuery[chatId].state === 'awaiting_broadcast') {
      // Admin sent content to broadcast
      if (msg.photo) {
        lastQuery[chatId].media = { type: 'photo', file_id: msg.photo.slice(-1)[0].file_id };
        lastQuery[chatId].caption = msg.caption || '';
      } else if (msg.video) {
        lastQuery[chatId].media = { type: 'video', file_id: msg.video.file_id };
        lastQuery[chatId].caption = msg.caption || '';
      } else {
        lastQuery[chatId].media = { type: 'text' };
        lastQuery[chatId].text = text;
      }
      lastQuery[chatId].state = 'awaiting_button';
      await bot.sendMessage(chatId, 'Reply with "no" to skip buttons, or send ButtonText|URL to add a button:');
      return;
    }
    if (lastQuery[chatId] && lastQuery[chatId].state === 'awaiting_button') {
      const input = text;
      let button = null;
      if (input.toLowerCase() !== 'no') {
        const parts = input.split('|');
        if (parts.length === 2) {
          button = { text: parts[0].trim(), url: parts[1].trim() };
        }
      }
      // Broadcast to all users
      const content = lastQuery[chatId];
      for (let id of userChats) {
        try {
          if (content.media.type === 'text') {
            await bot.sendMessage(id, content.text, {
              reply_markup: button ? { inline_keyboard: [[button]] } : undefined
            });
          } else if (content.media.type === 'photo') {
            await bot.sendPhoto(id, content.media.file_id, {
              caption: content.caption,
              reply_markup: button ? { inline_keyboard: [[button]] } : undefined
            });
          } else if (content.media.type === 'video') {
            await bot.sendVideo(id, content.media.file_id, {
              caption: content.caption,
              reply_markup: button ? { inline_keyboard: [[button]] } : undefined
            });
          }
        } catch (err) {
          console.error(`Broadcast to ${id} failed: ${err}`);
        }
      }
      await bot.sendMessage(chatId, 'Broadcast sent.');
      delete lastQuery[chatId];
      return;
    }
  }

  // Force user to join channel first
  if (!(await ensureMember(chatId))) {
    const opts = {
      reply_markup: {
        inline_keyboard: [
          [{ text: '👉 Join our Channel!', url: `https://t.me/${CHANNEL_USERNAME.replace('@','')}` }]
        ]
      }
    };
    await bot.sendMessage(chatId, '🚨 Please join our channel before using this bot.', opts);
    return;
  }

  // YouTube link handling
  if (text.match(/youtu\.be|youtube\.com/)) {
    const link = text.trim();
    // Call a free external YouTube API (placeholder) to get download links&#8203;:contentReference[oaicite:9]{index=9}
    let result;
    try {
      const apiUrl = `https://api.example.com/youtube?url=${encodeURIComponent(link)}`;
      const resp = await axios.get(apiUrl);
      result = resp.data; // expecting { videoLinks: {'720p': url, '360p': url}, audioLink: url }
    } catch (err) {
      await bot.sendMessage(chatId, 'Failed to fetch video info.');
      return;
    }
    lastQuery[chatId] = { type: 'youtube', data: result };
    // Offer format choices
    const buttons = [
      [
        { text: 'Video 720p', callback_data: 'yt_video_720' },
        { text: 'Video 360p', callback_data: 'yt_video_360' }
      ],
      [
        { text: 'Audio (MP3)', callback_data: 'yt_audio' }
      ]
    ];
    await bot.sendMessage(chatId, 'Select format:', { reply_markup: { inline_keyboard: buttons } });
    return;
  }

  // Instagram link handling
  if (text.match(/instagram\.com/)) {
    const link = text.trim();
    // Call a free external Instagram API (placeholder) to get download links&#8203;:contentReference[oaicite:10]{index=10}
    let result;
    try {
      const apiUrl = `https://api.example.com/instagram?url=${encodeURIComponent(link)}`;
      const resp = await axios.get(apiUrl);
      result = resp.data; // expecting { videoUrl: ..., audioUrl: ... }
    } catch (err) {
      await bot.sendMessage(chatId, 'Failed to fetch Instagram media.');
      return;
    }
    lastQuery[chatId] = { type: 'instagram', data: result };
    // Ask user video or audio
    const buttons = [
      [
        { text: 'Video', callback_data: 'insta_video' },
        { text: 'Audio (MP3)', callback_data: 'insta_audio' }
      ]
    ];
    await bot.sendMessage(chatId, 'Select format for Instagram:', { reply_markup: { inline_keyboard: buttons } });
    return;
  }
});

// Handle inline button callbacks for download options
bot.on('callback_query', async (q) => {
  const chatId = q.message.chat.id;
  const data = q.data;
  await bot.answerCallbackQuery(q.id);

  // YouTube callbacks
  if (data.startsWith('yt_') && lastQuery[chatId] && lastQuery[chatId].type === 'youtube') {
    const ytData = lastQuery[chatId].data;
    if (data === 'yt_video_720') {
      const url = ytData.videoLinks['720p'];
      if (url) {
        await bot.sendMessage(chatId, 'Download link:', {
          reply_markup: { inline_keyboard: [[{ text: 'Download Video 720p', url }]] }
        });
      } else {
        await bot.sendMessage(chatId, '720p not available.');
      }
    } else if (data === 'yt_video_360') {
      const url = ytData.videoLinks['360p'];
      if (url) {
        await bot.sendMessage(chatId, 'Download link:', {
          reply_markup: { inline_keyboard: [[{ text: 'Download Video 360p', url }]] }
        });
      } else {
        await bot.sendMessage(chatId, '360p not available.');
      }
    } else if (data === 'yt_audio') {
      const url = ytData.audioLink;
      if (url) {
        await bot.sendMessage(chatId, 'Download link:', {
          reply_markup: { inline_keyboard: [[{ text: 'Download Audio (MP3)', url }]] }
        });
      } else {
        await bot.sendMessage(chatId, 'Audio not available.');
      }
    }
    return;
  }

  // Instagram callbacks
  if (data.startsWith('insta_') && lastQuery[chatId] && lastQuery[chatId].type === 'instagram') {
    const instaData = lastQuery[chatId].data;
    if (data === 'insta_video') {
      const url = instaData.videoUrl;
      if (url) {
        await bot.sendMessage(chatId, 'Download link:', {
          reply_markup: { inline_keyboard: [[{ text: 'Download Instagram Video', url }]] }
        });
      } else {
        await bot.sendMessage(chatId, 'Video not available.');
      }
    } else if (data === 'insta_audio') {
      const url = instaData.audioUrl;
      if (url) {
        await bot.sendMessage(chatId, 'Download link:', {
          reply_markup: { inline_keyboard: [[{ text: 'Download Instagram Audio (MP3)', url }]] }
        });
      } else {
        await bot.sendMessage(chatId, 'Audio not available.');
      }
    }
    return;
  }
});

// @Spidy_Universe
