/**
 * Client-side Wikipedia/Wikimedia image search
 * * SIMPLIFIED "TRAFFIC CONTROLLER" VERSION:
 * - Uses 'visualSubjectType' to strictly route to the correct DB.
 * - Allows SVGs for Logos/Products.
 * - Blocks PDFs/Audio/Video by Title.
 */

const THUMB_WIDTH = 960;

export interface ImageResult {
  eventId: string;
  imageUrl: string | null;
  source: string | null;
}

export interface SearchQuery {
  eventId: string;
  query: string;
  queryEn?: string;
  year?: number;
  isCelebrity?: boolean;
  isMovie?: boolean;
  isMusic?: boolean;
  spotifySearchQuery?: string;
  category?: string;
  visualSubjectType?: string;
}

function isAllowedImageUrl(maybeUrl: string, allowSvg: boolean = false): boolean {
  try {
    const url = new URL(maybeUrl);
    const path = url.pathname.toLowerCase();
    const fullUrl = maybeUrl.toLowerCase();

    // Blokkeer transcoded content
    if (path.includes("/transcoded/")) return false;

    // Blokkeer audio/video/pdf bestanden - ook als ze ergens in het pad zitten
    const blockedExtensions = /\.(mp3|ogg|wav|webm|mp4|ogv|pdf|tif|tiff|flac|aac|m4a|oga)$/;
    if (path.match(blockedExtensions)) return false;

    // Extra check: blokkeer URLs die naar PDF/audio lijken te verwijzen
    if (fullUrl.includes("/pdf/") || (fullUrl.includes("file:") && fullUrl.includes(".pdf"))) return false;

    // SVG alleen toestaan als expliciet gevraagd (voor logos/producten)
    if (path.endsWith(".svg") && !allowSvg) return false;

    return path.match(/\.(jpg|jpeg|png|webp|gif|svg)$/) !== null;
  } catch {
    return false;
  }
}

function stripDecades(query: string): string {
  return query
    .replace(/\b(19|20)\d{2}s?\b/gi, "")
    .replace(/\b\d{2}s\b/gi, "")
    .replace(/\bjaren\s+\d{2,4}\b/gi, "")
    .replace(/\bdecade\b/gi, "")
    .replace(/\s+/g, " ")
    .trim();
}

function cleanQueryForTMDB(query: string): string {
  return stripDecades(query).replace(/[()]/g, "").trim();
}

// Simpele check of woorden matchen
function contentMatchesQuery(title: string, snippet: string | undefined, query: string): boolean {
  const normalize = (s: string) =>
    s
      .toLowerCase()
      .normalize("NFD")
      .replace(/[\u0300-\u036f]/g, "");
  const q = normalize(query);
  const t = normalize(title);
  const s = snippet ? normalize(snippet) : "";

  // Als er 2 of minder woorden zijn, MOETEN ze in de titel staan (strenge check)
  const words = q.split(/\s+/).filter((w) => w.length > 2);
  if (words.length <= 2) {
    return words.every((w) => t.includes(w));
  }
  // Anders kijken we ook in de snippet
  return words.some((w) => t.includes(w) || s.includes(w));
}

// Generic Fetcher
async function fetchWikiResults(
  url: string,
  query: string,
  allowSvg: boolean,
  strictMatch: boolean = true,
): Promise<{ imageUrl: string; source: string } | null> {
  try {
    const res = await fetch(url);
    if (!res.ok) return null;
    const data = await res.json();

    for (const result of data.query?.search || []) {
      // === SECURITY FIX: Blokkeer PDF/Audio/Video op TITEL ===
      if (result.title.match(/\.(pdf|djvu|stl|ogg|ogv|oga|mp3|wav|flac|webm|mp4|avi|mov|mkv|svg|tif|tiff)$/i)) {
        continue;
      }

      // Voor products/logos: minder strenge matching (eerste woord moet matchen)
      if (strictMatch && !contentMatchesQuery(result.title, result.snippet, query)) continue;
      if (!strictMatch) {
        const firstWord = query
          .split(/\s+/)
          .find((w) => w.length > 2)
          ?.toLowerCase();
        const titleLower = result.title.toLowerCase();
        if (firstWord && !titleLower.includes(firstWord)) continue;
      }

      const imageUrl = `https://commons.wikimedia.org/w/api.php?action=query&titles=${encodeURIComponent(result.title)}&prop=pageimages|imageinfo&iiprop=url|thumburl&iiurlwidth=${THUMB_WIDTH}&pithumbsize=${THUMB_WIDTH}&format=json&origin=*`;
      const imgRes = await fetch(imageUrl);
      if (!imgRes.ok) continue;
      const imgData = await imgRes.json();
      const pageId = Object.keys(imgData.query?.pages || {})[0];
      if (!pageId || pageId === "-1") continue;

      const page = imgData.query.pages[pageId];
      let thumb = page.thumbnail?.source || page.imageinfo?.[0]?.thumburl || page.imageinfo?.[0]?.url;

      if (thumb && isAllowedImageUrl(thumb, allowSvg)) {
        const isCommons = url.includes("commons.wikimedia.org");
        const sourceUrl = isCommons
          ? `https://commons.wikimedia.org/wiki/${encodeURIComponent(result.title)}`
          : `https://wikipedia.org/wiki/${encodeURIComponent(result.title)}`;
        return { imageUrl: thumb, source: sourceUrl };
      }
    }
    return null;
  } catch {
    return null;
  }
}

