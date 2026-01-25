import { serve } from "https://deno.land/std@0.168.0/http/server.ts";

const corsHeaders = {
  "Access-Control-Allow-Origin": "*",
  "Access-Control-Allow-Headers": "authorization, x-client-info, apikey, content-type",
};

interface ImageSearchRequest {
  queries: { eventId: string; query: string; year?: number }[];
  mode?: "fast" | "full";
}

const THUMB_WIDTH = 960;

function isAllowedImageUrl(maybeUrl: string): boolean {
  try {
    const url = new URL(maybeUrl);
    const path = url.pathname.toLowerCase();

    // Wikimedia sometimes hosts audio/video under /thumb/transcoded/... and will happily return .mp3 etc.
    // Those are NOT images and can be very large downloads.
    if (path.includes("/transcoded/")) return false;

    // Quick reject known non-image extensions
    if (
      path.endsWith(".mp3") ||
      path.endsWith(".ogg") ||
      path.endsWith(".wav") ||
      path.endsWith(".webm") ||
      path.endsWith(".mp4") ||
      path.endsWith(".ogv") ||
      path.endsWith(".pdf") ||
      path.endsWith(".svg")
    ) {
      return false;
    }

    // Accept common raster image extensions
    return (
      path.endsWith(".jpg") ||
      path.endsWith(".jpeg") ||
      path.endsWith(".png") ||
      path.endsWith(".webp") ||
      path.endsWith(".gif")
    );
  } catch {
    return false;
  }
}

function toWikimediaThumbUrl(uploadUrl: string, width: number): string | null {
  try {
    if (!isAllowedImageUrl(uploadUrl)) return null;

    const url = new URL(uploadUrl);
    if (url.hostname !== "upload.wikimedia.org") return null;

    const parts = url.pathname.split("/").filter(Boolean);
    // Expected: wikipedia/<project>/<hash1>/<hash2>/<filename>
    if (parts.length < 5) return null;
    if (parts[0] !== "wikipedia") return null;

    // If already a thumb URL, keep it (avoid weird re-writes)
    if (parts[2] === "thumb") return uploadUrl;

    const project = parts[1];
    const hash1 = parts[2];
    const hash2 = parts[3];
    const filename = parts.slice(4).join("/");

    const thumbPath = `/wikipedia/${project}/thumb/${hash1}/${hash2}/${filename}/${width}px-${filename.split("/").pop()}`;
    return `${url.origin}${thumbPath}`;
  } catch {
    return null;
  }
}

// Resolve Wikipedia Special:FilePath URLs to actual direct image URLs
async function resolveWikimediaUrl(url: string): Promise<string | null> {
  try {
    // Already a direct upload URL - return as-is
    if (url.includes("upload.wikimedia.org") && !url.includes("Special:FilePath")) {
      if (!isAllowedImageUrl(url)) return null;
      return toWikimediaThumbUrl(url, THUMB_WIDTH) || url;
    }

    // Skip obvious non-image files early
    // (For Special:FilePath URLs we may not have a filename extension, so this is best-effort.)
    const lower = url.toLowerCase();
    if (
      lower.includes("/transcoded/") ||
      lower.includes(".ogg") ||
      lower.includes(".mp3") ||
      lower.includes(".wav") ||
      lower.includes(".webm") ||
      lower.includes(".mp4") ||
      lower.includes(".ogv") ||
      lower.includes(".svg") ||
      lower.includes(".pdf")
    ) {
      return null;
    }

    // If it's a Special:FilePath URL, follow the redirect to get the actual image URL
    if (url.includes("Special:FilePath")) {
      let resp = await fetch(url, { method: "HEAD", redirect: "follow" });
      if (!resp.ok) {
        // Some hosts don't love HEAD; fall back to GET
        resp = await fetch(url, { method: "GET", redirect: "follow" });
      }

      const finalUrl = resp.url;
      
      // Verify it's actually an image
      if (finalUrl.includes("upload.wikimedia.org")) {
        if (!isAllowedImageUrl(finalUrl)) return null;
        return toWikimediaThumbUrl(finalUrl, THUMB_WIDTH) || finalUrl;
      }
      return null;
    }

    // Never return non-image pages (e.g. wikipedia.org/wiki/Fișier:...) as an image URL.
    return null;
  } catch (e) {
    console.error("Error resolving URL:", url, e);
    return null;
  }
}

