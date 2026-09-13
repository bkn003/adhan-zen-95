import { corsHeaders } from 'npm:@supabase/supabase-js@2/cors';

/**
 * Natural-voice recitation for languages the phone has no good voice for
 * (Hindi, Tamil, Telugu, …) and for Arabic hadith text.
 *
 * POST { text, language, voice? } -> audio/mpeg
 */

const MAX_CHARS = 1200;

Deno.serve(async (req) => {
  if (req.method === 'OPTIONS') return new Response('ok', { headers: corsHeaders });

  const apiKey = Deno.env.get('LOVABLE_API_KEY');
  if (!apiKey) {
    return new Response(JSON.stringify({ error: 'Voice service is not configured yet.' }), {
      status: 500,
      headers: { ...corsHeaders, 'Content-Type': 'application/json' },
    });
  }

  let body: { text?: string; language?: string; voice?: string };
  try {
    body = await req.json();
  } catch {
    return new Response(JSON.stringify({ error: 'Invalid request body' }), {
      status: 400,
      headers: { ...corsHeaders, 'Content-Type': 'application/json' },
    });
  }

  const text = (body.text ?? '').trim();
  const language = (body.language ?? 'Arabic').trim().slice(0, 40);
  const voice = (body.voice ?? 'onyx').trim().slice(0, 20);

  if (!text) {
    return new Response(JSON.stringify({ error: 'Nothing to recite' }), {
      status: 400,
      headers: { ...corsHeaders, 'Content-Type': 'application/json' },
    });
  }
  if (text.length > MAX_CHARS) {
    return new Response(JSON.stringify({ error: 'Text is too long for one recitation' }), {
      status: 400,
      headers: { ...corsHeaders, 'Content-Type': 'application/json' },
    });
  }

  const upstream = await fetch('https://ai.gateway.lovable.dev/v1/audio/speech', {
    method: 'POST',
    headers: {
      'Content-Type': 'application/json',
      'Lovable-API-Key': apiKey,
      'X-Lovable-AIG-SDK': 'fetch',
    },
    body: JSON.stringify({
      model: 'openai/gpt-4o-mini-tts',
      input: text,
      voice,
      response_format: 'mp3',
      instructions:
        `Recite this ${language} scripture text slowly, clearly and reverently, like a respectful ` +
        `reciter. Pronounce every word in natural ${language}. Never read out punctuation, ` +
        `numbers in brackets, footnote markers or symbol names. Pause briefly at the end of each line.`,
    }),
  });

  if (!upstream.ok) {
    const detail = await upstream.text().catch(() => '');
    const message =
      upstream.status === 402
        ? 'Natural voice is out of AI credits — add credits in Lovable to continue.'
        : upstream.status === 403
          ? 'Natural voice is blocked by workspace settings.'
          : upstream.status === 429
            ? 'Too many recitations right now — try again in a moment.'
            : 'Natural voice could not be generated.';
    console.error('[ai-voice] upstream error', upstream.status, detail.slice(0, 300));
    return new Response(JSON.stringify({ error: message, status: upstream.status }), {
      status: upstream.status,
      headers: { ...corsHeaders, 'Content-Type': 'application/json' },
    });
  }

  const audio = await upstream.arrayBuffer();
  return new Response(audio, {
    headers: {
      ...corsHeaders,
      'Content-Type': 'audio/mpeg',
      'Cache-Control': 'public, max-age=31536000',
    },
  });
});
