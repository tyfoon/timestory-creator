/**
 * Tol Image Search - Alternative image search using DDG Image Search API
 * 
 * This search method uses the DDG Image Search API which:
 * - Accepts loose search terms with built-in intelligence
 * - Works better with decade info (e.g., "Levis Jeans 80s")
 * - Returns ranked results using resolution, aspect ratio, domain trust, and query relevance
 * 
 * For Movies and TV shows, TMDB is used FIRST (same as Legacy), with DDG as fallback.
 */

import { supabase } from '@/integrations/supabase/client';
import { ImageResult, SearchTraceEntry } from './wikiImageSearch';

// Get the image blacklist from the database
async function getBlacklistedUrls(): Promise<Set<string>> {
  try {
    const { data, error } = await supabase
      .from('image_blacklist')
      .select('image_url');
    
    if (error) {
      console.warn('[Tol Search] Failed to fetch blacklist:', error);
      return new Set();
    }
    
    return new Set((data || []).map(row => row.image_url));
  } catch (e) {
    console.warn('[Tol Search] Error fetching blacklist:', e);
    return new Set();
  }
}

// Strip decades like "jaren 80", "80s", "1980s" from queries (for TMDB)
function stripDecades(query: string): string {
  return query
    .replace(/\b(19|20)\d{2}s?\b/gi, "") // Matches 1980, 1980s
    .replace(/\b\d{2}s\b/gi, "") // Matches 80s, 90s
    .replace(/\bjaren\s+\d{2,4}\b/gi, "") // Matches "jaren 80"
    .replace(/\bdecade\b/gi, "")
    .replace(/\s+/g, " ")
    .trim();
}

// Clean query for TMDB (strips decades and parentheses)
function cleanQueryForTMDB(query: string): string {
  return stripDecades(query).replace(/[()]/g, "").trim();
}

/**
 * Search TMDB for movie/TV posters - mirrors the Legacy implementation
 */
async function searchTMDB(
  eventId: string,
  query: string,
  type: "movie" | "tv",
  year?: number,
): Promise<ImageResult & { searchTrace?: SearchTraceEntry[] }> {
  const searchTrace: SearchTraceEntry[] = [];
  const startTime = Date.now();
  
  const addTrace = (source: string, usedQuery: string, withYear: boolean, result: 'found' | 'not_found' | 'error') => {
    searchTrace.push({
      source,
      query: usedQuery,
      withYear,
      result,
      timestamp: Date.now() - startTime,
    });
  };

  try {
    const supabaseUrl = import.meta.env.VITE_SUPABASE_URL;
    const supabaseKey = import.meta.env.VITE_SUPABASE_PUBLISHABLE_KEY;
    if (!supabaseUrl || !supabaseKey) {
      addTrace(type === 'tv' ? '📺 TMDB TV' : '🎬 TMDB Movie', query, !!year, 'error');
      return { eventId, imageUrl: null, source: null, searchTrace };
    }

    const cleanedQuery = cleanQueryForTMDB(query);
    console.log(`[Tol/TMDB] Searching ${type} for: "${cleanedQuery}" (year: ${year})`);

    const response = await fetch(`${supabaseUrl}/functions/v1/search-images`, {
      method: "POST",
      headers: { 
        "Content-Type": "application/json", 
        Authorization: `Bearer ${supabaseKey}`, 
        apikey: supabaseKey 
      },
      body: JSON.stringify({
        queries: [
          {
            eventId,
            query: cleanedQuery,
            year,
            isCelebrity: false,
            isMovie: type === "movie",
            isTV: type === "tv",
          },
        ],
      }),
    });

    if (!response.ok) {
      addTrace(type === 'tv' ? '📺 TMDB TV' : '🎬 TMDB Movie', cleanedQuery, !!year, 'error');
      return { eventId, imageUrl: null, source: null, searchTrace };
    }

    const data = await response.json();
    const result = data.images?.[0];
    
    if (result?.imageUrl) {
      addTrace(type === 'tv' ? '📺 TMDB TV' : '🎬 TMDB Movie', cleanedQuery, !!year, 'found');
      console.log(`[Tol/TMDB] ✓ Found ${type} poster for: "${cleanedQuery}"`);
      return { 
        eventId, 
        imageUrl: result.imageUrl, 
        source: result.source || 'TMDB',
        searchTrace 
      };
    }
    
    addTrace(type === 'tv' ? '📺 TMDB TV' : '🎬 TMDB Movie', cleanedQuery, !!year, 'not_found');
    return { eventId, imageUrl: null, source: null, searchTrace };
  } catch (err) {
    console.error('[Tol/TMDB] Error:', err);
    addTrace(type === 'tv' ? '📺 TMDB TV' : '🎬 TMDB Movie', query, !!year, 'error');
    return { eventId, imageUrl: null, source: null, searchTrace };
  }
}

/**
 * Search DDG API for images (the actual Tol search)
 */