// API wrappers
const wiki = (lang: string, q: string, y?: number, svg = false, strict = true) =>
  fetchWikiResults(
    `https://${lang}.wikipedia.org/w/api.php?action=query&list=search&srsearch=${encodeURIComponent(y ? `${q} ${y}` : q)}&format=json&origin=*`,
    q,
    svg,
    strict,
  );

const commons = (q: string, y?: number, svg = false, strict = true) =>
  fetchWikiResults(
    `https://commons.wikimedia.org/w/api.php?action=query&list=search&srsearch=${encodeURIComponent(y ? `${q} ${y}` : q)}&srnamespace=6&format=json&origin=*`,
    q,
    svg,
    strict,
  );

const nationaal = (q: string, y?: number) =>
  fetchWikiResults(
    `https://commons.wikimedia.org/w/api.php?action=query&list=search&srsearch=${encodeURIComponent(`${q} ${y || ""} Nationaal Archief`)}&srnamespace=6&format=json&origin=*`,
    q,
    false,
    true,
  );

// Spotify Album Art Wrapper
async function searchSpotifyAlbumArt(eventId: string, spotifyQuery: string): Promise<ImageResult> {
  try {
    const supabaseUrl = import.meta.env.VITE_SUPABASE_URL;
    const supabaseKey = import.meta.env.VITE_SUPABASE_PUBLISHABLE_KEY;
    if (!supabaseUrl || !supabaseKey) return { eventId, imageUrl: null, source: null };

    console.log(`[Spotify Art] Searching album art for: "${spotifyQuery}"`);

    const response = await fetch(`${supabaseUrl}/functions/v1/search-spotify`, {
      method: "POST",
      headers: { "Content-Type": "application/json", Authorization: `Bearer ${supabaseKey}`, apikey: supabaseKey },
      body: JSON.stringify({ query: spotifyQuery }),
    });

    if (!response.ok) return { eventId, imageUrl: null, source: null };
    const data = await response.json();

    if (data.albumImage && data.trackId) {
      return {
        eventId,
        imageUrl: data.albumImage,
        source: data.spotifyUrl || `https://open.spotify.com/track/${data.trackId}`,
      };
    }
    return { eventId, imageUrl: null, source: null };
  } catch (err) {
    return { eventId, imageUrl: null, source: null };
  }
}

// TMDB Wrapper
async function searchTMDB(
  eventId: string,
  query: string,
  type: "person" | "movie",
  year?: number,
  isMusic?: boolean,
  spotifySearchQuery?: string,
): Promise<ImageResult> {
  try {
    const supabaseUrl = import.meta.env.VITE_SUPABASE_URL;
    const supabaseKey = import.meta.env.VITE_SUPABASE_PUBLISHABLE_KEY;
    if (!supabaseUrl || !supabaseKey) return { eventId, imageUrl: null, source: null };

    const response = await fetch(`${supabaseUrl}/functions/v1/search-images`, {
      method: "POST",
      headers: { "Content-Type": "application/json", Authorization: `Bearer ${supabaseKey}`, apikey: supabaseKey },
      body: JSON.stringify({
        queries: [
          {
            eventId,
            query: cleanQueryForTMDB(query),
            year,
            isCelebrity: type === "person",
            isMovie: type === "movie",
            isMusic,
            spotifySearchQuery,
          },
        ],
      }),
    });
    if (!response.ok) return { eventId, imageUrl: null, source: null };
    const data = await response.json();
    return data.images?.[0]?.imageUrl ? data.images[0] : { eventId, imageUrl: null, source: null };
  } catch {
    return { eventId, imageUrl: null, source: null };
  }
}

