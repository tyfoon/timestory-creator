import { useCallback, useEffect, useState } from 'react';
import { supabase } from '@/integrations/supabase/client';

const LOCAL_BLACKLIST_KEY = 'image_blacklist';

// In-memory cache of blacklisted URLs (populated from DB on first load)
let globalBlacklistCache: string[] = [];
let cacheLoaded = false;

/**
 * Fetch all blacklisted image URLs from the database
 */
export async function fetchBlacklistFromDB(): Promise<string[]> {
  try {
    const { data, error } = await supabase
      .from('image_blacklist')
      .select('image_url');
    
    if (error) {
      console.warn('Failed to fetch blacklist from DB:', error);
      return [];
    }
    
    return data?.map(row => row.image_url) || [];
  } catch (e) {
    console.warn('Failed to fetch blacklist:', e);
    return [];
  }
}

/**
 * Get all blacklisted image URLs (from cache, falls back to localStorage)
 */
export function getBlacklistedImages(): string[] {
  if (cacheLoaded) {
    return globalBlacklistCache;
  }
  
  // Fallback to localStorage if cache not loaded yet
  try {
    const stored = localStorage.getItem(LOCAL_BLACKLIST_KEY);
    return stored ? JSON.parse(stored) : [];
  } catch {
    return [];
  }
}

/**
 * Call the DDG Image Search API's blacklist endpoint to permanently blacklist
 * the URL on their server and flush their cache.
 */
async function syncToDDGBlacklist(imageUrl: string): Promise<boolean> {
  try {
    const supabaseUrl = import.meta.env.VITE_SUPABASE_URL;
    const supabaseKey = import.meta.env.VITE_SUPABASE_PUBLISHABLE_KEY;
    
    if (!supabaseUrl || !supabaseKey) {
      console.warn('[DDG Blacklist] Missing Supabase config');
      return false;
    }

    // Call our edge function to proxy the DDG blacklist request
    const response = await fetch(`${supabaseUrl}/functions/v1/blacklist-image-ddg`, {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        'Authorization': `Bearer ${supabaseKey}`,
        'apikey': supabaseKey,
      },
      body: JSON.stringify({ url: imageUrl }),
    });

    if (!response.ok) {
      const errorText = await response.text();
      console.warn('[DDG Blacklist] Failed:', response.status, errorText);
      return false;
    }

    const result = await response.json();
    console.log('[DDG Blacklist] ✓ Synced to DDG API:', result);
    return true;
  } catch (e) {
    console.warn('[DDG Blacklist] Error syncing:', e);
    return false;
  }
}

/**
 * Add an image URL to the blacklist (both DB and local cache)
 * Also syncs to DDG API and purges matching entries from image_search_cache
 */
export async function addToBlacklist(
  imageUrl: string, 
  eventTitle?: string, 
  searchQuery?: string
): Promise<boolean> {
  try {
    // 1. Sync to DDG API (this also flushes their cache)
    const ddgSynced = await syncToDDGBlacklist(imageUrl);
    if (ddgSynced) {
      console.log('[Blacklist] ✓ Synced to DDG API');
    }

    // 2. Add to our database blacklist
    const { error } = await supabase
      .from('image_blacklist')
      .insert({ 
        image_url: imageUrl,
        event_title: eventTitle,
        search_query: searchQuery
      });
    
    if (error) {
      // Might be duplicate - that's fine
      if (!error.message.includes('duplicate')) {
        console.warn('Failed to add to DB blacklist:', error);
      }
    }
    
    // 3. Purge from our image_search_cache
    const { error: cacheError } = await supabase
      .from('image_search_cache')
      .delete()
      .eq('image_url', imageUrl);
    
    if (cacheError) {
      console.warn('Failed to purge from cache:', cacheError);
    } else {
      console.log('[Blacklist] Purged from local cache:', imageUrl.slice(0, 60) + '...');
    }
    
    // 4. Add to local in-memory cache
    if (!globalBlacklistCache.includes(imageUrl)) {
      globalBlacklistCache.push(imageUrl);
    }
    
    // 5. Also add to localStorage as backup
    try {
      const current = getBlacklistedImages();
      if (!current.includes(imageUrl)) {
        current.push(imageUrl);
        localStorage.setItem(LOCAL_BLACKLIST_KEY, JSON.stringify(current));
      }
    } catch (e) {
      console.warn('Failed to update localStorage blacklist:', e);
    }
    
    return true;
  } catch (e) {
    console.warn('Failed to add to blacklist:', e);
    return false;
  }
}

/**
 * Check if an image URL is blacklisted
 */
export function isBlacklisted(imageUrl: string): boolean {
  return getBlacklistedImages().includes(imageUrl);
}

/**
 * Initialize the blacklist cache from the database
 */
export async function initializeBlacklistCache(): Promise<void> {
  if (cacheLoaded) return;
  
  const dbBlacklist = await fetchBlacklistFromDB();
  
  // Merge with any local entries (in case DB was down when items were added)
  try {
    const stored = localStorage.getItem(LOCAL_BLACKLIST_KEY);
    const localBlacklist = stored ? JSON.parse(stored) : [];
    
    // Combine both, removing duplicates
    const combined = [...new Set([...dbBlacklist, ...localBlacklist])];
    globalBlacklistCache = combined;
  } catch {
    globalBlacklistCache = dbBlacklist;
  }
  
  cacheLoaded = true;
  console.log(`[Blacklist] Loaded ${globalBlacklistCache.length} blacklisted images`);
}

/**
 * Hook for managing image blacklist
 */
export function useImageBlacklist() {
  const [isLoading, setIsLoading] = useState(!cacheLoaded);
  
  // Initialize cache on first use
  useEffect(() => {
    if (!cacheLoaded) {
      initializeBlacklistCache().finally(() => setIsLoading(false));
    }
  }, []);

  const blacklistImage = useCallback(async (
    imageUrl: string, 
    eventTitle?: string, 
    searchQuery?: string
  ) => {
    return addToBlacklist(imageUrl, eventTitle, searchQuery);
  }, []);

  const checkBlacklisted = useCallback((imageUrl: string) => {
    return isBlacklisted(imageUrl);
  }, []);

  return {
    blacklistImage,
    checkBlacklisted,
    isLoading,
    getAll: getBlacklistedImages,
  };
}
