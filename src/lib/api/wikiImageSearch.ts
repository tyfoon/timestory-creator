/**
 * Client-side Wikipedia/Wikimedia image search
 * * SIMPLIFIED "TRAFFIC CONTROLLER" VERSION:
 * - Uses 'visualSubjectType' to strictly route to the correct DB.
 * - Allows SVGs for Logos/Products.
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
  category?: string;
  visualSubjectType?: string; // NIEUW
}

function isAllowedImageUrl(maybeUrl: string, allowSvg: boolean = false): boolean {
  try {
    const url = new URL(maybeUrl);
    const path = url.pathname.toLowerCase();
    if (path.includes("/transcoded/")) return false;
    
    // Standaard blokkeren we audio/video
    if (path.match(/\.(mp3|ogg|wav|webm|mp4|ogv|pdf|tif|tiff)$/)) return false;

    // SVG alleen toestaan als expliciet gevraagd (voor logos/producten)
    if (path.endsWith(".svg") && !allowSvg) return false;

    return path.match(/\.(jpg|jpeg|png|webp|gif|svg)$/) !== null;
  } catch {
    return false;
  }
}

// Opschonen voor TMDB (haalt jaartallen en haakjes weg)
function cleanQueryForTMDB(query: string): string {
  return query.replace(/\b\d{4}\b/g, '').replace(/[()]/g, '').trim();
}

// Simpele check of woorden matchen
function contentMatchesQuery(title: string, snippet: string | undefined, query: string): boolean {
  const normalize = (s: string) => s.toLowerCase().normalize("NFD").replace(/[\u0300-\u036f]/g, "");
  const q = normalize(query);
  const t = normalize(title);
  const s = snippet ? normalize(snippet) : "";
  
  // Als er 2 of minder woorden zijn, MOETEN ze in de titel staan (strenge check)
  const words = q.split(/\s+/).filter(w => w.length > 2);
  if (words.length <= 2) {
    return words.every(w => t.includes(w));
  }
  // Anders kijken we ook in de snippet
  return words.some(w => t.includes(w) || s.includes(w));
}

// Generic Fetcher
async function fetchWikiResults(url: string, query: string, allowSvg: boolean): Promise<{ imageUrl: string; source: string } | null> {
  try {
    const res = await fetch(url);
    if (!res.ok) return null;
    const data = await res.json();
    
    for (const result of data.query?.search || []) {
      if (!contentMatchesQuery(result.title, result.snippet, query)) continue;
      
      const imageUrl = `https://commons.wikimedia.org/w/api.php?action=query&titles=${encodeURIComponent(result.title)}&prop=pageimages|imageinfo&iiprop=url|thumburl&iiurlwidth=${THUMB_WIDTH}&pithumbsize=${THUMB_WIDTH}&format=json&origin=*`;
      const imgRes = await fetch(imageUrl);
      if (!imgRes.ok) continue;
      const imgData = await imgRes.json();
      const pageId = Object.keys(imgData.query?.pages || {})[0];
      if (!pageId || pageId === '-1') continue;
      
      const page = imgData.query.pages[pageId];
      let thumb = page.thumbnail?.source || page.imageinfo?.[0]?.thumburl || page.imageinfo?.[0]?.url;

      if (thumb && isAllowedImageUrl(thumb, allowSvg)) {
        return { imageUrl: thumb, source: `https://wikipedia.org/wiki/${encodeURIComponent(result.title)}` };
      }
    }
    return null;
  } catch { return null; }
}

// API wrappers
const wiki = (lang: string, q: string, y?: number, svg = false) => 
  fetchWikiResults(`https://${lang}.wikipedia.org/w/api.php?action=query&list=search&srsearch=${encodeURIComponent(y ? `${q} ${y}` : q)}&format=json&origin=*`, q, svg);

const commons = (q: string, y?: number, svg = false) => 
  fetchWikiResults(`https://commons.wikimedia.org/w/api.php?action=query&list=search&srsearch=${encodeURIComponent(y ? `${q} ${y}` : q)}&srnamespace=6&format=json&origin=*`, q, svg);

const nationaal = (q: string, y?: number) => 
  fetchWikiResults(`https://commons.wikimedia.org/w/api.php?action=query&list=search&srsearch=${encodeURIComponent(`${q} ${y || ''} Nationaal Archief`)}&srnamespace=6&format=json&origin=*`, q, false);

// TMDB Wrapper
async function searchTMDB(eventId: string, query: string, type: 'person' | 'movie', year?: number): Promise<ImageResult> {
  try {
    const supabaseUrl = import.meta.env.VITE_SUPABASE_URL;
    const supabaseKey = import.meta.env.VITE_SUPABASE_PUBLISHABLE_KEY;
    if (!supabaseUrl || !supabaseKey) return { eventId, imageUrl: null, source: null };
    
    const response = await fetch(`${supabaseUrl}/functions/v1/search-images`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json', 'Authorization': `Bearer ${supabaseKey}`, 'apikey': supabaseKey },
      body: JSON.stringify({ queries: [{ 
        eventId, 
        query: cleanQueryForTMDB(query), 
        year, 
        isCelebrity: type === 'person', 
        isMovie: type === 'movie' 
      }] }),
    });
    if (!response.ok) return { eventId, imageUrl: null, source: null };
    const data = await response.json();
    return data.images?.[0]?.imageUrl ? data.images[0] : { eventId, imageUrl: null, source: null };
  } catch { return { eventId, imageUrl: null, source: null }; }
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
  visualSubjectType?: string // <--- DE NIEUWE VERKEERSREGELAAR
): Promise<ImageResult> {
  let enQuery = queryEn || query;
  let type = visualSubjectType;

  // FALLBACK: Als visualSubjectType ontbreekt (oude cache?), gokken we op basis van categorie
  if (!type) {
    if (isCelebrity || category === 'music' || category === 'celebrity') type = 'person';
    else if (isMovie || category === 'entertainment') type = 'movie';
    else if (category === 'technology' || category === 'science') type = 'product';
    else type = 'event';
  }

  // ROUTING LOGICA
  // 1. Films & Series -> TMDB
  if (type === 'movie') {
    return await searchTMDB(eventId, enQuery, 'movie', year);
  }

  // 2. Personen & Muziek -> TMDB Person (veel betere kwaliteit dan Wiki)
  if (type === 'person') {
    const res = await searchTMDB(eventId, enQuery, 'person');
    if (res.imageUrl) return res;
    // Fallback naar Wiki als TMDB faalt (voor lokale artiesten)
    const wikiRes = await wiki('nl', query, undefined, false); 
    if (wikiRes) return { eventId, ...wikiRes };
  }

  // 3. Producten, Logos, Games -> Commons (Met SVG support!)
  if (type === 'product' || type === 'logo' || type === 'artwork') {
    const allowSvg = true; 
    // Probeer eerst Commons (beste voor producten)
    let res = await commons(enQuery, undefined, allowSvg); 
    if (res) return { eventId, ...res };
    
    // Probeer Wiki EN
    res = await wiki('en', enQuery, undefined, allowSvg);
    if (res) return { eventId, ...res };
  }

  // 4. Events & Locaties & Overig
  // Probeer Nationaal Archief alleen als het "Lokaal/Politiek" is
  const isLocal = type === 'event' && (category === 'local' || category === 'politics');
  
  if (isLocal) {
    const res = await nationaal(query, year);
    if (res) return { eventId, ...res };
  }

  // Standaard volgorde voor events
  const wikiPromises = [
    wiki('nl', query, year),
    wiki('en', enQuery, year),
    commons(enQuery, year)
  ];
  
  const results = await Promise.allSettled(wikiPromises);
  for (const result of results) {
    if (result.status === 'fulfilled' && result.value) return { eventId, ...result.value };
  }

  // Laatste redmiddel: Zonder jaartal zoeken
  const looseRes = await wiki('en', enQuery);
  if (looseRes) return { eventId, ...looseRes };

  return { eventId, imageUrl: null, source: null };
}

export async function searchImagesClientSide(queries: SearchQuery[]): Promise<ImageResult[]> {
  return []; 
}