// ============== MAIN ROUTER ==============

export async function searchSingleImage(
  eventId: string,
  query: string,
  year?: number,
  queryEn?: string,
  isCelebrity?: boolean,
  isMovie?: boolean,
  category?: string,
  visualSubjectType?: string,
  isMusic?: boolean,
  spotifySearchQuery?: string,
): Promise<ImageResult> {
  let enQuery = queryEn || query;
  let type = visualSubjectType;
  const musicEvent = isMusic || category === "music";

  // Fallback visualSubjectType logic
  if (!type) {
    if (isCelebrity || musicEvent || category === "celebrity") type = "person";
    else if (isMovie) type = "movie";
    else if (category === "technology" || category === "science" || category === "entertainment") type = "product";
    else type = "event";
  }

  // 1. MUSIC EVENTS
  if (musicEvent && spotifySearchQuery) {
    const spotifyResult = await searchSpotifyAlbumArt(eventId, spotifySearchQuery);
    if (spotifyResult.imageUrl) return spotifyResult;
  }

  // 2. FILMS & SERIES
  if (type === "movie") {
    return await searchTMDB(eventId, enQuery, "movie", year);
  }

  // 3. PERSONEN & MUZIEK
  if (type === "person") {
    const res = await searchTMDB(eventId, enQuery, "person", undefined, musicEvent, spotifySearchQuery);
    if (res.imageUrl) return res;

    if (musicEvent && spotifySearchQuery) {
      const artistOnly = spotifySearchQuery.split(" - ")[0]?.trim();
      if (artistOnly && artistOnly !== enQuery) {
        const artistRes = await searchTMDB(eventId, artistOnly, "person", undefined, true, artistOnly);
        if (artistRes.imageUrl) return artistRes;
      }
    }

    const commonsRes = await commons(enQuery, undefined, false, false);
    if (commonsRes) return { eventId, ...commonsRes };

    const wikiEnRes = await wiki("en", enQuery, undefined, false);
    if (wikiEnRes) return { eventId, ...wikiEnRes };

    const wikiNlRes = await wiki("nl", query, undefined, false);
    if (wikiNlRes) return { eventId, ...wikiNlRes };
  }

  // 4. PRODUCTEN / LOGOS / GAMES (Gebruik NL query ook op Commons!)
  const isGameOrProduct = type === "product" || type === "logo" || type === "artwork" || type === "lifestyle";

  if (isGameOrProduct) {
    let res = await commons(enQuery, undefined, false, false);
    if (res) return { eventId, ...res };

    // NIEUW: Ook Nederlandse term proberen op Commons (voor 'Oliebollen' etc.)
    res = await commons(query, undefined, false, false);
    if (res) return { eventId, ...res };

    res = await wiki("en", enQuery, undefined, false, false);
    if (res) return { eventId, ...res };

    res = await wiki("nl", query, undefined, false, false);
    if (res) return { eventId, ...res };

    // SVG Fallback
    res = await commons(enQuery, undefined, true, false);
    if (res) return { eventId, ...res };

    return { eventId, imageUrl: null, source: null };
  }

  // 5. EVENTS & LOCATIES
  const isLocal = type === "event" && (category === "local" || category === "politics");

  if (isLocal) {
    const res = await nationaal(query, year);
    if (res) return { eventId, ...res };
  }

  // NIEUWE VOLGORDE: Commons (EN + NL) -> Wiki
  const wikiPromises = [
    commons(enQuery, year),
    commons(query, year), // <--- NIEUW: Ook NL query op Commons (Oliebollen fix)
    wiki("en", enQuery, year),
    wiki("nl", query, year),
  ];

  const results = await Promise.allSettled(wikiPromises);
  for (const result of results) {
    if (result.status === "fulfilled" && result.value) return { eventId, ...result.value };
  }

  // FALLBACK
  const loosePromises = [
    commons(enQuery, undefined),
    commons(query, undefined), // <--- NIEUW: Ook hier
    wiki("en", enQuery, undefined),
    wiki("nl", query, undefined),
  ];

  const looseResults = await Promise.allSettled(loosePromises);
  for (const result of looseResults) {
    if (result.status === "fulfilled" && result.value) return { eventId, ...result.value };
  }

  return { eventId, imageUrl: null, source: null };
}

export async function searchImagesClientSide(queries: SearchQuery[]): Promise<ImageResult[]> {
  return [];
}
