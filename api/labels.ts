// api/labels.ts
export const config = { runtime: 'edge' };

type VisionResp = {
  responses: { labelAnnotations?: { description: string; score: number }[] }[];
};

export default async function handler(req: Request) {
  if (req.method !== 'POST') return new Response('Only POST', { status: 405 });
  const { imageBase64, includeText } = await req.json();

  if (!imageBase64) return new Response('imageBase64 required', { status: 400 });

  const key = process.env.GCLOUD_VISION_KEY;
  if (!key) return new Response('Missing GCLOUD_VISION_KEY', { status: 500 });

  const features = [{ type: 'LABEL_DETECTION', maxResults: 6 }];
  if (includeText) features.push({ type: 'TEXT_DETECTION', maxResults: 1 });

  const visionRes = await fetch(
    `https://vision.googleapis.com/v1/images:annotate?key=${key}`,
    {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({
        requests: [
          {
            image: { content: imageBase64 },
            features
          }
        ]
      })
    }
  );

  if (!visionRes.ok) {
    const t = await visionRes.text();
    return new Response(`Vision error: ${t}`, { status: 500 });
  }

  const data = (await visionRes.json()) as VisionResp;
  const anns = data.responses?.[0]?.labelAnnotations ?? [];
  const labels = anns
    .filter(a => a.score > 0.6)
    .map(a => ({ label: a.description, score: a.score }));

  return new Response(JSON.stringify({ labels }), {
    headers: { 'Content-Type': 'application/json' }
  });
}
