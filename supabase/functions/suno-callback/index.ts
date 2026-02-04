import { serve } from "https://deno.land/std@0.168.0/http/server.ts";

const corsHeaders = {
  'Access-Control-Allow-Origin': '*',
  'Access-Control-Allow-Headers': 'authorization, x-client-info, apikey, content-type',
};

/**
 * Callback endpoint for Suno API to POST completed track results.
 * This allows viewing the audio URL in edge function logs.
 */
serve(async (req) => {
  // Handle CORS preflight
  if (req.method === 'OPTIONS') {
    return new Response('ok', { headers: corsHeaders });
  }

  try {
    const body = await req.json();
    
    console.log("=== SUNO CALLBACK RECEIVED ===");
    console.log("Full callback payload:", JSON.stringify(body, null, 2));
    
    // Extract and log the audio URLs specifically
    if (body.data) {
      const data = body.data;
      console.log("Task ID:", data.taskId);
      console.log("Status:", data.status);
      
      if (data.suno_data && Array.isArray(data.suno_data)) {
        data.suno_data.forEach((track: any, index: number) => {
          console.log(`--- Track ${index + 1} ---`);
          console.log("Title:", track.title);
          console.log("Audio URL:", track.audio_url);
          console.log("Stream Audio URL:", track.stream_audio_url);
          console.log("Duration:", track.duration);
        });
      }
    }
    
    console.log("=== END SUNO CALLBACK ===");

    return new Response(JSON.stringify({ 
      success: true, 
      message: "Callback received and logged" 
    }), {
      status: 200,
      headers: { ...corsHeaders, "Content-Type": "application/json" },
    });

  } catch (error) {
    console.error("Suno callback error:", error);
    return new Response(JSON.stringify({ 
      success: false, 
      error: error instanceof Error ? error.message : "Unknown error" 
    }), {
      status: 500,
      headers: { ...corsHeaders, "Content-Type": "application/json" },
    });
  }
});
