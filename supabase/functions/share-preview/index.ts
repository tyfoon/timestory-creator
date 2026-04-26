/**
 * share-preview — serve per-story Open Graph + Twitter Card metadata.
 *
 * URL pattern (via Lovable's proxy on the branded domain):
 *   https://hetjaarvan.nl/functions/v1/share-preview/<storyId>
 * or directly via Supabase:
 *   https://<project>.functions.supabase.co/share-preview/<storyId>
 *
 * Behavior:
 *   - Social scrapers (Twitter, Facebook, WhatsApp, LinkedIn, Slack,
 *     Telegram, Discord, Pinterest, Mastodon, Google, Bing) receive a
 *     small HTML document with per-story og:title / og:description and
 *     a meta-refresh fallback to /s/:id (so a scraper that *does*
 *     follow up renders the SPA).
 *   - Real users (any UA without scraper match) get an immediate 302
 *     to /s/:id — the SPA stays the source of truth for the actual
 *     viewing experience.
 *
 * Privacy: og-titles are deterministic — derived from the year-range
 * of the story's events, not from the user's name, city, or any other
 * personal field. Format example: "Mijn jaren 80" / "My years 1985-1992".
 *
 * No JWT verification: this endpoint is intended to be public-fetchable
 * by anonymous scrapers.
 */

import { serve } from "https://deno.land/std@0.177.0/http/server.ts";
import { createClient } from "https://esm.sh/@supabase/supabase-js@2";

const PUBLIC_DOMAIN = "https://hetjaarvan.nl";

// ─── Scraper detection ──────────────────────────────────────────────────────

const SCRAPER_PATTERNS: RegExp[] = [
  /Twitterbot/i,
  /facebookexternalhit/i,
  /Facebot/i,
  /LinkedInBot/i,
  /Slackbot/i,
  /WhatsApp/i,
  /TelegramBot/i,
  /Discordbot/i,
  /Pinterest/i,
  /SkypeUriPreview/i,
  /Mastodon/i,
  /Mattermost/i,
  /Microsoft-Office/i,           // Outlook link previews
  /Embedly/i,
  /redditbot/i,
  /Googlebot/i,
  /Bingbot/i,
  /DuckDuckBot/i,
  /YandexBot/i,
  /Applebot/i,
];

function isScraperUA(ua: string | null): boolean {
  if (!ua) return false;
  return SCRAPER_PATTERNS.some((rx) => rx.test(ua));
}

// ─── Story → year range → og:title ──────────────────────────────────────────

interface StoryEvent {
  year: number;
}

interface StoryRow {
  content: { events?: StoryEvent[]; storyTitle?: string } | null;
  settings: { language?: string } | null;
  is_public: boolean;
}

function pickYearRange(events: StoryEvent[] | undefined): { start: number; end: number } | null {
  if (!events || events.length === 0) return null;
  const years = events.map((e) => Number(e.year)).filter((y) => Number.isFinite(y) && y > 0);
  if (years.length === 0) return null;
  return { start: Math.min(...years), end: Math.max(...years) };
}

type Lang = "nl" | "en" | "de" | "fr";

function pickLanguage(stored: string | undefined, acceptLang: string | null): Lang {
  const candidates: string[] = [];
  if (stored) candidates.push(stored.toLowerCase());
  if (acceptLang) {
    for (const part of acceptLang.split(",")) {
      const tag = part.trim().split(";")[0].toLowerCase();
      if (tag) candidates.push(tag);
    }
  }
  for (const c of candidates) {
    if (c.startsWith("nl")) return "nl";
    if (c.startsWith("en")) return "en";
    if (c.startsWith("de")) return "de";
    if (c.startsWith("fr")) return "fr";
  }
  return "nl";
}

function decadeLabel(year: number, lang: Lang): string {
  // floor to start of decade — 1985 → 80, 2003 → 00, 2017 → 10
  const dec = Math.floor((year % 100) / 10) * 10;
  const decStr = dec.toString().padStart(2, "0");
  switch (lang) {
    case "en":
      return year >= 2000 ? `${Math.floor(year / 10) * 10}s` : `${decStr}s`;
    case "de":
      return `${decStr}er Jahren`;
    case "fr":
      return year >= 2000 ? `années ${Math.floor(year / 10) * 10}` : `années ${decStr}`;
    case "nl":
    default:
      return year >= 2000 ? `jaren ${Math.floor(year / 10) * 10}` : `jaren ${decStr}`;
  }
}

