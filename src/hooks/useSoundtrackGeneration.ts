/**
 * Hook for background soundtrack generation
 * Supports two-stage generation:
 * - V1 (Quick): Fire-and-forget from homepage, uses basic formData only
 * - V2 (Full): Detailed generation with events and personal data
 */

import { useCallback, useEffect, useState } from 'react';
import { FormData } from '@/types/form';
import { TimelineEvent } from '@/types/timeline';

const SUPABASE_URL = import.meta.env.VITE_SUPABASE_URL || 'https://koeoboygsssyajpdstel.supabase.co';
const SUPABASE_ANON_KEY = import.meta.env.VITE_SUPABASE_PUBLISHABLE_KEY || 'eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZSIsInJlZiI6ImtvZW9ib3lnc3NzeWFqcGRzdGVsIiwicm9sZSI6ImFub24iLCJpYXQiOjE3NjkyNTY2NjEsImV4cCI6MjA4NDgzMjY2MX0.KuFaWF4r_cxZRiOumPGMChLVmwgyhT9vR5s7L52zr5s';

const STORAGE_KEY = 'soundtrack_generation_state';

export type SoundtrackStatus = 
  | 'idle'           // Not started
  | 'generating_lyrics' 
  | 'generating_music' 
  | 'polling'        // Waiting for Suno
  | 'completed' 
  | 'error';

export type SoundtrackVersion = 'v1' | 'v2';

export interface SoundtrackState {
  status: SoundtrackStatus;
  version: SoundtrackVersion | null;
  taskId: string | null;
  lyrics: string | null;
  style: string | null;
  title: string | null;
  audioUrl: string | null;
  duration: number | null;
  error: string | null;
  startedAt: number | null;
  completedAt: number | null;
}

const initialState: SoundtrackState = {
  status: 'idle',
  version: null,
  taskId: null,
  lyrics: null,
  style: null,
  title: null,
  audioUrl: null,
  duration: null,
  error: null,
  startedAt: null,
  completedAt: null,
};

// Persist state to sessionStorage
const saveState = (state: SoundtrackState) => {
  try {
    sessionStorage.setItem(STORAGE_KEY, JSON.stringify(state));
  } catch (e) {
    console.warn('Failed to save soundtrack state:', e);
  }
};

// Load state from sessionStorage
const loadState = (): SoundtrackState => {
  try {
    const saved = sessionStorage.getItem(STORAGE_KEY);
    if (saved) {
      const parsed = JSON.parse(saved);
      // If it was in a generating state but page was refreshed, reset to idle
      if (parsed.status === 'generating_lyrics' || parsed.status === 'generating_music') {
        return { ...initialState, ...parsed, status: 'error', error: 'Generatie onderbroken' };
      }
      return parsed;
    }
  } catch (e) {
    console.warn('Failed to load soundtrack state:', e);
  }
  return initialState;
};

// Clear state
export const clearSoundtrackState = () => {
  sessionStorage.removeItem(STORAGE_KEY);
};

/**
 * Start V1 (quick) soundtrack generation - fire and forget
 * Called from homepage when user clicks "Start"
 */
