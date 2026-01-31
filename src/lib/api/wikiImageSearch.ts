/**
 * Client-side Wikipedia/Wikimedia image search
 * * SIMPLIFIED "TRAFFIC CONTROLLER" VERSION:
 * - Uses 'visualSubjectType' to strictly route to the correct DB.
 * - Allows SVGs for Logos/Products.
 */

const THUMB_WIDTH = 960;

// Search trace entry for debugging
export interface SearchTraceEntry {
  source: string;           // e.g., "Spotify", "TMDB Movie", "Commons NL", "Wiki EN"
  query: string;            // The actual query used
  withYear: boolean;        // Whether year was included
  result: 'found' | 'not_found' | 'error';
  timestamp: number;        // ms since start
}

export interface ImageResult {
  eventId: string;
  imageUrl: string | null;
  source: string | null;
  searchTrace?: SearchTraceEntry[];  // NEW: Detailed search log
}

export interface SearchQuery {
  eventId: string;
  query: string;
  queryEn?: string;
  year?: number;
  isCelebrity?: boolean;
  isMovie?: boolean;
  isTV?: boolean; // NEW: Explicit TV show flag
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
// 3. VOEG DEZE NIEUWE FUNCTIE TOE (Voor het strippen van "jaren 80")
function stripDecades(query: string): string {
  return query
    .replace(/\b(19|20)\d{2}s?\b/gi, "") // Matches 1980, 1980s
    .replace(/\b\d{2}s\b/gi, "") // Matches 80s, 90s
    .replace(/\bjaren\s+\d{2,4}\b/gi, "") // Matches "jaren 80"
    .replace(/\bdecade\b/gi, "")
    .replace(/\s+/g, " ")
    .trim();
}

// Opschonen voor TMDB (haalt jaartallen en haakjes weg)
// function cleanQueryForTMDB(query: string): string {
//  return query.replace(/\b\d{4}\b/g, '').replace(/[()]/g, '').trim();
// }

// 4. PAS cleanQueryForTMDB AAN (Gebruik nu stripDecades)
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
      // === VOEG DIT BLOK TOE ===
      // Dit zorgt dat PDF's en video's direct worden genegeerd op basis van hun titel
      if (result.title.match(/\.(pdf|djvu|stl|ogg|ogv|oga|mp3|wav|flac|webm|mp4|avi|mov|mkv|svg|tif|tiff)$/i)) {
        continue;
      }
      // ========================

      // Voor products/logos: minder strenge matching ...
      if (strictMatch && !contentMatchesQuery(result.title, result.snippet, query)) continue;
      if (!strictMatch) {
        // Losse check: minstens het eerste significante woord moet ergens voorkomen
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
        // Correcte source URL voor Commons vs Wikipedia
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

// API wrappers (strictMatch = false voor products/logos)
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

// Spotify Album Art Wrapper - Returns album artwork from Spotify
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

    if (!response.ok) {
      console.log(`[Spotify Art] Search failed: ${response.status}`);
      return { eventId, imageUrl: null, source: null };
    }

    const data = await response.json();

    if (data.albumImage && data.trackId) {
      console.log(`[Spotify Art] Found album art for "${data.trackName}" by ${data.artistName}`);
      return {
        eventId,
        imageUrl: data.albumImage,
        source: data.spotifyUrl || `https://open.spotify.com/track/${data.trackId}`,
      };
    }

    console.log(`[Spotify Art] No album art found for: "${spotifyQuery}"`);
    return { eventId, imageUrl: null, source: null };
  } catch (err) {
    console.error("[Spotify Art] Error:", err);
    return { eventId, imageUrl: null, source: null };
  }
}

