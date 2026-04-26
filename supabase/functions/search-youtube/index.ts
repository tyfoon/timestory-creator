import { serve } from "https://deno.land/std@0.168.0/http/server.ts";
import { createClient } from "https://esm.sh/@supabase/supabase-js@2";

const corsHeaders = {
  "Access-Control-Allow-Origin": "*",
  "Access-Control-Allow-Headers": "authorization, x-client-info, apikey, content-type, x-supabase-client-platform, x-supabase-client-platform-version, x-supabase-client-runtime, x-supabase-client-runtime-version",
};

interface YouTubeSearchRequest {
  query: string;
}

interface YouTubeSearchResponse {
  success: boolean;
  videoId?: string | null;
  title?: string | null;
  thumbnail?: string | null;
  cached?: boolean;
  error?: string;
}

function normalizeQueryForCache(q: string): string {
  return q.toLowerCase().trim().replace(/\s+/g, " ");
}

serve(async (req) => {
  // Handle CORS preflight requests
  if (req.method === "OPTIONS") {
    return new Response("ok", { headers: corsHeaders });
  }

  try {
    const { query } = (await req.json()) as YouTubeSearchRequest;

    if (!query) {
      return new Response(
        JSON.stringify({ success: false, error: "Query is required" }),
        { status: 400, headers: { ...corsHeaders, "Content-Type": "application/json" } }
      );
    }

    const YOUTUBE_API_KEY = Deno.env.get("YOUTUBE_API_KEY");
    if (!YOUTUBE_API_KEY) {
      console.error("YOUTUBE_API_KEY is not configured");
      return new Response(
        JSON.stringify({ success: false, error: "YouTube API key not configured" }),
        { status: 500, headers: { ...corsHeaders, "Content-Type": "application/json" } }
      );
    }

    const supabaseUrl = Deno.env.get("SUPABASE_URL");
    const supabaseServiceKey = Deno.env.get("SUPABASE_SERVICE_ROLE_KEY");
    const supabase =
      supabaseUrl && supabaseServiceKey
        ? createClient(supabaseUrl, supabaseServiceKey)
        : null;

    const normalizedQuery = normalizeQueryForCache(query);

    // ───── 1. Cache lookup ─────────────────────────────────────────
    if (supabase) {
      try {
        const { data: cached } = await supabase
          .from("youtube_search_cache")
          .select("video_id, title, thumbnail")
          .eq("query", normalizedQuery)
          .maybeSingle();

        if (cached) {
          // Fire-and-forget bump of last_accessed.
          (supabase.from("youtube_search_cache") as any)
            .update({ last_accessed: new Date().toISOString() })
            .eq("query", normalizedQuery)
            .then(() => {});

          console.log(`[search-youtube] cache hit: ${normalizedQuery}`);
          return new Response(
            JSON.stringify({
              success: true,
              videoId: cached.video_id,
              title: cached.title,
              thumbnail: cached.thumbnail,
              cached: true,
            }),
            { headers: { ...corsHeaders, "Content-Type": "application/json" } },
          );
        }
      } catch (e) {
        // Cache failure is non-fatal — fall through to YouTube call.
        console.warn("[search-youtube] cache lookup failed:", e);
      }
    }

    console.log(`Searching YouTube for: ${query}`);

    // Search YouTube Data API v3
    const searchUrl = new URL("https://www.googleapis.com/youtube/v3/search");
    searchUrl.searchParams.set("part", "snippet");
    searchUrl.searchParams.set("q", query);
    searchUrl.searchParams.set("type", "video");
    searchUrl.searchParams.set("maxResults", "1");
    searchUrl.searchParams.set("key", YOUTUBE_API_KEY);
    // Filter for videos that can be embedded
    searchUrl.searchParams.set("videoEmbeddable", "true");

    const response = await fetch(searchUrl.toString());

    if (!response.ok) {
      const errorText = await response.text();
      console.error("YouTube API error:", response.status, errorText);
      // Return 200 with success:false so the supabase-js client gets a
      // structured response instead of throwing on a non-2xx status.
      // Quota-exceeded responses are NOT cached — retryable tomorrow.
      return new Response(
        JSON.stringify({ success: false, error: `YouTube API error: ${response.status}` }),
        { status: 200, headers: { ...corsHeaders, "Content-Type": "application/json" } }
      );
    }

    const data = await response.json();

    if (!data.items || data.items.length === 0) {
      console.log("No YouTube results found for:", query);

      // Cache the no-result so we don't re-spend quota on rare titles.
      if (supabase) {
        (supabase.from("youtube_search_cache") as any)
          .upsert(
            {
              query: normalizedQuery,
              video_id: null,
              title: null,
              thumbnail: null,
              last_accessed: new Date().toISOString(),
            },
            { onConflict: "query" },
          )
          .then(() => {});
      }

      return new Response(
        JSON.stringify({ success: true, videoId: null }),
        { headers: { ...corsHeaders, "Content-Type": "application/json" } }
      );
    }

    const video = data.items[0];
    const result: YouTubeSearchResponse = {
      success: true,
      videoId: video.id.videoId,
      title: video.snippet.title,
      thumbnail: video.snippet.thumbnails?.medium?.url || video.snippet.thumbnails?.default?.url,
    };

    console.log(`Found YouTube video: ${result.videoId} - ${result.title}`);

    // Cache the successful result (fire-and-forget).
    if (supabase) {
      (supabase.from("youtube_search_cache") as any)
        .upsert(
          {
            query: normalizedQuery,
            video_id: result.videoId,
            title: result.title,
            thumbnail: result.thumbnail,
            last_accessed: new Date().toISOString(),
          },
          { onConflict: "query" },
        )
        .then(() => {});
    }

    return new Response(JSON.stringify(result), {
      headers: { ...corsHeaders, "Content-Type": "application/json" },
    });
  } catch (error) {
    console.error("Error searching YouTube:", error);
    return new Response(
      JSON.stringify({ success: false, error: error instanceof Error ? error.message : "Unknown error" }),
      { status: 500, headers: { ...corsHeaders, "Content-Type": "application/json" } }
    );
  }
});
