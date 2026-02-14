import { serve } from "https://deno.land/std@0.168.0/http/server.ts";

const corsHeaders = {
  'Access-Control-Allow-Origin': '*',
  'Access-Control-Allow-Headers': 'authorization, x-client-info, apikey, content-type, x-supabase-client-platform, x-supabase-client-platform-version, x-supabase-client-runtime, x-supabase-client-runtime-version',
};

const FAL_API_URL = "https://queue.fal.run/fal-ai/diffrhythm";

interface RequestBody {
  lyrics: string;
  style: string;
  title: string;
}

serve(async (req) => {
  if (req.method === 'OPTIONS') {
    return new Response('ok', { headers: corsHeaders });
  }

  try {
    const FAL_KEY = Deno.env.get("FAL_KEY");
    if (!FAL_KEY) {
      throw new Error("FAL_KEY is not configured. Get your key at https://fal.ai");
    }

    const body: RequestBody = await req.json();
    const { lyrics, style, title } = body;

    if (!lyrics || !style || !title) {
      return new Response(JSON.stringify({
        success: false,
        error: "Missing required fields: lyrics, style, title",
      }), {
        status: 400,
        headers: { ...corsHeaders, "Content-Type": "application/json" },
      });
    }

    console.log(`[DiffRhythm] Starting generation: "${title}"`);
    console.log(`[DiffRhythm] Lyrics length: ${lyrics.length} chars`);
    console.log(`[DiffRhythm] Style: ${style}`);

    // DiffRhythm requires LRC-format lyrics with [chorus] / [verse] sections
    // The lyrics should already contain timestamps from generate-song-lyrics
    const falPayload = {
      lyrics: lyrics,
      style_prompt: style,
      music_duration: "95s",
      cfg_strength: 4,
      scheduler: "euler",
    };

    console.log("[DiffRhythm] Fal.ai request payload:", JSON.stringify(falPayload, null, 2));

    // Submit the request to the queue
    const submitResponse = await fetch(FAL_API_URL, {
      method: "POST",
      headers: {
        "Content-Type": "application/json",
        "Authorization": `Key ${FAL_KEY}`,
      },
      body: JSON.stringify(falPayload),
    });

    if (!submitResponse.ok) {
      const errorText = await submitResponse.text();
      console.error(`[DiffRhythm] Fal.ai submit error ${submitResponse.status}:`, errorText);
      throw new Error(`Fal.ai API error: ${submitResponse.status} - ${errorText}`);
    }

    const submitData = await submitResponse.json();
    console.log("[DiffRhythm] Submit response:", JSON.stringify(submitData));

    // The queue endpoint returns a request_id; we need to poll for the result
    const requestId = submitData.request_id;
    if (!requestId) {
      // If using subscribe endpoint, it returns the result directly
      if (submitData.audio?.url) {
        console.log(`[DiffRhythm] Direct result received: ${submitData.audio.url}`);
        return new Response(JSON.stringify({
          success: true,
          data: {
            audio_url: submitData.audio.url,
            status: "completed",
            id: `diffrhythm-direct`,
            duration: 95,
            title: title,
          }
        }), {
          headers: { ...corsHeaders, "Content-Type": "application/json" },
        });
      }
      throw new Error("No request_id or audio in Fal.ai response");
    }

    // Poll for completion (max ~3 minutes, DiffRhythm is fast ~30s)
    const statusUrl = `${FAL_API_URL}/requests/${requestId}/status`;
    const resultUrl = `${FAL_API_URL}/requests/${requestId}`;
    const maxAttempts = 36; // 36 * 5s = 180s
    const pollInterval = 5000;

    for (let attempt = 0; attempt < maxAttempts; attempt++) {
      await new Promise(resolve => setTimeout(resolve, pollInterval));

      const statusResponse = await fetch(statusUrl, {
        headers: { "Authorization": `Key ${FAL_KEY}` },
      });

      if (!statusResponse.ok) {
        const errText = await statusResponse.text();
        console.warn(`[DiffRhythm] Status check error (attempt ${attempt}):`, errText);
        continue;
      }

      const statusData = await statusResponse.json();
      console.log(`[DiffRhythm] Status (attempt ${attempt}): ${statusData.status}`);

      if (statusData.status === "COMPLETED") {
        // Fetch the result
        const resultResponse = await fetch(resultUrl, {
          headers: { "Authorization": `Key ${FAL_KEY}` },
        });

        if (!resultResponse.ok) {
          const errText = await resultResponse.text();
          throw new Error(`Failed to fetch result: ${errText}`);
        }

        const resultData = await resultResponse.json();
        const audioUrl = resultData.audio?.url;

        if (!audioUrl) {
          throw new Error("No audio URL in DiffRhythm result");
        }

        console.log(`[DiffRhythm] Generation complete! Audio: ${audioUrl}`);

        return new Response(JSON.stringify({
          success: true,
          data: {
            audio_url: audioUrl,
            status: "completed",
            id: `diffrhythm-${requestId}`,
            duration: 95,
            title: title,
          }
        }), {
          headers: { ...corsHeaders, "Content-Type": "application/json" },
        });
      }

      if (statusData.status === "FAILED") {
        throw new Error(`DiffRhythm generation failed: ${statusData.error || 'Unknown error'}`);
      }
    }

    throw new Error("DiffRhythm generation timed out after 3 minutes");

  } catch (error) {
    console.error("[DiffRhythm] Error:", error);
    return new Response(JSON.stringify({
      success: false,
      error: error instanceof Error ? error.message : "Onbekende fout bij DiffRhythm generatie",
    }), {
      status: 500,
      headers: { ...corsHeaders, "Content-Type": "application/json" },
    });
  }
});
