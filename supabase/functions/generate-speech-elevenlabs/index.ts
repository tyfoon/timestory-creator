import { serve } from "https://deno.land/std@0.168.0/http/server.ts";
import { encode as base64Encode } from "https://deno.land/std@0.168.0/encoding/base64.ts";

const corsHeaders = {
  'Access-Control-Allow-Origin': '*',
  'Access-Control-Allow-Headers': 'authorization, x-client-info, apikey, content-type, x-supabase-client-platform, x-supabase-client-platform-version, x-supabase-client-runtime, x-supabase-client-runtime-version',
};

interface SpeechRequest {
  text: string;
  voiceId?: string;
  modelId?: string;
  stability?: number;
  similarityBoost?: number;
  style?: number;
  speakingRate?: number;
}

// Default voice: George (warm male, works with free tier)
const DEFAULT_VOICE_ID = 'JBFqnCBsd6RMkjVDRZzb';
const DEFAULT_MODEL_ID = 'eleven_multilingual_v2';

serve(async (req) => {
  // Handle CORS preflight
  if (req.method === 'OPTIONS') {
    return new Response('ok', { headers: corsHeaders });
  }

  try {
    const ELEVENLABS_API_KEY = Deno.env.get('ELEVENLABS_API_KEY');
    
    if (!ELEVENLABS_API_KEY) {
      console.error('ELEVENLABS_API_KEY is not configured');
      return new Response(
        JSON.stringify({ error: 'ElevenLabs API key not configured' }),
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

    // Limit text length (ElevenLabs has a 5000 character limit per request)
    const text = body.text.slice(0, 5000);
    
    const voiceId = body.voiceId || DEFAULT_VOICE_ID;
    const modelId = body.modelId || DEFAULT_MODEL_ID;
    
    // Voice settings for storytelling narration
    const stability = body.stability ?? 0.5;
    const similarityBoost = body.similarityBoost ?? 0.75;
    const style = body.style ?? 0.3; // Moderate style for narration
    
    console.log(`Generating ElevenLabs speech for ${text.length} characters with voice ${voiceId}`);

    // Call ElevenLabs Text-to-Speech API
    const ttsUrl = `https://api.elevenlabs.io/v1/text-to-speech/${voiceId}?output_format=mp3_44100_128`;
    
    const ttsResponse = await fetch(ttsUrl, {
      method: 'POST',
      headers: {
        'xi-api-key': ELEVENLABS_API_KEY,
        'Content-Type': 'application/json',
      },
      body: JSON.stringify({
        text,
        model_id: modelId,
        voice_settings: {
          stability,
          similarity_boost: similarityBoost,
          style,
          use_speaker_boost: true,
        },
      }),
    });

    if (!ttsResponse.ok) {
      const errorText = await ttsResponse.text();
      console.error('ElevenLabs TTS API error:', ttsResponse.status, errorText);
      
      return new Response(
        JSON.stringify({ error: 'Failed to generate speech', details: errorText }),
        { status: ttsResponse.status, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
      );
    }

    // Get the audio buffer
    const audioBuffer = await ttsResponse.arrayBuffer();
    
    // Convert to base64 for consistent API with Google TTS
    const audioContent = base64Encode(audioBuffer);

    // Count words for duration estimation
    const wordCount = text.split(/\s+/).length;
    
    // ElevenLabs MP3 at 44.1kHz 128kbps = ~16000 bytes per second
    const bytesPerSecond = 16000;
    const byteBasedDuration = audioBuffer.byteLength / bytesPerSecond;
    
    // Word-based estimate: ~3.0 words/sec for narration
    const wordsPerSecond = 3.0;
    const wordBasedDuration = wordCount / wordsPerSecond;
    
    // Use the shorter estimate to avoid long pauses
    const estimatedDurationSeconds = Math.min(byteBasedDuration, wordBasedDuration);

    console.log(`ElevenLabs speech generated. Duration: ${estimatedDurationSeconds.toFixed(2)}s (${wordCount} words, ${audioBuffer.byteLength} bytes)`);

    return new Response(
      JSON.stringify({
        audioContent, // Base64 encoded MP3
        estimatedDurationSeconds,
        wordCount,
        voice: voiceId,
        provider: 'elevenlabs',
      }),
      { 
        status: 200, 
        headers: { ...corsHeaders, 'Content-Type': 'application/json' } 
      }
    );

  } catch (error) {
    console.error('generate-speech-elevenlabs error:', error);
    return new Response(
      JSON.stringify({ error: error instanceof Error ? error.message : 'Unknown error' }),
      { status: 500, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
    );
  }
});
