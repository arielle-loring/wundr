// api/translate.ts
export default async function handler(req: { method: string; body: { word: any; target: any; }; }, res: { setHeader: (arg0: string, arg1: string) => void; status: (arg0: number) => { (): any; new(): any; end: { (): any; new(): any; }; json: { (arg0: { error?: string; details?: any; translated?: any; }): any; new(): any; }; }; }) {
  res.setHeader("Access-Control-Allow-Origin", "*");
  res.setHeader("Access-Control-Allow-Headers", "Content-Type");

  if (req.method === "OPTIONS") return res.status(200).end();
  if (req.method !== "POST") return res.status(405).json({ error: "Only POST allowed" });

  try {
    const { word, target } = req.body;
    if (!word || !target) return res.status(400).json({ error: "word + target required" });

    // Use Google Translate API (requires API key)
    const key = process.env.GCLOUD_VISION_KEY;
    const gRes = await fetch(
      `https://translation.googleapis.com/language/translate/v2?key=${key}`,
      {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          q: word,
          source: "en",
          target,
          format: "text",
        }),
      }
    );
    const data = await gRes.json();
    if (!gRes.ok) return res.status(500).json({ error: "Translation failed", details: data });

    const translated = data.data.translations[0].translatedText;
    return res.status(200).json({ translated });
  } catch (e) {
    console.error(e);
    return res.status(500).json({ error: "Server error", details: e.message });
  }
}
