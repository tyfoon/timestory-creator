# Lazy-load Trailers — Project Plan

> Apart project, geparkeerd na de TvFilm/Music perf-fix (commit f800080).
> Niet nodig voor de typical 7-jaar case (35 items), wel voor langere
> year-ranges en YouTube-quota bescherming.
>
> Datum bewaard: 2026-04-26

---

## Context

Na commit `f800080` worden de 35 typische `/tv-film` trailers parallel
gefetched in ~1-2 sec, en de 35 typische `/muziek` Spotify-resoluties in
~2-3 sec. Voor het grootste deel van de gebruikers is dat snel genoeg.

Maar **alle** items worden gefetched zodra de pagina laadt — ook items
die de gebruiker waarschijnlijk nooit op het scherm krijgt (bv. 1980
items terwijl ze alleen de eerste paar jaar bekijken). Dat verbruikt
API-quota onnodig en wordt pas écht een probleem bij grotere ranges.

## Wanneer dit project oppakken

**Trigger-criteria** (één is genoeg):

1. Users met grote year-ranges (bv. 60+ jaar, 300+ items) klagen over
   snelheid of slechte progress-feedback.
2. YouTube API quota (`search-youtube`, default 100 searches/dag) raakt
   op. Te zien in Sentry-warnings of Supabase function-logs als 403.
3. Mobiele users met data-limit klagen over bandbreedte op `/tv-film` of
   `/muziek`.
4. We willen `search-youtube` JWT-on zetten (audit-finding) maar zonder
   eerst te lazy-loaden zou dat extra friction op de pagina geven.

Tot één van die triggers raakt: **niet bouwen** — premature optimization
en extra complexiteit voor weinig winst.

---

## Architectuur

### Concept

Gebruik de browser-native `IntersectionObserver` API om te detecteren
wanneer een card in (of net buiten) de viewport komt. Pas dán fetchen
we de trailer/album-art voor die specifieke card.

Geen libraries nodig — `IntersectionObserver` is breed ondersteund
(alle moderne browsers, mobile Safari ≥ 12.2).

### Implementatie-schets

In `TvFilmOverviewPage.tsx`:

```ts
// Replace the up-front parallel-batches loop with on-demand fetches.

const fetchedRef = useRef<Set<string>>(new Set());
const errorCountRef = useRef(0);

const fetchTrailerForItem = useCallback(async (key: string, item: TvFilmItem) => {
  if (fetchedRef.current.has(key)) return;
  fetchedRef.current.add(key);

  try {
    const query = `${item.title} ${item.type === 'film' ? 'official trailer' : 'trailer intro'}`;
    const { data, error } = await supabase.functions.invoke('search-youtube', { body: { query } });
    if (error) {
      errorCountRef.current += 1;
      throw error;
    }
    setResolvedItems(prev =>
      prev.map(ri =>
        `${ri.year}-${ri.item.title}` === key
          ? { ...ri, youtube: data?.videoId ? data : null, loading: false }
          : ri
      )
    );
  } catch {
    setResolvedItems(prev =>
      prev.map(ri =>
        `${ri.year}-${ri.item.title}` === key
          ? { ...ri, loading: false }
          : ri
      )
    );
  }
  setLoadedCount(prev => prev + 1);
}, []);

// Wrapper around each card with IntersectionObserver
const TrailerCard = ({ resolvedItem, ... }) => {
  const ref = useRef<HTMLDivElement | null>(null);
  const key = `${resolvedItem.year}-${resolvedItem.item.title}`;

  useEffect(() => {
    if (!ref.current || !resolvedItem.loading) return;
    const observer = new IntersectionObserver(
      (entries) => {
        entries.forEach(entry => {
          if (entry.isIntersecting) {
            fetchTrailerForItem(key, resolvedItem.item);
            observer.disconnect();
          }
        });
      },
      { rootMargin: '300px' } // start fetch ~1 row before card hits viewport
    );
    observer.observe(ref.current);
    return () => observer.disconnect();
  }, [key, resolvedItem.loading, resolvedItem.item, fetchTrailerForItem]);

  return <div ref={ref}>...</div>;
};
```

