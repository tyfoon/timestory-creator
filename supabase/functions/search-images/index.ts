import { serve } from "https://deno.land/std@0.168.0/http/server.ts";

const corsHeaders = {
  "Access-Control-Allow-Origin": "*",
  "Access-Control-Allow-Headers": "authorization, x-client-info, apikey, content-type",
};

interface ImageSearchRequest {
  queries: { eventId: string; query: string; year?: number; isCelebrity?: boolean; isMovie?: boolean }[];
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

// ============== HELPER: Check if search result title matches query subject ==============
function titleMatchesQuery(title: string, query: string, strict: boolean = true): boolean {
  const titleLower = title.toLowerCase();
  const queryLower = query.toLowerCase();
  
  // Extract the main subject from the query (first few significant words)
  const queryWords = queryLower.split(/\s+/).filter(w => 
    w.length > 2 && 
    !['the', 'and', 'for', 'van', 'het', 'een', 'der', 'den', 'des', 'von', 'und'].includes(w) &&
    !/^\d{4}$/.test(w) // Exclude years
  );
  
  if (queryWords.length === 0) return true;
  
  const mainSubjectWords = queryWords.slice(0, 4);
  const matchCount = mainSubjectWords.filter(word => titleLower.includes(word)).length;
  
  if (strict) {
    // Strict mode: require at least half of the main words to match
    const threshold = Math.max(1, Math.ceil(mainSubjectWords.length / 2));
    return matchCount >= threshold;
  } else {
    // Lenient mode (fallback): require just 1 word to match
    return matchCount >= 1;
  }
}

interface SearchOptions {
  useQuotes?: boolean;
  includeYear?: boolean;
  strictMatch?: boolean;
}

// ============== WIKIPEDIA API (most reliable source) ==============
async function searchWikipediaWithImages(
  query: string, 
  year: number | undefined,
  lang: string,
  options: SearchOptions = {}
): Promise<{ imageUrl: string; source: string } | null> {
  const { useQuotes = false, includeYear = true, strictMatch = true } = options;
  
  try {
    let searchQuery = query;
    if (useQuotes) {
      searchQuery = `"${query}"`;
    }
    if (includeYear && year) {
      searchQuery = `${searchQuery} ${year}`;
    }
    
    const searchUrl = `https://${lang}.wikipedia.org/w/api.php?action=query&list=search&srsearch=${encodeURIComponent(searchQuery)}&format=json&srlimit=5&origin=*`;
    
    const searchRes = await fetch(searchUrl);
    if (!searchRes.ok) return null;
    
    const searchData = await searchRes.json();
    const results = searchData.query?.search || [];
    
    if (results.length === 0) return null;
    
    for (const result of results.slice(0, 3)) {
      const title = result.title;
      
      if (!titleMatchesQuery(title, query, strictMatch)) {
        continue;
      }
      
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
        console.log(`Wikipedia ${lang}: matched "${title}" for query "${query}"`);
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
  year: number | undefined,
  options: SearchOptions = {}
): Promise<{ imageUrl: string; source: string } | null> {
  const { useQuotes = false, includeYear = true, strictMatch = true } = options;
  
  try {
    let searchQuery = query;
    if (useQuotes) {
      searchQuery = `"${query}"`;
    }
    if (includeYear && year) {
      searchQuery = `${searchQuery} ${year}`;
    }
    
    const searchUrl = `https://commons.wikimedia.org/w/api.php?action=query&list=search&srsearch=${encodeURIComponent(searchQuery)}&srnamespace=6&format=json&srlimit=5&origin=*`;
    const searchRes = await fetch(searchUrl);
    if (!searchRes.ok) return null;
    
    const searchData = await searchRes.json();
    const results = searchData.query?.search || [];
    
    for (const result of results.slice(0, 3)) {
      try {
        const title = result.title;
        
        if (!titleMatchesQuery(title, query, strictMatch)) {
          continue;
        }
        
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
          console.log(`Commons: matched "${title}" for query "${query}"`);
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
  year: number | undefined,
  options: SearchOptions = {}
): Promise<{ imageUrl: string; source: string } | null> {
  const { includeYear = true, strictMatch = true } = options;
  
  try {
    let searchQuery = `${query} Nationaal Archief`;
    if (includeYear && year) {
      searchQuery = `${query} ${year} Nationaal Archief`;
    }
    
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
        
        // Check title match with strictMatch setting
        if (!titleMatchesQuery(title, query, strictMatch)) {
          continue;
        }
        
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

// ============== TMDB API (celebrity portraits) ==============
async function searchTMDBPerson(
  query: string
): Promise<{ imageUrl: string; source: string } | null> {
  const TMDB_API_KEY = Deno.env.get("TMDB_API_KEY");
  if (!TMDB_API_KEY) {
    return null;
  }
  
  try {
    // Search for a person on TMDB
    const searchUrl = `https://api.themoviedb.org/3/search/person?api_key=${TMDB_API_KEY}&query=${encodeURIComponent(query)}&language=en-US&page=1`;
    
    const searchRes = await fetch(searchUrl);
    if (!searchRes.ok) return null;
    
    const searchData = await searchRes.json();
    const results = searchData.results || [];
    
    if (results.length === 0) return null;
    
    // Get the first matching person with a profile image
    for (const person of results.slice(0, 3)) {
      if (person.profile_path) {
        // Use w500 size for good quality
        const imageUrl = `https://image.tmdb.org/t/p/w500${person.profile_path}`;
        const source = `https://www.themoviedb.org/person/${person.id}`;
        
        console.log(`TMDB: found portrait for "${person.name}" (query: "${query}")`);
        return { imageUrl, source };
      }
    }
    
    return null;
  } catch (e) {
    console.error("TMDB Person API error:", e);
    return null;
  }
}

// ============== TMDB API (movie posters/backdrops) ==============
async function searchTMDBMovie(
  query: string,
  year?: number
): Promise<{ imageUrl: string; source: string } | null> {
  const TMDB_API_KEY = Deno.env.get("TMDB_API_KEY");
  if (!TMDB_API_KEY) {
    console.log("TMDB Movie: API key not configured");
    return null;
  }
  
  try {
    // Search for a movie on TMDB, optionally filter by year
    let searchUrl = `https://api.themoviedb.org/3/search/movie?api_key=${TMDB_API_KEY}&query=${encodeURIComponent(query)}&language=en-US&page=1`;
    if (year) {
      searchUrl += `&year=${year}`;
    }
    
    console.log(`TMDB Movie: searching for "${query}" (${year || 'no year'})`);
    
    const searchRes = await fetch(searchUrl);
    if (!searchRes.ok) {
      console.log(`TMDB Movie: API returned ${searchRes.status}`);
      return null;
    }
    
    const searchData = await searchRes.json();
    const results = searchData.results || [];
    
    console.log(`TMDB Movie: found ${results.length} results`);
    
    if (results.length === 0) return null;
    
    // Get the first matching movie with a backdrop or poster
    for (const movie of results.slice(0, 3)) {
      // Prefer backdrop (wider, more cinematic) over poster
      const imagePath = movie.backdrop_path || movie.poster_path;
      if (imagePath) {
        // Use w780 for backdrops (good quality, not too large)
        const size = movie.backdrop_path ? 'w780' : 'w500';
        const imageUrl = `https://image.tmdb.org/t/p/${size}${imagePath}`;
        const source = `https://www.themoviedb.org/movie/${movie.id}`;
        
        console.log(`TMDB: found movie image for "${movie.title}" (query: "${query}")`);
        return { imageUrl, source };
      }
    }
    
    console.log("TMDB Movie: no results with images found");
    return null;
  } catch (e) {
    console.error("TMDB Movie API error:", e);
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

// ============== FALLBACK HELPER ==============
async function trySourceWithFallback(
  searchFn: (query: string, year: number | undefined, options: SearchOptions) => Promise<{ imageUrl: string; source: string } | null>,
  query: string,
  year: number | undefined
): Promise<{ imageUrl: string; source: string } | null> {
  // Phase 1: With quotes + year (strict matching)
  let result = await searchFn(query, year, { useQuotes: true, includeYear: true, strictMatch: true });
  if (result) return result;
  
  // Phase 2: Without quotes + year (strict matching)
  result = await searchFn(query, year, { useQuotes: false, includeYear: true, strictMatch: true });
  if (result) return result;
  
  // Phase 3: Without quotes + without year (lenient matching)
  if (year) {
    result = await searchFn(query, year, { useQuotes: false, includeYear: false, strictMatch: false });
    if (result) return result;
  }
  
  return null;
}

// ============== MAIN SEARCH FUNCTION ==============
async function searchAllSources(
  eventId: string,
  query: string,
  year: number | undefined,
  firecrawlKey: string | undefined,
  isCelebrity: boolean = false,
  isMovie: boolean = false
): Promise<ImageResult> {
  console.log(`Searching for: "${query}" (${year || 'no year'})${isCelebrity ? ' [celebrity]' : ''}${isMovie ? ' [movie]' : ''}`);
  
  // For celebrities, try TMDB first as it's optimized for person portraits
  if (isCelebrity) {
    const tmdbResult = await searchTMDBPerson(query);
    if (tmdbResult) {
      console.log(`Found celebrity image via TMDB for "${query}"`);
      return { eventId, imageUrl: tmdbResult.imageUrl, source: tmdbResult.source };
    }
  }
  
  // For movies, try TMDB first as it has the best movie posters/backdrops
  if (isMovie) {
    const tmdbResult = await searchTMDBMovie(query, year);
    if (tmdbResult) {
      console.log(`Found movie image via TMDB for "${query}"`);
      return { eventId, imageUrl: tmdbResult.imageUrl, source: tmdbResult.source };
    }
  }
  
  // Search all sources in parallel with fallback strategy
  const allSources = [
    // Dutch sources first (likely most relevant for Dutch app)
    trySourceWithFallback(searchNationaalArchief, query, year),
    trySourceWithFallback(
      (q, y, opts) => searchWikipediaWithImages(q, y, 'nl', opts),
      query,
      year
    ),
    // International sources
    trySourceWithFallback(
      (q, y, opts) => searchWikipediaWithImages(q, y, 'en', opts),
      query,
      year
    ),
    trySourceWithFallback(
      (q, y, opts) => searchWikipediaWithImages(q, y, 'de', opts),
      query,
      year
    ),
    trySourceWithFallback(searchWikimediaCommons, query, year),
  ];
  
  // Add Firecrawl Wikipedia-only search if available (already has its own fallback)
  if (firecrawlKey) {
    allSources.push(searchFirecrawlWikipediaOnly(query, year, firecrawlKey));
  }

  // Use Promise.allSettled to get all results, then pick the first successful one
  const results = await Promise.allSettled(allSources);
  
  for (const result of results) {
    if (result.status === 'fulfilled' && result.value) {
      console.log(`Found image for "${query}": ${result.value.imageUrl?.substring(0, 80)}...`);
      return { eventId, imageUrl: result.value.imageUrl, source: result.value.source };
    }
  }
  
  console.log(`No image found for "${query}" in any source`);
  return { eventId, imageUrl: null, source: null };
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
      limitedQueries.map(({ eventId, query, year, isCelebrity, isMovie }) =>
        searchAllSources(eventId, query, year, FIRECRAWL_API_KEY, isCelebrity, isMovie)
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
