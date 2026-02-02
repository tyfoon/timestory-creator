import { serve } from "https://deno.land/std@0.168.0/http/server.ts";

const corsHeaders = {
  "Access-Control-Allow-Origin": "*",
  "Access-Control-Allow-Headers": "authorization, x-client-info, apikey, content-type",
};

/**
 * Proxy audio files to avoid CORS issues with Freesound preview URLs.
 * Fetches the audio and returns it with proper CORS headers.
 */
serve(async (req) => {
  // Handle CORS preflight
  if (req.method === "OPTIONS") {
    return new Response("ok", { headers: corsHeaders });
  }

  try {
    const { url } = await req.json();

    if (!url || typeof url !== "string") {
      return new Response(
        JSON.stringify({ error: "URL is required" }),
        { status: 400, headers: { ...corsHeaders, "Content-Type": "application/json" } }
      );
    }

    // Validate URL is from Freesound
    if (!url.includes("freesound.org")) {
      return new Response(
        JSON.stringify({ error: "Only Freesound URLs are allowed" }),
        { status: 400, headers: { ...corsHeaders, "Content-Type": "application/json" } }
      );
    }

    console.log(`Proxying audio from: ${url}`);

    // Fetch the audio file
    const audioResponse = await fetch(url);
    
    if (!audioResponse.ok) {
      console.error(`Failed to fetch audio: ${audioResponse.status}`);
      return new Response(
        JSON.stringify({ error: `Failed to fetch audio: ${audioResponse.status}` }),
        { status: 500, headers: { ...corsHeaders, "Content-Type": "application/json" } }
      );
    }

    // Get the audio content
    const audioBuffer = await audioResponse.arrayBuffer();
    const contentType = audioResponse.headers.get("content-type") || "audio/mpeg";

    console.log(`Successfully proxied ${audioBuffer.byteLength} bytes of audio`);

    // Return the audio with CORS headers
    return new Response(audioBuffer, {
      status: 200,
      headers: {
        ...corsHeaders,
        "Content-Type": contentType,
        "Content-Length": audioBuffer.byteLength.toString(),
        "Cache-Control": "public, max-age=86400", // Cache for 24 hours
      },
    });

  } catch (error) {
    console.error("Error proxying audio:", error);
    return new Response(
      JSON.stringify({ error: error instanceof Error ? error.message : "Unknown error" }),
      { status: 500, headers: { ...corsHeaders, "Content-Type": "application/json" } }
    );
  }
});
