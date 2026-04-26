# Beta Launch Audit — Progress Snapshot

> Stand van zaken bij het toewerken naar closed beta.
> Datum: 2026-04-26

---

## TL;DR

Alle 8 originele Critical-blockers staan groen of zijn bewust deferred. Vanuit
security en stabiliteit is de app **closed-beta ready**. Resterend werk valt in
twee groepen: één snelle dashboard-actie (Sentry DSN configureren) en de
"week-1 must-fixes" uit de oorspronkelijke audit (per-story og-tags,
account-deletion, auth-guard op routes, paid-AI paywall keuze).

---

## Drie audits (uitgevoerd door parallel agents)

1. **Security & data audit** — RLS policies, edge function auth, Stripe paywall,
   PII/GDPR, SSRF, cost-DoS.
2. **Edge function reliability audit** — error handling, timeouts, retries,
   idempotency, rate limiting, Suno-callback HMAC.
3. **Frontend production-readiness audit** — error boundaries, loading/error
   states, a11y, bundle, i18n, monitoring, SEO, dead code, TypeScript
   strictness, tests.

Volledige rapporten zijn in de chat-historie van deze sessie. Synthese hieronder.

---

## Originele Critical Blockers (8)

| # | Blocker | Status | Notes |
|---|---|---|---|
| 1 | Wallet-drain (8 paid-AI functies JWT-off + geen quota) | 🟡 deferred | Provider-side caps zijn een acceptabele tijdelijke mitigatie. Service-disruption risico blijft (aanvaller kan dag-quota opbranden). Productbeslissing nodig: hard paywall (A) vs auth+free-quota (A') vs freemium (B). Zie chat 26 apr. |
| 2 | `saved_stories` open UPDATE policy (defacement van public stories) | ✅ done | Vervangen door `increment_story_view_count(uuid)` SECURITY DEFINER RPC. Migration `20260426081844_*.sql`. |
| 3 | `proxy-image` SSRF (geen allowlist) | ✅ done | Allowlist met 6 hosts (wikimedia/tmdb/spotify/youtube), staged rollout met `X-Proxy-Off-Allowlist` header voor observability. Hostname suffix-match, https-only, 15s timeout, 15 MB streaming-cap, image/* content-type check. |
| 4 | `proxy-audio` SSRF (substring-match bypass) | ✅ done | Bestaande `ALLOWED_HOSTS` behouden, substring-match vervangen door hostname suffix-match. Hard 403 voor off-allowlist. Zelfde hardening als proxy-image. |
| 5 | `image_blacklist` + `image_search_cache` RLS open | ✅ done | Blacklist insert: `TO authenticated` + length checks. Cache writes: `TO service_role` only. Migration `20260426081844_*.sql`. |
| 6 | Geen React Error Boundary (white-screen risk) | ✅ done | `react-error-boundary` toegevoegd, top-level wrap in `main.tsx`, `ErrorFallback` met meertalige strings + dev-only stack-trace + retry/home buttons + resilient `useLanguage` (try/catch + NL fallback). |
| 7a | `index.html` Lovable-boilerplate | ✅ done | Brand "Het jaar van", `lang="nl"`, theme-color, canonical, complete og + twitter, 1200×630 og-image, slimme `robots.txt` (Twitter/Facebook bots toegelaten voor previews, Googlebot/Bingbot disallow op `/s/` en `/resultaat`). |
| 7b | Per-story dynamic og-tags | ⏳ deferred | Vereist edge function die scraper-UA detecteert en per-story HTML serveert. Niet in beta-blocker scope; week-1 must-fix. |
| 8 | Sentry error monitoring | ✅ done (config nog) | `src/lib/sentry.ts` met no-op-zonder-DSN, beforeSend filter (ResizeObserver, AbortError), `tracesSampleRate: 0.1` in prod, geen replay (PII). `ErrorFallback` forward errors via `Sentry.captureException`. **Actie**: `VITE_SENTRY_DSN` instellen in Lovable secrets. |

DSN voor Sentry is bekend en staat klaar:
`https://6f6e5bde9c3d23e75020a0ca1d06202a@o4511285386739712.ingest.de.sentry.io/4511285485764688`
(EU region, Frankfurt — SDK detecteert dat automatisch.)

---

## Bonus fixes die ondertussen via Lovable zijn geland

Naast de 8 prompts zijn er drie aanvullende fixes binnengekomen:

| Fix | Files | Beoordeling |
|---|---|---|
| Retry helpers `invokeWithRetry` + `fetchWithRetry` op 503/504/429 met exp. backoff + jitter | `src/lib/api/invokeWithRetry.ts` + 6 callers | ✅ goed; nit: helper heeft zelf geen `AbortController` timeout, en één `as any` cast |
| AceStep GPU cold-start: client timeout 30s → 120s | `src/hooks/useSoundtrackGeneration.ts` | ✅ correct; past binnen de 150s edge-cap |
| LayoutOverlap card-overlap bug (text card escapte parent op lange descriptions) | `src/pages/TimelineStoryPage.tsx` | ✅ nette CSS-grid fix met aspect-ratio voor lazy-load |

---

## Outstanding (week-1 must-fixes uit oorspronkelijke audit)

Niet blokkerend voor closed beta, wel belangrijk voor open beta:

### Security / data
- **`suno-callback` HMAC validatie + JWT-status helderheid**: webhook is fragile,
  geen signatuur-check. Mogelijk silent 401's vandaag.
- **Stripe webhook → eigen `subscribers` tabel**: huidige `check-subscription`
  doet live Stripe-lookup op email. Email change ontkoppelt subscription.
- **Account-deletion flow (GDPR Art. 17)**: roasts + namen blijven publiek na
  deletion. `saved_stories.user_id` cascade is `SET NULL`, content blijft.
- **`story-assets` bucket**: public read + anon write + geen DELETE policy.
  Roast-audio is wereldwijd opvraagbaar.
- **PII publiek via `/s/:id`**: defaulted op `is_public: true`. UUIDs zijn niet
  expirable, `noindex` op static is geregeld maar dynamic per-story og-tags
  ontbreken nog (zie #7b).

### Edge function reliability
- **Geen timeouts op 22 van 23 functions** (alleen `search-images-tol` heeft
  AbortController). Onder load → connection-slot exhaustion.
- **`search-youtube` is JWT-off + 100 searches/dag quota** — één bad actor
  brandt de hele dag-quota op in 30s.
- **`search-images` doet ~6 parallel sources × tot 20 events** zonder timeouts
  → tot ~360 concurrent fetches per request.
- **PII logging**: `generate-timeline` en `generate-song-lyrics` loggen
  volledige user data (naam, school, vrienden, partner, kinderen).

### Frontend
- **`SharedStoryPage` hardcoded NL error strings** (`'Geen verhaal ID
  opgegeven'`, `'Verhaal niet gevonden'`, `'Er ging iets mis bij het laden'`)
  — niet gelocaliseerd.
- **`NotFound.tsx`** is hardcoded English (`'Oops! Page not found'`).
- **`PolaroidCard.tsx`** maand-afkortingen hardcoded NL (`'Mrt'`, `'Mei'`,
  `'Okt'`).
- **Auth guard ontbreekt**: `ResultPage` is volledig public (genereert
  timelines, hit edge functions, downloadt PDFs). Alleen `AccountPage`
  self-guard met content-flash.
- **Geen code-splitting**: Remotion + jspdf + html2canvas + framer-motion +
  12 page-componenten allemaal in initial bundle.
- **Hardcoded Supabase URL+anon key fallback** in 3 components
  (`MusicVideoGenerator`, `VideoDialog`, `RoastDialog`) — koppelt build aan
  één project, maskeert misconfig.
- **`<div onClick>`** op `PolaroidCard:204-214` en `TimelineCard` zonder
  `role`/`tabIndex`/`onKeyDown` → niet via keyboard bereikbaar.
- **186 `console.*` calls** zonder `esbuild.drop` in `vite.config.ts` →
  alles ship't naar gebruikers' devtools.
- **Dead code**: `HomeV2`, `Index` (Home-v4), `src/components/v2/*`. Alleen
  `HomeV3` is live. `ImageBlacklistButton` zegt zelf "TEMPORARY: dev only".
- **Geen analytics** (PostHog/Plausible/etc.) — beta-data verzamelen kan niet
  zonder.
- **Geen tests** op kritieke paths. `vitest.config.ts` staat klaar maar
  `src/test/example.test.ts` is `expect(true).toBe(true)`.

### Polish / nits
- `public/og-image.png` is 1.0 MB (kan terug naar 100-200 KB).
- Favicon URL wijst naar Lovable's GCS bucket.
- TS `strict: false` + 66 `as any` casts. `src/integrations/supabase/types.ts`
  out-of-sync (zie `'saved_events' as any`, `'user_settings' as any`).

---

## Beslissingen die nog gemaakt moeten worden

1. **Paywall model voor #1 (wallet-drain)** — A (hard paywall), A' (auth-only +
   free quota, mijn aanbeveling), B (freemium met preview), of niets veranderen
   en op provider-caps blijven leunen.
2. **Per-story og-image (#7b)** — dynamic generation per share, of nette
   statische og-image accepteren voor beta.
3. **Beta-audience** — closed/invite-only of open beta? Bepaalt of de GDPR-items
   (account-deletion, PII via `/s/:id`) ook vóór launch moeten.

---

## Geparkeerde projecten

- **Admin-role + debug-UI gating** — zie [ADMIN_ROLE_PLAN.md](ADMIN_ROLE_PLAN.md).
  Tijdens Sprint A item 2 hebben we de debug-dialogs achter
  `import.meta.env.DEV` gegated, maar dat sluit de eigenaar zelf uit
  in productie. Echte oplossing: `is_admin` op profiles + RPC's voor
  promote/demote + admin-UI in AccountPage. Geparkeerd omdat scope te
  groot werd binnen Sprint A; wordt opgepakt na de UI/React
  optimalisatie sprint. Tussentijds: de DEV-gate is teruggedraaid en
  debug-dialogs zijn weer zichtbaar voor iedereen.

## Volgende potentiële aanvalsvectoren voor audit

De gebruiker heeft aangegeven dat de UI in de tijd via veel Lovable-iteraties is
opgebouwd. Een diepere frontend-audit specifiek op:

- Form-state flow op homepage (`HomeV3`) en handoff naar `ResultPage`
- Race conditions tussen `AuthContext`, `LanguageContext`, en page-mounts
- Dood code en orphaned components uit oudere iteraties (`HomeV2`,
  `src/components/v2/*`)
- Inconsistente loading/error/empty state patterns
- Memory leaks in `useEffect`s (event listeners, intervals)

Deze audit volgt in een aparte sessie/spawn.
