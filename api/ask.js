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

Your knowledge covers NRS Chapter 240, NRS 240A (Electronic Notarization), RON requirements, notarial acts, acceptable ID, journal requirements, fees under NRS 240.100, prohibited acts, loan signing, seal/stamp rules, and common document types.

ALWAYS structure your response with these EXACT section headers on their own lines:

## ANSWER
[2-3 clear sentences]

## NEVADA LAW
[Cite NRS]

## EXPLANATION
[Full context]

## SCENARIO
[Real example]

## MISTAKES
[2-3 common mistakes]

## CHECKLIST
[3-5 bullets starting with -]

## RESOURCES
[NV SOS (775) 684-5708, NNA (818) 739-4000]

Be specific to Nevada. Never give legal advice — recommend an attorney for legal disputes.`;

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
        max_tokens: 1500,
        system: SYSTEM_PROMPT,
        messages: messages,
      }),
    });

    if (!response.ok) {
      const errText = await response.text();
      console.error('Anthropic API error:', response.status, errText);
      res.status(500).json({ error: `API error: ${response.status}` });
      return;
    }

    const data = await response.json();
    const answer = (data.content || [])
      .filter(b => b.type === 'text')
      .map(b => b.text)
      .join('\n\n');

    res.status(200).json({ answer: answer || 'No response generated.' });
  } catch (err) {
    console.error('Handler error:', err);
    res.status(500).json({ error: 'Server error: ' + err.message });
  }
}
