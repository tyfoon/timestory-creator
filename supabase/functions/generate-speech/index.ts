import { serve } from "https://deno.land/std@0.168.0/http/server.ts";

const corsHeaders = {
  'Access-Control-Allow-Origin': '*',
  'Access-Control-Allow-Headers': 'authorization, x-client-info, apikey, content-type, x-supabase-client-platform, x-supabase-client-platform-version, x-supabase-client-runtime, x-supabase-client-runtime-version',
};

interface SpeechRequest {
  text: string;
  voice?: string;
  languageCode?: string;
  speakingRate?: number;
  pitch?: number;
}

type GoogleVoice = {
  name: string;
  languageCodes?: string[];
  ssmlGender?: string;
  naturalSampleRateHertz?: number;
};

const isVoiceDoesNotExistError = (errorText: string) => {
  return (
    errorText.includes('does not exist') &&
    (errorText.includes('Voice') || errorText.includes('voice'))
  );
};

const scoreVoiceName = (name: string) => {
  // Prefer higher quality families if available.
  // Note: Not all languages have Neural2. Dutch often has Wavenet/Standard.
  let score = 0;
  if (name.includes('Neural2')) score += 300;
  if (name.includes('Wavenet')) score += 200;
  if (name.includes('Standard')) score += 100;
  // Small tie-breaker: later letters sometimes differ by timbre; keep stable.
  score += name.charCodeAt(name.length - 1) / 1000;
  return score;
};

const pickBestVoice = (voices: GoogleVoice[], languageCode: string): string | null => {
  const filtered = voices.filter((v) =>
    Array.isArray(v.languageCodes) ? v.languageCodes.includes(languageCode) : true
  );
  const candidates = (filtered.length ? filtered : voices)
    .filter((v) => typeof v.name === 'string' && v.name.length > 0);

  if (candidates.length === 0) return null;

  candidates.sort((a, b) => scoreVoiceName(b.name) - scoreVoiceName(a.name));
  return candidates[0].name;
};

const fetchVoices = async (apiKey: string, languageCode: string): Promise<GoogleVoice[]> => {
  const url = `https://texttospeech.googleapis.com/v1/voices?languageCode=${encodeURIComponent(languageCode)}&key=${apiKey}`;
  const resp = await fetch(url);
  if (!resp.ok) {
    const t = await resp.text();
    console.error('Google TTS voices:list error:', resp.status, t);
    throw new Error(`voices:list failed (${resp.status})`);
  }
  const json = await resp.json();
  return Array.isArray(json?.voices) ? (json.voices as GoogleVoice[]) : [];
};

