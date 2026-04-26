# Analyse — Image search architectuur in `timestory-creator`

> Onderzoek naar de DDG/DigitalOcean image-search API
> (`https://ddg-image-search-bn3h8.ondigitalocean.app/search`),
> de samenhang met `image_blacklist` + `image_search_cache`,
> en de haalbaarheid om dit volledig binnen Lovable/Supabase te draaien.
>
> Datum: 2026-04-26

---

## 1. Hoe de huidige flow er werkelijk uitziet

Er zijn **twee parallelle search-modi**, geschakeld via
`sessionStorage.imageSearchMode` (default `'tol'`), zichtbaar als toggle in
`src/pages/Index.tsx:524` en gebruikt in
`src/hooks/useClientImageSearch.ts:68`:

| Mode | Client entry | Edge Function | Upstream |
|---|---|---|---|
| `'tol'` (default) | `src/lib/api/tolImageSearch.ts` → `searchSingleImageTol` | `supabase/functions/search-images-tol` | **DDG/DigitalOcean** (down) + TMDB + Spotify |
| `'legacy'` | `src/lib/api/wikiImageSearch.ts` → `searchSingleImage` | `supabase/functions/search-images` | Wikipedia (NL/EN/DE), Wikimedia Commons, Nationaal Archief, TMDB, Firecrawl |

Tol-modus gaat eerst naar TMDB voor expliciete movie/TV/celebrity events
en naar Spotify voor music — pas daarna komt DDG aan bod
(`src/lib/api/tolImageSearch.ts:294-347`). Dus DDG is **alleen leading
voor "alles wat geen movie/TV/music/celebrity is"**: gewone evenementen,
producten, plekken, gebeurtenissen, sport, etc.

Voor sport zit er een eigen tak: exacte jaargang i.p.v. decennium-suffix
(`supabase/functions/search-images-tol/index.ts:174`).

---

## 2. Cache + blacklist — schema en interactie

Beide tabellen staan in `public` schema, beide met RLS aan
(`supabase/migrations/20260201134612_…sql`,
`supabase/migrations/20260204110007_…sql`).

### `image_search_cache` — fungeert als white-list / hit-cache

- PK = `query` (lowercased, trimmed, collapsed whitespace — zie
  `normalizeQueryForCache`)
- Cols: `image_url`, `source`, `metadata` (jsonb), `created_at`,
  `last_accessed`
- Public read; service-role write; `last_accessed` wordt fire-and-forget
  bijgewerkt op cache-hits.

### `image_blacklist` — globale negative list

- PK uuid, **UNIQUE op `image_url`**
- Cols: `image_url`, `event_title`, `search_query`, `created_at`
- Public read **én public insert** (RLS open) — dit staat expliciet als
  "TEMPORARY: dev only" gemarkeerd in
  `src/components/ImageBlacklistButton.tsx:18`.

### Hoe ze samenwerken

1. **Cache-lookup**
   (`supabase/functions/search-images-tol/index.ts:35-82`, idem in
   `search-images`): cache-hit → check meteen of die URL inmiddels op de
   blacklist staat → zo ja, **delete self** uit cache en behandel als
   miss.
2. **Cache-write**: alleen als upstream een geldige URL teruggeeft die
   niet in blacklist zit.
3. **Blacklist-add** (`src/hooks/useImageBlacklist.ts:92-153`):
   5-staps cascade
   1. sync naar DDG API (via `blacklist-image-ddg`)
   2. insert in `image_blacklist`
   3. **`DELETE FROM image_search_cache WHERE image_url = $url`**
      (purge alle cache-rijen die deze URL serveerden, ongeacht query)
   4. update in-memory cache
   5. update `localStorage` backup
4. **Resultaat-filtering**: Edge function laadt de hele blacklist als
   `Set<string>` en `extractBestImage` itereert door alle DDG-results
   tot er één gevonden is die niet in de set staat
   (`supabase/functions/search-images-tol/index.ts:216-282`).

### Belangrijke nuance

