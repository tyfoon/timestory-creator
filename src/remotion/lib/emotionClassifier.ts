/**
 * Calls the `classify-event-emotions` edge function to label intro + events
 * with an emotion, an ElevenLabs audio tag, and tuned voice_settings.
 *
 * Used by the Spoken Story flow when the user picks ElevenLabs as the
 * voice provider, to make the narration emotionally varied per event.
 *
 * Failure-tolerant: any error returns `null` so the caller can fall back
 * to neutral narration without blocking audio generation.
 */
import { supabase } from '@/integrations/supabase/client';

export interface EmotionSegment {
  emotion: string;
  intensity: 'low' | 'medium' | 'high';
  audioTag: string;
  voiceSettings: {
    stability: number;
    similarityBoost: number;
    style: number;
  };
}

export interface EmotionClassification {
  intro: EmotionSegment | null;
  events: Record<string, EmotionSegment>;
}

interface InEvent {
  id: string;
  title: string;
  description: string;
  year?: number;
}

export const classifyEventEmotions = async (params: {
  language: string;
  intro?: string;
  events: InEvent[];
}): Promise<EmotionClassification | null> => {
  try {
    const { data, error } = await supabase.functions.invoke<EmotionClassification>(
      'classify-event-emotions',
      { body: params },
    );
    if (error || !data) {
      console.warn('[emotionClassifier] failed, falling back to neutral', error);
      return null;
    }
    return data;
  } catch (err) {
    console.warn('[emotionClassifier] threw, falling back to neutral', err);
    return null;
  }
};
