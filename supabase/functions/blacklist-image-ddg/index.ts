import { serve } from "https://deno.land/std@0.177.0/http/server.ts";

const corsHeaders = {
  'Access-Control-Allow-Origin': '*',
  'Access-Control-Allow-Headers': 'authorization, x-client-info, apikey, content-type, x-supabase-client-platform, x-supabase-client-platform-version, x-supabase-client-runtime, x-supabase-client-runtime-version',
};

const DDG_API_URL = 'https://ddg-image-search-bn3h8.ondigitalocean.app';

/**
 * Edge function to proxy blacklist requests to the DDG Image Search API.
 * 
 * This keeps the DDG API key server-side while allowing the client to
 * blacklist images. The DDG API will:
 * 1. Add the URL to its permanent blacklist
 * 2. Flush any cached search results containing this URL
 */
serve(async (req) => {
  // Handle CORS preflight
  if (req.method === 'OPTIONS') {
    return new Response('ok', { headers: corsHeaders });
  }

  try {
    const apiKey = Deno.env.get('DDG_IMAGE_SEARCH_API_KEY');
    if (!apiKey) {
      console.error('[DDG Blacklist] DDG_IMAGE_SEARCH_API_KEY not configured');
      return new Response(
        JSON.stringify({ error: 'API key not configured' }),
        { status: 500, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
      );
    }

    const body = await req.json();
    const { url } = body;

    if (!url) {
      return new Response(
        JSON.stringify({ error: 'URL is required' }),
        { status: 400, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
      );
    }

    console.log(`[DDG Blacklist] Blacklisting URL: ${url.slice(0, 100)}...`);

    // Call the DDG API's blacklist endpoint
    const response = await fetch(`${DDG_API_URL}/blacklist`, {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        'X-Api-Key': apiKey,
      },
      body: JSON.stringify({ url }),
    });

    if (!response.ok) {
      const errorText = await response.text();
      console.error(`[DDG Blacklist] API error: ${response.status} - ${errorText}`);
      return new Response(
        JSON.stringify({ 
          error: `DDG API error: ${response.status}`,
          details: errorText.slice(0, 200)
        }),
        { status: response.status, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
      );
    }

    const result = await response.json();
    console.log(`[DDG Blacklist] ✓ Success:`, result);

    return new Response(
      JSON.stringify({
        success: true,
        blacklisted: result.blacklisted,
        cachedEntriesFlushed: result.cachedEntriesFlushed || 0,
      }),
      { headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
    );

  } catch (error) {
    console.error('[DDG Blacklist] Error:', error);
    return new Response(
      JSON.stringify({ error: error instanceof Error ? error.message : 'Unknown error' }),
      { status: 500, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
    );
  }
});
