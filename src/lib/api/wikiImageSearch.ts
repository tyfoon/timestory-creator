/**
 * Client-side Wikipedia/Wikimedia image search
 * Runs directly in the browser to avoid server timeouts
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

function titleMatchesQuery(title: string, query: string): boolean {
  const titleLower = title.toLowerCase();
  const queryLower = query.toLowerCase();
  
  const queryWords = queryLower.split(/\s+/).filter(w => 
    w.length > 2 && 
    !['the', 'and', 'for', 'van', 'het', 'een', 'der', 'den', 'des'].includes(w) &&
    !/^\d{4}$/.test(w)
  );
  
  const mainSubjectWords = queryWords.slice(0, 3);
  const matchCount = mainSubjectWords.filter(word => titleLower.includes(word)).length;
  
  const threshold = mainSubjectWords.length <= 2 ? 1 : 2;
  return matchCount >= threshold;
}

async function searchWikipedia(
  query: string, 
  year: number | undefined,
  lang: string
): Promise<{ imageUrl: string; source: string } | null> {
  try {
    const searchQuery = year ? `"${query}" ${year}` : `"${query}"`;
    const searchUrl = `https://${lang}.wikipedia.org/w/api.php?action=query&list=search&srsearch=${encodeURIComponent(searchQuery)}&format=json&srlimit=5&origin=*`;
    
    const searchRes = await fetch(searchUrl);
    if (!searchRes.ok) return null;
    
    const searchData = await searchRes.json();
    const results = searchData.query?.search || [];
    
    if (results.length === 0) return null;
    
    for (const result of results.slice(0, 3)) {
      const title = result.title;
      
      if (!titleMatchesQuery(title, query)) {
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
  year: number | undefined
): Promise<{ imageUrl: string; source: string } | null> {
  try {
    const searchQuery = year ? `"${query}" ${year}` : `"${query}"`;
    
    const searchUrl = `https://commons.wikimedia.org/w/api.php?action=query&list=search&srsearch=${encodeURIComponent(searchQuery)}&srnamespace=6&format=json&srlimit=5&origin=*`;
    const searchRes = await fetch(searchUrl);
    if (!searchRes.ok) return null;
    
    const searchData = await searchRes.json();
    const results = searchData.query?.search || [];
    
    for (const result of results.slice(0, 3)) {
      try {
        const title = result.title;
        
        if (!titleMatchesQuery(title, query)) {
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
  year: number | undefined
): Promise<{ imageUrl: string; source: string } | null> {
  try {
    const searchQuery = year 
      ? `${query} ${year} Nationaal Archief`
      : `${query} Nationaal Archief`;
    
    const searchUrl = `https://commons.wikimedia.org/w/api.php?action=query&list=search&srsearch=${encodeURIComponent(searchQuery)}&srnamespace=6&format=json&srlimit=3&origin=*`;
    const searchRes = await fetch(searchUrl);
    if (!searchRes.ok) return null;
    
    const searchData = await searchRes.json();
    const results = searchData.query?.search || [];
    
    for (const result of results.slice(0, 2)) {
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
  } catch {
    return null;
  }
}

/**
 * Search for an image across all sources using Promise.any
 */
/**
 * Polyfill for Promise.any - returns first successful result
 */
async function promiseAny<T>(promises: Promise<T>[]): Promise<T> {
  return new Promise((resolve, reject) => {
    let rejectionCount = 0;
    
    promises.forEach((promise) => {
      promise
        .then(resolve)
        .catch(() => {
          rejectionCount++;
          if (rejectionCount === promises.length) {
            reject(new Error('All promises were rejected'));
          }
        });
    });
  });
}

/**
 * Search for an image across all sources - returns first successful result
 * Uses English query for international sources when available
 */
async function searchImageForEvent(
  eventId: string,
  query: string,
  year: number | undefined,
  queryEn?: string
): Promise<ImageResult> {
  // Use English query for international sources, fall back to original
  const enQuery = queryEn || query;
  
  const sources = [
    // Dutch sources use original query
    searchNationaalArchief(query, year),
    searchWikipedia(query, year, 'nl'),
    // International sources use English query for better results
    searchWikipedia(enQuery, year, 'en'),
    searchWikipedia(enQuery, year, 'de'),
    searchWikimediaCommons(enQuery, year),
  ];

  try {
    const result = await promiseAny(
      sources.map(async (promise) => {
        const res = await promise;
        if (!res) throw new Error('No result');
        return res;
      })
    );
    
    return { eventId, imageUrl: result.imageUrl, source: result.source };
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
  queryEn?: string
): Promise<ImageResult> {
  return searchImageForEvent(eventId, query, year, queryEn);
}
