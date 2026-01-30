/**
 * Client-side Wikipedia/Wikimedia image search
 * Runs directly in the browser to avoid server timeouts
 * * IMPROVED VERSION:
 * - Smart Stop Words: Ignores "Introduction" but keeps "Gameboy".
 * - Checks Description/Snippet: Finds "Gameboy" even if title is "DSC001.jpg".
 * - Priority TMDB: Uses cleaned queries for movies/celebs.
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
 * Normalize string: lower case, remove accents, replace punctuation with spaces
 */
function normalizeText(str: string): string {
  return str
    .toLowerCase()
    .normalize("NFD")
    .replace(/[\u0300-\u036f]/g, "") // Remove accents
    .replace(/[.,/#!$%^&*;:{}=\-_`~()'"]/g, " ") // Replace punctuation with spaces
    .replace(/\s+/g, " ")
    .trim();
}

// CRITICAL: Stop words are words we IGNORE during validation.
// We do NOT filter out specific proper nouns like "Gameboy", "Frankrijk", "WK", "Olympische".
// We DO filter out generic event descriptors like "Launch", "Birthday", "Picture of".
const STOP_WORDS = new Set([
  // English
  'the', 'and', 'for', 'with', 'from', 'image', 'file', 'jpg', 'png', 'picture', 'photo',
  'launch', 'introduction', 'presentation', 'release', 'debut', 'start', 'end',
  'born', 'birthday', 'birth', 'died', 'death', 'celebration', 'anniversary',
  'winner', 'winning', 'wins', 'champion', 'victory',
  'official', 'trailer', 'video', 'scene', 'clip',
  
  // Dutch
  'de', 'het', 'een', 'van', 'voor', 'met', 'op', 'bij', 'tijdens',
  'bestand', 'afbeelding', 'foto', 'plaatje', 'portret',
  'introductie', 'lancering', 'uitgave', 'release', 'start', 'einde', 'slot',
  'geboren', 'geboorte', 'jarig', 'verjaardag', 'overleden', 'sterft',
  'viering', 'feest', 'jubileum', 'huldiging',
  'winnaar', 'wint', 'winst', 'kampioen', 'overwinning', 'prijs', 'medaille',
  'officieel', 'videoclip', 'fragment', 'verslag',
  'gekte', 'rage', 'hype', 'trend', 'fenomeen'
]);

/**
 * Helper to clean query for TMDB (removes years and descriptive keywords)
 */
function cleanQueryForTMDB(query: string): string {
  let cleaned = query
    .replace(/\b\d{4}\b/g, '') // remove years
    .replace(/[()]/g, '') // remove parens
    .replace(/ - /g, ' ') 
    .replace(/\s+/g, ' ');

  // For TMDB we want the pure name, so we strip stop words
  const words = cleaned.split(' ');
  const filteredWords = words.filter(w => !STOP_WORDS.has(w.toLowerCase()));
  return filteredWords.join(' ').trim();
}

/**
 * Check if content matches query.
 * Uses "Subject-First" strategy: The first meaningful word (Gameboy, Zidane) MUST appear.
 */
function contentMatchesQuery(title: string, snippet: string | undefined, query: string, strict: boolean = true): boolean {
  const normalizedTitle = normalizeText(title);
  const normalizedSnippet = snippet ? normalizeText(snippet.replace(/<[^>]*>/g, "")) : ""; 
  const normalizedQuery = normalizeText(query);
  
  // 1. Extract KEYWORDS from query (excluding stop words)
  // Query: "Introductie Gameboy" -> Keywords: ["gameboy"]
  // Query: "WK Frankrijk" -> Keywords: ["wk", "frankrijk"]
  const queryWords = normalizedQuery.split(/\s+/).filter(w => 
    w.length > 2 && !STOP_WORDS.has(w) && !/^\d{4}$/.test(w)
  );
  
  if (queryWords.length === 0) return true; // Fallback
  
  // 2. Define Main Subjects (max 3)
  const mainSubjectWords = queryWords.slice(0, 3);
  
  // Helper: check word presence (strict for short words)
  const wordAppearsIn = (word: string, text: string): boolean => {
    if (word.length <= 3) return new RegExp(`\\b${word}\\b`, 'i').test(text);
    return text.includes(word);
  };
  
  const matchesInTitle = mainSubjectWords.filter(w => wordAppearsIn(w, normalizedTitle)).length;
  const matchesInSnippet = mainSubjectWords.filter(w => wordAppearsIn(w, normalizedSnippet)).length;
  const maxMatches = Math.max(matchesInTitle, matchesInSnippet);
  
  if (strict) {
    // STRICT: The FIRST keyword (Subject) MUST match.
    // "Introductie Gameboy" -> "Gameboy" must be there.
    // "George Clooney Jarig" -> "George" must be there.
    const firstWord = mainSubjectWords[0];
    const firstWordFound = wordAppearsIn(firstWord, normalizedTitle) || wordAppearsIn(firstWord, normalizedSnippet);
    
    if (!firstWordFound) return false;
    
    // Require majority match if multiple words (e.g. "WK" AND "Frankrijk")
    const threshold = Math.max(1, Math.ceil(mainSubjectWords.length * 0.6));
    return maxMatches >= threshold;
  } else {
    // LENIENT: Just need the primary subject
    if (mainSubjectWords.length > 0) {
       const firstWord = mainSubjectWords[0];
       if (!wordAppearsIn(firstWord, normalizedTitle) && !wordAppearsIn(firstWord, normalizedSnippet)) {
         return false; 
       }
    }
    return maxMatches >= 1;
  }
}

interface SearchOptions {
  useQuotes?: boolean;
  includeYear?: boolean;
  strictMatch?: boolean;
}

// ... (Rest of the file: searchWikipedia, searchCommons, etc. remains the same as previous) ...
// ... Just make sure to COPY the FULL implementation from the previous response but utilize the STOP_WORDS above ...

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
    
    const searchUrl = `https://${lang}.wikipedia.org/w/api.php?action=query&list=search&srsearch=${encodeURIComponent(searchQuery)}&format=json&srlimit=5&origin=*`;
    const res = await fetch(searchUrl);
    if (!res.ok) return null;
    const data = await res.json();
    
    for (const result of data.query?.search || []) {
      if (!contentMatchesQuery(result.title, result.snippet, query, strictMatch)) continue;
      const imageUrl = `https://${lang}.wikipedia.org/w/api.php?action=query&titles=${encodeURIComponent(result.title)}&prop=pageimages&format=json&pithumbsize=${THUMB_WIDTH}&piprop=thumbnail|original&origin=*`;
      const imgRes = await fetch(imageUrl);
      if (!imgRes.ok) continue;
      const imgData = await imgRes.json();
      const pageId = Object.keys(imgData.query?.pages || {})[0];
      if (pageId && pageId !== '-1') {
        const thumb = imgData.query.pages[pageId].thumbnail?.source;
        if (thumb && isAllowedImageUrl(thumb)) return { imageUrl: thumb, source: `https://${lang}.wikipedia.org/wiki/${encodeURIComponent(result.title)}` };
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
    const res = await fetch(searchUrl);
    if (!res.ok) return null;
    const data = await res.json();
    for (const result of data.query?.search || []) {
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
    for (const result of data.query?.search || []) {
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

async function trySourceWithFallback(
  searchFn: (query: string, year: number | undefined, opts: SearchOptions) => Promise<{ imageUrl: string; source: string } | null>,
  query: string, year: number | undefined
) {
  let res = await searchFn(query, year, { useQuotes: true, includeYear: true, strictMatch: true });
  if (res) return res;
  res = await searchFn(query, year, { useQuotes: false, includeYear: true, strictMatch: true });
  if (res) return res;
  if (year) {
    res = await searchFn(query, year, { useQuotes: false, includeYear: false, strictMatch: false }); 
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
  const tmdbQuery = cleanQueryForTMDB(enQuery);

  // TMDB Priority
  if (isCelebrity || isMovie) {
    try {
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
