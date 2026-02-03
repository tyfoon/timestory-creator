import { serve } from "https://deno.land/std@0.177.0/http/server.ts";

const corsHeaders = {
  'Access-Control-Allow-Origin': '*',
  'Access-Control-Allow-Headers': 'authorization, x-client-info, apikey, content-type, x-supabase-client-platform, x-supabase-client-platform-version, x-supabase-client-runtime, x-supabase-client-runtime-version',
};

const DDG_API_URL = 'https://ddg-image-search-bn3h8.ondigitalocean.app/search';

// Map year prefix to decade suffix
function getDecadeSuffix(year: number): string | null {
  const prefix = Math.floor(year / 10);
  const decadeMap: Record<number, string> = {
    197: '70s',
    198: '80s',
    199: '90s',
    200: '2000s',
    201: '2010s',
    202: '2020s',
  };
  return decadeMap[prefix] || null;
}

serve(async (req) => {
  // Handle CORS preflight
  if (req.method === 'OPTIONS') {
    return new Response('ok', { headers: corsHeaders });
  }

  try {
    const apiKey = Deno.env.get('DDG_IMAGE_SEARCH_API_KEY');
    if (!apiKey) {
      console.error('[Tol Search] DDG_IMAGE_SEARCH_API_KEY not configured');
      return new Response(
        JSON.stringify({ error: 'API key not configured' }),
        { status: 500, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
      );
    }

    const body = await req.json();
    const { query, year, category } = body;

    if (!query) {
      return new Response(
        JSON.stringify({ error: 'Query is required' }),
        { status: 400, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
      );
    }

    // Build optimized search query with decade suffix
    let searchQuery = query;
    if (year) {
      const decadeSuffix = getDecadeSuffix(year);
      if (decadeSuffix) {
        searchQuery = `${query} ${decadeSuffix}`;
      }
    }

    console.log(`[Tol Search] Query: "${searchQuery}" (original: "${query}", year: ${year}, category: ${category})`);

    // Call the DDG Image Search API
    const url = `${DDG_API_URL}?q=${encodeURIComponent(searchQuery)}&key=${apiKey}`;
    const response = await fetch(url);

    if (response.status === 404) {
      console.log(`[Tol Search] No result found for: "${searchQuery}"`);
      return new Response(
        JSON.stringify({ imageUrl: null, source: 'DDG/Tol', score: 0 }),
        { headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
      );
    }

    if (!response.ok) {
      const errorText = await response.text();
      console.error(`[Tol Search] API error: ${response.status} - ${errorText}`);
      return new Response(
        JSON.stringify({ error: `DDG API error: ${response.status}` }),
        { status: 500, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
      );
    }

    const data = await response.json();
    
    // The API returns an object with image info
    // Expected structure: { url: string, width: number, height: number, score: number }
    const imageUrl = data.url || data.image || null;
    const score = data.score || 0;

    console.log(`[Tol Search] Found image for "${searchQuery}": ${imageUrl ? 'YES' : 'NO'} (score: ${score})`);

    return new Response(
      JSON.stringify({
        imageUrl,
        source: 'DDG/Tol',
        score,
        searchQuery, // Include the actual query used for debugging
      }),
      { headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
    );

  } catch (error) {
    console.error('[Tol Search] Error:', error);
    return new Response(
      JSON.stringify({ error: error instanceof Error ? error.message : 'Unknown error' }),
      { status: 500, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
    );
  }
});
