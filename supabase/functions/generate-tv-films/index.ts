import "jsr:@supabase/functions-js/edge-runtime.d.ts";
import { createClient } from "https://esm.sh/@supabase/supabase-js@2";

const corsHeaders = {
  "Access-Control-Allow-Origin": "*",
  "Access-Control-Allow-Headers":
    "authorization, x-client-info, apikey, content-type, x-supabase-client-platform, x-supabase-client-platform-version, x-supabase-client-runtime, x-supabase-client-runtime-version",
};

const LANG_NAME: Record<string, string> = {
  nl: "Dutch",
  en: "English",
  de: "German",
  fr: "French",
};

const TTL_MS = 1000 * 60 * 60 * 24 * 30; // 30 days

function buildCacheKey(
  startYear: number,
  endYear: number,
  city: string,
  language: string,
): string {
  const normCity = (city || "").toLowerCase().trim().replace(/\s+/g, " ");
  const normLang = (language || "nl").toLowerCase().trim();
  return `${startYear}-${endYear}::${normCity}::${normLang}`;
}

Deno.serve(async (req) => {
  if (req.method === "OPTIONS") {
    return new Response(null, { headers: corsHeaders });
  }

  try {
    const { startYear, endYear, city, language } = await req.json();

    if (!startYear || !endYear) {
      return new Response(
        JSON.stringify({ error: "Missing startYear or endYear" }),
        { status: 400, headers: { ...corsHeaders, "Content-Type": "application/json" } }
      );
    }

    const lang = (language as string) || "nl";
    const langName = LANG_NAME[lang] || "Dutch";

    const supabaseUrl = Deno.env.get("SUPABASE_URL");
    const supabaseServiceKey = Deno.env.get("SUPABASE_SERVICE_ROLE_KEY");
    const supabase =
      supabaseUrl && supabaseServiceKey
        ? createClient(supabaseUrl, supabaseServiceKey)
        : null;

    const cacheKey = buildCacheKey(startYear, endYear, city || "", lang);

    // ───── 1. Cache lookup ─────────────────────────────────────────
    if (supabase) {
      try {
        const { data: cached } = await supabase
          .from("tvfilm_overview_cache")
          .select("country, items, cached_at")
          .eq("cache_key", cacheKey)
          .maybeSingle();

        if (cached) {
          const age = Date.now() - new Date(cached.cached_at as string).getTime();
          if (age < TTL_MS) {
            // Fire-and-forget bump.
            (supabase.from("tvfilm_overview_cache") as any)
              .update({ last_accessed: new Date().toISOString() })
              .eq("cache_key", cacheKey)
              .then(() => {});

            console.log(`[generate-tv-films] cache hit: ${cacheKey}`);
            return new Response(
              JSON.stringify({
                country: cached.country,
                items: cached.items,
                cached: true,
              }),
              { headers: { ...corsHeaders, "Content-Type": "application/json" } },
            );
          }
          console.log(`[generate-tv-films] cache stale, refetching: ${cacheKey}`);
        }
      } catch (e) {
        console.warn("[generate-tv-films] cache lookup failed:", e);
      }
    }

    const LOVABLE_API_KEY = Deno.env.get("LOVABLE_API_KEY");
    if (!LOVABLE_API_KEY) throw new Error("LOVABLE_API_KEY is not configured");

    const cityContext = city
      ? `The user lives in "${city}". Determine the country (use the ${langName} name of the country in the "country" field) and provide a mix of international blockbusters AND local/national productions popular in that country.`
      : `Provide the most iconic international TV series and films per year.`;

    const prompt = `You are a film and TV expert. ${cityContext}

For each year from ${startYear} to ${endYear} provide EXACTLY 5 items: a mix of TV series and films that were popular/iconic that year.

CRITICAL: Write all "title" and "description" fields and the "country" field in ${langName}. Original film/show titles may stay in their original language if that is how they are known internationally, but descriptions MUST be in ${langName}.

Respond ONLY with a JSON object, no other text:
{"country":"${city ? `country name in ${langName}` : 'International'}","items":{"${startYear}":[{"title":"Title","type":"film","description":"Short ${langName} description"}]}}

type is "film" or "tv". All years from ${startYear} to ${endYear}. Exactly 5 items per year. JSON only.`;

    const response = await fetch("https://ai.gateway.lovable.dev/v1/chat/completions", {
      method: "POST",
      headers: {
        Authorization: `Bearer ${LOVABLE_API_KEY}`,
        "Content-Type": "application/json",
      },
      body: JSON.stringify({
        model: "google/gemini-2.5-flash-lite",
        messages: [{ role: "user", content: prompt }],
        temperature: 0.7,
      }),
    });

    if (!response.ok) {
      const errorText = await response.text();
      console.error("AI API error:", errorText);
      throw new Error(`AI API returned ${response.status}`);
    }

    const data = await response.json();
    const content = data.choices?.[0]?.message?.content || "";

    let jsonStr = content;
    const jsonMatch = content.match(/```(?:json)?\s*([\s\S]*?)```/);
    if (jsonMatch) {
      jsonStr = jsonMatch[1].trim();
    }

    // Sanitize: strip raw control characters (newlines/tabs inside strings) that break JSON.parse
    const sanitize = (s: string) =>
      s.replace(/[\u0000-\u001F]+/g, (m) => (m.includes("\n") || m.includes("\r") || m.includes("\t") ? " " : ""));

    let parsed;
    try {
      parsed = JSON.parse(jsonStr);
    } catch (e) {
      console.warn("Initial JSON.parse failed, retrying after sanitize:", (e as Error).message);
      parsed = JSON.parse(sanitize(jsonStr));
    }

    // ───── 2. Cache write (fire-and-forget) ──────────────────────
    if (supabase && parsed?.items) {
      (supabase.from("tvfilm_overview_cache") as any)
        .upsert(
          {
            cache_key: cacheKey,
            start_year: startYear,
            end_year: endYear,
            city: city || "",
            language: lang,
            country: parsed.country ?? null,
            items: parsed.items,
            cached_at: new Date().toISOString(),
            last_accessed: new Date().toISOString(),
          },
          { onConflict: "cache_key" },
        )
        .then(() => {});
    }

    return new Response(JSON.stringify(parsed), {
      headers: { ...corsHeaders, "Content-Type": "application/json" },
    });
  } catch (error) {
    console.error("Error generating TV/films:", error);
    return new Response(
      JSON.stringify({ error: (error as Error).message }),
      { status: 500, headers: { ...corsHeaders, "Content-Type": "application/json" } }
    );
  }
});
