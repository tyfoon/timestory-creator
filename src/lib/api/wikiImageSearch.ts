/**
 * Client-side Wikipedia/Wikimedia image search
 * Runs directly in the browser to avoid server timeouts
 * 
 * Fallback strategy:
 * 1. Try with quotes (exact match) + year
 * 2. Try without quotes + year
 * 3. Try without year
 * 4. Relax title matching in later phases
 */

const THUMB_WIDTH = 960;

export interface ImageResult {
  eventId: string;
  imageUrl: string | null;
  source: string | null;
}

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

/**
 * Check if a Wikipedia/Commons page title matches the search query.
 * @param strict - If true, require more keywords to match. If false (fallback), be lenient.
 */
function titleMatchesQuery(title: string, query: string, strict: boolean = true): boolean {
  const titleLower = title.toLowerCase();
  const queryLower = query.toLowerCase();
  
  // Extract meaningful words from query
  const queryWords = queryLower.split(/\s+/).filter(w => 
    w.length > 2 && 
    !['the', 'and', 'for', 'van', 'het', 'een', 'der', 'den', 'des', 'von', 'und'].includes(w) &&
    !/^\d{4}$/.test(w) // Exclude year numbers
  );
  
  if (queryWords.length === 0) return true; // No meaningful words, allow anything
  
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

async function searchWikipedia(
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
        return {
          imageUrl: thumbnail,
          source: `https://${lang}.wikipedia.org/wiki/${encodeURIComponent(title)}`
        };
      }
    }
    
    return null;
  } catch {
    return null;
  }
}

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
  } catch {
    return null;
  }
}

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
    
    const searchUrl = `https://commons.wikimedia.org/w/api.php?action=query&list=search&srsearch=${encodeURIComponent(searchQuery)}&srnamespace=6&format=json&srlimit=3&origin=*`;
    const searchRes = await fetch(searchUrl);
    if (!searchRes.ok) return null;
    
    const searchData = await searchRes.json();
    const results = searchData.query?.search || [];
    
    for (const result of results.slice(0, 2)) {
      try {
        const title = result.title;
        
        // For Nationaal Archief, use the strictMatch setting
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
  } catch {
    return null;
  }
}

/**
 * Try a single source with fallback strategy:
 * 1. With quotes + year (strict)
 * 2. Without quotes + year (strict)
 * 3. Without quotes + without year (lenient)
 */
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

/**
 * Search for an image across all sources using parallel fallback strategy.
 * Uses English query for international sources, Dutch query for Nationaal Archief.
 * For celebrities, will also try TMDB via edge function.
 */
async function searchImageForEvent(
  eventId: string,
  queryNl: string,
  year: number | undefined,
  queryEn?: string,
  isCelebrity?: boolean
): Promise<ImageResult> {
  // Use English query for international sources, fall back to Dutch
  const enQuery = queryEn || queryNl;
  
  // Try all sources in parallel with their fallback strategies
  const sourcePromises = [
    // Dutch sources use Dutch query
    trySourceWithFallback(searchNationaalArchief, queryNl, year),
    trySourceWithFallback(
      (q, y, opts) => searchWikipedia(q, y, 'nl', opts),
      queryNl,
      year
    ),
    // International sources use English query for better results
    trySourceWithFallback(
      (q, y, opts) => searchWikipedia(q, y, 'en', opts),
      enQuery,
      year
    ),
    trySourceWithFallback(
      (q, y, opts) => searchWikipedia(q, y, 'de', opts),
      enQuery,
      year
    ),
    trySourceWithFallback(searchWikimediaCommons, enQuery, year),
  ];

  // Use Promise.allSettled to get all results, then pick the first successful one
  const results = await Promise.allSettled(sourcePromises);
  
  for (const result of results) {
    if (result.status === 'fulfilled' && result.value) {
      return { eventId, imageUrl: result.value.imageUrl, source: result.value.source };
    }
  }
  
  // If no image found and this is a celebrity, try TMDB via edge function
  if (isCelebrity) {
    try {
      const tmdbResult = await searchTMDBViaEdge(eventId, enQuery, year);
      if (tmdbResult.imageUrl) {
        return tmdbResult;
      }
    } catch (e) {
      console.error('TMDB fallback error:', e);
    }
  }
  
  return { eventId, imageUrl: null, source: null };
}

/**
 * Call the edge function to search TMDB for celebrity portraits
 */
async function searchTMDBViaEdge(
  eventId: string,
  query: string,
  year: number | undefined
): Promise<ImageResult> {
  try {
    const supabaseUrl = import.meta.env.VITE_SUPABASE_URL;
    const supabaseKey = import.meta.env.VITE_SUPABASE_PUBLISHABLE_KEY;
    
    if (!supabaseUrl || !supabaseKey) {
      return { eventId, imageUrl: null, source: null };
    }
    
    const response = await fetch(`${supabaseUrl}/functions/v1/search-images`, {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        'Authorization': `Bearer ${supabaseKey}`,
        'apikey': supabaseKey,
      },
      body: JSON.stringify({
        queries: [{ eventId, query, year, isCelebrity: true }],
      }),
    });
    
    if (!response.ok) {
      return { eventId, imageUrl: null, source: null };
    }
    
    const data = await response.json();
    const images = data.images || [];
    const found = images.find((img: ImageResult) => img.eventId === eventId);
    
    if (found?.imageUrl) {
      return found;
    }
    
    return { eventId, imageUrl: null, source: null };
  } catch {
    return { eventId, imageUrl: null, source: null };
  }
}

// ============== CONCURRENCY CONTROL ==============

type Task<T> = () => Promise<T>;

/**
 * Execute tasks with limited concurrency
 */
async function runWithConcurrency<T>(
  tasks: Task<T>[],
  maxConcurrent: number,
  onTaskComplete?: (result: T, index: number) => void
): Promise<T[]> {
  const results: T[] = [];
  let currentIndex = 0;
  
  async function runNext(): Promise<void> {
    const index = currentIndex++;
    if (index >= tasks.length) return;
    
    const result = await tasks[index]();
    results[index] = result;
    
    if (onTaskComplete) {
      onTaskComplete(result, index);
    }
    
    await runNext();
  }
  
  const workers = Array(Math.min(maxConcurrent, tasks.length))
    .fill(null)
    .map(() => runNext());
  
  await Promise.all(workers);
  return results;
}

// ============== PUBLIC API ==============

export interface SearchQuery {
  eventId: string;
  query: string;
  /** English query for better Wikimedia Commons results */
  queryEn?: string;
  year?: number;
}

/**
 * Search images for multiple events with concurrency control.
 * Calls onResult for each completed search immediately.
 */
export async function searchImagesClientSide(
  queries: SearchQuery[],
  options?: {
    maxConcurrent?: number;
    onResult?: (result: ImageResult) => void;
  }
): Promise<ImageResult[]> {
  const { maxConcurrent = 3, onResult } = options || {};
  
  const tasks = queries.map(({ eventId, query, queryEn, year }) => 
    () => searchImageForEvent(eventId, query, year, queryEn)
  );
  
  const results = await runWithConcurrency(tasks, maxConcurrent, (result) => {
    if (onResult) {
      onResult(result);
    }
  });
  
  return results;
}

/**
 * Search image for a single event (useful for lazy loading)
 */
export async function searchSingleImage(
  eventId: string,
  query: string,
  year?: number,
  queryEn?: string,
  isCelebrity?: boolean
): Promise<ImageResult> {
  return searchImageForEvent(eventId, query, year, queryEn, isCelebrity);
}
