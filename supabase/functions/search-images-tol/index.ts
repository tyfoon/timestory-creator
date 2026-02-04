import { serve } from "https://deno.land/std@0.177.0/http/server.ts";
import { createClient } from "https://esm.sh/@supabase/supabase-js@2";

const corsHeaders = {
  'Access-Control-Allow-Origin': '*',
  'Access-Control-Allow-Headers': 'authorization, x-client-info, apikey, content-type, x-supabase-client-platform, x-supabase-client-platform-version, x-supabase-client-runtime, x-supabase-client-runtime-version',
};

const DDG_API_URL = 'https://ddg-image-search-bn3h8.ondigitalocean.app/search';
const REQUEST_TIMEOUT_MS = 20_000; // Increased timeout for slow upstream
const RETRIES = 2; // One extra retry for flaky connections

// Bump this when deploying to verify the latest code is running
const VERSION = 'search-images-tol@2026-02-04.3';
const DEPLOYED_AT = new Date().toISOString();

// ============== CACHE HELPERS ==============

interface CacheEntry {
  image_url: string;
  source: string | null;
}

/**
 * Normalize query for cache lookup: lowercase, trimmed, collapsed whitespace
 */
function normalizeQueryForCache(query: string): string {
  return query.toLowerCase().trim().replace(/\s+/g, " ");
}

/**
 * Check cache for a previously found image
 */
async function checkCache(
  supabase: ReturnType<typeof createClient>,
  query: string,
): Promise<{ imageUrl: string; source: string | null } | null> {
  const normalizedQuery = normalizeQueryForCache(query);
  
  try {
    const { data: cacheHit, error: cacheError } = await supabase
      .from("image_search_cache")
      .select("image_url, source")
      .eq("query", normalizedQuery)
      .maybeSingle();
    
    if (cacheError) {
      console.log(`[Cache] Error: ${cacheError.message}`);
      return null;
    }
    
    if (!cacheHit) return null;
    
    const cacheData = cacheHit as unknown as CacheEntry;
    
    // Check blacklist
    const { data: blacklisted } = await supabase
      .from("image_blacklist")
      .select("id")
      .eq("image_url", cacheData.image_url)
      .maybeSingle();
    
    if (blacklisted) {
      console.log(`[Cache] URL blacklisted, removing: ${normalizedQuery}`);
      await (supabase.from("image_search_cache") as any).delete().eq("query", normalizedQuery);
      return null;
    }
    
    // Update last_accessed (fire-and-forget)
    (supabase.from("image_search_cache") as any)
      .update({ last_accessed: new Date().toISOString() })
      .eq("query", normalizedQuery)
      .then(() => {});
    
    console.log(`[Cache] HIT for "${normalizedQuery}"`);
    return { imageUrl: cacheData.image_url, source: cacheData.source };
  } catch (e) {
    console.log(`[Cache] Exception: ${e}`);
    return null;
  }
}

/**
 * Save to cache
 */
async function saveToCache(
  supabase: ReturnType<typeof createClient>,
  query: string,
  imageUrl: string,
  source: string | null,
): Promise<void> {
  const normalizedQuery = normalizeQueryForCache(query);
  
  try {
    const { error } = await (supabase.from("image_search_cache") as any)
      .upsert({
        query: normalizedQuery,
        image_url: imageUrl,
        source: source,
        last_accessed: new Date().toISOString(),
      }, { onConflict: "query" });
    
    if (error) {
      console.log(`[Cache] Save error: ${error.message}`);
    } else {
      console.log(`[Cache] Saved "${normalizedQuery}"`);
    }
  } catch (e) {
    console.log(`[Cache] Save exception: ${e}`);
  }
}

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

