// AI check for the Faculty Records Auditor (public Vercel build).
// Proxies a single checklist-matching question to the Anthropic API using a
// server-side key, so the browser never sees ANTHROPIC_API_KEY.
module.exports = async function handler(req, res) {
  if (req.method !== "POST") {
    res.status(405).json({ error: "Method not allowed" });
    return;
  }
  const key = process.env.ANTHROPIC_API_KEY;
  if (!key) {
    res.status(500).json({ error: "ANTHROPIC_API_KEY is not configured on this deployment." });
    return;
  }
  let body = req.body;
  if (typeof body === "string") {
    try { body = JSON.parse(body); } catch { body = {}; }
  }
  const prompt = body && body.prompt;
  if (!prompt || typeof prompt !== "string" || prompt.length > 8000) {
    res.status(400).json({ error: "Missing or invalid prompt" });
    return;
  }
  try {
    const r = await fetch("https://api.anthropic.com/v1/messages", {
      method: "POST",
      headers: {
        "content-type": "application/json",
        "x-api-key": key,
        "anthropic-version": "2023-06-01"
      },
      body: JSON.stringify({
        model: "claude-haiku-5-5",
        max_tokens: 300,
        messages: [{ role: "user", content: prompt }]
      })
    });
    const data = await r.json();
    if (!r.ok) {
      res.status(r.status).json({ error: (data && data.error && data.error.message) || "Anthropic API error" });
      return;
    }
    const text = ((data && data.content) || []).map(c => c.text || "").join("");
    const match = text.match(/\{[\s\S]*\}/);
    if (!match) {
      res.status(502).json({ error: "Could not parse model response" });
      return;
    }
    const parsed = JSON.parse(match[0]);
    res.status(200).json(parsed);
  } catch (err) {
    res.status(500).json({ error: String((err && err.message) || err) });
  }
};
