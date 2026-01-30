import { serve } from "https://deno.land/std@0.168.0/http/server.ts";

const corsHeaders = {
  "Access-Control-Allow-Origin": "*",
  "Access-Control-Allow-Headers": "authorization, x-client-info, apikey, content-type",
};

interface ImageSearchRequest {
  queries: { eventId: string; query: string; year?: number; isCelebrity?: boolean; isMovie?: boolean; isMusic?: boolean; spotifySearchQuery?: string }[];
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

// ============== HELPER: Normalize text (remove accents, lowercase) ==============
function normalizeText(str: string): string {
  return str
    .toLowerCase()
    .normalize("NFD")
    .replace(/[\u0300-\u036f]/g, "") // Remove accents
    .replace(/[.,/#!$%^&*;:{}=\-_`~()'"]/g, " ") // Replace punctuation with spaces
    .replace(/\s+/g, " ")
    .trim();
}

// Expanded stop words list
const STOP_WORDS = new Set([
  'the', 'and', 'for', 'van', 'het', 'een', 'der', 'den', 'des', 'von', 'und',
  'with', 'from', 'image', 'file', 'bestand', 'jpg', 'png', 'jpeg', 'gif',
  'photo', 'foto', 'picture', 'svg', 'logo', 'icon', 'thumb', 'thumbnail',
  'wiki', 'commons', 'wikipedia', 'media', 'upload', 'files',
  'lancering', 'release', 'launch', 'premiere', 'debut', 'start',
  'finale', 'einde', 'end', 'last', 'final', 'season', 'seizoen', 'episode',
  'film', 'movie', 'serie', 'series', 'show', 'game', 'spel',
  'gekte', 'rage', 'craze', 'hype', 'trend', 'phenomenon', 'fenomeen'
]);

// ============== HELPER: Check if search result title matches query subject ==============
function titleMatchesQuery(title: string, query: string, strict: boolean = true): boolean {
  const normalizedTitle = normalizeText(title);
  const normalizedQuery = normalizeText(query);
  
  // Extract significant words from query (excluding stop words and years)
  const queryWords = normalizedQuery.split(/\s+/).filter(w => 
    w.length > 2 && 
    !STOP_WORDS.has(w) &&
    !/^\d{4}$/.test(w)
  );
  
  if (queryWords.length === 0) return true;
  
  // Take the MAIN SUBJECT words (typically first 2-3 important words like "Furby", "Seinfeld", "Google")
  // These are the KEY identifiers that MUST appear in the result
  const mainSubjectWords = queryWords.slice(0, 3);
  
  // Count how many main subject words appear in the title
  const matchCount = mainSubjectWords.filter(word => {
    // For short words (<=4 chars), require exact word boundary match
    if (word.length <= 4) {
      const regex = new RegExp(`\\b${word}\\b`, 'i');
      return regex.test(normalizedTitle);
    }
    // For longer words, substring match is OK
    return normalizedTitle.includes(word);
  }).length;
  
  if (strict) {
    // STRICT MODE: The FIRST main subject word (the actual subject like "Furby", "Seinfeld") 
    // MUST appear in the title, plus at least half of remaining words
    const firstWordMatches = mainSubjectWords.length > 0 && 
      (mainSubjectWords[0].length <= 4 
        ? new RegExp(`\\b${mainSubjectWords[0]}\\b`, 'i').test(normalizedTitle)
        : normalizedTitle.includes(mainSubjectWords[0]));
    
    if (!firstWordMatches) {
      return false; // Primary subject not found = definitely wrong result
    }
    
    // Also require at least 60% of main words to match
    const threshold = Math.max(1, Math.ceil(mainSubjectWords.length * 0.6));
    return matchCount >= threshold;
  } else {
    // LENIENT MODE: At least 1 main subject word must match
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
    // Clean the query - TMDB works best with just the title
    // Remove "film", "movie", "TV", "TV show", years, etc.
    const cleanedQuery = cleanMovieQueryForTMDB(query);
    
    // Try MOVIE search first
    let searchUrl = `https://api.themoviedb.org/3/search/movie?api_key=${TMDB_API_KEY}&query=${encodeURIComponent(cleanedQuery)}&language=en-US&page=1`;
    if (year) {
      searchUrl += `&year=${year}`;
    }
    
    console.log(`TMDB Movie: searching for "${cleanedQuery}" (original: "${query}", year: ${year || 'none'})`);
    
    let searchRes = await fetch(searchUrl);
    if (searchRes.ok) {
      const searchData = await searchRes.json();
      const results = searchData.results || [];
      
      console.log(`TMDB Movie: found ${results.length} movie results`);
      
      for (const movie of results.slice(0, 3)) {
        const imagePath = movie.backdrop_path || movie.poster_path;
        if (imagePath) {
          const size = movie.backdrop_path ? 'w780' : 'w500';
          const imageUrl = `https://image.tmdb.org/t/p/${size}${imagePath}`;
          const source = `https://www.themoviedb.org/movie/${movie.id}`;
          
          console.log(`TMDB: found movie image for "${movie.title}" (query: "${cleanedQuery}")`);
          return { imageUrl, source };
        }
      }
    }
    
    // If no movie found, try TV SHOW search
    let tvSearchUrl = `https://api.themoviedb.org/3/search/tv?api_key=${TMDB_API_KEY}&query=${encodeURIComponent(cleanedQuery)}&language=en-US&page=1`;
    if (year) {
      tvSearchUrl += `&first_air_date_year=${year}`;
    }
    
    console.log(`TMDB TV: searching for "${cleanedQuery}"`);
    
    searchRes = await fetch(tvSearchUrl);
    if (searchRes.ok) {
      const searchData = await searchRes.json();
      const results = searchData.results || [];
      
      console.log(`TMDB TV: found ${results.length} TV results`);
      
      for (const show of results.slice(0, 3)) {
        const imagePath = show.backdrop_path || show.poster_path;
        if (imagePath) {
          const size = show.backdrop_path ? 'w780' : 'w500';
          const imageUrl = `https://image.tmdb.org/t/p/${size}${imagePath}`;
          const source = `https://www.themoviedb.org/tv/${show.id}`;
          
          console.log(`TMDB: found TV image for "${show.name}" (query: "${cleanedQuery}")`);
          return { imageUrl, source };
        }
      }
    }
    
    console.log("TMDB: no movie or TV results with images found");
    return null;
  } catch (e) {
    console.error("TMDB API error:", e);
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

// ============== HELPER: Clean music query (remove "album", "cover", etc.) ==============
function cleanMusicQuery(query: string): string {
  // Remove common words that pollute music searches
  const wordsToRemove = ['album', 'cover', 'single', 'record', 'vinyl', 'cd', 'ep', 'lp'];
  let cleaned = query;
  for (const word of wordsToRemove) {
    // Remove word with word boundaries (case insensitive)
    const regex = new RegExp(`\\b${word}\\b`, 'gi');
    cleaned = cleaned.replace(regex, '');
  }
  // Clean up extra spaces
  return cleaned.replace(/\s+/g, ' ').trim();
}

// ============== HELPER: Clean movie query for TMDB (remove "film", "movie", "TV", etc.) ==============
function cleanMovieQueryForTMDB(query: string): string {
  // TMDB works best with just the title - remove disambiguation words
  const wordsToRemove = ['film', 'movie', 'tv', 'tv show', 'television', 'serie', 'series', 'show'];
  let cleaned = query;
  for (const word of wordsToRemove) {
    const regex = new RegExp(`\\b${word}\\b`, 'gi');
    cleaned = cleaned.replace(regex, '');
  }
  // Also remove years that might be appended
  cleaned = cleaned.replace(/\b\d{4}\b/g, '');
  return cleaned.replace(/\s+/g, ' ').trim();
}

// ============== HELPER: Add disambiguation for movie fallback searches ==============
function addMovieDisambiguation(query: string): string {
  // For Wikipedia/Commons fallback, add "film" to help disambiguate
  const lowerQuery = query.toLowerCase();
  if (!lowerQuery.includes('film') && !lowerQuery.includes('movie') && !lowerQuery.includes('tv')) {
    return `${query} film`;
  }
  return query;
}

// ============== MAIN SEARCH FUNCTION ==============
async function searchAllSources(
  eventId: string,
  query: string,
  year: number | undefined,
  firecrawlKey: string | undefined,
  isCelebrity: boolean = false,
  isMovie: boolean = false,
  isMusic: boolean = false,
  spotifySearchQuery?: string
): Promise<ImageResult> {
  console.log(`Searching for: "${query}" (${year || 'no year'})${isCelebrity ? ' [celebrity]' : ''}${isMovie ? ' [movie]' : ''}${isMusic ? ' [music]' : ''}`);
  
  // For music, clean the query (remove "album", "cover", etc.)
  const searchQuery = isMusic ? cleanMusicQuery(query) : query;
  if (isMusic && searchQuery !== query) {
    console.log(`Music query cleaned: "${query}" -> "${searchQuery}"`);
  }
  
  // For celebrities, try TMDB first as it's optimized for person portraits
  if (isCelebrity) {
    const tmdbResult = await searchTMDBPerson(searchQuery);
    if (tmdbResult) {
      console.log(`Found celebrity image via TMDB for "${searchQuery}"`);
      return { eventId, imageUrl: tmdbResult.imageUrl, source: tmdbResult.source };
    }
  }
  
  // For movies, try TMDB first as it has the best movie posters/backdrops
  if (isMovie) {
    const tmdbResult = await searchTMDBMovie(searchQuery, year);
    if (tmdbResult) {
      console.log(`Found movie image via TMDB for "${searchQuery}"`);
      return { eventId, imageUrl: tmdbResult.imageUrl, source: tmdbResult.source };
    }
  }
  
  // For movie fallbacks, add disambiguation (e.g., "Titanic film") to help Wikipedia/Commons
  const fallbackQuery = isMovie ? addMovieDisambiguation(searchQuery) : searchQuery;
  
  // Search all sources in parallel with fallback strategy
  const allSources = [
    // Dutch sources first (likely most relevant for Dutch app)
    trySourceWithFallback(searchNationaalArchief, fallbackQuery, year),
    trySourceWithFallback(
      (q, y, opts) => searchWikipediaWithImages(q, y, 'nl', opts),
      fallbackQuery,
      year
    ),
    // International sources
    trySourceWithFallback(
      (q, y, opts) => searchWikipediaWithImages(q, y, 'en', opts),
      fallbackQuery,
      year
    ),
    trySourceWithFallback(
      (q, y, opts) => searchWikipediaWithImages(q, y, 'de', opts),
      fallbackQuery,
      year
    ),
    trySourceWithFallback(searchWikimediaCommons, fallbackQuery, year),
  ];
  
  // Add Firecrawl Wikipedia-only search if available (already has its own fallback)
  if (firecrawlKey) {
    allSources.push(searchFirecrawlWikipediaOnly(searchQuery, year, firecrawlKey));
  }

  // Use Promise.allSettled to get all results, then pick the first successful one
  const results = await Promise.allSettled(allSources);
  
  for (const result of results) {
    if (result.status === 'fulfilled' && result.value) {
      console.log(`Found image for "${searchQuery}": ${result.value.imageUrl?.substring(0, 80)}...`);
      return { eventId, imageUrl: result.value.imageUrl, source: result.value.source };
    }
  }
  
  // MUSIC FALLBACK: If no image found for music, try TMDB with Spotify query (artist name)
  if (isMusic && spotifySearchQuery) {
    // Extract artist name from Spotify query (format: "Artist - Title" or just "Artist")
    const artistName = spotifySearchQuery.includes(' - ') 
      ? spotifySearchQuery.split(' - ')[0].trim()
      : spotifySearchQuery.trim();
    
    console.log(`Music fallback: trying TMDB for artist "${artistName}"`);
    const tmdbResult = await searchTMDBPerson(artistName);
    if (tmdbResult) {
      console.log(`Found music artist image via TMDB for "${artistName}"`);
      return { eventId, imageUrl: tmdbResult.imageUrl, source: tmdbResult.source };
    }
  }
  
  console.log(`No image found for "${searchQuery}" in any source`);
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
      limitedQueries.map(({ eventId, query, year, isCelebrity, isMovie, isMusic, spotifySearchQuery }) =>
        searchAllSources(eventId, query, year, FIRECRAWL_API_KEY, isCelebrity, isMovie, isMusic, spotifySearchQuery)
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
