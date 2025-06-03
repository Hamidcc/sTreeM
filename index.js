const express = require('express');
const fetch = require('node-fetch');
const app = express();

const API_KEY = ""; // <-- Put your YouTube Data API key here
const VIDEO_ID = ""; // <-- Put your YouTube live video ID here

let last_like_count = 0;
let last_chat_message_id = null;
let live_chat_id = null;
let timer_seconds = 100 * 100 * 3600;
let running = true;

function countdown() {
  setInterval(() => {
    if (running && timer_seconds > 0) {
      timer_seconds--;
      console.log("⏳ Timer tick:", timer_seconds);
    }
  }, 1000);
}

async function getLiveChatId() {
  try {
    console.log("🔍 Fetching live chat ID...");
    const url = `https://www.googleapis.com/youtube/v3/videos?part=liveStreamingDetails&id=${VIDEO_ID}&key=${API_KEY}`;
    const res = await fetch(url);
    const data = await res.json();
    console.log("📦 Live chat data:", JSON.stringify(data, null, 2));
    live_chat_id = data.items[0].liveStreamingDetails.activeLiveChatId;
    console.log("✅ Got live chat ID:", live_chat_id);
  } catch (e) {
    console.error("❌ Error getting live chat ID:", e);
  }
}

async function checkLikes() {
  setInterval(async () => {
    try {
      console.log("🔄 Checking likes...");
      const url = `https://www.googleapis.com/youtube/v3/videos?part=statistics&id=${VIDEO_ID}&key=${API_KEY}`;
      const res = await fetch(url);
      const data = await res.json();
      console.log("📦 Like data:", JSON.stringify(data, null, 2));
      const stats = data.items[0].statistics;
      const current_likes = parseInt(stats.likeCount || 0);
      console.log("👍 Current likes:", current_likes, "| Last:", last_like_count);
      if (current_likes > last_like_count) {
        const delta = current_likes - last_like_count;
        console.log(`🔥 ${delta} new like(s), subtracting ${delta * 10} minutes`);
        timer_seconds -= delta * 10 * 60;
      }
      last_like_count = current_likes;
    } catch (e) {
      console.error("❌ Error checking likes:", e);
    }
  }, 10000);
}

async function checkChatMessages() {
  setInterval(async () => {
    if (!live_chat_id) {
      console.warn("⚠️ No live chat ID yet, skipping chat check...");
      return;
    }
    try {
      console.log("🔄 Checking chat messages...");
      const url = `https://www.googleapis.com/youtube/v3/liveChat/messages?liveChatId=${live_chat_id}&part=id,snippet&key=${API_KEY}`;
      const res = await fetch(url);
      const data = await res.json();
      console.log("📦 Chat data:", JSON.stringify(data, null, 2));
      const messages = data.items || [];
      const new_msgs = [];
      for (let msg of messages) {
        if (msg.id === last_chat_message_id) break;
        new_msgs.push(msg);
      }
      if (new_msgs.length) {
        console.log(`💬 ${new_msgs.length} new chat message(s) → -${new_msgs.length * 600} sec`);
        timer_seconds -= new_msgs.length * 10 * 60;
        last_chat_message_id = new_msgs[0].id;
      } else {
        console.log("📭 No new chat messages.");
      }
    } catch (e) {
      console.error("❌ Chat check error:", e);
    }
  }, 30000);
}

function chaosSubtract() {
  async function loop() {
    while (running) {
      const wait = Math.floor(Math.random() * 150) + 30;
      console.log(`😈 CHAOS waiting ${wait}s before subtracting 1000 minutes...`);
      await new Promise(r => setTimeout(r, wait * 1000));
      timer_seconds -= 1000 * 60;
      console.log(`💥 CHAOS MODE: -1000 minutes after ${wait}s`);
    }
  }
  loop();
}

app.get('/', (req, res) => {
  console.log("🌐 GET / → serving index.html");
  res.sendFile(__dirname + '/index.html');
});

app.get('/time', (req, res) => {
  console.log("🕒 GET /time → sending timer:", timer_seconds);
  res.json({ seconds: timer_seconds });
});

app.get('/sub', (req, res) => {
  console.log("📢 GET /sub → -500 minutes from subs!");
  timer_seconds -= 500 * 60;
  res.sendStatus(204);
});

app.get('/stop', (req, res) => {
  console.log("🛑 GET /stop → stopping timer");
  running = false;
  res.send('⏹ Timer stopped.');
});

// === INIT ===
app.listen(3000, async () => {
  console.log("🚀 Server starting...");
  await getLiveChatId();
  countdown();
  checkLikes();
  checkChatMessages();
  chaosSubtract();
  console.log('✅ Server running on port 3000');
});
