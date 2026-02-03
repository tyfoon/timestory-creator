import { supabase } from '@/integrations/supabase/client';

export type VoiceProvider = 'google' | 'elevenlabs';

interface GenerateSpeechParams {
  text: string;
  voice?: string;
  languageCode?: string;
  speakingRate?: number;
  provider?: VoiceProvider;
}

interface SpeechResult {
  audioContent: string; // Base64 encoded MP3
  estimatedDurationSeconds: number;
  wordCount: number;
  voice: string;
  languageCode?: string;
  provider: VoiceProvider;
}

// Default ElevenLabs voice ID - George (warm male, works with free tier)
const DEFAULT_ELEVENLABS_VOICE_ID = 'JBFqnCBsd6RMkjVDRZzb';

/**
 * Generate speech audio using Google Cloud TTS via Edge Function.
 */
const generateSpeechGoogle = async (params: Omit<GenerateSpeechParams, 'provider'>): Promise<SpeechResult> => {
  const { data, error } = await supabase.functions.invoke<SpeechResult>('generate-speech', {
    body: params,
  });

  if (error) {
    console.error('Google TTS generation error:', error);
    throw new Error(error.message || 'Failed to generate speech with Google TTS');
  }

  if (!data) {
    throw new Error('No data returned from Google TTS');
  }

  return { ...data, provider: 'google' };
};

/**
 * Generate speech audio using ElevenLabs TTS via Edge Function.
 */
const generateSpeechElevenLabs = async (params: Omit<GenerateSpeechParams, 'provider'>): Promise<SpeechResult> => {
  const { data, error } = await supabase.functions.invoke<SpeechResult>('generate-speech-elevenlabs', {
    body: {
      text: params.text,
      voiceId: params.voice || DEFAULT_ELEVENLABS_VOICE_ID,
    },
  });

  if (error) {
    console.error('ElevenLabs TTS generation error:', error);
    throw new Error(error.message || 'Failed to generate speech with ElevenLabs');
  }

  if (!data) {
    throw new Error('No data returned from ElevenLabs TTS');
  }

  return { ...data, provider: 'elevenlabs' };
};

/**
 * Generate speech audio using the specified provider.
 * Defaults to Google TTS (free, no restrictions).
 */
export const generateSpeech = async (params: GenerateSpeechParams): Promise<SpeechResult> => {
  const provider = params.provider || 'google'; // Google TTS is default (free tier friendly)
  
  if (provider === 'elevenlabs') {
    return generateSpeechElevenLabs(params);
  }
  
  return generateSpeechGoogle(params);
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
  onProgress?: (completed: number, total: number) => void,
  provider?: VoiceProvider
): Promise<Map<string, SpeechResult>> => {
  const results = new Map<string, SpeechResult>();
  
  for (let i = 0; i < segments.length; i++) {
    const segment = segments[i];
    try {
      const result = await generateSpeech({ text: segment.text, provider });
      results.set(segment.id, result);
      onProgress?.(i + 1, segments.length);
    } catch (error) {
      console.error(`Failed to generate speech for segment ${segment.id}:`, error);
      // Continue with other segments
    }
  }
  
  return results;
};
