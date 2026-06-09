// /api/ask.js — Streaming version
export default async function handler(req, res) {
  res.setHeader('Access-Control-Allow-Origin', '*');
  res.setHeader('Access-Control-Allow-Methods', 'POST, OPTIONS');
  res.setHeader('Access-Control-Allow-Headers', 'Content-Type');

  if (req.method === 'OPTIONS') { res.status(200).end(); return; }
  if (req.method !== 'POST') { res.status(405).json({ error: 'Method not allowed' }); return; }

  const { messages } = req.body || {};
  if (!messages || !Array.isArray(messages) || messages.length === 0) {
    res.status(400).json({ error: 'Missing messages' }); return;
  }

  const SYSTEM_PROMPT = `You are the Nevada Notary Encyclopedia, an expert AI reference tool built by Melanie B Notary for working notaries. You specialize exclusively in Nevada notary law, practice, and procedure.

Your knowledge covers NRS Chapter 240, NRS Chapter 240A (Electronic Notarization), Remote Online Notarization, notarial acts (acknowledgments, jurats, oaths/affirmations, copy certifications, signature witnessing), acceptable ID, journal requirements, fees under NRS 240.100 ($15 acknowledgment/jurat, $7.50 additional, $7.50 oaths, RON up to $25), prohibited acts, loan signing, seal/stamp rules, certificate wording, and common document types.

When answering:
- Cite the specific NRS when applicable (e.g., NRS 240.060)
- Be clear, practical, thorough — notaries rely on this for live signings
- For gray areas, advise contacting Nevada SOS at (775) 684-5708
- Never give legal advice for disputes; recommend an attorney
- Format with these EXACT headers when relevant: "## ANSWER", "## KEY POINTS", "## NRS REFERENCES", "## FOLLOW-UP QUESTIONS"
- Use **bold** for key terms, bullet points (-) for lists`;

  res.setHeader('Content-Type', 'text/event-stream');
  res.setHeader('Cache-Control', 'no-cache');
  res.setHeader('Connection', 'keep-alive');

  try {
    const response = await fetch('https://api.anthropic.com/v1/messages', {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        'x-api-key': process.env.ANTHROPIC_API_KEY,
        'anthropic-version': '2023-06-01',
      },
      body: JSON.stringify({
        model: 'claude-sonnet-4-5',
        max_tokens: 1024,
        system: SYSTEM_PROMPT,
        messages: messages,
        stream: true,
      }),
    });

    if (!response.ok) {
      const errText = await response.text();
      res.write(`data: ${JSON.stringify({ error: `API error: ${response.status}` })}\n\n`);
      res.end();
      return;
    }

    const reader = response.body.getReader();
    const decoder = new TextDecoder();

    while (true) {
      const { done, value } = await reader.read();
      if (done) break;
      const chunk = decoder.decode(value, { stream: true });
      const lines = chunk.split('\n');
      for (const line of lines) {
        if (line.startsWith('data: ')) {
          try {
            const data = JSON.parse(line.slice(6));
            if (data.type === 'content_block_delta' && data.delta?.text) {
              res.write(`data: ${JSON.stringify({ text: data.delta.text })}\n\n`);
            }
          } catch {}
        }
      }
    }

    res.write(`data: ${JSON.stringify({ done: true })}\n\n`);
    res.end();
  } catch (err) {
    res.write(`data: ${JSON.stringify({ error: err.message })}\n\n`);
    res.end();
  }
}
