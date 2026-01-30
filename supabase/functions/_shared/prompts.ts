/**
 * Client-side Wikipedia/Wikimedia image search
 * * FIXED VERSION:
 * - Restored TMDB search for Music/Celebrity categories (was missing in previous strict update).
 * - "Filename Authority" remains for generic topics to prevent mismatched items.
 * - Strict Number Logic remains.
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
  // English
  'the', 'and', 'for', 'with', 'from', 'image', 'file', 'jpg', 'png', 'picture', 'photo', 'on', 'at', 'in', 'of',
  'launch', 'introduction', 'presentation', 'release', 'debut', 'start', 'end',
  'born', 'birthday', 'birth', 'died', 'death', 'celebration', 'anniversary',
  'winner', 'winning', 'wins', 'champion', 'victory', 'award', 'prize',
  'official', 'trailer', 'video', 'scene', 'clip',
  'watch', 'clock', 'timepiece',
  
  // Dutch
  'de', 'het', 'een', 'van', 'voor', 'met', 'op', 'bij', 'tijdens', 'in', 'uit',
  'bestand', 'afbeelding', 'foto', 'plaatje', 'portret',
  'introductie', 'lancering', 'uitgave', 'release', 'start', 'einde', 'slot',
  'geboren', 'geboorte', 'jarig', 'verjaardag', 'overleden', 'sterft',
  'viering', 'feest', 'jubileum', 'huldiging',
  'winnaar', 'wint', 'winst', 'kampioen', 'overwinning', 'prijs', 'medaille',
  'officieel', 'videoclip', 'fragment', 'verslag',
  'gekte', 'rage', 'hype', 'trend', 'fenomeen', 'opkomst', 'succes',
  'horloge', 'klok', 'uurwerk',
  'speelgoed', 'spel', 'pop', 'gadget'
]);

function cleanQueryForTMDB(query: string): string {
  let cleaned = query.replace(/\b\d{4}\b/g, '').replace(/[()]/g, '').replace(/ - /g, ' ').replace(/\s+/g, ' ');
  const words = cleaned.split(' ');
  const filteredWords = words.filter(w => !STOP_WORDS.has(w.toLowerCase()));
  return filteredWords.join(' ').trim();
}

function contentMatchesQuery(title: string, snippet: string | undefined, query: string, strict: boolean = true): boolean {
  const normalizedTitle = normalizeText(title);
  const normalizedSnippet = snippet ? normalizeText(snippet.replace(/<[^>]*>/g, "")) : ""; 
  const normalizedQuery = normalizeText(query);
  
  const queryNumbers = normalizedQuery.match(/\b\d+(\.\d+)?\b/g);
  if (queryNumbers) {
    const combinedText = normalizedTitle + " " + normalizedSnippet;
    const allNumbersPresent = queryNumbers.every(num => combinedText.includes(num));
    if (!allNumbersPresent) return false;
  }

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
    if (mainSubjectWords.length <= 2) {
      return matchesInTitle === mainSubjectWords.length;
    }
    const threshold = Math.ceil(mainSubjectWords.length * 0.75);
    return maxMatches >= threshold;
  } else {
    return matchesInTitle >= 1 || matchesInSnippet >= 1;
  }
}

interface SearchOptions {
  useQuotes?: boolean;
  includeYear?: boolean;
  strictMatch?: boolean;
}

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
  let res = await searchFn(query, year, { useQuotes: false, includeYear: true, strictMatch: true });
  if (res) return res;
  
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
  
  // LOGIC FIX: Map categories to TMDB search types automatically
  // This ensures 'music' (Artists) are searched as People, and 'entertainment' might be checked too.
  const searchAsPerson = isCelebrity || category === 'music' || category === 'celebrity';
  const searchAsMovie = isMovie; 

  // TMDB Priority
  if (searchAsPerson || searchAsMovie) {
    try {
      const tmdbQuery = cleanQueryForTMDB(enQuery);
      // Pass the DERIVED flags (searchAsPerson, searchAsMovie) instead of the raw props
      const tmdbResult = await searchTMDBViaEdge(eventId, tmdbQuery, searchAsMovie ? year : undefined, searchAsPerson, searchAsMovie);
      if (tmdbResult.imageUrl) return tmdbResult;
    } catch (e) {
      console.error('TMDB error:', e);
    }
  }
  
  // SOURCE STRATEGY
  const isGlobalTopic = ['technology', 'science', 'world', 'music', 'entertainment', 'culture'].includes(category || '');
  const isDutchTopic = ['politics', 'local'].includes(category || '');

  const sourcePromises = [];

  if (isGlobalTopic) {
    sourcePromises.push(trySourceWithFallback(searchWikimediaCommons, enQuery, year));
    sourcePromises.push(trySourceWithFallback((q, y, opts) => searchWikipedia(q, y, 'en', opts), enQuery, year));
    sourcePromises.push(trySourceWithFallback((q, y, opts) => searchWikipedia(q, y, 'nl', opts), query, year));
  } else {
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

export async function searchImagesClientSide(queries: SearchQuery[]): Promise<ImageResult[]> {
  return []; 
}