// Fetch the main image from a Wikipedia article using the Wikipedia API
async function getWikipediaMainImage(wikiUrl: string): Promise<string | null> {
  try {
    const url = new URL(wikiUrl);
    
    // Extract article title from URL
    const pathMatch = url.pathname.match(/\/wiki\/(.+)/);
    if (!pathMatch) return null;
    
    const title = decodeURIComponent(pathMatch[1]);
    const lang = url.hostname.split('.')[0]; // e.g., 'en', 'nl'
    
    // Use Wikipedia API to get page images
    const apiUrl = `https://${lang}.wikipedia.org/w/api.php?action=query&titles=${encodeURIComponent(title)}&prop=pageimages&format=json&pithumbsize=${THUMB_WIDTH}&origin=*`;
    
    const response = await fetch(apiUrl);
    if (!response.ok) return null;
    
    const data = await response.json();
    const pages = data.query?.pages;
    if (!pages) return null;
    
    // Get the first page (there should only be one)
    const pageId = Object.keys(pages)[0];
    if (!pageId || pageId === '-1') return null;
    
    const thumbnail = pages[pageId]?.thumbnail?.source;
    if (thumbnail && isAllowedImageUrl(thumbnail)) {
      return thumbnail;
    }
    
    return null;
  } catch (e) {
    console.error("Error fetching Wikipedia image:", e);
    return null;
  }
}

// Convert Wikipedia/Commons File: page URLs to Special:FilePath URL
function toSpecialFilePath(maybeUrl: string): string | null {
  try {
    // Remove hash fragments
    const hashIdx = maybeUrl.indexOf("#");
    const cleanUrl = hashIdx === -1 ? maybeUrl : maybeUrl.slice(0, hashIdx);
    const url = new URL(cleanUrl);

    // Already a direct Wikimedia upload URL
    if (url.hostname === "upload.wikimedia.org") {
      return url.toString();
    }

    // Wikipedia/Commons file page -> convert to Special:FilePath
    const marker = "/wiki/File:";
    const idx = url.pathname.indexOf(marker);
    if (idx !== -1) {
      const filename = decodeURIComponent(url.pathname.slice(idx + marker.length));
      return `${url.origin}/wiki/Special:FilePath/${encodeURIComponent(filename)}`;
    }

    return null;
  } catch {
    return null;
  }
}