function buildTitle(range: { start: number; end: number } | null, lang: Lang, brand: string): {
  title: string;
  description: string;
} {
  const T: Record<Lang, { single: (y: number) => string; decade: (label: string) => string; range: (s: number, e: number) => string; descLong: string; descShort: string; brandSuffix: string }> = {
    nl: {
      single: (y) => `Mijn jaar ${y}`,
      decade: (label) => `Mijn ${label}`,
      range: (s, e) => `Mijn jaren ${s}–${e}`,
      descLong: "Een persoonlijke tijdlijn met events, muziek en herinneringen uit deze periode.",
      descShort: "Een persoonlijke tijdlijn.",
      brandSuffix: "Het jaar van",
    },
    en: {
      single: (y) => `My year ${y}`,
      decade: (label) => `My ${label}`,
      range: (s, e) => `My years ${s}–${e}`,
      descLong: "A personal timeline with events, music and memories from this period.",
      descShort: "A personal timeline.",
      brandSuffix: "Het jaar van",
    },
    de: {
      single: (y) => `Mein Jahr ${y}`,
      decade: (label) => `Meine ${label}`,
      range: (s, e) => `Meine Jahre ${s}–${e}`,
      descLong: "Eine persönliche Zeitleiste mit Ereignissen, Musik und Erinnerungen aus dieser Zeit.",
      descShort: "Eine persönliche Zeitleiste.",
      brandSuffix: "Het jaar van",
    },
    fr: {
      single: (y) => `Mon année ${y}`,
      decade: (label) => `Mes ${label}`,
      range: (s, e) => `Mes années ${s}–${e}`,
      descLong: "Une chronologie personnelle avec des événements, de la musique et des souvenirs de cette période.",
      descShort: "Une chronologie personnelle.",
      brandSuffix: "Het jaar van",
    },
  };

  const tpl = T[lang];

  let title: string;
  if (!range) {
    title = brand;
  } else if (range.start === range.end) {
    title = tpl.single(range.start);
  } else {
    const startDec = Math.floor(range.start / 10);
    const endDec = Math.floor(range.end / 10);
    if (startDec === endDec) {
      title = tpl.decade(decadeLabel(range.start, lang));
    } else {
      title = tpl.range(range.start, range.end);
    }
  }

  return {
    title: `${title} — ${tpl.brandSuffix}`,
    description: tpl.descLong,
  };
}

// ─── HTML rendering ─────────────────────────────────────────────────────────

