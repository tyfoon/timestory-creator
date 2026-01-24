import { supabase } from '@/integrations/supabase/client';
import { FormData } from '@/types/form';
import { TimelineResponse } from '@/types/timeline';

export const generateTimeline = async (
  formData: FormData, 
  language: string
): Promise<TimelineResponse> => {
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
};

export const searchImages = async (
  queries: { eventId: string; query: string; year?: number }[]
): Promise<{ success: boolean; images?: { eventId: string; imageUrl: string | null; source: string | null }[] }> => {
  const { data, error } = await supabase.functions.invoke('search-images', {
    body: { queries }
  });

  if (error) {
    console.error('Error calling search-images:', error);
    return { success: false };
  }

  return data;
};