// Pick the best image URL from a list of links (returns Special:FilePath for later resolution)
function pickBestImageLink(links: string[]): string | null {
  // First priority: direct upload.wikimedia.org URLs
  for (const link of links) {
    if (!link) continue;
    const direct = toSpecialFilePath(link);
    if (direct && direct.includes("upload.wikimedia.org") && isAllowedImageUrl(direct)) {
      return direct;
    }
  }

  // Second priority: File: pages (will be converted to Special:FilePath)
  for (const link of links) {
    if (!link) continue;
    const direct = toSpecialFilePath(link);
    // Skip obvious non-image file types even if they come via Special:FilePath
    if (
      direct &&
      direct.includes("Special:FilePath") &&
      !/\.(ogg|mp3|wav|webm|mp4|ogv|pdf|svg)$/i.test(direct)
    ) {
      return direct;
    }
  }

  // Third priority: any direct image URL
  for (const link of links) {
    if (!link) continue;
    const direct = toSpecialFilePath(link);
    if (direct && (direct.includes("upload.wikimedia.org") ? isAllowedImageUrl(direct) : true)) {
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
    const { queries, mode = "full" }: ImageSearchRequest = await req.json();
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

    // Process all queries in parallel (Firecrawl can handle it)
    const allResults: { eventId: string; imageUrl: string | null; source: string | null }[] = [];
    const limitedQueries = queries.slice(0, 20);

    const processQuery = async ({ eventId, query, year }: { eventId: string; query: string; year?: number }) => {
      try {
        const searchQuery = year ? `${query} ${year} wikipedia` : `${query} wikipedia`;
        console.log(`Searching for: "${searchQuery}"`);

        const response = await fetch("https://api.firecrawl.dev/v1/search", {
          method: "POST",
          headers: {
            "Authorization": `Bearer ${FIRECRAWL_API_KEY}`,
            "Content-Type": "application/json",
          },
          body: JSON.stringify({ query: searchQuery, limit: 5 }),
        });

        if (!response.ok) {
          console.error(`Firecrawl search failed for "${query}":`, response.status);
          return { eventId, imageUrl: null, source: null };
        }

        const data = await response.json();
        const results = data.data || [];

        for (const result of results) {
          if (result?.url) {
            const candidate = toSpecialFilePath(result.url);
            if (candidate) {
              const resolved = await resolveWikimediaUrl(candidate);
              if (resolved) {
                console.log(`Found direct image from result URL for "${query}": ${resolved}`);
                return { eventId, imageUrl: resolved, source: result.url };
              }
            }
          }

          if (result.metadata?.ogImage) {
            const candidate = toSpecialFilePath(result.metadata.ogImage);
            if (candidate) {
              const resolved = await resolveWikimediaUrl(candidate);
              if (resolved) {
                console.log(`Found og:image for "${query}": ${resolved}`);
                return { eventId, imageUrl: resolved, source: result.url };
              }
            }
          }

          if (result.metadata?.image) {
            const candidate = toSpecialFilePath(result.metadata.image);
            if (candidate) {
              const resolved = await resolveWikimediaUrl(candidate);
              if (resolved) {
                console.log(`Found metadata image for "${query}": ${resolved}`);
                return { eventId, imageUrl: resolved, source: result.url };
              }
            }
          }
        }

        // Try Wikipedia API directly for the first Wikipedia result (faster than scraping)
        const wikiResult = results.find(
          (r: any) => r?.url?.includes("wikipedia.org") && !r?.url?.includes("wikimedia.org")
        );
        
        if (wikiResult?.url) {
          const wikiImage = await getWikipediaMainImage(wikiResult.url);
          if (wikiImage) {
            console.log(`Found Wikipedia API image for "${query}": ${wikiImage}`);
            return { eventId, imageUrl: wikiImage, source: wikiResult.url };
          }
        }

        // Full mode: optionally scrape the top Wikipedia result for extra image links.
        // Fast mode: skip scraping entirely (much faster first images).
        if (mode === "full") {
          const wikiOrMediaResult = results.find(
            (r: any) => r?.url?.includes("wikipedia.org") || r?.url?.includes("wikimedia.org")
          );

          if (wikiOrMediaResult?.url) {
            try {
              console.log(`Scraping ${wikiOrMediaResult.url} for images...`);
              const scrapeResponse = await fetch("https://api.firecrawl.dev/v1/scrape", {
                method: "POST",
                headers: {
                  "Authorization": `Bearer ${FIRECRAWL_API_KEY}`,
                  "Content-Type": "application/json",
                },
                body: JSON.stringify({ url: wikiOrMediaResult.url, formats: ["links"], onlyMainContent: true }),
              });

              if (scrapeResponse.ok) {
                const scrapeData = await scrapeResponse.json();
                const links = scrapeData.data?.links || scrapeData.links || [];

                const bestImageCandidate = pickBestImageLink(links);
                if (bestImageCandidate) {
                  const resolved = await resolveWikimediaUrl(bestImageCandidate);
                  if (resolved) {
                    console.log(`Found best image for "${query}": ${resolved}`);
                    return { eventId, imageUrl: resolved, source: wikiOrMediaResult.url };
                  }
                }
              }
            } catch (scrapeErr) {
              console.error(`Scrape error for "${query}":`, scrapeErr);
            }
          }
        }

        console.log(`No image found for "${query}"`);
        return { eventId, imageUrl: null, source: results[0]?.url || null };
      } catch (error) {
        console.error(`Error searching for "${query}":`, error);
        return { eventId, imageUrl: null, source: null };
      }
    };

    // Run all queries in parallel
    const batchResults = await Promise.all(limitedQueries.map(processQuery));
    allResults.push(...batchResults);

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