De DDG-API hield **een eigen tweede blacklist+cache** bij
(`cachedEntriesFlushed` veld in respons). Dat betekent dat na het
wegvallen van de DDG service `image_blacklist` + `image_search_cache`
source-of-truth blijven — zolang `addToBlacklist` netjes is doorgelopen
voor elke geblacklist URL is er geen verlies.

---

## 3. Reverse-engineerd DDG-API contract

Uit de twee callers (`search-images-tol` en `blacklist-image-ddg`)
afgeleid:

```
GET  https://ddg-image-search-bn3h8.ondigitalocean.app/search?q=<query>&key=<apiKey>
POST https://ddg-image-search-bn3h8.ondigitalocean.app/blacklist
     headers: X-Api-Key: <apiKey>, Content-Type: application/json
     body: {"url": "<imageUrl>"}
```

### Auth

Eén shared secret `DDG_IMAGE_SEARCH_API_KEY` (Supabase secret).
Search via querystring, blacklist via header — inconsistent maar dat
is wat de wrappers verwachten.

### Search response

Zo flexibel afgehandeld dat upstream blijkbaar variabel was:

- platte vorm: `{url|imageUrl|image|src: string, score?: number}`
- of array onder één van: `results | items | images | data`,
  eventueel genest onder `data.{...}`
- elk array-item:
  `{url|imageUrl|image|src|original|link: string,
    score|rank|relevance?: number}`

### Status codes

Waar de wrapper expliciet rekening mee houdt:

- 200 met body → parse
- 404 → "no result"
- 502/503/504 → soft-fail, retourneer `imageUrl: null`
- AbortError + andere → 3 retries met 250ms sleep, 45s per request

### Blacklist response

`{blacklisted: boolean, cachedEntriesFlushed?: number}`

### Klant-zijdige query-engineering vóór de call

(`supabase/functions/search-images-tol/index.ts:152-187`)

- `stripDecadeHints` haalt eventuele "jaren 80", "1980s", "'80s"
  uit de query (omdat het AI-genererende deel die soms al toevoegt)
- daarna wordt voor sport de exacte 4-cijferige year toegevoegd, voor
  andere categorieën een decennium-suffix uit de fixed map
  (`194→40s, …, 202→2020s`)
- normalisatie voor cache-key gebeurt apart in
  `normalizeQueryForCache`.

---

## 4. Wat deed de DigitalOcean-service écht onder de motorkap?

We hebben de source niet, maar uit de README-comment in
`src/lib/api/tolImageSearch.ts:1-10` en uit het response-shape valt
af te leiden:

1. **Scrape DuckDuckGo image search** (DDG heeft géén officiële
   image-API; dit gaat altijd via een `vqd`-token-handshake op
   `duckduckgo.com/?q=…` gevolgd door
   `duckduckgo.com/i.js?o=json&q=…&vqd=…`, JSON met
   `{results:[{image, thumbnail, title, source, url, width, height}], next}`).
2. **Re-rank** op resolutie, aspect-ratio, domain-trust, query-relevantie.
3. **Cache** een resultaat per query.
4. **Permanente blacklist** met cache-flush bij toevoegen.

Dat is het hele service-oppervlak. Geen exotische dependencies.

---

## 5. Kunnen we dit binnen Lovable/Supabase laten draaien? — Ja, met kanttekeningen

### Wat technisch nodig is

om de DigitalOcean-service overbodig te maken (alléén onderzoek, niet
bouwen):

- **DDG-scrape in Deno Edge Function**: ~30 regels —
  `fetch('https://duckduckgo.com/?q=…')`, regex
  `vqd=['"](\d-\d+-\d+)['"]` uit de HTML, dan
  `fetch('https://duckduckgo.com/i.js?l=us-en&o=json&q=…&vqd=…')` en
  JSON parsen. Werkt zonder externe libs in Deno.
- **Ranker** als pure functie binnen `search-images-tol`:
  - filter blacklist (al aanwezig als `Set`)
  - score = combinatie van `width*height` (resolutie),
    `|aspect-ratio - target|` (target hangt van category af),
    domain-whitelist boost (wikipedia, britannica, imdb, themoviedb,
    nytimes, getty, …), en `titleMatchesQuery` (al geïmplementeerd in
    `supabase/functions/search-images/index.ts:276` — copy-paste).
