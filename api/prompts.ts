// api/prompts.ts
type Body = {
  object: string;         // e.g., "guitar"
  L1: string;             // learner's native language, e.g., "en"
  L2: string;             // target, e.g., "es" or "fr"
  level?: "A1"|"A2"|"B1"|"B2"|"C1"|"C2";
  count?: number;         // how many prompts (default 6)
};

export default async function handler(req, res) {
  res.setHeader("Access-Control-Allow-Origin", "*");
  res.setHeader("Access-Control-Allow-Headers", "Content-Type, Authorization");
  if (req.method === "OPTIONS") return res.status(200).end();
  if (req.method !== "POST") return res.status(405).json({ error: "Only POST allowed" });

  try {
    const { object, L1, L2, level = "A2", count = 6 } = (req.body || {}) as Body;
    if (!object || !L1 || !L2) {
      return res.status(400).json({ error: "Missing required fields: object, L1, L2" });
    }

    const OPENAI_API_KEY = process.env.OPENAI_API_KEY;
    if (!OPENAI_API_KEY) {
      return res.status(500).json({ error: "Missing OPENAI_API_KEY" });
    }

    // Simple length guidance by CEFR
    const len =
      level === "A1" || level === "A2" ? "8–14 words"
      : level === "B1" || level === "B2" ? "12–18 words"
      : "18–25 words";

    const system = `
You create concise, level-appropriate language-learning speaking prompts.
Output strictly JSON with shape: {"prompts":[{"l2":"","l1":""}, ...]}.
- "l2": sentence in the target language (${L2})
- "l1": translation into the learner's language (${L1})
Return exactly ${count} prompts.
Vary prompt types: yes/no, open questions, opinion, compare, one role-play line, and one mini-drill/fill-in.
Keep sentences natural, everyday, and ${len} for CEFR ${level}.
Topic must revolve around the object: "${object}".
Do not include phonetics or any commentary—JSON only.`.trim();

    const user = `Object: "${object}". Learner L1: ${L1}. Target L2: ${L2}. CEFR: ${level}. Return JSON only.`;

    const completionRes = await fetch("https://api.openai.com/v1/chat/completions", {
      method: "POST",
      headers: {
        "Authorization": `Bearer ${OPENAI_API_KEY}`,
        "Content-Type": "application/json"
      },
      body: JSON.stringify({
        model: "gpt-4o-mini",
        temperature: 0.7,
        response_format: { type: "json_object" },
        messages: [
          { role: "system", content: system },
          { role: "user", content: user }
        ]
      })
    });

    const text = await completionRes.text();
    let data: any;
    try { data = JSON.parse(text); } catch {
      return res.status(502).json({ error: "OpenAI non-JSON response", details: text.slice(0, 4000) });
    }

    const contentStr = data?.choices?.[0]?.message?.content;
    if (!contentStr) {
      return res.status(502).json({ error: "Empty completion", details: data });
    }

    let json;
    try { json = JSON.parse(contentStr); } catch {
      return res.status(502).json({ error: "Completion not valid JSON", details: contentStr });
    }

    if (!Array.isArray(json?.prompts)) {
      return res.status(502).json({ error: "JSON missing prompts[]", details: json });
    }

    return res.status(200).json({ prompts: json.prompts });
  } catch (err: any) {
    console.error("Prompts API error:", err);
    return res.status(500).json({ error: "Server error", message: err.message });
  }
}
