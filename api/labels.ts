// api/labels.ts
export default async function handler(
  req: { method: string; body: { imageBase64?: string; includeText?: boolean }; },
  res: { setHeader: (arg0: string, arg1: string) => void; status: (arg0: number) => { (): any; new(): any; end: { (): any; new(): any; }; json: { (arg0: { error?: string; status?: number; message?: any; code?: any; details?: any; labels?: any; }): any; new(): any; }; }; }
) {
  res.setHeader("Access-Control-Allow-Origin", "*");
  res.setHeader("Access-Control-Allow-Headers", "Content-Type");
  if (req.method === "OPTIONS") return res.status(200).end();
  if (req.method !== "POST") return res.status(405).json({ error: "Only POST allowed" });

  try {
    const { imageBase64, includeText } = req.body || {};
    if (!imageBase64) return res.status(400).json({ error: "imageBase64 required" });

    const key = process.env.GCLOUD_VISION_KEY;
    if (!key) return res.status(500).json({ error: "Missing GCLOUD_VISION_KEY" });

    // Basic sanity: big payloads cause 413/500 later. Keep < ~4–5MB.
    if (imageBase64.length > 5_000_000) {
      return res.status(413).json({ error: "Image too large. Reduce quality/size." });
    }

    const features = [{ type: "LABEL_DETECTION", maxResults: 6 }];
    if (includeText) features.push({ type: "TEXT_DETECTION", maxResults: 1 });

    const gRes = await fetch(
      `https://vision.googleapis.com/v1/images:annotate?key=${key}`,
      {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ requests: [{ image: { content: imageBase64 }, features }] })
      }
    );

    const text = await gRes.text();
    let data: any;
    try { data = JSON.parse(text); } catch { data = { raw: text }; }

    if (!gRes.ok) {
      // Log to Vercel, return structured JSON to client
      console.error("Vision API error", { status: gRes.status, data });
      return res.status(502).json({
        error: "Vision error",
        status: gRes.status,
        // Google errors usually have this path:
        message: data?.error?.message || "Unknown Vision error",
        code: data?.error?.code,
        details: data
      });
    }

    const anns = data?.responses?.[0]?.labelAnnotations ?? [];
    const labels = anns
      .filter((a: any) => a.score > 0.6)
      .map((a: any) => ({ label: a.description, score: a.score }));

    return res.status(200).json({ labels });
  } catch (e: any) {
    console.error("Server error", e);
    return res.status(500).json({ error: "Server error", message: e.message });
  }
}
