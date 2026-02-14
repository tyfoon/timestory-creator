import { serve } from "https://deno.land/std@0.168.0/http/server.ts";

const corsHeaders = {
  'Access-Control-Allow-Origin': '*',
  'Access-Control-Allow-Headers': 'authorization, x-client-info, apikey, content-type, x-supabase-client-platform, x-supabase-client-platform-version, x-supabase-client-runtime, x-supabase-client-runtime-version',
};

// Use synchronous endpoint (not queue) — DiffRhythm generates in <30s
const FAL_API_URL = "https://fal.run/fal-ai/diffrhythm";

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

    const falPayload = {
      lyrics: lyrics,
      style_prompt: style,
      music_duration: "95s",
      cfg_strength: 4,
      scheduler: "euler",
    };

    console.log("[DiffRhythm] Sending synchronous request to fal.run...");

    // Synchronous call — blocks until result is ready (~30s)
    const response = await fetch(FAL_API_URL, {
      method: "POST",
      headers: {
        "Content-Type": "application/json",
        "Authorization": `Key ${FAL_KEY}`,
      },
      body: JSON.stringify(falPayload),
    });

    if (!response.ok) {
      const errorText = await response.text();
      console.error(`[DiffRhythm] Fal.ai error ${response.status}:`, errorText);
      throw new Error(`Fal.ai API error: ${response.status} - ${errorText}`);
    }

    const resultData = await response.json();
    console.log("[DiffRhythm] Response received:", JSON.stringify(resultData));

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
        id: `diffrhythm-${Date.now()}`,
        duration: 95,
        title: title,
      }
    }), {
      headers: { ...corsHeaders, "Content-Type": "application/json" },
    });

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
