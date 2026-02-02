import { useCallback, useEffect, useRef, useState } from 'react';
import { TimelineEvent } from '@/types/timeline';

// Fallback Supabase configuration
const SUPABASE_URL = import.meta.env.VITE_SUPABASE_URL || 'https://koeoboygsssyajpdstel.supabase.co';
const SUPABASE_ANON_KEY = import.meta.env.VITE_SUPABASE_PUBLISHABLE_KEY || 'eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZSIsInJlZiI6ImtvZW9ib3lnc3NzeWFqcGRzdGVsIiwicm9sZSI6ImFub24iLCJpYXQiOjE3NjkyNTY2NjEsImV4cCI6MjA4NDgzMjY2MX0.KuFaWF4r_cxZRiOumPGMChLVmwgyhT9vR5s7L52zr5s';

interface FreesoundResult {
  success: boolean;
  sound?: {
    id: number;
    name: string;
    duration: number;
    rating: number;
    previewUrl: string;
  };
  error?: string;
}

interface UseSoundEffectsOptions {
  maxConcurrent?: number;
  onSoundFound?: (eventId: string, soundUrl: string) => void;
}

/**
 * Hook for fetching sound effects from Freesound.org with concurrency control.
 * Similar to useClientImageSearch but for audio effects.
 */
export function useSoundEffects(options: UseSoundEffectsOptions = {}) {
  const { maxConcurrent = 2, onSoundFound } = options;

  const [isSearching, setIsSearching] = useState(false);
  const [searchedCount, setSearchedCount] = useState(0);
  const [foundCount, setFoundCount] = useState(0);

  const queueRef = useRef<TimelineEvent[]>([]);
  const activeWorkersRef = useRef(0);
  const processedIdsRef = useRef<Set<string>>(new Set());
  const isProcessingRef = useRef(false);

  // Use ref to always have the latest callback
  const onSoundFoundRef = useRef(onSoundFound);
  useEffect(() => {
    onSoundFoundRef.current = onSoundFound;
  }, [onSoundFound]);

  const searchFreesound = async (query: string): Promise<FreesoundResult> => {
    try {
      const response = await fetch(`${SUPABASE_URL}/functions/v1/search-freesound`, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          'Authorization': `Bearer ${SUPABASE_ANON_KEY}`,
          'apikey': SUPABASE_ANON_KEY,
        },
        body: JSON.stringify({ query }),
      });

      if (!response.ok) {
        console.error('Freesound API error:', response.status);
        return { success: false, error: `API error: ${response.status}` };
      }

      return await response.json();
    } catch (error) {
      console.error('Freesound fetch error:', error);
      return { success: false, error: error instanceof Error ? error.message : 'Unknown error' };
    }
  };

  const processQueue = useCallback(async () => {
    if (isProcessingRef.current) return;
    isProcessingRef.current = true;
    setIsSearching(true);

    while (queueRef.current.length > 0 || activeWorkersRef.current > 0) {
      // Start new workers if we have capacity and items in queue
      while (activeWorkersRef.current < maxConcurrent && queueRef.current.length > 0) {
        const event = queueRef.current.shift();
        if (!event || !event.soundEffectSearchQuery) continue;

        // Skip if already processed
        if (processedIdsRef.current.has(event.id)) continue;
        processedIdsRef.current.add(event.id);

        activeWorkersRef.current++;

        // Start search without awaiting (runs in parallel)
        searchFreesound(event.soundEffectSearchQuery)
          .then((result) => {
            setSearchedCount((c) => c + 1);

            if (result.success && result.sound?.previewUrl) {
              console.log(`Found sound for event ${event.id}: ${result.sound.name}`);
              setFoundCount((c) => c + 1);

              if (onSoundFoundRef.current) {
                onSoundFoundRef.current(event.id, result.sound.previewUrl);
              }
            } else {
              console.log(`No sound found for "${event.soundEffectSearchQuery}"`);
            }
          })
          .catch((err) => {
            console.error('Sound search error:', err);
          })
          .finally(() => {
            activeWorkersRef.current--;
          });
      }

      // Wait a bit before checking again
      if (activeWorkersRef.current > 0 || queueRef.current.length > 0) {
        await new Promise((resolve) => setTimeout(resolve, 100));
      }
    }

    isProcessingRef.current = false;
    setIsSearching(false);
  }, [maxConcurrent]);

  const addToQueue = useCallback(
    (events: TimelineEvent[]) => {
      // Filter out events that don't need sound effect search:
      // - Already processed
      // - No soundEffectSearchQuery
      // - Already has a soundEffectUrl
      const newEvents = events.filter(
        (e) =>
          e.soundEffectSearchQuery &&
          !e.soundEffectUrl &&
          !processedIdsRef.current.has(e.id)
      );

      if (newEvents.length === 0) return;

      console.log(`Adding ${newEvents.length} events to sound effects queue`);
      queueRef.current.push(...newEvents);
      processQueue();
    },
    [processQueue]
  );

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