export const startQuickSoundtrackGeneration = async (formData: FormData): Promise<void> => {
  const startYear = formData.type === 'birthdate' && formData.birthDate 
    ? formData.birthDate.year 
    : formData.yearRange?.startYear || 1980;
    
  const endYear = formData.type === 'birthdate' && formData.birthDate 
    ? formData.birthDate.year + 25 
    : formData.yearRange?.endYear || 2000;

  // Save initial state
  const newState: SoundtrackState = {
    ...initialState,
    status: 'generating_lyrics',
    version: 'v1',
    startedAt: Date.now(),
  };
  saveState(newState);

  console.log('[Soundtrack V1] Starting quick generation...', { startYear, endYear });

  try {
    // Step 1: Generate lyrics (Mode A - quick, no events)
    const lyricsResponse = await fetch(`${SUPABASE_URL}/functions/v1/generate-song-lyrics`, {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        'Authorization': `Bearer ${SUPABASE_ANON_KEY}`,
        'apikey': SUPABASE_ANON_KEY,
      },
      body: JSON.stringify({
        mode: 'quick',
        formData: {
          birthYear: formData.birthDate?.year,
          city: formData.optionalData.city,
          periodType: formData.optionalData.periodType,
          startYear,
          endYear,
        },
        personalData: {
          firstName: formData.optionalData.firstName,
          city: formData.optionalData.city,
        },
        subculture: formData.optionalData.subculture,
        gender: formData.optionalData.gender,
        startYear,
        endYear,
      }),
    });

    if (!lyricsResponse.ok) {
      const errorData = await lyricsResponse.json().catch(() => ({}));
      throw new Error(errorData.error || `Lyrics error: ${lyricsResponse.status}`);
    }

    const lyricsData = await lyricsResponse.json();
    if (!lyricsData.success) {
      throw new Error(lyricsData.error || 'Lyrics generation failed');
    }

    console.log('[Soundtrack V1] Lyrics generated:', lyricsData.data.title);

    // Update state with lyrics
    const lyricsState: SoundtrackState = {
      ...newState,
      status: 'generating_music',
      lyrics: lyricsData.data.lyrics,
      style: lyricsData.data.style,
      title: lyricsData.data.title,
    };
    saveState(lyricsState);

    // Step 2: Start Suno generation
    const sunoResponse = await fetch(`${SUPABASE_URL}/functions/v1/generate-suno-track`, {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        'Authorization': `Bearer ${SUPABASE_ANON_KEY}`,
        'apikey': SUPABASE_ANON_KEY,
      },
      body: JSON.stringify({
        lyrics: lyricsData.data.lyrics,
        style: lyricsData.data.style,
        title: lyricsData.data.title,
      }),
    });

    if (!sunoResponse.ok) {
      const errorData = await sunoResponse.json().catch(() => ({}));
      throw new Error(errorData.error || `Suno error: ${sunoResponse.status}`);
    }

    const sunoData = await sunoResponse.json();
    if (!sunoData.success || !sunoData.data?.taskId) {
      throw new Error(sunoData.error || 'No taskId received');
    }

    console.log('[Soundtrack V1] Suno task started:', sunoData.data.taskId);

    // Update state with taskId - polling will be done by the hook
    const pollingState: SoundtrackState = {
      ...lyricsState,
      status: 'polling',
      taskId: sunoData.data.taskId,
    };
    saveState(pollingState);

  } catch (error) {
    console.error('[Soundtrack V1] Error:', error);
    const errorState: SoundtrackState = {
      ...newState,
      status: 'error',
      error: error instanceof Error ? error.message : 'Unknown error',
    };
    saveState(errorState);
  }
};

/**
 * Hook for tracking and completing soundtrack generation
 * Polls for completion when in 'polling' state
 */
