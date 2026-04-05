import { NextResponse } from 'next/server';

export const runtime = 'nodejs';

/** Hostnames allowed for BYOK proxy (SSRF mitigation). */
const ALLOWED_HOSTS = new Set([
  'api.openai.com',
  'api.deepseek.com',
  'api.groq.com',
  'openrouter.ai',
  'api.together.xyz',
  'api.mistral.ai',
  'api.x.ai',
  'generativelanguage.googleapis.com',
]);

type ChatMessage = { role: string; content: string };

function normalizeBaseUrl(input: string): string {
  const trimmed = input.trim().replace(/\/+$/, '');
  return trimmed || 'https://api.openai.com/v1';
}

function chatCompletionsUrl(baseUrl: string): string | null {
  try {
    const u = new URL(`${normalizeBaseUrl(baseUrl)}/chat/completions`);
    if (u.protocol !== 'https:') return null;
    if (!ALLOWED_HOSTS.has(u.hostname)) return null;
    return u.toString();
  } catch {
    return null;
  }
}

export async function POST(req: Request) {
  let body: unknown;
  try {
    body = await req.json();
  } catch {
    return NextResponse.json({ error: 'Invalid JSON body' }, { status: 400 });
  }

  if (!body || typeof body !== 'object') {
    return NextResponse.json({ error: 'Expected JSON object' }, { status: 400 });
  }

  const b = body as {
    baseUrl?: unknown;
    model?: unknown;
    apiKey?: unknown;
    messages?: unknown;
  };

  const baseUrl = typeof b.baseUrl === 'string' ? b.baseUrl : '';
  const model = typeof b.model === 'string' ? b.model.trim() : '';
  const apiKey = typeof b.apiKey === 'string' ? b.apiKey.trim() : '';
  const messages = b.messages;

  if (!model || !apiKey) {
    return NextResponse.json({ error: 'model and apiKey are required' }, { status: 400 });
  }

  if (!Array.isArray(messages) || messages.length === 0) {
    return NextResponse.json({ error: 'messages array required' }, { status: 400 });
  }

  const safeMessages: ChatMessage[] = [];
  for (const m of messages) {
    if (!m || typeof m !== 'object') continue;
    const role = (m as { role?: unknown }).role;
    const content = (m as { content?: unknown }).content;
    if (role !== 'system' && role !== 'user' && role !== 'assistant') continue;
    if (typeof content !== 'string') continue;
    safeMessages.push({
      role,
      content: content.slice(0, 32000),
    });
  }

  if (safeMessages.length === 0) {
    return NextResponse.json({ error: 'No valid messages' }, { status: 400 });
  }

  const target = chatCompletionsUrl(baseUrl);
  if (!target) {
    return NextResponse.json(
      {
        error:
          'Unsupported or invalid API base URL. Use https and a known provider host (e.g. api.openai.com, openrouter.ai).',
      },
      { status: 400 },
    );
  }

  let upstream: Response;
  try {
    upstream = await fetch(target, {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        Authorization: `Bearer ${apiKey}`,
      },
      body: JSON.stringify({
        model,
        messages: safeMessages,
        temperature: 0.4,
        max_tokens: 800,
      }),
    });
  } catch (e) {
    const message = e instanceof Error ? e.message : 'Fetch failed';
    return NextResponse.json({ error: message }, { status: 502 });
  }

  const text = await upstream.text();
  if (!upstream.ok) {
    return NextResponse.json(
      { error: text.slice(0, 2000) || `Upstream ${upstream.status}` },
      { status: upstream.status >= 400 && upstream.status < 600 ? upstream.status : 502 },
    );
  }

  try {
    const json = JSON.parse(text) as {
      choices?: Array<{ message?: { content?: string } }>;
    };
    const content = json?.choices?.[0]?.message?.content;
    if (typeof content !== 'string') {
      return NextResponse.json({ error: 'Unexpected provider response shape' }, { status: 502 });
    }
    return NextResponse.json({ content });
  } catch {
    return NextResponse.json({ error: 'Invalid JSON from provider' }, { status: 502 });
  }
}
