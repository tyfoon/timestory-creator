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

// ============== WIKIPEDIA API (most reliable source) ==============
async function searchWikipediaWithImages(
  query: string, 
  year: number | undefined,
  lang: string
): Promise<{ imageUrl: string; source: string } | null> {
  try {
    // Step 1: Search for the most relevant article
    const searchQuery = year ? `${query} ${year}` : query;
    const searchUrl = `https://${lang}.wikipedia.org/w/api.php?action=query&list=search&srsearch=${encodeURIComponent(searchQuery)}&format=json&srlimit=5&origin=*`;
    
    const searchRes = await fetch(searchUrl);
    if (!searchRes.ok) return null;
    
    const searchData = await searchRes.json();
    const results = searchData.query?.search || [];
    
    if (results.length === 0) return null;
    
    // Step 2: Get images for top 3 results, pick the best one
    for (const result of results.slice(0, 3)) {
      const title = result.title;
      
      // Get the page thumbnail directly
      const imageUrl = `https://${lang}.wikipedia.org/w/api.php?action=query&titles=${encodeURIComponent(title)}&prop=pageimages&format=json&pithumbsize=${THUMB_WIDTH}&piprop=thumbnail|original&origin=*`;
      
      const imageRes = await fetch(imageUrl);
      if (!imageRes.ok) continue;
      
      const imageData = await imageRes.json();
      const pages = imageData.query?.pages;
      if (!pages) continue;
      
      const pageId = Object.keys(pages)[0];
      if (!pageId || pageId === '-1') continue;
      
      const page = pages[pageId];
      const thumbnail = page?.thumbnail?.source;
      
      if (thumbnail && isAllowedImageUrl(thumbnail)) {
        return {
          imageUrl: thumbnail,
          source: `https://${lang}.wikipedia.org/wiki/${encodeURIComponent(title)}`
        };
      }
    }
    
    return null;
  } catch (e) {
    console.error(`Wikipedia ${lang} API error:`, e);
    return null;
  }
}

