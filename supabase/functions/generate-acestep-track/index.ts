import { serve } from "https://deno.land/std@0.168.0/http/server.ts";

const corsHeaders = {
  'Access-Control-Allow-Origin': '*',
  'Access-Control-Allow-Headers': 'authorization, x-client-info, apikey, content-type, x-supabase-client-platform, x-supabase-client-platform-version, x-supabase-client-runtime, x-supabase-client-runtime-version',
};

const ACESTEP_API_URL = "https://michiel-tol--ace-step-acestepservice-generate.modal.run";

interface RequestBody {
  lyrics: string;
  style: string;
  title: string;
}

interface AceStepResponse {
  audio_base64: string;
  audio_format: string;
  duration: number;
  sample_rate: number;
  bpm: number | null;
  seed: number;
  prompt: string;
}

serve(async (req) => {
  if (req.method === 'OPTIONS') {
    return new Response('ok', { headers: corsHeaders });
  }

  try {
    const ACESTEP_API_KEY = Deno.env.get("ACESTEP_API_KEY");
    if (!ACESTEP_API_KEY) {
      throw new Error("ACESTEP_API_KEY is not configured");
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

    console.log(`[AceStep] Starting generation: "${title}" | style: "${style}"`);
    console.log(`[AceStep] Lyrics length: ${lyrics.length} chars`);

    // Transform app payload to Ace-Step API format
     // prompt = style description (identical to what Suno receives), lyrics = song lyrics
      const aceStepPayload = {
       prompt: style,
       lyrics: lyrics,
       duration: 90,
       guidance_scale: 5.0,
       audio_format: "mp3",
       quality: "studio",
     };

    console.log("[AceStep] Request payload:", JSON.stringify(aceStepPayload, null, 2));

    const response = await fetch(ACESTEP_API_URL, {
      method: "POST",
      headers: {
        "Content-Type": "application/json",
        "Authorization": `Bearer ${ACESTEP_API_KEY}`,
      },
      body: JSON.stringify(aceStepPayload),
    });

    if (!response.ok) {
      const errorText = await response.text();
      console.error(`[AceStep] API error ${response.status}:`, errorText);
      
      let errorDetail = `AceStep API error: ${response.status}`;
      try {
        const errorJson = JSON.parse(errorText);
        errorDetail = errorJson.detail || errorDetail;
      } catch { /* ignore parse error */ }
      
      throw new Error(errorDetail);
    }

    const data: AceStepResponse = await response.json();

    console.log(`[AceStep] Generation complete! Duration: ${data.duration}s, BPM: ${data.bpm}, Seed: ${data.seed}`);

    // Convert base64 audio to a data URI for the client
    const audioDataUri = `data:audio/mp3;base64,${data.audio_base64}`;

    // Return in a format compatible with the existing Suno flow
    return new Response(JSON.stringify({
      success: true,
      data: {
        audio_url: audioDataUri,
        status: "completed",
        id: `acestep-${data.seed}`,
        duration: data.duration,
        title: title,
      }
    }), {
      headers: { ...corsHeaders, "Content-Type": "application/json" },
    });

  } catch (error) {
    console.error("[AceStep] Error:", error);
    return new Response(JSON.stringify({
      success: false,
      error: error instanceof Error ? error.message : "Onbekende fout bij Ace-Step generatie",
    }), {
      status: 500,
      headers: { ...corsHeaders, "Content-Type": "application/json" },
    });
  }
});
