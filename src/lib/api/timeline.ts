import { FormData } from '@/types/form';
import { TimelineResponse } from '@/types/timeline';

// Lazy import supabase to prevent crash if env vars not loaded yet
const getSupabase = async () => {
  const { supabase } = await import('@/integrations/supabase/client');
  return supabase;
};

export const generateTimeline = async (
  formData: FormData, 
  language: string
): Promise<TimelineResponse> => {
  try {
    const supabase = await getSupabase();
    
    const { data, error } = await supabase.functions.invoke('generate-timeline', {
      body: {
        type: formData.type,
        birthDate: formData.birthDate,
        yearRange: formData.yearRange,
        optionalData: formData.optionalData,
        language
      }
    });

    if (error) {
      console.error('Error calling generate-timeline:', error);
      return { success: false, error: error.message };
    }

    return data;
  } catch (err) {
    console.error('Error initializing Supabase:', err);
    return { 
      success: false, 
      error: 'Backend nog niet beschikbaar. Ververs de pagina.' 
    };
  }
};

export const searchImages = async (
  queries: { eventId: string; query: string; year?: number }[]
): Promise<{ success: boolean; images?: { eventId: string; imageUrl: string | null; source: string | null }[] }> => {
  try {
    const supabase = await getSupabase();
    
    const { data, error } = await supabase.functions.invoke('search-images', {
      body: { queries }
    });

    if (error) {
      console.error('Error calling search-images:', error);
      return { success: false };
    }

    return data;
  } catch (err) {
    console.error('Error initializing Supabase:', err);
    return { success: false };
  }
};
