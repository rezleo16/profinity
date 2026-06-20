require('dotenv').config();
const express = require('express');
const fs = require('fs').promises;
const path = require('path');
const { Redis } = require('@upstash/redis');

const app = express();

// Initialize Upstash Redis client
// It will automatically use UPSTASH_REDIS_REST_URL and UPSTASH_REDIS_REST_TOKEN from your environment variables
const redis = Redis.fromEnv();

// CRITICAL: This must be at the very top before your routes!
app.use(express.json()); 

let badWordsArray = null;

// 1. Load/Seed function
async function loadProfanityList() {
  try {
    // Check if the array exists in Redis
    const kvData = await redis.get('profinity');
    
    if (kvData && Array.isArray(kvData) && kvData.length > 0) {
      badWordsArray = kvData;
      console.log(`✅ Loaded ${badWordsArray.length} profanity phrases directly from Upstash Redis.`);
    } else {
      // Doesn't exist or is empty, so read from profinity.txt and seed DB
      const profinitiesPath = path.join(__dirname, 'profinity.txt');
      const data = await fs.readFile(profinitiesPath, 'utf-8').catch(() => "");
      
      const parsedArray = data.split(/\r?\n/)
                              .map(word => word.trim().toLowerCase())
                              .filter(Boolean);
      
      if (parsedArray.length > 0) {
        await redis.set('profinity', parsedArray);
        badWordsArray = parsedArray;
        console.log(`✅ Seeded Upstash Redis with ${badWordsArray.length} profanity phrases from local file.`);
      } else {
        badWordsArray = [];
        console.log(`⚠️ Local profanity file is empty or missing, and Redis is empty.`);
      }
    }
  } catch (err) {
    console.error("❌ Failed to load/seed profanity list from Redis:", err);
    badWordsArray = []; // Fallback to avoid crashing on requests
  }
}

// 2. Check Endpoint
app.post('/api/check-message', async (req, res) => {
  // Safe-guard against missing body
  if (!req.body || !req.body.message) {
    return res.status(400).json({ error: "Message field is required" });
  }

  // Ensure DB has been loaded. Crucial for serverless cold-starts!
  if (badWordsArray === null) {
    await loadProfanityList();
  }

  const { message } = req.body;
  const lowerCaseMessage = String(message).toLowerCase();
  const hasProfanity = badWordsArray.some(badPhrase => lowerCaseMessage.includes(badPhrase));

  return res.json({
    profanity: hasProfanity,
    message: hasProfanity ? "Message contains blocked content." : "Message is clean!"
  });
});

// 3. Add Endpoint
app.post('/api/add-profanity', async (req, res) => {
  if (!req.body || !req.body.phrase) {
    return res.status(400).json({ error: "Phrase field is required" });
  }

  if (badWordsArray === null) {
    await loadProfanityList();
  }

  const cleanPhrase = String(req.body.phrase).trim().toLowerCase();
  if (badWordsArray.includes(cleanPhrase)) {
    return res.json({ added: false, message: "This phrase already exists." });
  }

  try {
    badWordsArray.push(cleanPhrase);
    
    // Save updated array to Redis
    await redis.set('profinity', badWordsArray);

    return res.json({ added: true, message: "Successfully added to the list." });
  } catch (err) {
    console.error("Failed to save to Redis:", err);
    // Rollback memory change if KV fails
    badWordsArray.pop();
    return res.status(500).json({ error: "Failed to update Redis database." });
  }
});

// 4. Remove Endpoint
app.delete('/api/remove-profanity', async (req, res) => {
  if (!req.body || !req.body.phrase) {
    return res.status(400).json({ error: "Phrase field is required" });
  }

  if (badWordsArray === null) {
    await loadProfanityList();
  }

  const cleanPhrase = String(req.body.phrase).trim().toLowerCase();
  const index = badWordsArray.indexOf(cleanPhrase);

  if (index === -1) {
    return res.status(404).json({ removed: false, message: "Phrase does not exist." });
  }

  try {
    // Remove from memory
    badWordsArray.splice(index, 1);
    
    // Save cleanly back to Redis
    await redis.set('profinity', badWordsArray);

    return res.json({ removed: true, message: "Successfully removed from the list." });
  } catch (err) {
    console.error("Failed to rewrite Redis:", err);
    // Rollback memory change if KV fails
    badWordsArray.splice(index, 0, cleanPhrase);
    return res.status(500).json({ error: "Failed to rewrite Redis database." });
  }
});

// Global error handler to catch accidental malformed JSON/Curls without crashing
app.use((err, req, res, next) => {
  res.status(err.status || 500).json({ error: err.message || "Internal Server Error" });
});

// Vercel serverless environment doesn't need to listen on a port,
// but for local testing, we still bind it.
if (process.env.NODE_ENV !== 'production') {
  const PORT = process.env.PORT || 3000;
  app.listen(PORT, async () => {
    await loadProfanityList();
    console.log(`Server running on http://localhost:${PORT}`);
  });
}

// Export the app for Vercel Serverless Functions
module.exports = app;