### `rootMargin` afweging

- **`'300px'`** (≈ 1 cardrow eerder): smooth UX, user ziet zelden "loading" state tijdens scrollen
- **`'0px'`** (exact in viewport): minimale API calls, user ziet wel kort "loading" placeholder
- **`'600px'`**: nog vroeger, voelt meteen klaar maar fetcht ook items die user misschien niet bereikt

Aanbevolen: `'300px'`. Bij quota-bezorgdheid kan dat naar `'0px'`.

### Concurrency cap blijft handig

Zelfs met lazy-load wil je niet 20 trailers tegelijk fetchen wanneer
user snel langs een rij scrolt. Combineren met een eenvoudige queue:
queue items als ze in beeld komen, max N tegelijk verwerken.

```ts
const fetchQueue = useRef<Array<() => Promise<void>>>([]);
const activeFetches = useRef(0);
const MAX_CONCURRENT = 4;

const enqueueFetch = (fn: () => Promise<void>) => {
  fetchQueue.current.push(fn);
  drainQueue();
};

const drainQueue = () => {
  while (activeFetches.current < MAX_CONCURRENT && fetchQueue.current.length > 0) {
    const next = fetchQueue.current.shift()!;
    activeFetches.current++;
    next().finally(() => {
      activeFetches.current--;
      drainQueue();
    });
  }
};
```

### Progress-bar UX

Met lazy-load is "loadedCount / total" niet meer een betekenisvolle
metric, want we weten niet of de user de hele lijst gaat zien.

Twee opties:

1. **Progress-bar weghalen** zodra alle ZICHTBARE items klaar zijn —
   "Trailers laden..." voor visible-but-not-yet-loaded count.
2. **Progress-bar koppelen aan visible items only** — toont activiteit
   tijdens scroll-induced fetches, voelt natuurlijker.

---

## Bestanden die geraakt worden

| File | Wijziging |
|---|---|
| `src/pages/TvFilmOverviewPage.tsx` | Vervang up-front batch-loop door per-card observer + queue |
| `src/pages/MusicOverviewPage.tsx` | Idem voor Spotify resolutie |
| (optioneel) `src/lib/useLazyFetch.ts` | Generic hook als beide pagina's dezelfde queue/observer gebruiken |

---

## Verwacht effect

| Metric | Huidig (parallel up-front) | Met lazy-load |
|---|---|---|
| API calls bij user die alleen eerste rij ziet | 35 | ~5-10 |
| API calls bij user die hele lijst scrolt | 35 | 35 (over tijd) |
| Time-to-first-trailer | ~1-2s | <500ms (alleen visible items) |
| YouTube/Spotify quota-impact bij 60-jaar range | 300 calls per page-load | ~10-20 calls typical |
| Code-complexity | laag | medium (observer + queue) |

---

## Niet doen tot er een trigger is

Waarom uitstellen:

- 35 items lazy-laden is over-engineered; het bestaande parallel-pad
  is al snel.
- IntersectionObserver bugs zijn moeilijk te debuggen in productie.
- Cache-policies (sessionCache schrijft alle items na completion)
  moeten herzien — wat schrijven we als alleen 10 van 35 items
  daadwerkelijk gefetched zijn? Stel dit niet uit naar
  half-implementaties.
- Bij grotere ranges loont het pas écht.

## Referentie

- Browser support: <https://developer.mozilla.org/en-US/docs/Web/API/Intersection_Observer_API>
- React patterns: kijk naar `react-intersection-observer` als we toch een lib willen, maar de native API is hier prima.
- Zie ook FRONTEND_AUDIT_SYNTHESIS.md voor de oorspronkelijke H4 (aspect-ratio) finding waar lazy-loading naast lijkt te liggen.
