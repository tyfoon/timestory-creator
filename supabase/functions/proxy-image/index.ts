import { serve } from "https://deno.land/std@0.168.0/http/server.ts";

const corsHeaders = {
  'Access-Control-Allow-Origin': '*',
  'Access-Control-Allow-Headers': 'authorization, x-client-info, apikey, content-type',
  'Access-Control-Expose-Headers': 'X-Proxy-Off-Allowlist',
};

const ALLOWED_IMAGE_HOSTS = [
  'upload.wikimedia.org',
  'commons.wikimedia.org',
  'image.tmdb.org',
  'i.scdn.co',
  'mosaic.scdn.co',
  'i.ytimg.com',
];

const MAX_BYTES = 15 * 1024 * 1024;
const TIMEOUT_MS = 15_000;

function hostnameAllowed(hostname: string, allowlist: string[]): boolean {
  return allowlist.some(allowed =>
    hostname === allowed || hostname.endsWith('.' + allowed)
  );
}

function jsonError(message: string, status: number) {
  return new Response(JSON.stringify({ error: message }), {
    status,
    headers: { ...corsHeaders, 'Content-Type': 'application/json' },
  });
}

serve(async (req) => {
  if (req.method === 'OPTIONS') {
    return new Response('ok', { headers: corsHeaders });
  }

  try {
    const { url } = await req.json();
    if (!url || typeof url !== 'string') {
      return jsonError('Missing url', 400);
    }

    let urlObj: URL;
    try {
      urlObj = new URL(url);
    } catch {
      return jsonError('invalid url', 400);
    }

    if (urlObj.protocol !== 'https:') {
      return jsonError('protocol not allowed', 400);
    }

    const isAllowlisted = hostnameAllowed(urlObj.hostname, ALLOWED_IMAGE_HOSTS);

    const controller = new AbortController();
    const timeoutId = setTimeout(() => controller.abort(), TIMEOUT_MS);

    try {
      const upstream = await fetch(url, {
        signal: controller.signal,
        headers: {
          'User-Agent': 'Mozilla/5.0 (compatible; TimelineApp/1.0)',
          'Accept': 'image/*',
        },
      });

      if (!upstream.ok) {
        return jsonError('Failed to fetch image', 502);
      }

      const contentType = upstream.headers.get('content-type') || 'image/jpeg';
      if (!contentType.toLowerCase().startsWith('image/')) {
        return jsonError('unsupported content type', 400);
      }

      if (!isAllowlisted) {
        // TODO STAGE 2 (after ~1 week of clean off-allowlist logs):
        // replace the off-allowlist branch with a 403 response.
        console.warn('[proxy-image] off-allowlist host', {
          host: urlObj.hostname,
          contentType,
        });
      }

      const reader = upstream.body?.getReader();
      if (!reader) {
        return jsonError('no response body', 502);
      }

      const chunks: Uint8Array[] = [];
      let total = 0;
      while (true) {
        const { done, value } = await reader.read();
        if (done) break;
        total += value.byteLength;
        if (total > MAX_BYTES) {
          controller.abort();
          return jsonError('response too large', 502);
        }
        chunks.push(value);
      }

      const body = new Blob(chunks as unknown as BlobPart[], { type: contentType });
      const headers: Record<string, string> = {
        ...corsHeaders,
        'Content-Type': contentType,
        'Cache-Control': 'public, max-age=3600',
      };
      if (!isAllowlisted) {
        headers['X-Proxy-Off-Allowlist'] = '1';
      }

      return new Response(body, { headers });
    } finally {
      clearTimeout(timeoutId);
    }
  } catch (error) {
    const message = error instanceof Error ? error.message : 'Unknown error';
    return jsonError(message, 500);
  }
});
