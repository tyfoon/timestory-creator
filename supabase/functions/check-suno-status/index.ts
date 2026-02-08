import { serve } from "https://deno.land/std@0.168.0/http/server.ts";

const corsHeaders = {
  'Access-Control-Allow-Origin': '*',
  'Access-Control-Allow-Headers': 'authorization, x-client-info, apikey, content-type, x-supabase-client-platform, x-supabase-client-platform-version, x-supabase-client-runtime, x-supabase-client-runtime-version',
};

const SUNO_API_BASE = "https://api.sunoapi.org";

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

    const { taskId } = await req.json();
    
    if (!taskId) {
      return new Response(JSON.stringify({
        success: false,
        error: "Missing required field: taskId",
      }), {
        status: 400,
        headers: { ...corsHeaders, "Content-Type": "application/json" },
      });
    }

    console.log(`Checking status for task ${taskId}`);

    const url = `${SUNO_API_BASE}/api/v1/generate/record-info?taskId=${encodeURIComponent(taskId)}`;
    const response = await fetch(url, {
      method: "GET",
      headers: {
        "Authorization": `Bearer ${SUNO_API_KEY}`,
      },
    });

    if (!response.ok) {
      console.error(`Suno API error: ${response.status}`);
      throw new Error(`Suno API error: ${response.status}`);
    }

    const data: SunoRecordInfoResponse = await response.json();
    console.log(`Task ${taskId} status: ${data.data?.status}`);

    if (data.code !== 200 || !data.data) {
      return new Response(JSON.stringify({
        success: true,
        data: {
          taskId,
          status: 'PENDING',
          ready: false,
        }
      }), {
        headers: { ...corsHeaders, "Content-Type": "application/json" },
      });
    }

    const status = data.data.status;
    const tracks = data.data.response?.sunoData ?? [];
    const track = tracks[0];

    // Check for error statuses
    const statusLower = String(status).toLowerCase();
    if (
      statusLower.includes('failed') ||
      statusLower.includes('error') ||
      status === 'SENSITIVE_WORD_ERROR'
    ) {
      return new Response(JSON.stringify({
        success: false,
        error: `Track generation failed: ${data.data.errorMessage || status}`,
        data: {
          taskId,
          status,
          ready: false,
          errorCode: data.data.errorCode,
          errorMessage: data.data.errorMessage,
        }
      }), {
        status: 500,
        headers: { ...corsHeaders, "Content-Type": "application/json" },
      });
    }

    // FIRST_SUCCESS = streaming preview available, not fully ready yet
    // SUCCESS = fully complete
    const isFullyReady = status === 'SUCCESS' && 
                         track && 
                         track.duration && 
                         (track.audioUrl || track.streamAudioUrl);

    const hasStreamPreview = status === 'FIRST_SUCCESS' && 
                             track && 
                             track.streamAudioUrl;

    if (isFullyReady) {
      console.log(`Track FULLY ready! duration: ${track.duration}s, audioUrl: ${track.audioUrl}`);
      return new Response(JSON.stringify({
        success: true,
        data: {
          taskId,
          status,
          ready: true,
          audioUrl: track.audioUrl || track.streamAudioUrl,
          streamAudioUrl: track.streamAudioUrl,
          videoUrl: track.videoUrl,
          duration: track.duration,
          title: track.title,
        }
      }), {
        headers: { ...corsHeaders, "Content-Type": "application/json" },
      });
    }

    // Stream preview available - not ready yet but can start playing
    if (hasStreamPreview) {
      console.log(`Stream preview available! streamUrl: ${track.streamAudioUrl}, duration so far: ${track.duration}s`);
      return new Response(JSON.stringify({
        success: true,
        data: {
          taskId,
          status,
          ready: false,
          streamAudioUrl: track.streamAudioUrl,
          duration: track.duration,
          title: track.title,
        }
      }), {
        headers: { ...corsHeaders, "Content-Type": "application/json" },
      });
    }

    // Still processing
    return new Response(JSON.stringify({
      success: true,
      data: {
        taskId,
        status,
        ready: false,
        duration: track?.duration,
      }
    }), {
      headers: { ...corsHeaders, "Content-Type": "application/json" },
    });

  } catch (error) {
    console.error("check-suno-status error:", error);
    return new Response(JSON.stringify({
      success: false,
      error: error instanceof Error ? error.message : "Onbekende fout bij ophalen status",
    }), {
      status: 500,
      headers: { ...corsHeaders, "Content-Type": "application/json" },
    });
  }
});