function escapeHtml(s: string): string {
  return s
    .replace(/&/g, "&amp;")
    .replace(/</g, "&lt;")
    .replace(/>/g, "&gt;")
    .replace(/"/g, "&quot;")
    .replace(/'/g, "&#39;");
}

function htmlOgLocale(lang: Lang): string {
  switch (lang) {
    case "en": return "en_US";
    case "de": return "de_DE";
    case "fr": return "fr_FR";
    case "nl":
    default: return "nl_NL";
  }
}

function renderHtml(
  storyId: string,
  title: string,
  description: string,
  lang: Lang,
): string {
  const canonical = `${PUBLIC_DOMAIN}/s/${storyId}`;
  const ogImage = `${PUBLIC_DOMAIN}/og-image.png`;
  const safeTitle = escapeHtml(title);
  const safeDescription = escapeHtml(description);

  return `<!doctype html>
<html lang="${lang}">
  <head>
    <meta charset="UTF-8" />
    <meta name="viewport" content="width=device-width, initial-scale=1.0" />
    <title>${safeTitle}</title>
    <meta name="description" content="${safeDescription}" />
    <meta name="robots" content="noindex,follow" />
    <link rel="canonical" href="${canonical}" />

    <meta property="og:type" content="article" />
    <meta property="og:site_name" content="Het jaar van" />
    <meta property="og:locale" content="${htmlOgLocale(lang)}" />
    <meta property="og:title" content="${safeTitle}" />
    <meta property="og:description" content="${safeDescription}" />
    <meta property="og:url" content="${canonical}" />
    <meta property="og:image" content="${ogImage}" />
    <meta property="og:image:width" content="1200" />
    <meta property="og:image:height" content="630" />
    <meta property="og:image:alt" content="${safeTitle}" />

    <meta name="twitter:card" content="summary_large_image" />
    <meta name="twitter:title" content="${safeTitle}" />
    <meta name="twitter:description" content="${safeDescription}" />
    <meta name="twitter:image" content="${ogImage}" />
    <meta name="twitter:image:alt" content="${safeTitle}" />

    <!-- Fallback for any non-scraper that lands here despite UA detection. -->
    <meta http-equiv="refresh" content="0; url=${canonical}" />
  </head>
  <body>
    <p>Redirecting to <a href="${canonical}">${safeTitle}</a>…</p>
    <script>window.location.replace(${JSON.stringify(canonical)});</script>
  </body>
</html>`;
}

// ─── Handler ────────────────────────────────────────────────────────────────

const corsHeaders = {
  "Access-Control-Allow-Origin": "*",
  "Access-Control-Allow-Headers": "authorization, x-client-info, apikey, content-type",
};

serve(async (req) => {
  if (req.method === "OPTIONS") {
    return new Response(null, { headers: corsHeaders });
  }

  try {
    // Extract storyId from the URL. Supabase routes
    // `/functions/v1/share-preview/<id>` to this function with the trailing
    // segment(s) preserved on req.url. Take the LAST non-empty path segment.
    const url = new URL(req.url);
    const segments = url.pathname.split("/").filter(Boolean);
    const storyId = segments[segments.length - 1] || "";

    // Basic UUID-ish validation — refuse weird IDs upfront so we don't
    // hammer the DB with crawler garbage.
    if (!/^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$/i.test(storyId)) {
      return new Response("Not found", { status: 404, headers: corsHeaders });
    }

    const ua = req.headers.get("User-Agent");
    const isScraper = isScraperUA(ua);

    // Real user → straight to the SPA, no DB roundtrip needed.
    if (!isScraper) {
      return Response.redirect(`${PUBLIC_DOMAIN}/s/${storyId}`, 302);
    }

    // Scraper path: query the story, render dynamic og-tags.
    const supabaseUrl = Deno.env.get("SUPABASE_URL");
    const supabaseAnonKey = Deno.env.get("SUPABASE_ANON_KEY");
    if (!supabaseUrl || !supabaseAnonKey) {
      // Without DB access, fall back to brand-default tags rather than 500 —
      // a scraper failing to scrape gets a generic preview instead of nothing.
      const html = renderHtml(storyId, "Het jaar van", "Een persoonlijke tijdlijn.", "nl");
      return new Response(html, {
        headers: { ...corsHeaders, "Content-Type": "text/html; charset=utf-8" },
      });
    }

    const supabase = createClient(supabaseUrl, supabaseAnonKey);
    const { data, error } = await supabase
      .from("saved_stories")
      .select("content, settings, is_public")
      .eq("id", storyId)
      .maybeSingle<StoryRow>();

    if (error) {
      console.error("[share-preview] DB error:", error.message);
      const html = renderHtml(storyId, "Het jaar van", "Een persoonlijke tijdlijn.", "nl");
      return new Response(html, {
        headers: { ...corsHeaders, "Content-Type": "text/html; charset=utf-8" },
      });
    }

    if (!data || !data.is_public) {
      // Non-public or missing — return 404 to scrapers so they don't index a
      // generic preview against an invalid id.
      return new Response("Not found", { status: 404, headers: corsHeaders });
    }

    const lang = pickLanguage(data.settings?.language, req.headers.get("Accept-Language"));
    const range = pickYearRange(data.content?.events);
    const { title, description } = buildTitle(range, lang, "Het jaar van");

    const html = renderHtml(storyId, title, description, lang);
    return new Response(html, {
      headers: {
        ...corsHeaders,
        "Content-Type": "text/html; charset=utf-8",
        // Cache for a minute on the edge so repeated scraper hits don't
        // re-query the DB. Stories are immutable post-save so safe to cache.
        "Cache-Control": "public, max-age=60, s-maxage=300",
      },
    });
  } catch (err) {
    console.error("[share-preview] unexpected error:", err);
    return new Response("Internal error", { status: 500, headers: corsHeaders });
  }
});