export const useSoundtrackGeneration = () => {
  const [state, setState] = useState<SoundtrackState>(loadState);

  // Sync state changes to storage
  useEffect(() => {
    saveState(state);
  }, [state]);

  // Poll for Suno completion when in polling state
  useEffect(() => {
    if (state.status !== 'polling' || !state.taskId) return;

    let cancelled = false;
    const pollInterval = 5000;
    const maxAttempts = 60; // 5 minutes max

    const poll = async (attempt: number) => {
      if (cancelled || attempt >= maxAttempts) {
        if (attempt >= maxAttempts) {
          setState(prev => ({
            ...prev,
            status: 'error',
            error: 'Muziek generatie duurde te lang',
          }));
        }
        return;
      }

      try {
        const response = await fetch(`${SUPABASE_URL}/functions/v1/check-suno-status`, {
          method: 'POST',
          headers: {
            'Content-Type': 'application/json',
            'Authorization': `Bearer ${SUPABASE_ANON_KEY}`,
            'apikey': SUPABASE_ANON_KEY,
          },
          body: JSON.stringify({ taskId: state.taskId }),
        });

        if (!response.ok) {
          throw new Error(`Status check failed: ${response.status}`);
        }

        const data = await response.json();
        
        if (!data.success) {
          throw new Error(data.error || 'Status check failed');
        }

        if (data.data.ready) {
          // Get audio URL
          const audioUrl = data.data.audioUrl || data.data.streamAudioUrl;
          
          // Proxy the audio to avoid CORS
          let finalAudioUrl = audioUrl;
          try {
            const proxyResponse = await fetch(`${SUPABASE_URL}/functions/v1/proxy-audio`, {
              method: 'POST',
              headers: {
                'Content-Type': 'application/json',
                'Authorization': `Bearer ${SUPABASE_ANON_KEY}`,
                'apikey': SUPABASE_ANON_KEY,
              },
              body: JSON.stringify({ url: audioUrl }),
            });

            if (proxyResponse.ok) {
              const audioBlob = await proxyResponse.blob();
              finalAudioUrl = URL.createObjectURL(audioBlob);
            }
          } catch (proxyError) {
            console.warn('[Soundtrack] Proxy failed, using direct URL:', proxyError);
          }

          setState(prev => ({
            ...prev,
            status: 'completed',
            audioUrl: finalAudioUrl,
            duration: data.data.duration || 180,
            completedAt: Date.now(),
          }));

          console.log('[Soundtrack] Generation completed!');
          return;
        }

        // Continue polling
        setTimeout(() => poll(attempt + 1), pollInterval);
      } catch (error) {
        console.error('[Soundtrack] Poll error:', error);
        setState(prev => ({
          ...prev,
          status: 'error',
          error: error instanceof Error ? error.message : 'Polling failed',
        }));
      }
    };

    poll(0);

    return () => {
      cancelled = true;
    };
  }, [state.status, state.taskId]);

  // Reset state
  const reset = useCallback(() => {
    clearSoundtrackState();
    setState(initialState);
  }, []);

  // Start V2 (full) generation with events
  const startFullGeneration = useCallback(async (
    events: TimelineEvent[],
    summary: string,
    formData: FormData,
    personalData?: {
      friends?: string;
      school?: string;
      nightlife?: string;
    }
  ) => {
    const startYear = formData.type === 'birthdate' && formData.birthDate 
      ? formData.birthDate.year 
      : formData.yearRange?.startYear || 1980;
      
    const endYear = formData.type === 'birthdate' && formData.birthDate 
      ? formData.birthDate.year + 25 
      : formData.yearRange?.endYear || 2000;

    setState({
      ...initialState,
      status: 'generating_lyrics',
      version: 'v2',
      startedAt: Date.now(),
    });

    console.log('[Soundtrack V2] Starting full generation with events...', { eventCount: events.length });

    try {
      // Step 1: Generate lyrics (Mode B - full, with events)
      const lyricsResponse = await fetch(`${SUPABASE_URL}/functions/v1/generate-song-lyrics`, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          'Authorization': `Bearer ${SUPABASE_ANON_KEY}`,
          'apikey': SUPABASE_ANON_KEY,
        },
        body: JSON.stringify({
          mode: 'full',
          events,
          summary,
          personalData: {
            firstName: formData.optionalData.firstName,
            city: formData.optionalData.city,
            friends: personalData?.friends || formData.optionalData.friends,
            school: personalData?.school || formData.optionalData.school,
            nightlife: personalData?.nightlife || formData.optionalData.nightlife,
          },
          subculture: formData.optionalData.subculture,
          gender: formData.optionalData.gender,
          startYear,
          endYear,
        }),
      });

      if (!lyricsResponse.ok) {
        const errorData = await lyricsResponse.json().catch(() => ({}));
        throw new Error(errorData.error || `Lyrics error: ${lyricsResponse.status}`);
      }

      const lyricsData = await lyricsResponse.json();
      if (!lyricsData.success) {
        throw new Error(lyricsData.error || 'Lyrics generation failed');
      }

      console.log('[Soundtrack V2] Lyrics generated:', lyricsData.data.title);

      setState(prev => ({
        ...prev,
        status: 'generating_music',
        lyrics: lyricsData.data.lyrics,
        style: lyricsData.data.style,
        title: lyricsData.data.title,
      }));

      // Step 2: Start Suno generation
      const sunoResponse = await fetch(`${SUPABASE_URL}/functions/v1/generate-suno-track`, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          'Authorization': `Bearer ${SUPABASE_ANON_KEY}`,
          'apikey': SUPABASE_ANON_KEY,
        },
        body: JSON.stringify({
          lyrics: lyricsData.data.lyrics,
          style: lyricsData.data.style,
          title: lyricsData.data.title,
        }),
      });

      if (!sunoResponse.ok) {
        const errorData = await sunoResponse.json().catch(() => ({}));
        throw new Error(errorData.error || `Suno error: ${sunoResponse.status}`);
      }

      const sunoData = await sunoResponse.json();
      if (!sunoData.success || !sunoData.data?.taskId) {
        throw new Error(sunoData.error || 'No taskId received');
      }

      console.log('[Soundtrack V2] Suno task started:', sunoData.data.taskId);

      setState(prev => ({
        ...prev,
        status: 'polling',
        taskId: sunoData.data.taskId,
      }));

    } catch (error) {
      console.error('[Soundtrack V2] Error:', error);
      setState(prev => ({
        ...prev,
        status: 'error',
        error: error instanceof Error ? error.message : 'Unknown error',
      }));
    }
  }, []);

  return {
    ...state,
    reset,
    startFullGeneration,
    isGenerating: state.status === 'generating_lyrics' || state.status === 'generating_music' || state.status === 'polling',
    isComplete: state.status === 'completed',
    hasError: state.status === 'error',
  };
};
