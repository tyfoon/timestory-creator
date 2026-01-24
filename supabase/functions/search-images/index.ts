import { serve } from "https://deno.land/std@0.168.0/http/server.ts";

const corsHeaders = {
  "Access-Control-Allow-Origin": "*",
  "Access-Control-Allow-Headers": "authorization, x-client-info, apikey, content-type",
};

interface ImageSearchRequest {
  queries: { eventId: string; query: string; year?: number }[];
}

// Convert Wikipedia/Commons File: page URLs to direct image URLs via Special:FilePath
function toDirectImageUrl(maybeUrl: string): string | null {
  try {
    // Remove hash fragments
    const hashIdx = maybeUrl.indexOf("#");
    const cleanUrl = hashIdx === -1 ? maybeUrl : maybeUrl.slice(0, hashIdx);
    const url = new URL(cleanUrl);

    // Already a direct Wikimedia upload URL
    if (url.hostname === "upload.wikimedia.org") {
      return url.toString();
    }

    // Wikipedia/Commons file page -> convert to Special:FilePath (redirects to actual image)
    const marker = "/wiki/File:";
    const idx = url.pathname.indexOf(marker);
    if (idx !== -1) {
      const filename = decodeURIComponent(url.pathname.slice(idx + marker.length));
      // Special:FilePath returns a redirect to the actual image file
      return `${url.origin}/wiki/Special:FilePath/${encodeURIComponent(filename)}`;
    }

    // Accept direct image file URLs
    const lower = url.pathname.toLowerCase();
    if (lower.endsWith(".jpg") || lower.endsWith(".jpeg") || lower.endsWith(".png") || lower.endsWith(".webp") || lower.endsWith(".gif")) {
      return url.toString();
    }

    return null;
  } catch {
    return null;
  }
}

// Pick the best direct image URL from a list of links
function pickBestDirectImage(links: string[]): string | null {
  // First priority: direct upload.wikimedia.org URLs
  for (const link of links) {
    if (!link) continue;
    const direct = toDirectImageUrl(link);
    if (direct && direct.includes("upload.wikimedia.org")) {
      return direct;
    }
  }

  // Second priority: Special:FilePath URLs (converted from File: pages)
  for (const link of links) {
    if (!link) continue;
    const direct = toDirectImageUrl(link);
    if (direct && direct.includes("Special:FilePath")) {
      return direct;
    }
  }

  // Third priority: any direct image URL
  for (const link of links) {
    if (!link) continue;
    const direct = toDirectImageUrl(link);
    if (direct) {
      return direct;
    }
  }

  return null;
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

    const batchSize = 5;
    const allResults: { eventId: string; imageUrl: string | null; source: string | null }[] = [];
    const limitedQueries = queries.slice(0, 15);
    
    for (let i = 0; i < limitedQueries.length; i += batchSize) {
      const batch = limitedQueries.slice(i, i + batchSize);
      
      const batchResults = await Promise.all(
        batch.map(async ({ eventId, query, year }) => {
          try {
            // Search for Wikipedia/Wikimedia images
            const searchQuery = year 
              ? `${query} ${year} wikipedia`
              : `${query} wikipedia`;
            
            console.log(`Searching for: "${searchQuery}"`);

            const response = await fetch("https://api.firecrawl.dev/v1/search", {
              method: "POST",
              headers: {
                "Authorization": `Bearer ${FIRECRAWL_API_KEY}`,
                "Content-Type": "application/json",
              },
              body: JSON.stringify({
                query: searchQuery,
                limit: 5,
              }),
            });

            if (!response.ok) {
              console.error(`Firecrawl search failed for "${query}":`, response.status);
              return { eventId, imageUrl: null, source: null };
            }

            const data = await response.json();
            const results = data.data || [];
            
            // Check each result for direct image URLs
            for (const result of results) {
              // If the result URL itself is a Wikipedia File: page, convert it
              if (result?.url) {
                const directFromUrl = toDirectImageUrl(result.url);
                if (directFromUrl) {
                  console.log(`Found direct image from result URL for "${query}": ${directFromUrl}`);
                  return { eventId, imageUrl: directFromUrl, source: result.url };
                }
              }

              // Check og:image metadata
              if (result.metadata?.ogImage) {
                const directOg = toDirectImageUrl(result.metadata.ogImage);
                if (directOg) {
                  console.log(`Found og:image for "${query}": ${directOg}`);
                  return { eventId, imageUrl: directOg, source: result.url };
                }
              }
              
              // Check image metadata
              if (result.metadata?.image) {
                const directImg = toDirectImageUrl(result.metadata.image);
                if (directImg) {
                  console.log(`Found metadata image for "${query}": ${directImg}`);
                  return { eventId, imageUrl: directImg, source: result.url };
                }
              }
            }
            
            // Try scraping the first Wikipedia result for image links
            const wikiResult = results.find((r: any) => 
              r?.url?.includes("wikipedia.org") || r?.url?.includes("wikimedia.org")
            );
            
            if (wikiResult?.url) {
              try {
                console.log(`Scraping ${wikiResult.url} for images...`);
                const scrapeResponse = await fetch("https://api.firecrawl.dev/v1/scrape", {
                  method: "POST",
                  headers: {
                    "Authorization": `Bearer ${FIRECRAWL_API_KEY}`,
                    "Content-Type": "application/json",
                  },
                  body: JSON.stringify({
                    url: wikiResult.url,
                    formats: ["links"],
                    onlyMainContent: true,
                  }),
                });

                if (scrapeResponse.ok) {
                  const scrapeData = await scrapeResponse.json();
                  const links = scrapeData.data?.links || scrapeData.links || [];
                  
                  const bestImage = pickBestDirectImage(links);
                  if (bestImage) {
                    console.log(`Found best image for "${query}": ${bestImage}`);
                    return { eventId, imageUrl: bestImage, source: wikiResult.url };
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
      
      if (i + batchSize < limitedQueries.length) {
        await new Promise(resolve => setTimeout(resolve, 200));
      }
    }

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
