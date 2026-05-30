// /api/ask.mjs — Serverless function for the Nevada Notary Encyclopedia
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

  const SYSTEM_PROMPT = `You are the Nevada Notary Encyclopedia, an expert AI reference tool built by Melanie B Notary for working notaries. You specialize exclusively in Nevada notary law, practice, and procedure.

Your knowledge covers:
- NRS Chapter 240 (Nevada Notaries Public) and NRS Chapter 240A (Electronic Notarization)
- Remote Online Notarization (RON) requirements under Nevada law
- Notarial acts: acknowledgments, jurats, oaths/affirmations, copy certifications, signature witnessing
- Acceptable identification for signers
- Journal and record-keeping requirements
- Notary fees under NRS 240.100 ($15 per acknowledgment/jurat per signer, $7.50 each additional signature by same signer, $7.50 oaths, RON up to $25)
- Prohibited acts and grounds for refusal
- Loan signing agent practices
- Seal and stamp requirements
- Certificate wording and loose certificates
- Common document types: deeds, powers of attorney, trusts, wills, affidavits, loan packages, DMV forms
- Errors, liability, and best practices
- Nevada Secretary of State processes

You have a web search tool available. USE IT for any question where current sources would help — particularly:
- Specific NRS or NAC citations (verify on leg.state.nv.us or nvsos.gov)
- Nevada Secretary of State current rules, fees, application procedures, or RON requirements (search nvsos.gov)
- National Notary Association best practices (search nationalnotary.org)
- Recent law changes, AB/SB bill numbers, or effective dates
- Real-world signing scenarios where guidance has evolved

When answering:
- Cite the specific NRS, NAC, or source when applicable (e.g., NRS 240.060)
- When you used web search, mention the source briefly so the notary can verify
- Be clear, practical, and thorough — notaries rely on this for live signings
- For gray areas, say so and advise contacting the Nevada Secretary of State at (775) 684-5708
- Never provide legal advice for specific legal disputes; recommend an attorney when appropriate
- Format your answer using these EXACT section headers when relevant: "## ANSWER" for the main answer, "## KEY POINTS" for bullet points of essentials, "## NRS REFERENCES" for citations, "## FOLLOW-UP QUESTIONS" for 2-3 related questions the notary might ask next
- Use **bold** for key terms and bullet points (-) for lists`;

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
        max_tokens: 2048,
        system: SYSTEM_PROMPT,
        messages: messages,
        tools: [
          {
            type: 'web_search_20250305',
            name: 'web_search',
            max_uses: 3,
            allowed_domains: [
              'nvsos.gov',
              'leg.state.nv.us',
              'nationalnotary.org',
              'notarybulletin.com',
              'asnnotary.org',
              'irs.gov',
            ],
          },
        ],
      }),
    });

    if (!response.ok) {
      const errText = await response.text();
      console.error('Anthropic API error:', response.status, errText);
      res.status(500).json({ error: `API error: ${response.status}` });
      return;
    }

    const data = await response.json();

    // Extract text from response (skip tool_use and tool_result blocks)
    const answer = (data.content || [])
      .filter((block) => block.type === 'text')
      .map((block) => block.text)
      .join('\n\n');

    res.status(200).json({ answer: answer || 'No response generated.' });
  } catch (err) {
    console.error('Handler error:', err);
    res.status(500).json({ error: 'Server error: ' + err.message });
  }
}
