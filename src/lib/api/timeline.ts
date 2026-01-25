import { FormData } from '@/types/form';
import { TimelineEvent, TimelineResponse, FamousBirthday } from '@/types/timeline';

// Fallback Supabase configuration - used when env vars aren't loaded yet
const SUPABASE_URL = import.meta.env.VITE_SUPABASE_URL || 'https://koeoboygsssyajpdstel.supabase.co';
const SUPABASE_ANON_KEY = import.meta.env.VITE_SUPABASE_PUBLISHABLE_KEY || 'eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZSIsInJlZiI6ImtvZW9ib3lnc3NzeWFqcGRzdGVsIiwicm9sZSI6ImFub24iLCJpYXQiOjE3NjkyNTY2NjEsImV4cCI6MjA4NDgzMjY2MX0.KuFaWF4r_cxZRiOumPGMChLVmwgyhT9vR5s7L52zr5s';

export interface StreamCallbacks {
  onEvent: (event: TimelineEvent) => void;
  onSummary: (summary: string) => void;
  onFamousBirthdays: (birthdays: FamousBirthday[]) => void;
  onComplete: (data: { events: TimelineEvent[]; summary: string; famousBirthdays: FamousBirthday[] }) => void;
  onError: (error: string) => void;
}

export const generateTimelineStreaming = async (
  formData: FormData,
  language: string,
  callbacks: StreamCallbacks,
  options?: { maxEvents?: number }
): Promise<void> => {
  try {
    console.log('Calling generate-timeline edge function with streaming...');
    
    const response = await fetch(`${SUPABASE_URL}/functions/v1/generate-timeline`, {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        'Authorization': `Bearer ${SUPABASE_ANON_KEY}`,
        'apikey': SUPABASE_ANON_KEY,
      },
      body: JSON.stringify({
        type: formData.type,
        birthDate: formData.birthDate,
        yearRange: formData.yearRange,
        optionalData: formData.optionalData,
        language,
        stream: true,
        maxEvents: options?.maxEvents
      })
    });

    if (!response.ok) {
      const errorText = await response.text();
      console.error('Edge function error:', response.status, errorText);
      
      if (response.status === 429) {
        callbacks.onError('Te veel verzoeken. Probeer het later opnieuw.');
        return;
      }
      if (response.status === 402) {
        callbacks.onError('Credits op. Voeg credits toe aan je workspace.');
        return;
      }
      
      callbacks.onError(`Server error: ${response.status}`);
      return;
    }

    const reader = response.body?.getReader();
    if (!reader) {
      callbacks.onError('No response stream');
      return;
    }

    const decoder = new TextDecoder();
    let buffer = '';

    while (true) {
      const { done, value } = await reader.read();
      if (done) break;
      
      buffer += decoder.decode(value, { stream: true });
      const lines = buffer.split('\n');
      buffer = lines.pop() || '';
      
      for (const line of lines) {
        if (!line.startsWith('data: ')) continue;
        const data = line.slice(6);
        if (data === '[DONE]') continue;
        
        try {
          const parsed = JSON.parse(data);
          
          switch (parsed.type) {
            case 'event':
              callbacks.onEvent(parsed.event);
              break;
            case 'summary':
              callbacks.onSummary(parsed.summary);
              break;
            case 'famousBirthdays':
              callbacks.onFamousBirthdays(parsed.famousBirthdays);
              break;
            case 'complete':
              callbacks.onComplete(parsed.data);
              break;
          }
        } catch (e) {
          // Ignore parse errors for incomplete data
        }
      }
    }
    
  } catch (err) {
    console.error('Error in streaming timeline:', err);
    callbacks.onError(err instanceof Error ? err.message : 'Onbekende fout');
  }
};

export const generateTimeline = async (
  formData: FormData, 
  language: string
): Promise<TimelineResponse> => {
  try {
    console.log('Calling generate-timeline edge function...');
    
    const response = await fetch(`${SUPABASE_URL}/functions/v1/generate-timeline`, {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        'Authorization': `Bearer ${SUPABASE_ANON_KEY}`,
        'apikey': SUPABASE_ANON_KEY,
      },
      body: JSON.stringify({
        type: formData.type,
        birthDate: formData.birthDate,
        yearRange: formData.yearRange,
        optionalData: formData.optionalData,
        language
      })
    });

    if (!response.ok) {
      const errorText = await response.text();
      console.error('Edge function error:', response.status, errorText);
      
      if (response.status === 429) {
        return { success: false, error: 'Te veel verzoeken. Probeer het later opnieuw.' };
      }
      if (response.status === 402) {
        return { success: false, error: 'Credits op. Voeg credits toe aan je workspace.' };
      }
      
      return { success: false, error: `Server error: ${response.status}` };
    }

    const data = await response.json();
    console.log('Timeline generated successfully');
    return data;
    
  } catch (err) {
    console.error('Error calling generate-timeline:', err);
    return { 
      success: false, 
      error: err instanceof Error ? err.message : 'Onbekende fout' 
    };
  }
};

export const searchImages = async (
  queries: { eventId: string; query: string; year?: number }[]
  , options?: { mode?: 'fast' | 'full' }
): Promise<{ success: boolean; images?: { eventId: string; imageUrl: string | null; source: string | null }[] }> => {
  try {
    const response = await fetch(`${SUPABASE_URL}/functions/v1/search-images`, {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        'Authorization': `Bearer ${SUPABASE_ANON_KEY}`,
        'apikey': SUPABASE_ANON_KEY,
      },
      body: JSON.stringify({ queries, mode: options?.mode })
    });

    if (!response.ok) {
      console.error('Search images error:', response.status);
      return { success: false };
    }

    const data = await response.json();
    return data;
    
  } catch (err) {
    console.error('Error calling search-images:', err);
    return { success: false };
  }
};
