import { serve } from "https://deno.land/std@0.168.0/http/server.ts";

const corsHeaders = {
  'Access-Control-Allow-Origin': '*',
  'Access-Control-Allow-Headers': 'authorization, x-client-info, apikey, content-type, x-supabase-client-platform, x-supabase-client-platform-version, x-supabase-client-runtime, x-supabase-client-runtime-version',
};

// Official Suno API endpoint
const SUNO_API_BASE = "https://api.sunoapi.org";

interface RequestBody {
  lyrics: string;
  style: string;
  title: string;
}

interface SunoGenerateResponse {
  code: number;
  msg: string;
  data?: {
    taskId: string;
  };
}

serve(async (req) => {
  // Handle CORS preflight
  if (req.method === 'OPTIONS') {
    return new Response('ok', { headers: corsHeaders });
  }

  try {
    const SUNO_API_KEY = Deno.env.get("SUNO_API_KEY");
    if (!SUNO_API_KEY) {
      throw new Error("SUNO_API_KEY is not configured. Get your key at https://sunoapi.org");
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

    console.log(`Starting Suno track generation: "${title}" in style "${style}"`);
    console.log(`Lyrics length: ${lyrics.length} characters`);

    // Truncate lyrics if too long (Suno V4_5ALL limit is 5000 chars)
    const maxLyricsLength = 4500;
    const truncatedLyrics = lyrics.length > maxLyricsLength 
      ? lyrics.substring(0, maxLyricsLength) + "..."
      : lyrics;

    // Truncate style if too long (max 1000 chars for V4_5ALL)
    const maxStyleLength = 200;
    const truncatedStyle = style.length > maxStyleLength
      ? style.substring(0, maxStyleLength)
      : style;

    // Truncate title if too long (max 80 chars for V4_5ALL)
    const maxTitleLength = 75;
    const truncatedTitle = title.length > maxTitleLength
      ? title.substring(0, maxTitleLength)
      : title;

    // Use the Supabase edge function as callback URL
    const supabaseUrl = Deno.env.get("SUPABASE_URL") || "https://koeoboygsssyajpdstel.supabase.co";
    const callbackUrl = `${supabaseUrl}/functions/v1/suno-callback`;
    
    const requestBody = {
      customMode: true,
      instrumental: false,
      model: "V4_5ALL",
      prompt: truncatedLyrics,
      style: truncatedStyle,
      title: truncatedTitle,
      duration: 105, // Max 1:45 (in seconds)
      callBackUrl: callbackUrl,
    };

    console.log("Suno request body:", JSON.stringify(requestBody, null, 2));

    const response = await fetch(`${SUNO_API_BASE}/api/v1/generate`, {
      method: "POST",
      headers: {
        "Content-Type": "application/json",
        "Authorization": `Bearer ${SUNO_API_KEY}`,
      },
      body: JSON.stringify(requestBody),
    });

    const responseText = await response.text();
    console.log(`Suno generate response status: ${response.status}`);
    console.log(`Suno generate response body: ${responseText}`);

    if (!response.ok) {
      console.error(`Suno generate error: ${response.status}`, responseText);
      throw new Error(`Suno API error: ${response.status} - ${responseText}`);
    }

    let data: SunoGenerateResponse;
    try {
      data = JSON.parse(responseText);
    } catch (_e) {
      throw new Error(`Failed to parse Suno response: ${responseText}`);
    }

    if (data.code !== 200 || !data.data?.taskId) {
      throw new Error(`Suno API returned error: ${data.msg || 'No taskId in response'}`);
    }

    const taskId = data.data.taskId;
    console.log(`Task ID received: ${taskId} - returning immediately for client-side polling`);

    // Return immediately with taskId - client will poll check-suno-status
    return new Response(JSON.stringify({
      success: true,
      data: {
        taskId,
        status: 'PENDING',
      }
    }), {
      headers: { ...corsHeaders, "Content-Type": "application/json" },
    });

  } catch (error) {
    console.error("generate-suno-track error:", error);
    return new Response(JSON.stringify({
      success: false,
      error: error instanceof Error ? error.message : "Onbekende fout bij het genereren van muziek",
    }), {
      status: 500,
      headers: { ...corsHeaders, "Content-Type": "application/json" },
    });
  }
});
