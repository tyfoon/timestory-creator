import { serve } from "https://deno.land/std@0.168.0/http/server.ts";

const corsHeaders = {
  'Access-Control-Allow-Origin': '*',
  'Access-Control-Allow-Headers': 'authorization, x-client-info, apikey, content-type, x-supabase-client-platform, x-supabase-client-platform-version, x-supabase-client-runtime, x-supabase-client-runtime-version',
};

const SUNO_API_BASE = "https://sunoapi.org";
const MAX_POLL_ATTEMPTS = 60; // 5 minutes max (60 * 5 seconds)
const POLL_INTERVAL_MS = 5000;

interface RequestBody {
  lyrics: string;
  style: string;
  title: string;
  maxDurationSeconds?: number;
}

interface SunoGenerateResponse {
  id?: string;
  ids?: string[];
  status?: string;
  error?: string;
}

interface SunoStatusResponse {
  status: string;
  audio_url?: string;
  stream_audio_url?: string;
  video_url?: string;
  duration?: number;
  error?: string;
}

async function generateTrack(apiKey: string, lyrics: string, style: string, title: string): Promise<string> {
  console.log(`Starting Suno track generation: "${title}" in style "${style}"`);
  
  // Truncate lyrics if too long (Suno has a limit)
  const maxLyricsLength = 3000;
  const truncatedLyrics = lyrics.length > maxLyricsLength 
    ? lyrics.substring(0, maxLyricsLength) + "..."
    : lyrics;

  const response = await fetch(`${SUNO_API_BASE}/api/custom_generate`, {
    method: "POST",
    headers: {
      "Content-Type": "application/json",
      "Authorization": `Bearer ${apiKey}`,
    },
    body: JSON.stringify({
      prompt: truncatedLyrics,
      tags: style,
      title: title,
      make_instrumental: false,
      wait_audio: false, // Return immediately, we'll poll for status
    }),
  });

  if (!response.ok) {
    const errorText = await response.text();
    console.error(`Suno generate error: ${response.status}`, errorText);
    throw new Error(`Suno API error: ${response.status} - ${errorText}`);
  }

  const data: SunoGenerateResponse = await response.json();
  console.log("Suno generate response:", JSON.stringify(data));

  // Extract the track ID from response
  const trackId = data.id || (data.ids && data.ids[0]);
  if (!trackId) {
    throw new Error("No track ID in Suno response");
  }

  console.log(`Track ID received: ${trackId}`);
  return trackId;
}

async function pollForCompletion(apiKey: string, trackId: string): Promise<SunoStatusResponse> {
  console.log(`Starting to poll for track ${trackId}`);
  
  for (let attempt = 0; attempt < MAX_POLL_ATTEMPTS; attempt++) {
    console.log(`Poll attempt ${attempt + 1}/${MAX_POLL_ATTEMPTS}`);
    
    try {
      const response = await fetch(`${SUNO_API_BASE}/api/get?ids=${trackId}`, {
        headers: {
          "Authorization": `Bearer ${apiKey}`,
        },
      });

      if (!response.ok) {
        console.error(`Poll error: ${response.status}`);
        await new Promise(resolve => setTimeout(resolve, POLL_INTERVAL_MS));
        continue;
      }

      const data = await response.json();
      console.log(`Poll response:`, JSON.stringify(data).substring(0, 500));

      // Handle array response (Suno returns array of tracks)
      const track = Array.isArray(data) ? data[0] : data;
      
      if (!track) {
        await new Promise(resolve => setTimeout(resolve, POLL_INTERVAL_MS));
        continue;
      }

      const status = track.status?.toLowerCase();
      
      if (status === 'complete' || status === 'streaming' || track.audio_url) {
        console.log(`Track completed! Audio URL: ${track.audio_url}`);
        return {
          status: 'complete',
          audio_url: track.audio_url,
          stream_audio_url: track.stream_audio_url,
          video_url: track.video_url,
          duration: track.duration,
        };
      }

      if (status === 'error' || status === 'failed') {
        throw new Error(`Track generation failed: ${track.error || 'Unknown error'}`);
      }

      // Still processing, wait and try again
      await new Promise(resolve => setTimeout(resolve, POLL_INTERVAL_MS));
      
    } catch (pollError) {
      console.error(`Poll error:`, pollError);
      await new Promise(resolve => setTimeout(resolve, POLL_INTERVAL_MS));
    }
  }

  throw new Error("Track generation timed out after 5 minutes");
}

serve(async (req) => {
  // Handle CORS preflight
  if (req.method === 'OPTIONS') {
    return new Response('ok', { headers: corsHeaders });
  }

  try {
    const SUNO_API_KEY = Deno.env.get("SUNO_API_KEY");
    if (!SUNO_API_KEY) {
      throw new Error("SUNO_API_KEY is not configured");
    }

    const body: RequestBody = await req.json();
    const { lyrics, style, title, maxDurationSeconds = 180 } = body;

    if (!lyrics || !style || !title) {
      return new Response(JSON.stringify({
        success: false,
        error: "Missing required fields: lyrics, style, title",
      }), {
        status: 400,
        headers: { ...corsHeaders, "Content-Type": "application/json" },
      });
    }

    console.log(`Generating Suno track: "${title}"`);
    console.log(`Style: ${style}`);
    console.log(`Lyrics length: ${lyrics.length} characters`);

    // Step 1: Start generation
    const trackId = await generateTrack(SUNO_API_KEY, lyrics, style, title);

    // Step 2: Poll for completion
    const result = await pollForCompletion(SUNO_API_KEY, trackId);

    // Check duration and warn if too long
    if (result.duration && result.duration > maxDurationSeconds) {
      console.warn(`Track duration (${result.duration}s) exceeds max (${maxDurationSeconds}s)`);
    }

    return new Response(JSON.stringify({
      success: true,
      data: {
        trackId,
        audioUrl: result.audio_url,
        streamAudioUrl: result.stream_audio_url,
        videoUrl: result.video_url,
        duration: result.duration,
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