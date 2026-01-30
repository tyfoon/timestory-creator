import { useCallback, useEffect, useRef, useState } from 'react';
import { searchSingleImage, ImageResult } from '@/lib/api/wikiImageSearch';
import { TimelineEvent } from '@/types/timeline';

interface UseClientImageSearchOptions {
  maxConcurrent?: number;
  onImageFound?: (eventId: string, imageUrl: string, source: string | null) => void;
}

// Check if this is the "Welcome to the world" / birth announcement event
// These events should NEVER have image search - they always use the birthday placeholder
const isWelcomeEvent = (event: TimelineEvent): boolean => {
  const titleLower = event.title.toLowerCase();
  return (
    titleLower.includes('welkom op de wereld') ||
    titleLower.includes('welcome to the world') ||
    titleLower.includes('geboren') ||
    titleLower.includes('geboorte') ||
    (event.category === 'personal' && event.eventScope === 'birthdate' && 
     (titleLower.includes('birth') || titleLower.includes('born')))
  );
};

/**
 * Hook for client-side image searching with concurrency control.
 * Uses a queue system with configurable parallel workers.
 */
export function useClientImageSearch(options: UseClientImageSearchOptions = {}) {
  const { maxConcurrent = 3, onImageFound } = options;
  
  const [isSearching, setIsSearching] = useState(false);
  const [searchedCount, setSearchedCount] = useState(0);
  const [foundCount, setFoundCount] = useState(0);
  
  const queueRef = useRef<TimelineEvent[]>([]);
  const activeWorkersRef = useRef(0);
  const processedIdsRef = useRef<Set<string>>(new Set());
  const isProcessingRef = useRef(false);
  
  // Use ref to always have the latest callback without recreating processQueue
  const onImageFoundRef = useRef(onImageFound);
  useEffect(() => {
    onImageFoundRef.current = onImageFound;
  }, [onImageFound]);
  
  const processQueue = useCallback(async () => {
    if (isProcessingRef.current) return;
    isProcessingRef.current = true;
    setIsSearching(true);
    
    while (queueRef.current.length > 0 || activeWorkersRef.current > 0) {
      // Start new workers if we have capacity and items in queue
      while (activeWorkersRef.current < maxConcurrent && queueRef.current.length > 0) {
        const event = queueRef.current.shift();
        if (!event || !event.imageSearchQuery) continue;
        
        // Skip if already processed
        if (processedIdsRef.current.has(event.id)) continue;
        processedIdsRef.current.add(event.id);
        
        activeWorkersRef.current++;
        
        // Start search without awaiting (runs in parallel)
        // Use English query for better international results
        // Pass isCelebrityBirthday, isMovie, and music flags for specialized search
        const isMusic = event.category === 'music' || !!event.spotifySearchQuery;
        searchSingleImage(
          event.id, 
          event.imageSearchQuery, 
          event.year, 
          event.imageSearchQueryEn, 
          (event.isCelebrityBirthday || event.category === 'music' || event.category === 'celebrity'), 
          event.isMovie, 
          event.category, 
          event.visualSubjectType,
          isMusic,
          event.spotifySearchQuery
        )
          .then((result: ImageResult) => {
            setSearchedCount(c => c + 1);
            
            if (result.imageUrl) {
              setFoundCount(c => c + 1);
              // Use ref to get latest callback
              if (onImageFoundRef.current) {
                onImageFoundRef.current(result.eventId, result.imageUrl, result.source);
              }
            }
          })
          .catch((err) => {
            console.error('Image search error:', err);
          })
          .finally(() => {
            activeWorkersRef.current--;
          });
      }
      
      // Wait a bit before checking again
      if (activeWorkersRef.current > 0 || queueRef.current.length > 0) {
        await new Promise(resolve => setTimeout(resolve, 50));
      }
    }
    
    isProcessingRef.current = false;
    setIsSearching(false);
  }, [maxConcurrent]);
  
  const addToQueue = useCallback((events: TimelineEvent[]) => {
    // Filter out events that don't need image search:
    // - Already processed
    // - No search query
    // - Welcome/birth events (they always use birthday placeholder)
    const newEvents = events.filter(e => 
      e.imageSearchQuery && 
      !processedIdsRef.current.has(e.id) &&
      !isWelcomeEvent(e)
    );
    
    if (newEvents.length === 0) return;
    
    queueRef.current.push(...newEvents);
    processQueue();
  }, [processQueue]);
  
  const reset = useCallback(() => {
    queueRef.current = [];
    processedIdsRef.current.clear();
    setSearchedCount(0);
    setFoundCount(0);
  }, []);
  
  return {
    addToQueue,
    reset,
    isSearching,
    searchedCount,
    foundCount,
    queueLength: queueRef.current.length,
  };
}