serve(async (req) => {
  // Handle CORS preflight
  if (req.method === 'OPTIONS') {
    return new Response('ok', { headers: corsHeaders });
  }

  try {
    const GOOGLE_CLOUD_TTS_API_KEY = Deno.env.get('GOOGLE_CLOUD_TTS_API_KEY');
    
    if (!GOOGLE_CLOUD_TTS_API_KEY) {
      console.error('GOOGLE_CLOUD_TTS_API_KEY is not configured');
      return new Response(
        JSON.stringify({ error: 'TTS API key not configured' }),
        { status: 500, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
      );
    }

    const body: SpeechRequest = await req.json();
    
    if (!body.text || body.text.trim().length === 0) {
      return new Response(
        JSON.stringify({ error: 'Text is required' }),
        { status: 400, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
      );
    }

    // Limit text length to prevent abuse (Google TTS has a 5000 character limit per request)
    const text = body.text.slice(0, 5000);
    
    const languageCode = body.languageCode || 'nl-NL';
    const requestedVoice = (body.voice || '').trim();
    const speakingRate = body.speakingRate || 0.95; // Slightly slower for storytelling
    const pitch = body.pitch || 0;

    // Choose a valid voice name.
    // - If user provided a voice name, we try it.
    // - Otherwise, or if it fails, we auto-pick from voices:list.
    let voiceName: string | null = requestedVoice && requestedVoice !== 'auto' ? requestedVoice : null;
    let usedFallback = false;

    if (!voiceName) {
      const voices = await fetchVoices(GOOGLE_CLOUD_TTS_API_KEY, languageCode);
      voiceName = pickBestVoice(voices, languageCode);
      if (!voiceName) {
        return new Response(
          JSON.stringify({ error: `No voices available for languageCode ${languageCode}` }),
          { status: 500, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
        );
      }
      usedFallback = true;
    }

    console.log(`Generating speech for ${text.length} characters with voice ${voiceName} (requested: ${requestedVoice || 'none'})`);

    // Call Google Cloud Text-to-Speech API
    const googleTTSUrl = `https://texttospeech.googleapis.com/v1/text:synthesize?key=${GOOGLE_CLOUD_TTS_API_KEY}`;
    
    const synthesize = async (name: string) => {
      return await fetch(googleTTSUrl, {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
      },
      body: JSON.stringify({
        input: { text },
        voice: {
          languageCode,
          name,
        },
        audioConfig: {
          audioEncoding: 'MP3',
          speakingRate,
          pitch,
          effectsProfileId: ['headphone-class-device'], // Optimized for headphones/speakers
        },
      }),
      });
    };

    let ttsResponse = await synthesize(voiceName);

    // If the user supplied a voice that doesn't exist, auto-pick and retry once.
    if (!ttsResponse.ok) {
      const errorText = await ttsResponse.clone().text();
      if (!usedFallback && isVoiceDoesNotExistError(errorText)) {
        console.warn('Requested voice invalid; falling back to auto-picked voice.');
        try {
          const voices = await fetchVoices(GOOGLE_CLOUD_TTS_API_KEY, languageCode);
          const fallback = pickBestVoice(voices, languageCode);
          if (fallback && fallback !== voiceName) {
            voiceName = fallback;
            usedFallback = true;
            ttsResponse = await synthesize(voiceName);
          }
        } catch (e) {
          console.error('Failed to fallback voice selection:', e);
        }
      }
    }

    if (!ttsResponse.ok) {
      const errorText = await ttsResponse.text();
      console.error('Google TTS API error:', ttsResponse.status, errorText);
      
      return new Response(
        JSON.stringify({ error: 'Failed to generate speech', details: errorText }),
        { status: ttsResponse.status, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
      );
    }

    const ttsData = await ttsResponse.json();
    
    if (!ttsData.audioContent) {
      console.error('No audio content in TTS response');
      return new Response(
        JSON.stringify({ error: 'No audio content returned' }),
        { status: 500, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
      );
    }

    // Count words for logging
    const wordCount = text.split(/\s+/).length;
    
    // Calculate actual audio duration from MP3 data
    // Base64 encoding adds ~33% overhead, so base64_length * 0.75 = raw bytes
    const base64Length = ttsData.audioContent.length;
    const rawBytes = Math.round(base64Length * 0.75);
    
    // MP3 duration calculation:
    // Google TTS outputs MP3 at ~32kbps for speech (very efficient encoding)
    // With speakingRate 0.95, actual bitrate is around 32000 bits/sec = 4000 bytes/sec
    // However, this varies. A more reliable approach:
    // - Google TTS at 24kHz sample rate, mono, typically ~32-48kbps for speech
    // - Average ~5000 bytes per second of audio is a good estimate
    const bytesPerSecond = 5000;
    const byteBasedDuration = rawBytes / bytesPerSecond;
    
    // Also calculate word-based as sanity check (Dutch ~3.0 words/sec with speakingRate 0.95)
    const wordsPerSecond = 3.0;
    const wordBasedDuration = wordCount / wordsPerSecond;
    
    // Use the SHORTER of the two estimates to avoid long pauses
    // If byte-based is significantly shorter, it's likely more accurate
    const estimatedDurationSeconds = Math.min(byteBasedDuration, wordBasedDuration);

    console.log(`Speech generated. Duration: ${estimatedDurationSeconds.toFixed(2)}s (byte-based: ${byteBasedDuration.toFixed(2)}s, word-based: ${wordBasedDuration.toFixed(2)}s, ${wordCount} words, ${rawBytes} bytes)`);

    return new Response(
      JSON.stringify({
        audioContent: ttsData.audioContent, // Base64 encoded MP3
        estimatedDurationSeconds,
        wordCount,
        voice: voiceName,
        languageCode,
        requestedVoice: requestedVoice || null,
        usedFallback,
      }),
      { 
        status: 200, 
        headers: { ...corsHeaders, 'Content-Type': 'application/json' } 
      }
    );

  } catch (error) {
    console.error('generate-speech error:', error);
    return new Response(
      JSON.stringify({ error: error instanceof Error ? error.message : 'Unknown error' }),
      { status: 500, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
    );
  }
});
