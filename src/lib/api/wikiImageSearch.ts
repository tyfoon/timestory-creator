/**
 * Client-side Wikipedia/Wikimedia image search
 * Runs directly in the browser to avoid server timeouts
 * * IMPROVED VERSION:
 * - Prioritizes TMDB for movies and celebrities with CLEANED queries
 * - Checks description/snippet for matches (not just filenames)
 * - Ignores accents (André == Andre)
 */

const THUMB_WIDTH = 960;

export interface ImageResult {
  eventId: string;
  imageUrl: string | null;
  source: string | null;
}

// Update Interface: Add flags to SearchQuery
export interface SearchQuery {
  eventId: string;
  query: string;
  queryEn?: string;
  year?: number;
  isCelebrity?: boolean;
  isMovie?: boolean;
}

function isAllowedImageUrl(maybeUrl: string): boolean {
  try {
    const url = new URL(maybeUrl);
    const path = url.pathname.toLowerCase();

    if (path.includes("/transcoded/")) return false;

    if (path.match(/\.(mp3|ogg|wav|webm|mp4|ogv|pdf|svg)$/)) return false;

    return path.match(/\.(jpg|jpeg|png|webp|gif)$/) !== null;
  } catch {
    return false;
  }
}

/**
 * Normalize string: lower case, remove accents, remove punctuation
 */
