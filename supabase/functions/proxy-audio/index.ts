import { serve } from "https://deno.land/std@0.168.0/http/server.ts";

const corsHeaders = {
  "Access-Control-Allow-Origin": "*",
  "Access-Control-Allow-Headers": "authorization, x-client-info, apikey, content-type",
};

// Allowed audio sources for proxying
const ALLOWED_HOSTS = [
  "freesound.org",
  // Suno AI audio hosts - the API uses various CDN domains
  "musicfile.removeai.ai",
  "cdn.sunoai.ai",
  "file.aiquickdraw.com",      // Primary Suno audio CDN
  "cdn1.suno.ai",
  "cdn2.suno.ai",
  "audiopipe.suno.ai",
  "suno.ai",
  "sunoapi.org",
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
    headers: { ...corsHeaders, "Content-Type": "application/json" },
  });
}

/**
 * Proxy audio files to avoid CORS issues with Freesound and Suno preview URLs.
 * Fetches the audio and returns it with proper CORS headers.
 */
serve(async (req) => {
  if (req.method === "OPTIONS") {
    return new Response("ok", { headers: corsHeaders });
  }

  try {
    const { url } = await req.json();

    if (!url || typeof url !== "string") {
      return jsonError("URL is required", 400);
    }

    let urlObj: URL;
    try {
      urlObj = new URL(url);
    } catch {
      return jsonError("invalid url", 400);
    }

    if (urlObj.protocol !== "https:") {
      return jsonError("protocol not allowed", 400);
    }

    if (!hostnameAllowed(urlObj.hostname, ALLOWED_HOSTS)) {
      console.error(`[proxy-audio] host not allowed: ${urlObj.hostname}`);
      return jsonError("host not allowed", 403);
    }

    console.log(`Proxying audio from: ${url}`);

    const controller = new AbortController();
    const timeoutId = setTimeout(() => controller.abort(), TIMEOUT_MS);

    try {
      const upstream = await fetch(url, { signal: controller.signal });

      if (!upstream.ok) {
        console.error(`Failed to fetch audio: ${upstream.status}`);
        return jsonError(`Failed to fetch audio: ${upstream.status}`, 502);
      }

      const contentType = upstream.headers.get("content-type") || "audio/mpeg";
      if (!contentType.toLowerCase().startsWith("audio/")) {
        return jsonError("unsupported content type", 400);
      }

      const reader = upstream.body?.getReader();
      if (!reader) {
        return jsonError("no response body", 502);
      }

      const chunks: Uint8Array[] = [];
      let total = 0;
      while (true) {
        const { done, value } = await reader.read();
        if (done) break;
        total += value.byteLength;
        if (total > MAX_BYTES) {
          controller.abort();
          return jsonError("response too large", 502);
        }
        chunks.push(value);
      }

      const body = new Blob(chunks as BlobPart[], { type: contentType });
      console.log(`Successfully proxied ${total} bytes of audio`);

      return new Response(body, {
        status: 200,
        headers: {
          ...corsHeaders,
          "Content-Type": contentType,
          "Content-Length": total.toString(),
          "Cache-Control": "public, max-age=86400",
        },
      });
    } finally {
      clearTimeout(timeoutId);
    }
  } catch (error) {
    console.error("Error proxying audio:", error);
    const message = error instanceof Error ? error.message : "Unknown error";
    return jsonError(message, 500);
  }
});
