import { serve } from "https://deno.land/std@0.177.0/http/server.ts";

const corsHeaders = {
  'Access-Control-Allow-Origin': '*',
  'Access-Control-Allow-Headers': 'authorization, x-client-info, apikey, content-type, x-supabase-client-platform, x-supabase-client-platform-version, x-supabase-client-runtime, x-supabase-client-runtime-version',
};

const DDG_API_URL = 'https://ddg-image-search-bn3h8.ondigitalocean.app/search';
const REQUEST_TIMEOUT_MS = 12_000;
const RETRIES = 1;

// Map year prefix to decade suffix
function getDecadeSuffix(year: number): string | null {
  const prefix = Math.floor(year / 10);
  const decadeMap: Record<number, string> = {
    194: '40s',
    195: '50s',
    196: '60s',
    197: '70s',
    198: '80s',
    199: '90s',
    200: '2000s',
    201: '2010s',
    202: '2020s',
  };
  return decadeMap[prefix] || null;
}

// Remove full decade references like "1980s", "1990s" from query (AI sometimes includes these)
function stripFullDecadeReference(query: string): string {
  // Match patterns like "1980s", "1990s", "2000s", "2010s" etc.
  return query.replace(/\b(19[4-9]0s|20[0-2]0s)\b/gi, '').replace(/\s{2,}/g, ' ').trim();
}

// Build optimized search query based on category
function buildSearchQuery(query: string, year: number, category?: string): string {
  // First, strip any existing full decade reference from the query
  const cleanedQuery = stripFullDecadeReference(query);
  
  // Sports events: use exact year (more precise for matches, tournaments, etc.)
  if (category === 'sports') {
    return `${cleanedQuery} ${year}`;
  }
  
  // All other categories: use decade suffix for better era-matching
  const decadeSuffix = getDecadeSuffix(year);
  if (decadeSuffix) {
    return `${cleanedQuery} ${decadeSuffix}`;
  }
  
  // Fallback: use year if no decade mapping exists
  return `${cleanedQuery} ${year}`;
}

type AnyRecord = Record<string, unknown>;

function isRecord(v: unknown): v is AnyRecord {
  return !!v && typeof v === 'object' && !Array.isArray(v);
}

function firstArrayCandidate(obj: AnyRecord): unknown[] | null {
  const candidates = ['results', 'items', 'images', 'data'];
  for (const key of candidates) {
    const v = obj[key];
    if (Array.isArray(v)) return v;
  }
  // Some APIs wrap: { data: { results: [...] } }
  const data = obj['data'];
  if (isRecord(data)) {
    for (const key of candidates) {
      const v = (data as AnyRecord)[key];
      if (Array.isArray(v)) return v;
    }
  }
  return null;
}

function extractBestImage(payload: unknown): { imageUrl: string | null; score: number } {
  // Common flat shapes
  if (isRecord(payload)) {
    const flatUrl =
      (typeof payload.url === 'string' && payload.url) ||
      (typeof payload.imageUrl === 'string' && payload.imageUrl) ||
      (typeof payload.image === 'string' && payload.image) ||
      (typeof payload.src === 'string' && payload.src) ||
      null;

    const flatScore = typeof payload.score === 'number' ? payload.score : 0;
    if (flatUrl) return { imageUrl: flatUrl, score: flatScore };

    const arr = firstArrayCandidate(payload);
    if (arr && arr.length > 0) {
      const first = arr[0];
      if (isRecord(first)) {
        const url =
          (typeof first.url === 'string' && first.url) ||
          (typeof first.imageUrl === 'string' && first.imageUrl) ||
          (typeof first.image === 'string' && first.image) ||
          (typeof first.src === 'string' && first.src) ||
          (typeof first.original === 'string' && first.original) ||
          (typeof first.link === 'string' && first.link) ||
          null;
        const score =
          (typeof first.score === 'number' && first.score) ||
          (typeof first.rank === 'number' && first.rank) ||
          (typeof first.relevance === 'number' && first.relevance) ||
          flatScore ||
          0;
        return { imageUrl: url, score };
      }
    }

    // Nothing found; log shape keys for troubleshooting.
    console.log(
      `[Tol Search] Could not extract image URL. Top-level keys: ${Object.keys(payload).slice(0, 20).join(', ')}`
    );
  }

  return { imageUrl: null, score: 0 };
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

    // Build optimized search query (decade for most, exact year for sports)
    const searchQuery = year ? buildSearchQuery(query, year, category) : query;

    console.log(`[Tol Search] Query: "${searchQuery}" (original: "${query}", year: ${year}, category: ${category})`);

    // Call the DDG Image Search API (with timeout + retry)
    const url = `${DDG_API_URL}?q=${encodeURIComponent(searchQuery)}&key=${apiKey}`;

    let response: Response | null = null;
    let lastErr: unknown = null;
    for (let attempt = 0; attempt <= RETRIES; attempt++) {
      const controller = new AbortController();
      const timeoutId = setTimeout(() => controller.abort(), REQUEST_TIMEOUT_MS);
      try {
        response = await fetch(url, { signal: controller.signal });
        lastErr = null;
        break;
      } catch (e) {
        lastErr = e;
        const isAbort = e instanceof Error && e.name === 'AbortError';
        console.warn(`[Tol Search] Upstream fetch failed (attempt ${attempt + 1}/${RETRIES + 1})`, {
          isAbort,
          message: e instanceof Error ? e.message : String(e),
        });
        if (attempt < RETRIES) {
          await new Promise((r) => setTimeout(r, 250));
        }
      } finally {
        clearTimeout(timeoutId);
      }
    }

    if (!response) {
      console.error('[Tol Search] Upstream fetch failed after retries', lastErr);
      // Soft-fail: do not break the UI if upstream is flaky
      return new Response(
        JSON.stringify({ imageUrl: null, source: 'DDG/Tol', score: 0, searchQuery }),
        { headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
      );
    }

    if (response.status === 404) {
      console.log(`[Tol Search] No result found for: "${searchQuery}"`);
      return new Response(
        JSON.stringify({ imageUrl: null, source: 'DDG/Tol', score: 0 }),
        { headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
      );
    }

    // Soft-fail common upstream timeout/availability codes
    if (response.status === 504 || response.status === 503 || response.status === 502) {
      const errorText = await response.text().catch(() => '');
      console.warn(`[Tol Search] Upstream unavailable (${response.status}) for "${searchQuery}"`, errorText.slice(0, 200));
      return new Response(
        JSON.stringify({ imageUrl: null, source: 'DDG/Tol', score: 0, searchQuery }),
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
    const { imageUrl, score } = extractBestImage(data);

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
