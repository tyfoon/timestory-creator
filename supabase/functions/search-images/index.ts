import { serve } from "https://deno.land/std@0.168.0/http/server.ts";

const corsHeaders = {
  "Access-Control-Allow-Origin": "*",
  "Access-Control-Allow-Headers": "authorization, x-client-info, apikey, content-type",
};

interface ImageSearchRequest {
  queries: { eventId: string; query: string; year?: number }[];
  mode?: "fast" | "full";
}

interface ImageResult {
  eventId: string;
  imageUrl: string | null;
  source: string | null;
}

const THUMB_WIDTH = 960;

function isAllowedImageUrl(maybeUrl: string): boolean {
  try {
    const url = new URL(maybeUrl);
    const path = url.pathname.toLowerCase();

    if (path.includes("/transcoded/")) return false;

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
    if (parts.length < 5) return null;
    if (parts[0] !== "wikipedia" && parts[0] !== "commons") return null;

    if (parts[2] === "thumb" || parts[1] === "thumb") return uploadUrl;

    // Handle both /wikipedia/commons/ and /commons/ paths
    if (parts[0] === "commons") {
      const hash1 = parts[1];
      const hash2 = parts[2];
      const filename = parts.slice(3).join("/");
      const thumbPath = `/commons/thumb/${hash1}/${hash2}/${filename}/${width}px-${filename.split("/").pop()}`;
      return `${url.origin}${thumbPath}`;
    }

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

// ============== SOURCE 1: Wikipedia API (fastest) ==============
async function searchWikipediaAPI(query: string, year?: number): Promise<string | null> {
  try {
    const searchQuery = year ? `${query} ${year}` : query;
    
    // Try multiple language Wikipedias in parallel
    const langs = ['nl', 'en', 'de'];
    const searches = langs.map(async (lang) => {
      try {
        // First search for articles
        const searchUrl = `https://${lang}.wikipedia.org/w/api.php?action=query&list=search&srsearch=${encodeURIComponent(searchQuery)}&format=json&srlimit=3&origin=*`;
        const searchRes = await fetch(searchUrl);
        if (!searchRes.ok) return null;
        
        const searchData = await searchRes.json();
        const results = searchData.query?.search || [];
        
        // Get images for top results in parallel
        const imagePromises = results.slice(0, 2).map(async (result: any) => {
          const imageUrl = `https://${lang}.wikipedia.org/w/api.php?action=query&titles=${encodeURIComponent(result.title)}&prop=pageimages&format=json&pithumbsize=${THUMB_WIDTH}&origin=*`;
          const imageRes = await fetch(imageUrl);
          if (!imageRes.ok) return null;
          
          const imageData = await imageRes.json();
          const pages = imageData.query?.pages;
          if (!pages) return null;
          
          const pageId = Object.keys(pages)[0];
          if (!pageId || pageId === '-1') return null;
          
          const thumbnail = pages[pageId]?.thumbnail?.source;
          if (thumbnail && isAllowedImageUrl(thumbnail)) {
            return { imageUrl: thumbnail, source: `https://${lang}.wikipedia.org/wiki/${encodeURIComponent(result.title)}` };
          }
          return null;
        });
        
        const images = await Promise.all(imagePromises);
        return images.find(img => img !== null) || null;
      } catch {
        return null;
      }
    });
    
    const results = await Promise.all(searches);
    const found = results.find(r => r !== null);
    return found?.imageUrl || null;
  } catch (e) {
    console.error("Wikipedia API error:", e);
    return null;
  }
}

// ============== SOURCE 2: Wikimedia Commons (huge archive) ==============
async function searchWikimediaCommons(query: string, year?: number): Promise<{ imageUrl: string; source: string } | null> {
  try {
    const searchQuery = year ? `${query} ${year}` : query;
    
    // Search Commons for images
    const searchUrl = `https://commons.wikimedia.org/w/api.php?action=query&list=search&srsearch=${encodeURIComponent(searchQuery)}&srnamespace=6&format=json&srlimit=5&origin=*`;
    const searchRes = await fetch(searchUrl);
    if (!searchRes.ok) return null;
    
    const searchData = await searchRes.json();
    const results = searchData.query?.search || [];
    
    // Get image info for top results
    for (const result of results.slice(0, 3)) {
      try {
        const title = result.title;
        const infoUrl = `https://commons.wikimedia.org/w/api.php?action=query&titles=${encodeURIComponent(title)}&prop=imageinfo&iiprop=url|thumburl&iiurlwidth=${THUMB_WIDTH}&format=json&origin=*`;
        const infoRes = await fetch(infoUrl);
        if (!infoRes.ok) continue;
        
        const infoData = await infoRes.json();
        const pages = infoData.query?.pages;
        if (!pages) continue;
        
        const pageId = Object.keys(pages)[0];
        if (!pageId || pageId === '-1') continue;
        
        const imageInfo = pages[pageId]?.imageinfo?.[0];
        const thumbUrl = imageInfo?.thumburl || imageInfo?.url;
        
        if (thumbUrl && isAllowedImageUrl(thumbUrl)) {
          return {
            imageUrl: thumbUrl,
            source: `https://commons.wikimedia.org/wiki/${encodeURIComponent(title)}`
          };
        }
      } catch {
        continue;
      }
    }
    
    return null;
  } catch (e) {
    console.error("Commons API error:", e);
    return null;
  }
}

// ============== SOURCE 3: OpenVerse (Creative Commons search) ==============
async function searchOpenVerse(query: string, year?: number): Promise<{ imageUrl: string; source: string } | null> {
  try {
    const searchQuery = year ? `${query} ${year}` : query;
    
    // OpenVerse API (no key required for basic search)
    const searchUrl = `https://api.openverse.org/v1/images/?q=${encodeURIComponent(searchQuery)}&page_size=5&license_type=all`;
    const searchRes = await fetch(searchUrl, {
      headers: {
        'User-Agent': 'TimelineApp/1.0'
      }
    });
    
    if (!searchRes.ok) return null;
    
    const data = await searchRes.json();
    const results = data.results || [];
    
    for (const result of results) {
      // Prefer high-resolution thumbnails
      const imageUrl = result.thumbnail || result.url;
      if (imageUrl && isAllowedImageUrl(imageUrl)) {
        return {
          imageUrl,
          source: result.foreign_landing_url || result.url
        };
      }
    }
    
    return null;
  } catch (e) {
    console.error("OpenVerse API error:", e);
    return null;
  }
}

// ============== SOURCE 4: Flickr Commons (public domain historical) ==============
async function searchFlickrCommons(query: string, year?: number): Promise<{ imageUrl: string; source: string } | null> {
  try {
    const searchQuery = year ? `${query} ${year}` : query;
    
    // Flickr Commons uses the regular Flickr API but filters for The Commons
    // This is a public endpoint that doesn't require API key for basic access
    const searchUrl = `https://api.flickr.com/services/feeds/photos_public.gne?tags=${encodeURIComponent(searchQuery)}&format=json&nojsoncallback=1`;
    const searchRes = await fetch(searchUrl);
    
    if (!searchRes.ok) return null;
    
    const data = await searchRes.json();
    const items = data.items || [];
    
    for (const item of items.slice(0, 3)) {
      // Get a medium-sized image
      const imageUrl = item.media?.m?.replace('_m.', '_c.'); // Get larger size
      if (imageUrl && isAllowedImageUrl(imageUrl)) {
        return {
          imageUrl,
          source: item.link
        };
      }
    }
    
    return null;
  } catch (e) {
    console.error("Flickr API error:", e);
    return null;
  }
}

// ============== FIRECRAWL FALLBACK (only if API key available) ==============
async function searchFirecrawl(
  query: string, 
  year: number | undefined, 
  apiKey: string,
  mode: "fast" | "full"
): Promise<{ imageUrl: string; source: string } | null> {
  try {
    const searchQuery = year ? `${query} ${year} wikipedia` : `${query} wikipedia`;
    
    const response = await fetch("https://api.firecrawl.dev/v1/search", {
      method: "POST",
      headers: {
        "Authorization": `Bearer ${apiKey}`,
        "Content-Type": "application/json",
      },
      body: JSON.stringify({ query: searchQuery, limit: 3 }),
    });

    if (!response.ok) return null;

    const data = await response.json();
    const results = data.data || [];

    // Check metadata images first (fastest)
    for (const result of results) {
      if (result.metadata?.ogImage) {
        const candidate = result.metadata.ogImage;
        if (isAllowedImageUrl(candidate)) {
          const thumbUrl = toWikimediaThumbUrl(candidate, THUMB_WIDTH) || candidate;
          return { imageUrl: thumbUrl, source: result.url };
        }
      }
      if (result.metadata?.image) {
        const candidate = result.metadata.image;
        if (isAllowedImageUrl(candidate)) {
          const thumbUrl = toWikimediaThumbUrl(candidate, THUMB_WIDTH) || candidate;
          return { imageUrl: thumbUrl, source: result.url };
        }
      }
    }

    // In fast mode, skip scraping entirely
    if (mode === "fast") return null;

    // In full mode, try scraping for more images (slower)
    const wikiResult = results.find(
      (r: any) => r?.url?.includes("wikipedia.org") || r?.url?.includes("wikimedia.org")
    );

    if (wikiResult?.url) {
      try {
        const scrapeResponse = await fetch("https://api.firecrawl.dev/v1/scrape", {
          method: "POST",
          headers: {
            "Authorization": `Bearer ${apiKey}`,
            "Content-Type": "application/json",
          },
          body: JSON.stringify({ url: wikiResult.url, formats: ["links"], onlyMainContent: true }),
        });

        if (scrapeResponse.ok) {
          const scrapeData = await scrapeResponse.json();
          const links = scrapeData.data?.links || [];

          for (const link of links) {
            if (link?.includes("upload.wikimedia.org") && isAllowedImageUrl(link)) {
              const thumbUrl = toWikimediaThumbUrl(link, THUMB_WIDTH) || link;
              return { imageUrl: thumbUrl, source: wikiResult.url };
            }
          }
        }
      } catch {
        // Ignore scrape errors
      }
    }

    return null;
  } catch (e) {
    console.error("Firecrawl error:", e);
    return null;
  }
}

// ============== MAIN SEARCH FUNCTION ==============
async function searchAllSources(
  eventId: string,
  query: string,
  year: number | undefined,
  firecrawlKey: string | undefined,
  mode: "fast" | "full"
): Promise<ImageResult> {
  console.log(`Searching for: "${query}" (${year || 'no year'})`);
  
  // Race all free sources in parallel - first one wins
  const freeSources = [
    searchWikipediaAPI(query, year).then(url => url ? { imageUrl: url, source: 'Wikipedia' } : null),
    searchWikimediaCommons(query, year),
    searchOpenVerse(query, year),
    searchFlickrCommons(query, year),
  ];
  
  // Add Firecrawl if available
  if (firecrawlKey) {
    freeSources.push(searchFirecrawl(query, year, firecrawlKey, mode));
  }

  // Use Promise.any to get the first successful result
  try {
    const result = await Promise.any(
      freeSources.map(async (promise) => {
        const res = await promise;
        if (!res) throw new Error('No result');
        return res;
      })
    );
    
    console.log(`Found image for "${query}": ${result.imageUrl?.substring(0, 60)}...`);
    return { eventId, imageUrl: result.imageUrl, source: result.source };
  } catch {
    // All sources failed, wait for all to complete and check
    const allResults = await Promise.allSettled(freeSources);
    const firstSuccess = allResults.find(
      r => r.status === 'fulfilled' && r.value !== null
    );
    
    if (firstSuccess && firstSuccess.status === 'fulfilled' && firstSuccess.value) {
      return { eventId, imageUrl: firstSuccess.value.imageUrl, source: firstSuccess.value.source };
    }
    
    console.log(`No image found for "${query}"`);
    return { eventId, imageUrl: null, source: null };
  }
}

serve(async (req) => {
  if (req.method === "OPTIONS") {
    return new Response(null, { headers: corsHeaders });
  }

  try {
    const { queries, mode = "fast" }: ImageSearchRequest = await req.json();
    console.log(`Searching images for ${queries.length} events (mode: ${mode})`);

    const FIRECRAWL_API_KEY = Deno.env.get("FIRECRAWL_API_KEY");

    // Limit to prevent abuse
    const limitedQueries = queries.slice(0, 20);

    // Process all queries in parallel with all sources
    const results = await Promise.all(
      limitedQueries.map(({ eventId, query, year }) =>
        searchAllSources(eventId, query, year, FIRECRAWL_API_KEY, mode)
      )
    );

    // Fill in any missing eventIds
    const finalResults = queries.map(q => {
      const found = results.find(r => r.eventId === q.eventId);
      return found || { eventId: q.eventId, imageUrl: null, source: null };
    });

    const successCount = finalResults.filter(r => r.imageUrl).length;
    console.log(`Found images for ${successCount}/${queries.length} events`);

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