async function searchDDG(
  eventId: string,
  query: string,
  year: number,
  category?: string,
  blacklist?: Set<string>,
): Promise<ImageResult & { score?: number; actualQuery?: string }> {
  try {
    const { data, error } = await supabase.functions.invoke('search-images-tol', {
      body: { query, year, category },
    });

    if (error) {
      console.error('[Tol/DDG] Edge function error:', error);
      return { eventId, imageUrl: null, source: null };
    }

    const imageUrl = data?.imageUrl || null;
    const actualQuery = data?.searchQuery || query;
    const score = data?.score ?? null;

    // Check if image is blacklisted
    if (imageUrl && blacklist?.has(imageUrl)) {
      console.log(`[Tol/DDG] Image blacklisted, skipping: ${imageUrl}`);
      return { eventId, imageUrl: null, source: null, score, actualQuery };
    }

    return { 
      eventId, 
      imageUrl, 
      source: imageUrl ? 'DDG/Tol' : null,
      score,
      actualQuery,
    };
  } catch (error) {
    console.error('[Tol/DDG] Error:', error);
    return { eventId, imageUrl: null, source: null };
  }
}

/**
 * Search for a single image using the Tol/DDG API
 * For Movies and TV: TMDB first, then DDG as fallback
 * 
 * @param eventId - The event ID for tracking
 * @param query - The search query (imageSearchQuery from the event)
 * @param year - The year of the event (used to add decade suffix)
 * @param queryEn - English version of the query (optional)
 * @param isCelebrityOrMusic - Whether this is a celebrity or music event
 * @param isMovie - Whether this is a movie event
 * @param category - The event category
 * @param visualSubjectType - The visual subject type
 * @param isMusic - Whether this is a music event
 * @param spotifySearchQuery - Spotify search query for music
 * @param isTV - Whether this is a TV show event
 */
export async function searchSingleImageTol(
  eventId: string,
  query: string,
  year: number,
  queryEn?: string,
  isCelebrityOrMusic?: boolean,
  isMovie?: boolean,
  category?: string,
  visualSubjectType?: string,
  isMusic?: boolean,
  spotifySearchQuery?: string,
  isTV?: boolean
): Promise<ImageResult> {
  const startTime = Date.now();
  const searchTrace: SearchTraceEntry[] = [];
  
  const addTrace = (source: string, usedQuery: string, withYear: boolean, result: 'found' | 'not_found' | 'error') => {
    searchTrace.push({
      source,
      query: usedQuery,
      withYear,
      result,
      timestamp: Date.now() - startTime,
    });
  };

  // Get blacklisted URLs
  const blacklist = await getBlacklistedUrls();

  // Use English query if available (works better with DDG and TMDB)
  const searchQuery = queryEn || query;

  // ========== TV SHOWS: TMDB TV API FIRST ==========
  if (isTV || visualSubjectType === 'tv') {
    console.log(`[Tol Search] TV show detected, trying TMDB TV first for: "${searchQuery}"`);
    const tmdbResult = await searchTMDB(eventId, searchQuery, "tv", year);
    
    // Merge TMDB trace
    if (tmdbResult.searchTrace) {
      searchTrace.push(...tmdbResult.searchTrace);
    }
    
    if (tmdbResult.imageUrl) {
      return { eventId, imageUrl: tmdbResult.imageUrl, source: tmdbResult.source, searchTrace };
    }
    
    console.log(`[Tol Search] TMDB TV failed, falling back to DDG...`);
  }

  // ========== MOVIES: TMDB MOVIE API FIRST ==========
  if (isMovie || visualSubjectType === 'movie') {
    console.log(`[Tol Search] Movie detected, trying TMDB Movie first for: "${searchQuery}"`);
    const tmdbResult = await searchTMDB(eventId, searchQuery, "movie", year);
    
    // Merge TMDB trace
    if (tmdbResult.searchTrace) {
      searchTrace.push(...tmdbResult.searchTrace);
    }
    
    if (tmdbResult.imageUrl) {
      return { eventId, imageUrl: tmdbResult.imageUrl, source: tmdbResult.source, searchTrace };
    }
    
    console.log(`[Tol Search] TMDB Movie failed, falling back to DDG...`);
  }

  // ========== DDG SEARCH (default or fallback) ==========
  const ddgResult = await searchDDG(eventId, searchQuery, year, category, blacklist);
  
  // Build trace label with score if available
  const traceLabel = ddgResult.score !== null && ddgResult.score !== undefined
    ? `🔍 DDG/Tol (score: ${ddgResult.score})` 
    : '🔍 DDG/Tol';
  
  const actualQuery = ddgResult.actualQuery || searchQuery;
  
  if (ddgResult.imageUrl) {
    addTrace(traceLabel, actualQuery, !!year, 'found');
    return {
      eventId,
      imageUrl: ddgResult.imageUrl,
      source: 'DDG/Tol',
      searchTrace,
    };
  } else {
    addTrace(traceLabel, actualQuery, !!year, 'not_found');
    return {
      eventId,
      imageUrl: null,
      source: null,
      searchTrace,
    };
  }
}