function normalizeText(str: string): string {
  return str
    .toLowerCase()
    .normalize("NFD")
    .replace(/[\u0300-\u036f]/g, "") // Remove accents
    .replace(/[.,/#!$%^&*;:{}=\-_`~()]/g, "") // Remove punctuation
    .trim();
}

/**
 * Helper to clean query for TMDB (removes years and keywords)
 * "Titanic film 1997" -> "Titanic"
 */
function cleanQueryForTMDB(query: string): string {
  return query
    .replace(/\b\d{4}\b/g, '') // remove years
    .replace(/[()]/g, '') // remove parens
    .replace(/\b(film|movie|concert|tour|live|band|group|singer|actor|actress|trailer|official|video|tv show|series)\b/gi, '') // remove keywords
    .replace(/ - /g, ' ') // separators
    .replace(/\s+/g, ' ')
    .trim();
}

/**
 * Check if a Wikipedia/Commons page title OR snippet matches the search query.
 */
function contentMatchesQuery(title: string, snippet: string | undefined, query: string, strict: boolean = true): boolean {
  const cleanTitle = normalizeText(title);
  const cleanSnippet = snippet ? normalizeText(snippet.replace(/<[^>]*>/g, "")) : ""; 
  const cleanQuery = normalizeText(query);
  
  const stopWords = new Set([
    'the', 'and', 'for', 'van', 'het', 'een', 'der', 'den', 'des', 'von', 'und',
    'with', 'from', 'image', 'file', 'bestand', 'jpg', 'png'
  ]);
  
  const queryWords = cleanQuery.split(/\s+/).filter(w => 
    w.length > 2 && !stopWords.has(w) && !/^\d{4}$/.test(w)
  );
  
  if (queryWords.length === 0) return true;
  
  const mainSubjectWords = queryWords.slice(0, 5);
  const countMatches = (text: string) => mainSubjectWords.filter(word => text.includes(word)).length;

  const matchesInTitle = countMatches(cleanTitle);
  const matchesInSnippet = countMatches(cleanSnippet);
  const maxMatches = Math.max(matchesInTitle, matchesInSnippet);
  
  if (strict) {
    if (mainSubjectWords.length === 1) return maxMatches >= 1;
    const threshold = Math.ceil(mainSubjectWords.length * 0.6);
    return maxMatches >= threshold;
  } else {
    return maxMatches >= 1;
  }
}

interface SearchOptions {
  useQuotes?: boolean;
  includeYear?: boolean;
  strictMatch?: boolean;
}

async function searchWikipedia(
  query: string, 
  year: number | undefined,
  lang: string,
  options: SearchOptions = {}
): Promise<{ imageUrl: string; source: string } | null> {
  const { useQuotes = false, includeYear = true, strictMatch = true } = options;
  
  try {
    let searchQuery = query;
    if (useQuotes) searchQuery = `"${query}"`;
    if (includeYear && year) searchQuery = `${searchQuery} ${year}`;
    
    // Fetch snippet/description as well
    const searchUrl = `https://${lang}.wikipedia.org/w/api.php?action=query&list=search&srsearch=${encodeURIComponent(searchQuery)}&format=json&srlimit=5&origin=*`;
    
    const searchRes = await fetch(searchUrl);
    if (!searchRes.ok) return null;
    
    const searchData = await searchRes.json();
    const results = searchData.query?.search || [];
    
    for (const result of results.slice(0, 3)) {
      if (!contentMatchesQuery(result.title, result.snippet, query, strictMatch)) continue;
      
      const imageUrl = `https://${lang}.wikipedia.org/w/api.php?action=query&titles=${encodeURIComponent(result.title)}&prop=pageimages&format=json&pithumbsize=${THUMB_WIDTH}&piprop=thumbnail|original&origin=*`;
      const imageRes = await fetch(imageUrl);
      if (!imageRes.ok) continue;
      
      const imageData = await imageRes.json();
      const pages = imageData.query?.pages;
      const pageId = Object.keys(pages || {})[0];
      
      if (pageId && pageId !== '-1' && pages[pageId]?.thumbnail?.source) {
        return {
          imageUrl: pages[pageId].thumbnail.source,
          source: `https://${lang}.wikipedia.org/wiki/${encodeURIComponent(result.title)}`
        };
      }
    }
    return null;
  } catch { return null; }
}

async function searchWikimediaCommons(query: string, year: number | undefined, options: SearchOptions = {}): Promise<{ imageUrl: string; source: string } | null> {
  const { useQuotes = false, includeYear = true, strictMatch = true } = options;
  try {
    let searchQuery = query;
    if (useQuotes) searchQuery = `"${query}"`;
    if (includeYear && year) searchQuery = `${searchQuery} ${year}`;
    
    const searchUrl = `https://commons.wikimedia.org/w/api.php?action=query&list=search&srsearch=${encodeURIComponent(searchQuery)}&srnamespace=6&format=json&srlimit=5&origin=*`;
    const searchRes = await fetch(searchUrl);
    if (!searchRes.ok) return null;
    const searchData = await searchRes.json();
    
    for (const result of (searchData.query?.search || []).slice(0, 3)) {
      if (!contentMatchesQuery(result.title, result.snippet, query, strictMatch)) continue;
      
      const infoUrl = `https://commons.wikimedia.org/w/api.php?action=query&titles=${encodeURIComponent(result.title)}&prop=imageinfo&iiprop=url|thumburl&iiurlwidth=${THUMB_WIDTH}&format=json&origin=*`;
      const infoRes = await fetch(infoUrl);
      if (!infoRes.ok) continue;
      const infoData = await infoRes.json();
      const pageId = Object.keys(infoData.query?.pages || {})[0];
      const img = infoData.query?.pages[pageId]?.imageinfo?.[0];
      
      if (img && (img.thumburl || img.url) && isAllowedImageUrl(img.thumburl || img.url)) {
        return { imageUrl: img.thumburl || img.url, source: `https://commons.wikimedia.org/wiki/${encodeURIComponent(result.title)}` };
      }
    }
    return null;
  } catch { return null; }
}

async function searchNationaalArchief(query: string, year: number | undefined, options: SearchOptions = {}): Promise<{ imageUrl: string; source: string } | null> {
  const { includeYear = true, strictMatch = true } = options;
  try {
    let searchQuery = `${query} Nationaal Archief`;
    if (includeYear && year) searchQuery = `${query} ${year} Nationaal Archief`;
    
    const searchUrl = `https://commons.wikimedia.org/w/api.php?action=query&list=search&srsearch=${encodeURIComponent(searchQuery)}&srnamespace=6&format=json&srlimit=3&origin=*`;
    const res = await fetch(searchUrl);
    if (!res.ok) return null;
    const data = await res.json();
    
    for (const result of (data.query?.search || []).slice(0, 2)) {
      if (!contentMatchesQuery(result.title, result.snippet, query, strictMatch)) continue;
      // Fetch image details logic (same as Commons)
      const infoUrl = `https://commons.wikimedia.org/w/api.php?action=query&titles=${encodeURIComponent(result.title)}&prop=imageinfo&iiprop=url|thumburl&iiurlwidth=${THUMB_WIDTH}&format=json&origin=*`;
      const infoRes = await fetch(infoUrl);
      if (!infoRes.ok) continue;
      const infoData = await infoRes.json();
      const pageId = Object.keys(infoData.query?.pages || {})[0];
      const img = infoData.query?.pages[pageId]?.imageinfo?.[0];
      if (img && (img.thumburl || img.url)) {
        return { imageUrl: img.thumburl || img.url, source: `https://commons.wikimedia.org/wiki/${encodeURIComponent(result.title)}` };
      }
    }
    return null;
  } catch { return null; }
}

async function trySourceWithFallback(
  searchFn: (query: string, year: number | undefined, opts: SearchOptions) => Promise<{ imageUrl: string; source: string } | null>,
  query: string, year: number | undefined
) {
  let res = await searchFn(query, year, { useQuotes: true, includeYear: true, strictMatch: true });
  if (res) return res;
  res = await searchFn(query, year, { useQuotes: false, includeYear: true, strictMatch: true });
  if (res) return res;
  if (year) {
    res = await searchFn(query, year, { useQuotes: false, includeYear: false, strictMatch: false }); // Lenient without year
    if (res) return res;
  }
  return null;
}

// ============== MAIN SEARCH LOGIC ==============

async function searchImageForEvent(
  eventId: string,
  queryNl: string,
  year: number | undefined,
  queryEn?: string,
  isCelebrity?: boolean,
  isMovie?: boolean
): Promise<ImageResult> {
  let enQuery = queryEn || queryNl;
  
  // Clean query for TMDB (remove 'film', '1997', etc to match exact titles)
  const tmdbQuery = cleanQueryForTMDB(enQuery);

  // TMDB PRIORITY: Try TMDB first for celebrities or movies
  if (isCelebrity || isMovie) {
    try {
      // Pass the CLEANED query to TMDB
      // Pass year explicitly only for movies (TMDB supports it separately)
      const tmdbResult = await searchTMDBViaEdge(eventId, tmdbQuery, isMovie ? year : undefined, isCelebrity, isMovie);
      if (tmdbResult.imageUrl) return tmdbResult;
    } catch (e) {
      console.error('TMDB error:', e);
    }
  }
  
  // Parallel fallback to Wiki/Commons
  const sourcePromises = [
    trySourceWithFallback(searchNationaalArchief, queryNl, year),
    trySourceWithFallback((q, y, opts) => searchWikipedia(q, y, 'nl', opts), queryNl, year),
    trySourceWithFallback((q, y, opts) => searchWikipedia(q, y, 'en', opts), enQuery, year),
    trySourceWithFallback((q, y, opts) => searchWikipedia(q, y, 'de', opts), enQuery, year),
    trySourceWithFallback(searchWikimediaCommons, enQuery, year),
  ];

  const results = await Promise.allSettled(sourcePromises);
  for (const result of results) {
    if (result.status === 'fulfilled' && result.value) return { eventId, ...result.value };
  }
  
  return { eventId, imageUrl: null, source: null };
}

async function searchTMDBViaEdge(eventId: string, query: string, year: number | undefined, isCelebrity?: boolean, isMovie?: boolean): Promise<ImageResult> {
  try {
    const supabaseUrl = import.meta.env.VITE_SUPABASE_URL;
    const supabaseKey = import.meta.env.VITE_SUPABASE_PUBLISHABLE_KEY;
    if (!supabaseUrl || !supabaseKey) return { eventId, imageUrl: null, source: null };
    
    const response = await fetch(`${supabaseUrl}/functions/v1/search-images`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json', 'Authorization': `Bearer ${supabaseKey}`, 'apikey': supabaseKey },
      body: JSON.stringify({ queries: [{ eventId, query, year, isCelebrity: !!isCelebrity, isMovie: !!isMovie }] }),
    });
    
    if (!response.ok) return { eventId, imageUrl: null, source: null };
    const data = await response.json();
    return data.images?.[0]?.imageUrl ? data.images[0] : { eventId, imageUrl: null, source: null };
  } catch { return { eventId, imageUrl: null, source: null }; }
}

// ============== PUBLIC API ==============

// Concurrency helper
async function runWithConcurrency<T>(tasks: (() => Promise<T>)[], maxConcurrent: number, onResult?: (res: T) => void): Promise<T[]> {
  const results: T[] = [];
  let index = 0;
  async function next(): Promise<void> {
    while (index < tasks.length) {
      const i = index++;
      const res = await tasks[i]();
      results[i] = res;
      onResult?.(res);
    }
  }
  await Promise.all(Array(Math.min(maxConcurrent, tasks.length)).fill(null).map(next));
  return results;
}

export async function searchImagesClientSide(
  queries: SearchQuery[],
  options?: { maxConcurrent?: number; onResult?: (result: ImageResult) => void; }
): Promise<ImageResult[]> {
  const tasks = queries.map(({ eventId, query, queryEn, year, isCelebrity, isMovie }) => 
    () => searchImageForEvent(eventId, query, year, queryEn, isCelebrity, isMovie)
  );
  return runWithConcurrency(tasks, options?.maxConcurrent || 3, options?.onResult);
}

export async function searchSingleImage(
  eventId: string,
  query: string,
  year?: number,
  queryEn?: string,
  isCelebrity?: boolean,
  isMovie?: boolean
): Promise<ImageResult> {
  return searchImageForEvent(eventId, query, year, queryEn, isCelebrity, isMovie);
}
