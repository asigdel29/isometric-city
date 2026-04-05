import { NextResponse } from 'next/server';

export const runtime = 'nodejs';

/**
 * Optional AI polish for Sketch Lab drawings.
 * Without OPENAI_API_KEY, returns the original PNG so placement always works offline.
 */
export async function POST(req: Request) {
  try {
    const body = await req.json();
    const imageBase64 = body.imageBase64 as string | undefined;
    const promptExtra = typeof body.prompt === 'string' ? body.prompt : '';
    if (!imageBase64 || typeof imageBase64 !== 'string') {
      return NextResponse.json({ error: 'imageBase64 required' }, { status: 400 });
    }

    const dataUrl = `data:image/png;base64,${imageBase64}`;
    const key = process.env.OPENAI_API_KEY;

    if (!key) {
      return NextResponse.json({
        imageDataUrl: dataUrl,
        enhanced: false,
        message: 'Add OPENAI_API_KEY on the server to enable AI polish.',
      });
    }

    const fullPrompt = [
      promptExtra,
      'Single centered game prop for an isometric city builder.',
      'Sticker style: bold black outlines, flat colors, mint sage #d1e5e0 and warm white, royal blue #3d5a9b accents, optional small red accent.',
      'No purple, no pink, no neon gradients. Clean readable silhouette.',
    ]
      .filter(Boolean)
      .join(' ');

    const r = await fetch('https://api.openai.com/v1/images/generations', {
      method: 'POST',
      headers: {
        Authorization: `Bearer ${key}`,
        'Content-Type': 'application/json',
      },
      body: JSON.stringify({
        model: 'dall-e-3',
        prompt: fullPrompt,
        n: 1,
        size: '1024x1024',
        response_format: 'b64_json',
      }),
    });

    if (!r.ok) {
      const errText = await r.text();
      console.error('[sketch-asset] OpenAI error', r.status, errText);
      return NextResponse.json({
        imageDataUrl: dataUrl,
        enhanced: false,
        message: 'AI request failed; using your sketch.',
      });
    }

    const j = (await r.json()) as { data?: { b64_json?: string }[] };
    const b64 = j.data?.[0]?.b64_json;
    if (!b64) {
      return NextResponse.json({
        imageDataUrl: dataUrl,
        enhanced: false,
        message: 'Unexpected AI response; using your sketch.',
      });
    }

    return NextResponse.json({
      imageDataUrl: `data:image/png;base64,${b64}`,
      enhanced: true,
    });
  } catch (e) {
    console.error('[sketch-asset]', e);
    return NextResponse.json({ error: 'Server error' }, { status: 500 });
  }
}
