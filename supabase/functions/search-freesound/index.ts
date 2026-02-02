import { serve } from "https://deno.land/std@0.168.0/http/server.ts";

const corsHeaders = {
  "Access-Control-Allow-Origin": "*",
  "Access-Control-Allow-Headers": "authorization, x-client-info, apikey, content-type",
};

interface FreesoundRequest {
  query: string;
}

interface FreesoundSound {
  id: number;
  name: string;
  duration: number;
  avg_rating: number;
  previews?: {
    "preview-hq-mp3"?: string;
    "preview-lq-mp3"?: string;
  };
}

interface FreesoundResponse {
  count: number;
  results: FreesoundSound[];
}

serve(async (req) => {
  // Handle CORS preflight
  if (req.method === "OPTIONS") {
    return new Response("ok", { headers: corsHeaders });
  }

  try {
    const { query }: FreesoundRequest = await req.json();

    if (!query || typeof query !== "string") {
      return new Response(
        JSON.stringify({ success: false, error: "Query is required" }),
        { status: 400, headers: { ...corsHeaders, "Content-Type": "application/json" } }
      );
    }

    const FREESOUND_API_KEY = Deno.env.get("FREESOUND_API_KEY");
    if (!FREESOUND_API_KEY) {
      console.error("FREESOUND_API_KEY is not configured");
      return new Response(
        JSON.stringify({ success: false, error: "Freesound API key not configured" }),
        { status: 500, headers: { ...corsHeaders, "Content-Type": "application/json" } }
      );
    }

    console.log(`Searching Freesound for: "${query}"`);

    // Simplify query for better Freesound matches
    // Remove decade prefixes and overly specific terms
    const simplifiedQuery = query
      .replace(/\b(70s|80s|90s|00s|10s)\b/gi, '') // Remove decade prefixes
      .replace(/\b(ambience|ambient)\b/gi, '')     // Often too specific
      .replace(/\s+/g, ' ')                        // Clean up whitespace
      .trim();
    
    console.log(`Simplified query: "${query}" -> "${simplifiedQuery}"`);

    // Build the Freesound API URL with relaxed filters
    // - duration:[1 TO 30] = wider range for more results
    // - fields = only fetch what we need
    // - sort = sort by rating descending for quality
    const params = new URLSearchParams({
      query: simplifiedQuery || query, // fallback to original if simplified is empty
      filter: "duration:[1 TO 30]",
      fields: "id,name,previews,duration,avg_rating",
      sort: "rating_desc",
      page_size: "15", // Get more results to find good matches
      token: FREESOUND_API_KEY,
    });

    const apiUrl = `https://freesound.org/apiv2/search/text/?${params.toString()}`;
    
    const response = await fetch(apiUrl, {
      method: "GET",
      headers: {
        "Accept": "application/json",
      },
    });

    if (!response.ok) {
      const errorText = await response.text();
      console.error(`Freesound API error: ${response.status} - ${errorText}`);
      return new Response(
        JSON.stringify({ success: false, error: `Freesound API error: ${response.status}` }),
        { status: 500, headers: { ...corsHeaders, "Content-Type": "application/json" } }
      );
    }

    const data: FreesoundResponse = await response.json();
    console.log(`Found ${data.count} sounds for "${query}"`);

    // Return the first result with a preview URL
    if (data.results && data.results.length > 0) {
      // Find the first result that has a preview
      const soundWithPreview = data.results.find(
        (sound) => sound.previews?.["preview-hq-mp3"] || sound.previews?.["preview-lq-mp3"]
      );

      if (soundWithPreview) {
        const previewUrl = 
          soundWithPreview.previews?.["preview-hq-mp3"] || 
          soundWithPreview.previews?.["preview-lq-mp3"];

        console.log(`Returning sound: "${soundWithPreview.name}" (${soundWithPreview.duration}s)`);

        return new Response(
          JSON.stringify({
            success: true,
            sound: {
              id: soundWithPreview.id,
              name: soundWithPreview.name,
              duration: soundWithPreview.duration,
              rating: soundWithPreview.avg_rating,
              previewUrl,
            },
          }),
          { headers: { ...corsHeaders, "Content-Type": "application/json" } }
        );
      }
    }

    // No results found
    console.log(`No suitable sounds found for "${query}"`);
    return new Response(
      JSON.stringify({ success: true, sound: null }),
      { headers: { ...corsHeaders, "Content-Type": "application/json" } }
    );

  } catch (error) {
    console.error("Error in search-freesound:", error);
    return new Response(
      JSON.stringify({ 
        success: false, 
        error: error instanceof Error ? error.message : "Unknown error" 
      }),
      { status: 500, headers: { ...corsHeaders, "Content-Type": "application/json" } }
    );
  }
});
