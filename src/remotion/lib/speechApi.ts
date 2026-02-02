import { supabase } from '@/integrations/supabase/client';

interface GenerateSpeechParams {
  text: string;
  voice?: string;
  languageCode?: string;
  speakingRate?: number;
}

interface SpeechResult {
  audioContent: string; // Base64 encoded MP3
  estimatedDurationSeconds: number;
  wordCount: number;
  voice: string;
  languageCode: string;
}

/**
 * Generate speech audio using Google Cloud TTS via Edge Function.
 */
export const generateSpeech = async (params: GenerateSpeechParams): Promise<SpeechResult> => {
  const { data, error } = await supabase.functions.invoke<SpeechResult>('generate-speech', {
    body: params,
  });

  if (error) {
    console.error('Speech generation error:', error);
    throw new Error(error.message || 'Failed to generate speech');
  }

  if (!data) {
    throw new Error('No data returned from speech generation');
  }

  return data;
};

/**
 * Convert base64 audio to a data URL for use in Remotion.
 */
export const base64ToAudioUrl = (base64: string): string => {
  return `data:audio/mp3;base64,${base64}`;
};

/**
 * Generate speech for multiple text segments.
 */
export const generateSpeechBatch = async (
  segments: { id: string; text: string }[],
  onProgress?: (completed: number, total: number) => void
): Promise<Map<string, SpeechResult>> => {
  const results = new Map<string, SpeechResult>();
  
  for (let i = 0; i < segments.length; i++) {
    const segment = segments[i];
    try {
      const result = await generateSpeech({ text: segment.text });
      results.set(segment.id, result);
      onProgress?.(i + 1, segments.length);
    } catch (error) {
      console.error(`Failed to generate speech for segment ${segment.id}:`, error);
      // Continue with other segments
    }
  }
  
  return results;
};
