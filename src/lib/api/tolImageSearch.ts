/**
 * Tol Image Search - Alternative image search using DDG Image Search API
 * 
 * This search method uses the DDG Image Search API which:
 * - Accepts loose search terms with built-in intelligence
 * - Works better with decade info (e.g., "Levis Jeans 80s")
 * - Returns ranked results using resolution, aspect ratio, domain trust, and query relevance
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

/**
 * Search for a single image using the Tol/DDG API
 * 
 * @param eventId - The event ID for tracking
 * @param query - The search query (imageSearchQuery from the event)
 * @param year - The year of the event (used to add decade suffix)
 * @param queryEn - English version of the query (optional, currently unused by Tol)
 * @param category - The event category (optional, for future use)
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

  try {
    // Get blacklisted URLs
    const blacklist = await getBlacklistedUrls();

    // Use English query if available, otherwise use the regular query
    // English queries tend to work better with DDG
    const searchQuery = queryEn || query;

    // Call the edge function
    const { data, error } = await supabase.functions.invoke('search-images-tol', {
      body: {
        query: searchQuery,
        year,
        category,
      },
    });

    if (error) {
      console.error('[Tol Search] Edge function error:', error);
      addTrace('🔍 DDG/Tol', searchQuery, !!year, 'error');
      return {
        eventId,
        imageUrl: null,
        source: null,
        searchTrace,
      };
    }

    const imageUrl = data?.imageUrl || null;
    const actualQuery = data?.searchQuery || searchQuery;

    // Check if image is blacklisted
    if (imageUrl && blacklist.has(imageUrl)) {
      console.log(`[Tol Search] Image blacklisted, skipping: ${imageUrl}`);
      addTrace('🔍 DDG/Tol', actualQuery, !!year, 'not_found');
      return {
        eventId,
        imageUrl: null,
        source: null,
        searchTrace,
      };
    }

    if (imageUrl) {
      addTrace('🔍 DDG/Tol', actualQuery, !!year, 'found');
      return {
        eventId,
        imageUrl,
        source: 'DDG/Tol',
        searchTrace,
      };
    } else {
      addTrace('🔍 DDG/Tol', actualQuery, !!year, 'not_found');
      return {
        eventId,
        imageUrl: null,
        source: null,
        searchTrace,
      };
    }

  } catch (error) {
    console.error('[Tol Search] Error:', error);
    addTrace('🔍 DDG/Tol', query, !!year, 'error');
    return {
      eventId,
      imageUrl: null,
      source: null,
      searchTrace,
    };
  }
}
