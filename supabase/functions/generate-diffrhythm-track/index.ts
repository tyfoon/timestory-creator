import { serve } from "https://deno.land/std@0.168.0/http/server.ts";

const corsHeaders = {
  'Access-Control-Allow-Origin': '*',
  'Access-Control-Allow-Headers': 'authorization, x-client-info, apikey, content-type, x-supabase-client-platform, x-supabase-client-platform-version, x-supabase-client-runtime, x-supabase-client-runtime-version',
};

// Use async queue endpoint to avoid timeout (generation takes ~3 min)
const FAL_QUEUE_URL = "https://queue.fal.run/fal-ai/diffrhythm";

interface RequestBody {
  lyrics: string;
  style: string;
  title: string;
  // For polling mode
  action?: 'submit' | 'poll';
  requestId?: string;
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
    const action = body.action || 'submit';

    if (action === 'poll') {
      // === POLL MODE: Check status of queued request ===
      const { requestId } = body;
      if (!requestId) {
        return new Response(JSON.stringify({ success: false, error: "Missing requestId" }), {
          status: 400,
          headers: { ...corsHeaders, "Content-Type": "application/json" },
        });
      }

      console.log(`[DiffRhythm] Polling status for: ${requestId}`);

      // Check status
      const statusResponse = await fetch(`${FAL_QUEUE_URL}/requests/${requestId}/status`, {
        method: "GET",
        headers: { "Authorization": `Key ${FAL_KEY}` },
      });

      if (!statusResponse.ok) {
        const errorText = await statusResponse.text();
        console.error(`[DiffRhythm] Status check error: ${statusResponse.status}`, errorText);
        throw new Error(`Status check failed: ${statusResponse.status}`);
      }

      const statusData = await statusResponse.json();
      console.log(`[DiffRhythm] Status: ${statusData.status}`);

      if (statusData.status === 'COMPLETED') {
        // Fetch the result
        const resultResponse = await fetch(`${FAL_QUEUE_URL}/requests/${requestId}`, {
          method: "GET",
          headers: { "Authorization": `Key ${FAL_KEY}` },
        });

        if (!resultResponse.ok) {
          throw new Error(`Result fetch failed: ${resultResponse.status}`);
        }

        const resultData = await resultResponse.json();
        const audioUrl = resultData.audio?.url;

        if (!audioUrl) {
          throw new Error("No audio URL in DiffRhythm result");
        }

        console.log(`[DiffRhythm] Complete! Audio: ${audioUrl}`);

        return new Response(JSON.stringify({
          success: true,
          data: {
            audio_url: audioUrl,
            status: "completed",
            id: `diffrhythm-${requestId}`,
            duration: 95,
            title: body.title || 'DiffRhythm Track',
          }
        }), {
          headers: { ...corsHeaders, "Content-Type": "application/json" },
        });
      }

      // Still processing
      return new Response(JSON.stringify({
        success: true,
        data: {
          status: statusData.status === 'IN_QUEUE' ? 'in_queue' : 'processing',
          requestId,
          position: statusData.queue_position,
        }
      }), {
        headers: { ...corsHeaders, "Content-Type": "application/json" },
      });

    } else {
      // === SUBMIT MODE: Queue a new generation request ===
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

      console.log(`[DiffRhythm] Submitting to queue: "${title}"`);
      console.log(`[DiffRhythm] Lyrics length: ${lyrics.length} chars`);

      // DiffRhythm style_prompt should be SHORT and SIMPLE (e.g. "pop", "synthpop")
      // DiffRhythm sings whatever lyrics you provide - no need for language/vocal instructions
      // Strip out long descriptive tags, keep only the core genre
      const cleanStyle = style
        .replace(/,?\s*(Dutch language vocals|sung in Dutch|male vocals|female vocals|fast tempo|radio edit|short song|spoken word delivery|melodic|nostalgic|radio-friendly|anthemic|driving|energetic|sentimental|warm|analogue sound|raw production|polished|radio hit|lo-fi aesthetics|dreamy reverb|punchy)/gi, '')
        .replace(/,\s*,/g, ',')
        .replace(/^,\s*|,\s*$/g, '')
        .trim() || 'pop';

      console.log(`[DiffRhythm] Original style: ${style}`);
      console.log(`[DiffRhythm] Clean style for API: ${cleanStyle}`);

      const falPayload = {
        lyrics: lyrics,
        style_prompt: cleanStyle,
        music_duration: "95s",
        cfg_strength: 4,
        scheduler: "euler",
      };

      const response = await fetch(FAL_QUEUE_URL, {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
          "Authorization": `Key ${FAL_KEY}`,
        },
        body: JSON.stringify(falPayload),
      });

      if (!response.ok) {
        const errorText = await response.text();
        console.error(`[DiffRhythm] Queue submit error: ${response.status}`, errorText);
        throw new Error(`Fal.ai queue error: ${response.status} - ${errorText}`);
      }

      const queueData = await response.json();
      const requestId = queueData.request_id;

      if (!requestId) {
        throw new Error("No request_id returned from queue");
      }

      console.log(`[DiffRhythm] Queued! request_id: ${requestId}`);

      return new Response(JSON.stringify({
        success: true,
        data: {
          status: "queued",
          requestId,
          title,
        }
      }), {
        headers: { ...corsHeaders, "Content-Type": "application/json" },
      });
    }

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