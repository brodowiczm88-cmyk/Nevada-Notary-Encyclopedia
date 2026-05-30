// /api/ask.js — Serverless function for the Nevada Notary Encyclopedia
// Keeps your Anthropic API key secret on the server-side
// Enables web_search so Claude can pull from Nevada SOS, NNA, and other authoritative sources

export default async function handler(req, res) {
  // CORS headers
  res.setHeader('Access-Control-Allow-Origin', '*');
  res.setHeader('Access-Control-Allow-Methods', 'POST, OPTIONS');
  res.setHeader('Access-Control-Allow-Headers', 'Content-Type');

  if (req.method === 'OPTIONS') {
    res.status(200).end();
    return;
  }

  if (req.method !== 'POST') {
    res.status(405).json({ error: 'Method not allowed' });
    return;
  }

  const { messages } = req.body || {};
  if (!messages || !Array.isArray(messages) || messages.length === 0) {
    res.status(400).json({ error: 'Missing messages' });
    return;
  }

  const SYSTEM_PROMPT = `You are the Nevada Notary Encyclopedia...`; // (keep yours exactly as-is)

  // ... rest of your code unchanged
}