// ============== WIKIMEDIA COMMONS (large historical archive) ==============
async function searchWikimediaCommons(
  query: string, 
  year: number | undefined
): Promise<{ imageUrl: string; source: string } | null> {
  try {
    // Search Commons for images - be specific to avoid unrelated results
    const searchQuery = year ? `"${query}" ${year}` : `"${query}"`;
    
    const searchUrl = `https://commons.wikimedia.org/w/api.php?action=query&list=search&srsearch=${encodeURIComponent(searchQuery)}&srnamespace=6&format=json&srlimit=5&origin=*`;
    const searchRes = await fetch(searchUrl);
    if (!searchRes.ok) return null;
    
    const searchData = await searchRes.json();
    const results = searchData.query?.search || [];
    
    for (const result of results.slice(0, 3)) {
      try {
        const title = result.title;
        
        // Get image info with thumbnail
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

// ============== NATIONAAL ARCHIEF (Dutch historical photos - CC0/Public Domain) ==============
async function searchNationaalArchief(
  query: string,
  year: number | undefined
): Promise<{ imageUrl: string; source: string } | null> {
  try {
    // Search Nationaal Archief via their open data API
    // Their photos are also mirrored to Wikimedia Commons under "Images from Nationaal Archief"
    const searchQuery = year 
      ? `${query} ${year} Nationaal Archief`
      : `${query} Nationaal Archief`;
    
    // Search Commons specifically for Nationaal Archief images
    const searchUrl = `https://commons.wikimedia.org/w/api.php?action=query&list=search&srsearch=${encodeURIComponent(searchQuery)}&srnamespace=6&format=json&srlimit=5&origin=*`;
    const searchRes = await fetch(searchUrl);
    if (!searchRes.ok) return null;
    
    const searchData = await searchRes.json();
    const results = searchData.query?.search || [];
    
    for (const result of results.slice(0, 3)) {
      try {
        const title = result.title;
        
        // Verify it's actually from Nationaal Archief by checking categories
        const catUrl = `https://commons.wikimedia.org/w/api.php?action=query&titles=${encodeURIComponent(title)}&prop=categories&format=json&origin=*`;
        const catRes = await fetch(catUrl);
        if (!catRes.ok) continue;
        
        const catData = await catRes.json();
        const pages = catData.query?.pages;
        if (!pages) continue;
        
        const pageId = Object.keys(pages)[0];
        if (!pageId || pageId === '-1') continue;
        
        const categories = pages[pageId]?.categories || [];
        const isFromNA = categories.some((cat: { title: string }) => 
          cat.title.toLowerCase().includes('nationaal archief') ||
          cat.title.toLowerCase().includes('anefo') ||
          cat.title.toLowerCase().includes('van de poll')
        );
        
        if (!isFromNA) continue;
        
        // Get image info with thumbnail
        const infoUrl = `https://commons.wikimedia.org/w/api.php?action=query&titles=${encodeURIComponent(title)}&prop=imageinfo&iiprop=url|thumburl&iiurlwidth=${THUMB_WIDTH}&format=json&origin=*`;
        const infoRes = await fetch(infoUrl);
        if (!infoRes.ok) continue;
        
        const infoData = await infoRes.json();
        const infoPages = infoData.query?.pages;
        if (!infoPages) continue;
        
        const infoPageId = Object.keys(infoPages)[0];
        if (!infoPageId || infoPageId === '-1') continue;
        
        const imageInfo = infoPages[infoPageId]?.imageinfo?.[0];
        const thumbUrl = imageInfo?.thumburl || imageInfo?.url;
        
        if (thumbUrl && isAllowedImageUrl(thumbUrl)) {
          console.log(`Found Nationaal Archief image for "${query}"`);
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
    console.error("Nationaal Archief search error:", e);
    return null;
  }
}

// ============== FIRECRAWL WIKIPEDIA ONLY (no generic sources) ==============
async function searchFirecrawlWikipediaOnly(
  query: string, 
  year: number | undefined, 
  apiKey: string
): Promise<{ imageUrl: string; source: string } | null> {
  try {
    // Search specifically for Wikipedia articles only
    const searchQuery = year 
      ? `site:wikipedia.org "${query}" ${year}` 
      : `site:wikipedia.org "${query}"`;
    
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

    // Only use Wikipedia results
    for (const result of results) {
      if (!result?.url?.includes("wikipedia.org")) continue;
      
      // Extract the article title and fetch image via Wikipedia API
      try {
        const urlObj = new URL(result.url);
        const pathMatch = urlObj.pathname.match(/\/wiki\/(.+)/);
        if (!pathMatch) continue;
        
        const title = decodeURIComponent(pathMatch[1]);
        const lang = urlObj.hostname.split('.')[0];
        
        // Use Wikipedia API to get the actual article image
        const imageUrl = `https://${lang}.wikipedia.org/w/api.php?action=query&titles=${encodeURIComponent(title)}&prop=pageimages&format=json&pithumbsize=${THUMB_WIDTH}&origin=*`;
        
        const imageRes = await fetch(imageUrl);
        if (!imageRes.ok) continue;
        
        const imageData = await imageRes.json();
        const pages = imageData.query?.pages;
        if (!pages) continue;
        
        const pageId = Object.keys(pages)[0];
        if (!pageId || pageId === '-1') continue;
        
        const thumbnail = pages[pageId]?.thumbnail?.source;
        if (thumbnail && isAllowedImageUrl(thumbnail)) {
          return { imageUrl: thumbnail, source: result.url };
        }
      } catch {
        continue;
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
  firecrawlKey: string | undefined
): Promise<ImageResult> {
  console.log(`Searching for: "${query}" (${year || 'no year'})`);
  
  // Search all sources in parallel - prioritize Dutch/historical sources
  const allSources = [
    // Dutch sources first (likely most relevant for Dutch app)
    searchNationaalArchief(query, year),
    searchWikipediaWithImages(query, year, 'nl'),
    // International sources
    searchWikipediaWithImages(query, year, 'en'),
    searchWikipediaWithImages(query, year, 'de'),
    searchWikimediaCommons(query, year),
  ];
  
  // Add Firecrawl Wikipedia-only search if available
  if (firecrawlKey) {
    allSources.push(searchFirecrawlWikipediaOnly(query, year, firecrawlKey));
  }

  // Use Promise.any to get the first successful result
  try {
    const result = await Promise.any(
      allSources.map(async (promise) => {
        const res = await promise;
        if (!res) throw new Error('No result');
        return res;
      })
    );
    
    console.log(`Found image for "${query}": ${result.imageUrl?.substring(0, 80)}...`);
    return { eventId, imageUrl: result.imageUrl, source: result.source };
  } catch {
    // All sources failed - return null (better no image than wrong image)
    console.log(`No image found for "${query}" in any source`);
    return { eventId, imageUrl: null, source: null };
  }
}

serve(async (req) => {
  if (req.method === "OPTIONS") {
    return new Response(null, { headers: corsHeaders });
  }

  try {
    const { queries }: ImageSearchRequest = await req.json();
    console.log(`Searching images for ${queries.length} events (Wikipedia/Commons only)`);

    const FIRECRAWL_API_KEY = Deno.env.get("FIRECRAWL_API_KEY");

    // Limit to prevent abuse
    const limitedQueries = queries.slice(0, 20);

    // Process all queries in parallel
    const results = await Promise.all(
      limitedQueries.map(({ eventId, query, year }) =>
        searchAllSources(eventId, query, year, FIRECRAWL_API_KEY)
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
