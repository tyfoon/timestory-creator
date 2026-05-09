import { supabase } from '@/integrations/supabase/client';

export type VoiceProvider = 'google' | 'elevenlabs';

interface GenerateSpeechParams {
  text: string;
  voice?: string;
  languageCode?: string;
  speakingRate?: number;
  provider?: VoiceProvider;
  /** ElevenLabs only — prepended to text (e.g. "[warm][softly] ") */
  audioTag?: string;
  /** ElevenLabs only — overrides default voice settings */
  stability?: number;
  similarityBoost?: number;
  style?: number;
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
const MIN_PLAYABLE_AUDIO_BASE64_LENGTH = 1000;

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
 * Throttled to MAX 2 concurrent requests (free tier limit is 3).
 */
const ELEVENLABS_MAX_CONCURRENT = 2;
let elevenLabsActive = 0;
const elevenLabsQueue: Array<() => void> = [];

const acquireElevenLabsSlot = (): Promise<void> => {
  if (elevenLabsActive < ELEVENLABS_MAX_CONCURRENT) {
    elevenLabsActive++;
    return Promise.resolve();
  }
  return new Promise((resolve) => {
    elevenLabsQueue.push(() => {
      elevenLabsActive++;
      resolve();
    });
  });
};

const releaseElevenLabsSlot = () => {
  elevenLabsActive--;
  const next = elevenLabsQueue.shift();
  if (next) next();
};

const generateSpeechElevenLabs = async (params: Omit<GenerateSpeechParams, 'provider'>): Promise<SpeechResult> => {
  await acquireElevenLabsSlot();
  try {
    // Prefix the audio tag (e.g. "[warm][softly] ") so ElevenLabs picks up the emotion.
    const taggedText = params.audioTag
      ? `${params.audioTag.trim()} ${params.text}`
      : params.text;

    const { data, error } = await supabase.functions.invoke<SpeechResult>('generate-speech-elevenlabs', {
      body: {
        text: taggedText,
        voiceId: params.voice || DEFAULT_ELEVENLABS_VOICE_ID,
        stability: params.stability,
        similarityBoost: params.similarityBoost,
        style: params.style,
      },
    });

    if (error) {
      console.error('ElevenLabs TTS generation error:', error);
      const details = typeof error.context === 'object' && error.context && 'details' in error.context
        ? String((error.context as { details?: unknown }).details)
        : '';
      throw new Error(details || error.message || 'Failed to generate speech with ElevenLabs');
    }

    if (!data) {
      throw new Error('No data returned from ElevenLabs TTS');
    }

    if (!data.audioContent || data.audioContent.length < MIN_PLAYABLE_AUDIO_BASE64_LENGTH) {
      throw new Error('ElevenLabs returned no playable audio');
    }

    return { ...data, provider: 'elevenlabs' };
  } finally {
    releaseElevenLabsSlot();
  }
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
 * Browser-native base64 decoding is the safest path for MP3-in-JSON TTS.
 */
export const base64ToAudioUrl = (base64: string): string => `data:audio/mpeg;base64,${base64}`;

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