- **Cache + blacklist**: blijft 1-op-1 — `image_search_cache` en
  `image_blacklist` veranderen niet.
- **`blacklist-image-ddg` edge function + `DDG_IMAGE_SEARCH_API_KEY`
  secret**: kunnen weg. `addToBlacklist` stap 1 (sync naar DDG) wordt
  no-op.
- **`config.toml`**: alleen entry voor `blacklist-image-ddg` weghalen.

### Risico's & afwegingen

1. **DDG TOS / IP-reputatie**: scraping is tegen DDG's voorwaarden (de
   DigitalOcean-droplet deed het al; dezelfde TOS-positie, alleen
   verschuift de egress-IP naar Supabase Edge). Supabase Edge draait
   achter een gedeelde IP-pool — kans op rate-limit of captcha is reëel.
   Mitigatie: terugvallen op de bestaande `searchAllSources`
   (Wikipedia/Commons/etc.) wanneer DDG `null` of een captcha-page
   geeft. Die fallback bestaat al en is wat `search-images` (legacy) doet.
2. **Functietijd**: Edge Functions hebben 150s wallclock; één DDG-scrape
   = 2 requests, ~1-3s. Geen probleem. `useClientImageSearch` cap't al
   op 3 parallel (`src/hooks/useClientImageSearch.ts:44`).
3. **Ranking-pariteit**: we moeten zélf bepalen wat "domain-trust"
   betekent — de DigitalOcean-service had vermoedelijk een hand-curated
   lijst. Pragmatisch starten met een whitelist + simpele scoring en
   bijwerken o.b.v. resultaten.
4. **Waarom is de DigitalOcean-service down?**: ofwel droplet uit, ofwel
   DDG heeft die IP geblokt. Als dat tweede speelt, gaat dezelfde scrape
   vanaf Supabase ook last krijgen. Een gevarieerde User-Agent,
   accept-language matching en respect voor `Cache-Control` helpen, maar
   geven geen 100% garantie.
5. **Open RLS op `image_blacklist`**: orthogonaal aan deze migratie, maar
   de "anyone can insert" policy moet sowieso dicht voor productie — dat
   staat al als TODO in `src/components/ImageBlacklistButton.tsx:18`.

### Eindoordeel

Ja, dit is haalbaar. De DDG-service was eigenlijk een dunne wrapper rond
een DDG-scrape met een ranker en een eigen cache/blacklist die wij al
deels gedupliceerd hebben in onze Supabase database. Het volledig
in-house brengen levert per saldo **minder code op** (één edge function
vervangen, één edge function + één secret weg) en haalt een single point
of failure weg. Het enige nieuwe wat je echt schrijft is de DDG-scrape
(`vqd` handshake + `i.js` JSON parse) en de ranker — samen ~80-120
regels Deno.

---

## 6. Bestanden die geraakt worden bij het in-house brengen

| Wijziging | File |
|---|---|
| Vervang upstream-fetch door DDG-scrape + ranker | `supabase/functions/search-images-tol/index.ts` |
| Verwijderen | `supabase/functions/blacklist-image-ddg/index.ts` |
| Sync-stap (stap 1) verwijderen uit `addToBlacklist` | `src/hooks/useImageBlacklist.ts` |
| Entry voor `blacklist-image-ddg` weghalen | `supabase/config.toml` |
| Secret `DDG_IMAGE_SEARCH_API_KEY` opruimen | Supabase project settings |

**Niet aangeraakt** — blijft 1-op-1 werken:

- `supabase/migrations/20260201134612_…sql` (image_blacklist)
- `supabase/migrations/20260204110007_…sql` (image_search_cache)
- `src/lib/api/tolImageSearch.ts` (client-side flow blijft hetzelfde)
- `src/hooks/useClientImageSearch.ts` (toggle blijft hetzelfde)
- `src/components/ImageBlacklistButton.tsx` (UI blijft hetzelfde)
