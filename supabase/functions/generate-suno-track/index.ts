import { serve } from "https://deno.land/std@0.168.0/http/server.ts";

const corsHeaders = {
  'Access-Control-Allow-Origin': '*',
  'Access-Control-Allow-Headers': 'authorization, x-client-info, apikey, content-type, x-supabase-client-platform, x-supabase-client-platform-version, x-supabase-client-runtime, x-supabase-client-runtime-version',
};

// Official Suno API endpoint
const SUNO_API_BASE = "https://api.sunoapi.org";
// Edge functions have execution time limits; stop polling as soon as we have a stream URL.
// 25 * 5s = 125s max polling window.
const MAX_POLL_ATTEMPTS = 25;
const POLL_INTERVAL_MS = 5000;

interface RequestBody {
  lyrics: string;
  style: string;
  title: string;
  maxDurationSeconds?: number;
}

interface SunoGenerateResponse {
  code: number;
  msg: string;
  data?: {
    taskId: string;
  };
}

interface SunoTrack {
  id: string;
  status: string;
  audioUrl?: string;
  streamAudioUrl?: string;
  videoUrl?: string;
  duration?: number;
  title?: string;
}

type SunoTaskStatus =
  | 'PENDING'
  | 'TEXT_SUCCESS'
  | 'FIRST_SUCCESS'
  | 'SUCCESS'
  | 'CREATE_TASK_FAILED'
  | 'GENERATE_AUDIO_FAILED'
  | 'CALLBACK_EXCEPTION'
  | 'SENSITIVE_WORD_ERROR'
  | string;

interface SunoRecordInfoResponse {
  code: number;
  msg: string;
  data?: {
    taskId: string;
    status: SunoTaskStatus;
    response?: {
      taskId: string;
      sunoData?: SunoTrack[];
    };
    errorCode?: string | null;
    errorMessage?: string | null;
  };
}

async function generateTrack(apiKey: string, lyrics: string, style: string, title: string): Promise<string> {
  console.log(`Starting Suno track generation: "${title}" in style "${style}"`);
  
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

  const requestBody = {
    customMode: true,           // We provide lyrics, style, and title
    instrumental: false,        // We want vocals (lyrics)
    model: "V4_5ALL",           // Best song structure, up to 8 min
    prompt: truncatedLyrics,    // The lyrics
    style: truncatedStyle,      // Music style
    title: truncatedTitle,      // Song title
    callBackUrl: "https://example.com/callback", // Required by API (we use polling instead)
  };

  console.log("Suno request body:", JSON.stringify(requestBody, null, 2));

  const response = await fetch(`${SUNO_API_BASE}/api/v1/generate`, {
    method: "POST",
    headers: {
      "Content-Type": "application/json",
      "Authorization": `Bearer ${apiKey}`,
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
  } catch (e) {
    throw new Error(`Failed to parse Suno response: ${responseText}`);
  }

  if (data.code !== 200 || !data.data?.taskId) {
    throw new Error(`Suno API returned error: ${data.msg || 'No taskId in response'}`);
  }

  console.log(`Task ID received: ${data.data.taskId}`);
  return data.data.taskId;
}

async function pollForCompletion(apiKey: string, taskId: string): Promise<SunoTrack> {
  console.log(`Starting to poll for task ${taskId}`);
  
  for (let attempt = 0; attempt < MAX_POLL_ATTEMPTS; attempt++) {
    console.log(`Poll attempt ${attempt + 1}/${MAX_POLL_ATTEMPTS}`);
    
    try {
      // Per docs: GET /api/v1/generate/record-info?taskId=...
      const url = `${SUNO_API_BASE}/api/v1/generate/record-info?taskId=${encodeURIComponent(taskId)}`;
      const response = await fetch(url, {
        method: "GET",
        headers: {
          "Authorization": `Bearer ${apiKey}`,
        },
      });

      if (!response.ok) {
        console.error(`Poll error: ${response.status}`);
        await new Promise(resolve => setTimeout(resolve, POLL_INTERVAL_MS));
        continue;
      }

       const data: SunoRecordInfoResponse = await response.json();
       console.log(`Poll response code: ${data.code}, msg: ${data.msg}`);

       if (data.code !== 200 || !data.data) {
         console.log("No task info yet, waiting...");
        await new Promise(resolve => setTimeout(resolve, POLL_INTERVAL_MS));
        continue;
      }

       const status = data.data.status;
       const tracks = data.data.response?.sunoData ?? [];
       const track = tracks[0]; // 2 tracks per request; we return the first

       console.log(`Task status: ${status}; tracks: ${tracks.length}; hasStream: ${!!track?.streamAudioUrl}; hasAudio: ${!!track?.audioUrl}`);

       // Fail fast on terminal error statuses
       const statusLower = String(status).toLowerCase();
       if (
         statusLower.includes('failed') ||
         statusLower.includes('error') ||
         status === 'SENSITIVE_WORD_ERROR'
       ) {
         const details = {
           status,
           errorCode: data.data.errorCode,
           errorMessage: data.data.errorMessage,
         };
         throw new Error(`Track generation failed: ${JSON.stringify(details)}`);
       }

       // IMPORTANT: streamAudioUrl is usually available much earlier than audioUrl.
       // To avoid edge function timeouts, we return as soon as we have a playable URL.
       if (track && (track.streamAudioUrl || track.audioUrl)) {
         console.log(`Track playable! streamAudioUrl: ${track.streamAudioUrl}; audioUrl: ${track.audioUrl}`);
         return track;
       }

      // Still processing, wait and try again
      await new Promise(resolve => setTimeout(resolve, POLL_INTERVAL_MS));
      
    } catch (pollError) {
      console.error(`Poll error:`, pollError);
      await new Promise(resolve => setTimeout(resolve, POLL_INTERVAL_MS));
    }
  }

  throw new Error("Track generation timed out while waiting for a playable URL");
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
    const taskId = await generateTrack(SUNO_API_KEY, lyrics, style, title);

    // Step 2: Poll for completion
    const track = await pollForCompletion(SUNO_API_KEY, taskId);

    // Check duration and warn if too long
    if (track.duration && track.duration > maxDurationSeconds) {
      console.warn(`Track duration (${track.duration}s) exceeds max (${maxDurationSeconds}s)`);
    }

    return new Response(JSON.stringify({
      success: true,
      data: {
        taskId,
        // Backwards compatible: always provide a playable URL in audioUrl
        audioUrl: track.audioUrl || track.streamAudioUrl,
        streamAudioUrl: track.streamAudioUrl,
        videoUrl: track.videoUrl,
        duration: track.duration,
        title: track.title,
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