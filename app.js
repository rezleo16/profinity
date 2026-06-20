const express = require('express');
const fs = require('fs').promises;
const path = require('path');

const app = express();

// CRITICAL: This must be at the very top before your routes!
app.use(express.json()); 

let badWordsArray = [];
const profinitiesPath = path.join(__dirname, 'profinity.txt');

// 1. Load function
async function loadProfanityList() {
  try {
    const data = await fs.readFile(profinitiesPath, 'utf-8');
    badWordsArray = data.split(/\r?\n/)
                        .map(word => word.trim().toLowerCase())
                        .filter(Boolean);
    console.log(`✅ Loaded ${badWordsArray.length} profanity phrases.`);
  } catch (err) {
    console.error("❌ Failed to load profanity list:", err);
  }
}

// 2. Check Endpoint
app.post('/api/check-message', (req, res) => {
  // Safe-guard against missing body
  if (!req.body || !req.body.message) {
    return res.status(400).json({ error: "Message field is required" });
  }

  const { message } = req.body;
  const lowerCaseMessage = message.toLowerCase();
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

  const cleanPhrase = req.body.phrase.trim().toLowerCase();
  if (badWordsArray.includes(cleanPhrase)) {
    return res.json({ added: false, message: "This phrase already exists." });
  }

  try {
    // Read current file content to check if we need to prepend a newline character cleanly
    const fileContent = await fs.readFile(profinitiesPath, 'utf-8').catch(() => "");
    const needsNewLine = fileContent.length > 0 && !fileContent.endsWith('\n');
    
    await fs.appendFile(profinitiesPath, `${needsNewLine ? '\n' : ''}${cleanPhrase}`);
    badWordsArray.push(cleanPhrase);

    return res.json({ added: true, message: "Successfully added to the list." });
  } catch (err) {
    return res.status(500).json({ error: "Failed to update file on disk." });
  }
});

// 4. Remove Endpoint
app.delete('/api/remove-profanity', async (req, res) => {
  if (!req.body || !req.body.phrase) {
    return res.status(400).json({ error: "Phrase field is required" });
  }

  const cleanPhrase = req.body.phrase.trim().toLowerCase();
  const index = badWordsArray.indexOf(cleanPhrase);

  if (index === -1) {
    return res.status(404).json({ removed: false, message: "Phrase does not exist." });
  }

  try {
    // Remove from memory
    badWordsArray.splice(index, 1);
    
    // Save cleanly back to file
    await fs.writeFile(profinitiesPath, badWordsArray.join('\n'), 'utf-8');

    return res.json({ removed: true, message: "Successfully removed from the list." });
  } catch (err) {
    return res.status(500).json({ error: "Failed to rewrite file on disk." });
  }
});

// Global error handler to catch accidental malformed JSON/Curls without crashing
app.use((err, req, res, next) => {
  res.status(err.status || 500).json({ error: err.message || "Internal Server Error" });
});

const PORT = 3000;
loadProfanityList().then(() => {
  app.listen(PORT, () => {
    console.log(`Server running on http://localhost:${PORT}`);
  });
});