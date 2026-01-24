import { serve } from "https://deno.land/std@0.168.0/http/server.ts";

const corsHeaders = {
  "Access-Control-Allow-Origin": "*",
  "Access-Control-Allow-Headers": "authorization, x-client-info, apikey, content-type",
};

interface ImageSearchRequest {
  queries: { eventId: string; query: string; year?: number }[];
}

serve(async (req) => {
  if (req.method === "OPTIONS") {
    return new Response(null, { headers: corsHeaders });
  }

  try {
    const { queries }: ImageSearchRequest = await req.json();
    console.log(`Searching images for ${queries.length} events`);

    const FIRECRAWL_API_KEY = Deno.env.get("FIRECRAWL_API_KEY");
    
    if (!FIRECRAWL_API_KEY) {
      console.log("FIRECRAWL_API_KEY not configured, returning placeholder images");
      // Return placeholder data if Firecrawl is not configured
      const placeholderResults = queries.map(q => ({
        eventId: q.eventId,
        imageUrl: null,
        source: null
      }));
      return new Response(
        JSON.stringify({ success: true, images: placeholderResults }),
        { headers: { ...corsHeaders, "Content-Type": "application/json" } }
      );
    }

    // Batch search for images using Firecrawl
    const imageResults = await Promise.all(
      queries.slice(0, 10).map(async ({ eventId, query, year }) => {
        try {
          // Add year to query for more relevant results
          const searchQuery = year ? `${query} ${year}` : query;
          
          const response = await fetch("https://api.firecrawl.dev/v1/search", {
            method: "POST",
            headers: {
              "Authorization": `Bearer ${FIRECRAWL_API_KEY}`,
              "Content-Type": "application/json",
            },
            body: JSON.stringify({
              query: searchQuery,
              limit: 3,
            }),
          });

          if (!response.ok) {
            console.error(`Firecrawl search failed for "${query}":`, response.status);
            return { eventId, imageUrl: null, source: null };
          }

          const data = await response.json();
          
          // Try to extract image URL from results
          const result = data.data?.[0];
          if (result) {
            return {
              eventId,
              imageUrl: null, // Firecrawl search doesn't return images directly
              source: result.url,
              title: result.title
            };
          }

          return { eventId, imageUrl: null, source: null };
        } catch (error) {
          console.error(`Error searching for "${query}":`, error);
          return { eventId, imageUrl: null, source: null };
        }
      })
    );

    // For events we couldn't get images for, return null
    const allResults = queries.map(q => {
      const found = imageResults.find(r => r.eventId === q.eventId);
      return found || { eventId: q.eventId, imageUrl: null, source: null };
    });

    return new Response(
      JSON.stringify({ success: true, images: allResults }),
      { headers: { ...corsHeaders, "Content-Type": "application/json" } }
    );

  } catch (error) {
    console.error("Error searching images:", error);
    return new Response(
      JSON.stringify({ 
        success: false, 
        error: error instanceof Error ? error.message : "Unknown error" 
      }),
      { status: 500, headers: { ...corsHeaders, "Content-Type": "application/json" } }
    );
  }
});
