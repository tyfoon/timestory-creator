/**
 * Client-side Wikipedia/Wikimedia image search
 * IMPROVED VERSION:
 * - Source Filtering based on Category (No Nationaal Archief for Tech/World)
 * - Strict Number Matching (Commodore 64 must match "64")
 * - Smart Stop Words
 */

const THUMB_WIDTH = 960;

export interface ImageResult {
  eventId: string;
  imageUrl: string | null;
  source: string | null;
}

export interface SearchQuery {
  eventId: string;
  query: string;
  queryEn?: string;
  year?: number;
  isCelebrity?: boolean;
  isMovie?: boolean;
  category?: string;
}

function isAllowedImageUrl(maybeUrl: string): boolean {
  try {
    const url = new URL(maybeUrl);
    const path = url.pathname.toLowerCase();
    if (path.includes("/transcoded/")) return false;
    if (path.match(/\.(mp3|ogg|wav|webm|mp4|ogv|pdf|svg|tif|tiff)$/)) return false;
    return path.match(/\.(jpg|jpeg|png|webp|gif)$/) !== null;
  } catch {
    return false;
  }
}

function normalizeText(str: string): string {
  return str
    .toLowerCase()
    .normalize("NFD")
    .replace(/[\u0300-\u036f]/g, "")
    .replace(/[.,/#!$%^&*;:{}=\-_`~()'"]/g, " ")
    .replace(/\s+/g, " ")
    .trim();
}

const STOP_WORDS = new Set([
  'the', 'and', 'for', 'with', 'from', 'image', 'file', 'jpg', 'png', 'picture', 'photo', 'on', 'at', 'in', 'of',
  'launch', 'introduction', 'presentation', 'release', 'debut', 'start', 'end',
  'born', 'birthday', 'birth', 'died', 'death', 'celebration', 'anniversary',
  'winner', 'winning', 'wins', 'champion', 'victory', 'award', 'prize',
  'official', 'trailer', 'video', 'scene', 'clip',
  'de', 'het', 'een', 'van', 'voor', 'met', 'op', 'bij', 'tijdens', 'in', 'uit',
  'bestand', 'afbeelding', 'foto', 'plaatje', 'portret',
  'introductie', 'lancering', 'uitgave', 'release', 'start', 'einde', 'slot',
  'geboren', 'geboorte', 'jarig', 'verjaardag', 'overleden', 'sterft',
  'viering', 'feest', 'jubileum', 'huldiging',
  'winnaar', 'wint', 'winst', 'kampioen', 'overwinning', 'prijs', 'medaille',
  'officieel', 'videoclip', 'fragment', 'verslag',
  'gekte', 'rage', 'hype', 'trend', 'fenomeen', 'opkomst'
]);

function cleanQueryForTMDB(query: string): string {
  let cleaned = query.replace(/\b\d{4}\b/g, '').replace(/[()]/g, '').replace(/ - /g, ' ').replace(/\s+/g, ' ');
  const words = cleaned.split(' ');
  const filteredWords = words.filter(w => !STOP_WORDS.has(w.toLowerCase()));
  return filteredWords.join(' ').trim();
}

/**
 * Checks if content matches query with strict logic for numbers.
 */
function contentMatchesQuery(title: string, snippet: string | undefined, query: string, strict: boolean = true): boolean {
  const normalizedTitle = normalizeText(title);
  const normalizedSnippet = snippet ? normalizeText(snippet.replace(/<[^>]*>/g, "")) : ""; 
  const normalizedQuery = normalizeText(query);
  
  // 1. NUMBER CHECK (Crucial for "Commodore 64", "Windows 1.0")
  // If the query contains numbers, the result MUST contain those numbers.
  const queryNumbers = normalizedQuery.match(/\b\d+(\.\d+)?\b/g);
  if (queryNumbers) {
    const combinedText = normalizedTitle + " " + normalizedSnippet;
    const allNumbersPresent = queryNumbers.every(num => {
      // Allow loose match for years (1980 match 1980s), but strict for versions (1.0)
      return combinedText.includes(num); 
    });
    if (!allNumbersPresent) return false;
  }

  // 2. Keyword Check
  const queryWords = normalizedQuery.split(/\s+/).filter(w => 
    w.length > 1 && !STOP_WORDS.has(w) && !/^\d{4}$/.test(w)
  );
  
  if (queryWords.length === 0) return true;
  
  const mainSubjectWords = queryWords.slice(0, 4);
  const wordAppearsIn = (word: string, text: string) => {
    if (word.length <= 3) return new RegExp(`\\b${word}\\b`, 'i').test(text);
    return text.includes(word);
  };
  
  const matchesInTitle = mainSubjectWords.filter(w => wordAppearsIn(w, normalizedTitle)).length;
  const matchesInSnippet = mainSubjectWords.filter(w => wordAppearsIn(w, normalizedSnippet)).length;
  const maxMatches = Math.max(matchesInTitle, matchesInSnippet);
  
  if (strict) {
    // If specific short query (e.g. "Apple Macintosh"), require ALL words.
    if (mainSubjectWords.length <= 2) {
      return maxMatches === mainSubjectWords.length;
    }
    const threshold = Math.ceil(mainSubjectWords.length * 0.75);
    return maxMatches >= threshold;
  } else {
    // Fallback lenient
    return maxMatches >= 1;
  }
}

interface SearchOptions {
  useQuotes?: boolean;
  includeYear?: boolean;
  strictMatch?: boolean;
}

// GENERIC FETCH FUNCTION
async function fetchWikiResults(url: string, query: string, strictMatch: boolean): Promise<{ imageUrl: string; source: string } | null> {
  try {
    const res = await fetch(url);
    if (!res.ok) return null;
    const data = await res.json();
    
    for (const result of data.query?.search || []) {
      if (!contentMatchesQuery(result.title, result.snippet, query, strictMatch)) continue;
      
      const imageUrl = `https://commons.wikimedia.org/w/api.php?action=query&titles=${encodeURIComponent(result.title)}&prop=pageimages|imageinfo&iiprop=url|thumburl&iiurlwidth=${THUMB_WIDTH}&pithumbsize=${THUMB_WIDTH}&format=json&origin=*`;
      const imgRes = await fetch(imageUrl);
      if (!imgRes.ok) continue;
      
      const imgData = await imgRes.json();
      const pageId = Object.keys(imgData.query?.pages || {})[0];
      if (!pageId || pageId === '-1') continue;
      
      const page = imgData.query.pages[pageId];
      // Try thumbnail first, then imageinfo url
      let thumb = page.thumbnail?.source;
      if (!thumb && page.imageinfo?.[0]) {
        thumb = page.imageinfo[0].thumburl || page.imageinfo[0].url;
      }

      if (thumb && isAllowedImageUrl(thumb)) {
        return { imageUrl: thumb, source: `https://wikipedia.org/wiki/${encodeURIComponent(result.title)}` };
      }
    }
    return null;
  } catch { return null; }
}

async function searchWikipedia(query: string, year: number | undefined, lang: string, options: SearchOptions = {}): Promise<{ imageUrl: string; source: string } | null> {
  const { useQuotes = false, includeYear = true, strictMatch = true } = options;
  let searchQuery = useQuotes ? `"${query}"` : query;
  if (includeYear && year) searchQuery = `${searchQuery} ${year}`;
  
  const searchUrl = `https://${lang}.wikipedia.org/w/api.php?action=query&list=search&srsearch=${encodeURIComponent(searchQuery)}&format=json&srlimit=5&origin=*`;
  return fetchWikiResults(searchUrl, query, strictMatch);
}

async function searchWikimediaCommons(query: string, year: number | undefined, options: SearchOptions = {}): Promise<{ imageUrl: string; source: string } | null> {
  const { useQuotes = false, includeYear = true, strictMatch = true } = options;
  let searchQuery = useQuotes ? `"${query}"` : query;
  if (includeYear && year) searchQuery = `${searchQuery} ${year}`;
  
  const searchUrl = `https://commons.wikimedia.org/w/api.php?action=query&list=search&srsearch=${encodeURIComponent(searchQuery)}&srnamespace=6&format=json&srlimit=5&origin=*`;
  return fetchWikiResults(searchUrl, query, strictMatch);
}

async function searchNationaalArchief(query: string, year: number | undefined, options: SearchOptions = {}): Promise<{ imageUrl: string; source: string } | null> {
  const { includeYear = true, strictMatch = true } = options;
  let searchQuery = `${query} Nationaal Archief`;
  if (includeYear && year) searchQuery = `${query} ${year} Nationaal Archief`;
  
  const searchUrl = `https://commons.wikimedia.org/w/api.php?action=query&list=search&srsearch=${encodeURIComponent(searchQuery)}&srnamespace=6&format=json&srlimit=3&origin=*`;
  return fetchWikiResults(searchUrl, query, strictMatch);
}

async function trySourceWithFallback(
  searchFn: (query: string, year: number | undefined, opts: SearchOptions) => Promise<{ imageUrl: string; source: string } | null>,
  query: string, year: number | undefined
) {
  // 1. Strict with Year
  let res = await searchFn(query, year, { useQuotes: false, includeYear: true, strictMatch: true });
  if (res) return res;
  
  // 2. Strict without Year (but strict content match)
  if (year) {
    const cleanQuery = query.replace(/\b\d{4}\b/g, '').trim();
    res = await searchFn(cleanQuery, undefined, { useQuotes: false, includeYear: false, strictMatch: true }); 
    if (res) return res;
  }
  return null;
}

// ============== MAIN SEARCH LOGIC ==============

export async function searchSingleImage(
  eventId: string,
  query: string,
  year?: number,
  queryEn?: string,
  isCelebrity?: boolean,
  isMovie?: boolean,
  category?: string
): Promise<ImageResult> {
  let enQuery = queryEn || query;
  
  // TMDB Priority for Media
  if (isCelebrity || isMovie || category === 'music' || category === 'entertainment') {
    try {
      const tmdbQuery = cleanQueryForTMDB(enQuery);
      const tmdbResult = await searchTMDBViaEdge(eventId, tmdbQuery, isMovie ? year : undefined, isCelebrity, isMovie);
      if (tmdbResult.imageUrl) return tmdbResult;
    } catch (e) {
      console.error('TMDB error:', e);
    }
  }
  
  // SOURCE STRATEGY BASED ON CATEGORY
  // Technology, Science, World -> International sources preferred. Nationaal Archief causes noise.
  const isGlobalTopic = ['technology', 'science', 'world', 'music', 'entertainment'].includes(category || '');
  const isDutchTopic = ['politics', 'local', 'culture'].includes(category || ''); // Assuming app context is NL based on logs

  const sourcePromises = [];

  if (isGlobalTopic) {
    // For global topics, prioritize EN Wiki and Commons. Skip Nationaal Archief completely or put last.
    sourcePromises.push(trySourceWithFallback((q, y, opts) => searchWikipedia(q, y, 'en', opts), enQuery, year));
    sourcePromises.push(trySourceWithFallback(searchWikimediaCommons, enQuery, year));
    sourcePromises.push(trySourceWithFallback((q, y, opts) => searchWikipedia(q, y, 'nl', opts), query, year));
  } else {
    // For local/mixed topics, verify Dutch sources
    if (isDutchTopic) {
       sourcePromises.push(trySourceWithFallback(searchNationaalArchief, query, year));
    }
    sourcePromises.push(trySourceWithFallback((q, y, opts) => searchWikipedia(q, y, 'nl', opts), query, year));
    sourcePromises.push(trySourceWithFallback((q, y, opts) => searchWikipedia(q, y, 'en', opts), enQuery, year));
    sourcePromises.push(trySourceWithFallback(searchWikimediaCommons, enQuery, year));
  }

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

// Helper for concurrency (used by useClientImageSearch via searchSingleImage calls)
export async function searchImagesClientSide(queries: SearchQuery[]): Promise<ImageResult[]> {
  // This function is less used now as the hook handles queuing, 
  // but kept for compatibility if needed.
  return []; 
}