// Remove any decade hints already present (prevents e.g. "80s 80s" or "1980s 80s")
function stripDecadeHints(query: string): string {
  // Order matters: remove "jaren 80" first so we don't leave a dangling "jaren"
  let q = query;

  // Dutch-style: "jaren 80", "jaren '80s", "jaren ’80s"
  q = q.replace(/\bjaren\s+['’]?(?:[4-9]0s|[0-2]0s)\b/gi, '');

  // Full decades: "1940s".."1990s", "2000s".."2020s"
  q = q.replace(/\b(19[4-9]0s|20[0-2]0s)\b/gi, '');

  // Short decades: "40s".."90s", "00s".."20s" (optionally prefixed with apostrophe)
  q = q.replace(/\b['’]?(?:[4-9]0s|[0-2]0s)\b/gi, '');

  return q.replace(/\s{2,}/g, ' ').trim();
}

// Build optimized search query based on category
function buildSearchQuery(query: string, year: number, category?: string): string {
  // First, strip any existing decade hints from the query (AI sometimes includes these)
  const cleanedQuery = stripDecadeHints(query);
  
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
    console.log(`[${VERSION}] Request received`, { deployedAt: DEPLOYED_AT });

    const apiKey = Deno.env.get('DDG_IMAGE_SEARCH_API_KEY');
    if (!apiKey) {
      console.error('[Tol Search] DDG_IMAGE_SEARCH_API_KEY not configured');
      return new Response(
        JSON.stringify({ error: 'API key not configured', _version: VERSION }),
        { status: 500, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
      );
    }

    // Initialize Supabase client for cache operations
    const supabaseUrl = Deno.env.get("SUPABASE_URL");
    const supabaseServiceKey = Deno.env.get("SUPABASE_SERVICE_ROLE_KEY");
    
    let supabase: ReturnType<typeof createClient> | null = null;
    if (supabaseUrl && supabaseServiceKey) {
      supabase = createClient(supabaseUrl, supabaseServiceKey);
    }

    const body = await req.json();
    const { query, year, category } = body;

    if (!query) {
      return new Response(
        JSON.stringify({ error: 'Query is required', _version: VERSION }),
        { status: 400, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
      );
    }

    // Build optimized search query (decade for most, exact year for sports)
    const searchQuery = year ? buildSearchQuery(query, year, category) : query;

    // STEP 1: Check cache first
    if (supabase) {
      const cached = await checkCache(supabase, searchQuery);
      if (cached) {
        return new Response(
          JSON.stringify({
            imageUrl: cached.imageUrl,
            source: cached.source || 'DDG/Tol',
            score: 100, // Cache hits get high score
            searchQuery,
            cached: true,
            _version: VERSION,
          }),
          { headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
        );
      }
    }

    console.log(`[Tol Search] Query: "${searchQuery}" (original: "${query}", year: ${year}, category: ${category})`);

    // STEP 2: Call the DDG Image Search API (with timeout + retry)
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
        JSON.stringify({ imageUrl: null, source: 'DDG/Tol', score: 0, searchQuery, _version: VERSION }),
        { headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
      );
    }

    if (response.status === 404) {
      console.log(`[Tol Search] No result found for: "${searchQuery}"`);
      return new Response(
        JSON.stringify({ imageUrl: null, source: 'DDG/Tol', score: 0, _version: VERSION }),
        { headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
      );
    }

    // Soft-fail common upstream timeout/availability codes
    if (response.status === 504 || response.status === 503 || response.status === 502) {
      const errorText = await response.text().catch(() => '');
      console.warn(`[Tol Search] Upstream unavailable (${response.status}) for "${searchQuery}"`, errorText.slice(0, 200));
      return new Response(
        JSON.stringify({ imageUrl: null, source: 'DDG/Tol', score: 0, searchQuery, _version: VERSION }),
        { headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
      );
    }

    if (!response.ok) {
      const errorText = await response.text();
      console.error(`[Tol Search] API error: ${response.status} - ${errorText}`);
      return new Response(
        JSON.stringify({ error: `DDG API error: ${response.status}`, _version: VERSION }),
        { status: 500, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
      );
    }

    const data = await response.json();
    const { imageUrl, score } = extractBestImage(data);

    console.log(`[Tol Search] Found image for "${searchQuery}": ${imageUrl ? 'YES' : 'NO'} (score: ${score})`);

    // STEP 3: Save successful result to cache
    if (supabase && imageUrl) {
      saveToCache(supabase, searchQuery, imageUrl, 'DDG/Tol').catch(() => {});
    }

    return new Response(
      JSON.stringify({
        imageUrl,
        source: 'DDG/Tol',
        score,
        searchQuery, // Include the actual query used for debugging
        _version: VERSION,
      }),
      { headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
    );

  } catch (error) {
    console.error('[Tol Search] Error:', error);
    return new Response(
      JSON.stringify({ error: error instanceof Error ? error.message : 'Unknown error', _version: VERSION }),
      { status: 500, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
    );
  }
});
