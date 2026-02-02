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
    
    // Default to Dutch Neural2-B voice (male, natural sounding)
    const voice = body.voice || 'nl-NL-Neural2-B';
    const languageCode = body.languageCode || 'nl-NL';
    const speakingRate = body.speakingRate || 0.95; // Slightly slower for storytelling
    const pitch = body.pitch || 0;

    console.log(`Generating speech for ${text.length} characters with voice ${voice}`);

    // Call Google Cloud Text-to-Speech API
    const googleTTSUrl = `https://texttospeech.googleapis.com/v1/text:synthesize?key=${GOOGLE_CLOUD_TTS_API_KEY}`;
    
    const ttsResponse = await fetch(googleTTSUrl, {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
      },
      body: JSON.stringify({
        input: { text },
        voice: {
          languageCode,
          name: voice,
        },
        audioConfig: {
          audioEncoding: 'MP3',
          speakingRate,
          pitch,
          effectsProfileId: ['headphone-class-device'], // Optimized for headphones/speakers
        },
      }),
    });

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

    // Estimate audio duration based on text length and speaking rate
    // Average speaking rate is ~150 words per minute, Neural2 at 0.95x
    const wordCount = text.split(/\s+/).length;
    const estimatedDurationSeconds = (wordCount / 150) * 60 / speakingRate;

    console.log(`Speech generated successfully. Estimated duration: ${estimatedDurationSeconds.toFixed(1)}s`);

    return new Response(
      JSON.stringify({
        audioContent: ttsData.audioContent, // Base64 encoded MP3
        estimatedDurationSeconds,
        wordCount,
        voice,
        languageCode,
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
