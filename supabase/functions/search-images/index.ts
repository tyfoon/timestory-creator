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
      console.log("FIRECRAWL_API_KEY not configured, returning null images");
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

    // Search for images using Firecrawl - process in batches to avoid rate limits
    const batchSize = 5;
    const allResults: { eventId: string; imageUrl: string | null; source: string | null }[] = [];
    
    // Limit to first 15 queries to stay within rate limits
    const limitedQueries = queries.slice(0, 15);
    
    for (let i = 0; i < limitedQueries.length; i += batchSize) {
      const batch = limitedQueries.slice(i, i + batchSize);
      
      const batchResults = await Promise.all(
        batch.map(async ({ eventId, query, year }) => {
          try {
            // Create a search query that will likely find images
            // Focus on Wikipedia/Wikimedia for historical images
            const searchQuery = year 
              ? `${query} ${year} historical photo wikipedia`
              : `${query} historical photo wikipedia`;
            
            console.log(`Searching for: "${searchQuery}"`);

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
            
            // Try to extract an image URL from the search results
            const results = data.data || [];
            
            for (const result of results) {
              // Check if result has an image or og:image
              if (result.metadata?.ogImage) {
                console.log(`Found og:image for "${query}": ${result.metadata.ogImage}`);
                return {
                  eventId,
                  imageUrl: result.metadata.ogImage,
                  source: result.url
                };
              }
              
              // Try to find image in metadata
              if (result.metadata?.image) {
                console.log(`Found metadata image for "${query}": ${result.metadata.image}`);
                return {
                  eventId,
                  imageUrl: result.metadata.image,
                  source: result.url
                };
              }
            }
            
            // If no direct image found, try scraping the first result for images
            if (results[0]?.url) {
              try {
                const scrapeResponse = await fetch("https://api.firecrawl.dev/v1/scrape", {
                  method: "POST",
                  headers: {
                    "Authorization": `Bearer ${FIRECRAWL_API_KEY}`,
                    "Content-Type": "application/json",
                  },
                  body: JSON.stringify({
                    url: results[0].url,
                    formats: ["links"],
                    onlyMainContent: true,
                  }),
                });

                if (scrapeResponse.ok) {
                  const scrapeData = await scrapeResponse.json();
                  const links = scrapeData.data?.links || scrapeData.links || [];
                  
                  // Find image links
                  const imageLink = links.find((link: string) => 
                    link && (
                      link.includes('.jpg') || 
                      link.includes('.jpeg') || 
                      link.includes('.png') ||
                      link.includes('.webp') ||
                      link.includes('upload.wikimedia.org')
                    )
                  );
                  
                  if (imageLink) {
                    console.log(`Found image link for "${query}": ${imageLink}`);
                    return {
                      eventId,
                      imageUrl: imageLink,
                      source: results[0].url
                    };
                  }
                }
              } catch (scrapeErr) {
                console.error(`Scrape error for "${query}":`, scrapeErr);
              }
            }

            console.log(`No image found for "${query}"`);
            return { eventId, imageUrl: null, source: results[0]?.url || null };
          } catch (error) {
            console.error(`Error searching for "${query}":`, error);
            return { eventId, imageUrl: null, source: null };
          }
        })
      );
      
      allResults.push(...batchResults);
      
      // Small delay between batches to avoid rate limiting
      if (i + batchSize < limitedQueries.length) {
        await new Promise(resolve => setTimeout(resolve, 200));
      }
    }

    // Map results back to all queries (those not searched get null)
    const finalResults = queries.map(q => {
      const found = allResults.find(r => r.eventId === q.eventId);
      return found || { eventId: q.eventId, imageUrl: null, source: null };
    });

    console.log(`Found images for ${finalResults.filter(r => r.imageUrl).length}/${queries.length} events`);

    return new Response(
      JSON.stringify({ success: true, images: finalResults }),
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