// TMDB Wrapper - now supports both movies and TV shows
async function searchTMDB(
  eventId: string,
  query: string,
  type: "person" | "movie" | "tv",
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
            isTV: type === "tv", // NEW: Pass TV flag to edge function
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
  isTV?: boolean, // NEW: Explicit TV show flag
): Promise<ImageResult> {
  let enQuery = queryEn || query;
  let type = visualSubjectType;
  
  // Search trace for debugging
  const searchTrace: SearchTraceEntry[] = [];
  const startTime = Date.now();
  
  const addTrace = (source: string, searchQuery: string, withYear: boolean, result: 'found' | 'not_found' | 'error') => {
    searchTrace.push({
      source,
      query: searchQuery,
      withYear,
      result,
      timestamp: Date.now() - startTime
    });
  };

  // Determine if this is a music event
  const musicEvent = isMusic || category === "music";

  // FALLBACK: Als visualSubjectType ontbreekt (oude cache?), gokken we op basis van categorie
  // BELANGRIJK: entertainment ≠ movie! Games zijn ook entertainment maar moeten naar Commons
  if (!type) {
    if (isCelebrity || musicEvent || category === "celebrity") type = "person";
    else if (isTV)
      type = "tv"; // Explicit TV show flag takes precedence
    else if (isMovie)
      type = "movie"; // Alleen als expliciet isMovie=true
    else if (category === "technology" || category === "science" || category === "entertainment") type = "product";
    else type = "event";
  }

  // Helper to return result with trace
  const withTrace = (result: ImageResult): ImageResult => ({
    ...result,
    searchTrace
  });

  // ========== MUSIC EVENTS: SPOTIFY ALBUM ART FIRST ==========
  // Voor muziek-events proberen we eerst Spotify album artwork te halen
  // Dit is betrouwbaarder dan TMDB/Wikipedia voor muziek-gerelateerde afbeeldingen
  if (musicEvent && spotifySearchQuery) {
    console.log(`[Image Router] Music event detected, trying Spotify first for: "${spotifySearchQuery}"`);
    const spotifyResult = await searchSpotifyAlbumArt(eventId, spotifySearchQuery);
    addTrace('🎵 Spotify Album Art', spotifySearchQuery, false, spotifyResult.imageUrl ? 'found' : 'not_found');
    if (spotifyResult.imageUrl) {
      console.log(`[Image Router] ✓ Spotify album art found!`);
      return withTrace(spotifyResult);
    }
    console.log(`[Image Router] Spotify failed, falling back to other sources...`);
  }

  // ROUTING LOGICA
  // 1. TV Shows -> TMDB TV API ONLY (no fallback to movies)
  if (type === "tv" || isTV) {
    console.log(`[Image Router] TV show detected, using TMDB TV API for: "${enQuery}"`);
    const tvResult = await searchTMDB(eventId, enQuery, "tv", year);
    addTrace('📺 TMDB TV', cleanQueryForTMDB(enQuery), !!year, tvResult.imageUrl ? 'found' : 'not_found');
    if (tvResult.imageUrl) return withTrace(tvResult);
    // Fallback to Wikipedia/Commons for TV shows not in TMDB
  }

  // 2. Films -> TMDB Movie API ONLY (no fallback to TV)
  if (type === "movie" && !isTV) {
    console.log(`[Image Router] Movie detected, using TMDB Movie API for: "${enQuery}"`);
    const movieResult = await searchTMDB(eventId, enQuery, "movie", year);
    addTrace('🎬 TMDB Movie', cleanQueryForTMDB(enQuery), !!year, movieResult.imageUrl ? 'found' : 'not_found');
    return withTrace(movieResult);
  }

  // 2. Personen & Muziek -> TMDB Person (veel betere kwaliteit dan Wiki)
  if (type === "person") {
    const res = await searchTMDB(eventId, enQuery, "person", undefined, musicEvent, spotifySearchQuery);
    addTrace('👤 TMDB Person', cleanQueryForTMDB(enQuery), false, res.imageUrl ? 'found' : 'not_found');
    if (res.imageUrl) return withTrace(res);

    // Voor muziek: probeer ook alleen de artiest (eerste deel voor " - " of spotifySearchQuery)
    if (musicEvent && spotifySearchQuery) {
      const artistOnly = spotifySearchQuery.split(" - ")[0]?.trim();
      if (artistOnly && artistOnly !== enQuery) {
        const artistRes = await searchTMDB(eventId, artistOnly, "person", undefined, true, artistOnly);
        addTrace('👤 TMDB Artist Only', artistOnly, false, artistRes.imageUrl ? 'found' : 'not_found');
        if (artistRes.imageUrl) return withTrace(artistRes);
      }
    }

    // Fallback 1: Commons ZONDER jaartal (voor royalty, politici, etc. die niet in TMDB staan)
    const commonsRes = await commons(enQuery, undefined, false, false);
    addTrace('🖼️ Commons (EN)', enQuery, false, commonsRes ? 'found' : 'not_found');
    if (commonsRes) return withTrace({ eventId, ...commonsRes });

    // Fallback 2: EN Wikipedia ZONDER jaartal
    const wikiEnRes = await wiki("en", enQuery, undefined, false);
    addTrace('📖 Wikipedia EN', enQuery, false, wikiEnRes ? 'found' : 'not_found');
    if (wikiEnRes) return withTrace({ eventId, ...wikiEnRes });

    // Fallback 3: NL Wikipedia (voor lokale bekende personen)
    const wikiNlRes = await wiki("nl", query, undefined, false);
    addTrace('📖 Wikipedia NL', query, false, wikiNlRes ? 'found' : 'not_found');
    if (wikiNlRes) return withTrace({ eventId, ...wikiNlRes });
    
    return withTrace({ eventId, imageUrl: null, source: null });
  }

  // 3. Producten, Logos, Games, Lifestyle -> Commons (Met SVG support!)
  // GEEN JAARTAL gebruiken voor games/logos/producten/lifestyle - alleen titel!
  const isGameOrProduct = type === "product" || type === "logo" || type === "artwork" || type === "lifestyle";

  if (isGameOrProduct) {
    // Voor products: gebruik LOSSE matching (strict = false) - eerste woord moet matchen
    // Probeer EERST zonder SVG (echte afbeeldingen hebben voorkeur)
    let res = await commons(enQuery, undefined, false, false);
    addTrace('🖼️ Commons (EN)', enQuery, false, res ? 'found' : 'not_found');
    if (res) return withTrace({ eventId, ...res });

    // Probeer ook Nederlandse query op Commons
    res = await commons(query, undefined, false, false);
    addTrace('🖼️ Commons (NL)', query, false, res ? 'found' : 'not_found');
    if (res) return withTrace({ eventId, ...res });

    res = await wiki("en", enQuery, undefined, false, false);
    addTrace('📖 Wikipedia EN', enQuery, false, res ? 'found' : 'not_found');
    if (res) return withTrace({ eventId, ...res });

    res = await wiki("nl", query, undefined, false, false);
    addTrace('📖 Wikipedia NL', query, false, res ? 'found' : 'not_found');
    if (res) return withTrace({ eventId, ...res });

    // FALLBACK: Als geen echte afbeelding, probeer met SVG
    res = await commons(enQuery, undefined, true, false);
    addTrace('🖼️ Commons (EN) +SVG', enQuery, false, res ? 'found' : 'not_found');
    if (res) return withTrace({ eventId, ...res });

    res = await wiki("en", enQuery, undefined, true, false);
    addTrace('📖 Wikipedia EN +SVG', enQuery, false, res ? 'found' : 'not_found');
    if (res) return withTrace({ eventId, ...res });

    // Geen resultaat gevonden voor game/product
    return withTrace({ eventId, imageUrl: null, source: null });
  }

  // 4. Events & Locaties & Overig
  // NL-prioriteit voor:
  // - Lokale/politieke/culturele events (category check)
  // - visualSubjectType === "culture" of "location" (bijv. Sinterklaas, Nederlandse tradities)
  const isLocal = 
    category === "local" || 
    category === "politics" || 
    category === "culture" ||
    type === "culture" ||
    type === "location";

  if (isLocal) {
    // Probeer Nationaal Archief alleen als het "Lokaal/Politiek" is
    if (category === "local" || category === "politics") {
      const res = await nationaal(query, year);
      addTrace('🏛️ Nationaal Archief', query, !!year, res ? 'found' : 'not_found');
      if (res) return withTrace({ eventId, ...res });
    }

    // Voor LOKALE/CULTURELE events: zoek EERST met Nederlandse query op Commons/Wiki
    // Dit voorkomt dat "Bijlmer disaster memorial, Jerusalem" wordt gevonden ipv "Bijlmerramp"
    // Fase 1: NL query met jaar
    let res = await commons(query, year);
    addTrace('🖼️ Commons (NL)', query, true, res ? 'found' : 'not_found');
    if (res) return withTrace({ eventId, ...res });
    
    res = await wiki("nl", query, year);
    addTrace('📖 Wikipedia NL', query, true, res ? 'found' : 'not_found');
    if (res) return withTrace({ eventId, ...res });
    
    res = await commons(enQuery, year);
    addTrace('🖼️ Commons (EN)', enQuery, true, res ? 'found' : 'not_found');
    if (res) return withTrace({ eventId, ...res });
    
    res = await wiki("en", enQuery, year);
    addTrace('📖 Wikipedia EN', enQuery, true, res ? 'found' : 'not_found');
    if (res) return withTrace({ eventId, ...res });

    // Fase 2: NL query zonder jaar
    res = await commons(query, undefined);
    addTrace('🖼️ Commons (NL)', query, false, res ? 'found' : 'not_found');
    if (res) return withTrace({ eventId, ...res });
    
    res = await wiki("nl", query, undefined);
    addTrace('📖 Wikipedia NL', query, false, res ? 'found' : 'not_found');
    if (res) return withTrace({ eventId, ...res });
    
    res = await commons(enQuery, undefined);
    addTrace('🖼️ Commons (EN)', enQuery, false, res ? 'found' : 'not_found');
    if (res) return withTrace({ eventId, ...res });
    
    res = await wiki("en", enQuery, undefined);
    addTrace('📖 Wikipedia EN', enQuery, false, res ? 'found' : 'not_found');
    if (res) return withTrace({ eventId, ...res });

    return withTrace({ eventId, imageUrl: null, source: null });
  }

  // Standaard volgorde voor INTERNATIONALE events: EN query eerst (beste resultaten)
  // Probeer EERST met jaartal
  let res = await commons(enQuery, year);
  addTrace('🖼️ Commons (EN)', enQuery, true, res ? 'found' : 'not_found');
  if (res) return withTrace({ eventId, ...res });
  
  res = await wiki("en", enQuery, year);
  addTrace('📖 Wikipedia EN', enQuery, true, res ? 'found' : 'not_found');
  if (res) return withTrace({ eventId, ...res });
  
  res = await wiki("nl", query, year);
  addTrace('📖 Wikipedia NL', query, true, res ? 'found' : 'not_found');
  if (res) return withTrace({ eventId, ...res });

  // FALLBACK: Probeer Commons en Wiki ZONDER jaartal (veel events hebben geen jaar in de titel)
  res = await commons(enQuery, undefined);
  addTrace('🖼️ Commons (EN)', enQuery, false, res ? 'found' : 'not_found');
  if (res) return withTrace({ eventId, ...res });
  
  res = await wiki("en", enQuery, undefined);
  addTrace('📖 Wikipedia EN', enQuery, false, res ? 'found' : 'not_found');
  if (res) return withTrace({ eventId, ...res });
  
  res = await wiki("nl", query, undefined);
  addTrace('📖 Wikipedia NL', query, false, res ? 'found' : 'not_found');
  if (res) return withTrace({ eventId, ...res });

  return withTrace({ eventId, imageUrl: null, source: null });
}

export async function searchImagesClientSide(queries: SearchQuery[]): Promise<ImageResult[]> {
  return [];
}
