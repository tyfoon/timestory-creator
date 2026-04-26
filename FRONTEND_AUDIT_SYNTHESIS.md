# Frontend Audit — Synthese

> Diepe frontend-audit ter voorbereiding op closed beta.
> Drie parallel agents: flow & state, component graveyard, UI/UX consistency.
> Datum: 2026-04-26

---

## Top-5 verdachten voor "soms werkt de flow niet, rare dingen elders"

### 1. Drie home-implementaties parallel actief
`src/App.tsx` routeert `/` → HomeV3, `/home-v2` → HomeV2, `/home-v4` →
Index. `HomeV2.tsx` en `Index.tsx` leven nog volledig en bevatten elk hun
eigen `sessionStorage` writes naar overlappende keys. Oude bookmarks of
toevallig getypte URLs raken bij een verouderde flow.

### 2. `sessionStorage` zonder user-scoping + geen cleanup op logout
- `src/pages/HomeV3.tsx:209` schrijft `homepageFormState` zonder user-key
- `src/pages/ResultPage.tsx:214` en `src/pages/TimelineStoryPage.tsx:1047`
  lezen `timelineFormData` zonder ownership-check
- `src/contexts/AuthContext.tsx` cleart niets bij `signOut`
- Race in `src/pages/HomeV3.tsx:213-225`: `initialState` is closure-captured
  op mount; `loadSettings()` skipped als oude sessionStorage bestaat

In dezelfde tab/browser na logout-login zie je oude form-state of zelfs
andermans timeline.

### 3. DateInput accepteert ongeldige datums
`src/components/DateInput.tsx:56-116` cap't dag op `Math.min(31, ...)` en
maand op `Math.min(12, ...)` zonder de combinatie te valideren. Feb 30,
Apr 31, jaar 9999 — allemaal accepted. `onComplete` vuurt zonder
`isValidDate()` check. Form gaat door met malformed date → AI-prompt
gets weird year/birthday → output voelt "kapot".

### 4. SubcultureSelector kan stille selectie-verlies hebben
`src/components/SubcultureSelector.tsx:30-75` — de `useMemo` voor de
top-5 subculturen depends op `[startYear, endYear, periodType, focus,
city]`. Als parent één van die props herberekent, wordt de lijst
opnieuw gegenereerd en kan de eerder gekozen subcultuur er niet meer
in staan. De gebruiker ziet plotseling "neutral" geselecteerd.

Daarbij: `src/pages/HomeV3.tsx:310-316` zet `step3HasAdvanced = true`
éénmalig en reset 'm nooit. Step 3 deselect + re-select → UI flickert
of "Start" knop animeert niet meer in.

### 5. Silent failures in side-pagina's
- `src/pages/AccountPage.tsx:81`: `catch {}` op `checkSubscription` —
  premium lijkt niet beschikbaar terwijl het API gewoon faalde
- `src/pages/MusicOverviewPage.tsx:231-240`: `catch { return null; }` op
  Spotify search — gebruiker ziet incompleet grid zonder uitleg
- `src/pages/TvFilmOverviewPage.tsx:118`: zelfde pattern op YouTube search

Verklaart "rare dingen op andere pagina's": items missen, knoppen werken
inconsistent, geen foutmelding.

---

## CRITICAL — must-fix vóór beta

| # | Issue | File:Line | Wat user ziet |
|---|---|---|---|
| C1 | DateInput accepteert ongeldige datums | `DateInput.tsx:109-116` | Form advanceert met onmogelijke datum |
| C2 | `sessionStorage` zonder user-key + geen logout-cleanup | `HomeV3.tsx:209`, `ResultPage.tsx:214`, `AuthContext.tsx` | Vorige user's data verschijnt bij nieuwe login in zelfde browser |
| C3 | Drie home-implementaties parallel | `App.tsx:36-56` | Onverwacht gedrag bij oude bookmarks; verwarring bij iteraties |
| C4 | `ImageBlacklistButton` (dev-only) zit in productie-routes | `ImageBlacklistButton.tsx:17-19` | "Ban" knop op elke image → users blacklisten per ongeluk |
| C5 | Silent fail op subscription-check | `AccountPage.tsx:81` | Premium-status klopt soms niet, geen retry |

---

## HIGH — beta polish

| # | Issue | File:Line | Wat user ziet |
|---|---|---|---|
| H1 | SubcultureSelector verliest selectie bij parent prop changes | `SubcultureSelector.tsx:30-75` | "Ik had toch X gekozen?" |
| H2 | Step 3 auto-collapse race (`step3HasAdvanced` nooit reset) | `HomeV3.tsx:310-316` | UI haperingen bij re-selecteren |
| H3 | Silent API failures op MusicOverview / TvFilmOverview | `MusicOverviewPage.tsx:231`, `TvFilmOverviewPage.tsx:118` | Incomplete grids, geen feedback |
| H4 | Image layout shift op TimelineCard/PolaroidCard (geen aspect-ratio) | `TimelineCard.tsx:258` | Layout-jumps tijdens scrollen, klik-misses |
| H5 | Stale closure: `useEffect([])` gebruikt `t()` | `ResultPage.tsx:269`, `TimelineStoryPage.tsx:1103` | Taal-switch update geen error-strings |
| H6 | Multiple loading states ongesynchroniseerd | `ResultPage.tsx:837-896` | "Laden..." naast al gerenderd content |
| H7 | `DebugInfoDialog` zit ook in productie-build | `DebugInfoDialog.tsx` | Debug-knop zichtbaar voor users |
| H8 | YouTube iframe in TimelineCard heeft geen focus-return | `TimelineCard.tsx:262-276` | Tab-orde breekt na sluiten embed |
| H9 | Touch targets 28×28 px (WCAG min 44×44) | `ImageBlacklistButton.tsx:44`, `TimelineCard.tsx:309` | Mobile mis-taps |
| H10 | `ResultPage` is volledig public route, geen auth-guard | `App.tsx` | Direct-URL leidt tot fouten / lege pagina |

---

## MEDIUM — post-beta opruimen

### Dead code (mogelijke bron van verwarring bij toekomstige Lovable-iteraties)

- Volledig `src/components/v2/*` (9 components, 2 daarvan zelfs binnen
  HomeV2 niet gebruikt)
- `HomeV2.tsx`, `Index.tsx` (= home-v4)
- Vermoedelijk dood: `NavLink.tsx`, `ChoiceCard.tsx`, `useSoundEffects` hook
- `ResultPage` vs `TimelineStoryPage` zijn near-duplicates met
  overlappende handlers (PDF, TikTok, blacklist)

### Patroon-drift

- **Loading**: `Loader2` vs `Clock` vs plain text vs niets
- **Error**: toast vs inline `AlertCircle` card vs `console.error` only
  vs `catch {}`
- **Empty state**: ontbreekt op MusicOverview en TvFilmOverview
- **Date format**: `nl-NL` long ("14 april 2025") in AccountPage vs
  `apr '90` in TimelineCard
- **Hardcoded `#1DB954`** (Spotify-groen) in 3 plekken vs semantic tokens
- `<h1>` sizes drift over pagina's; semantische `<main>` ontbreekt op
  SharedStoryPage en AccountPage
- **Animation-mixing**: framer-motion + CSS transitions +
  `group-hover:scale-105` op zelfde elementen

### Mobile / iOS

- Geen `safe-area-inset` → Header zit onder iPhone notch
- Inconsistente breakpoints (`sm:` vs `md:` voor zelfde concept)
- Geen `viewport-fit=cover`

### Code-hygiëne

- `getBackgroundForYear()` 3× gekopieerd ipv import uit `eraThemes.ts`
- Toast spam-risico: geen dedup op rapid bookmarks (MusicOverview)
- Hardcoded Supabase URL+key fallback in 3 components

---

## Sprint-volgorde (advies)

### Sprint A (1 dag) — kill the worst confusion
1. **C3**: HomeV2 + Index uit routes, archiveer code (niet wissen)
2. **C4 + H7**: `ImageBlacklistButton` en `DebugInfoDialog` achter
   `import.meta.env.DEV` flag of helemaal weg
3. **C1**: DateInput proper validation
4. **C2**: sessionStorage cleanup in `signOut` + user-prefix op keys

### Sprint B (1 dag) — consistency wins
5. **C5 + H3**: silent failures fixen (toast + retry op 3 catch-blocks)
6. **H1 + H2**: SubcultureSelector + Step 3 race
7. **H4**: aspect-ratio op TimelineCard/PolaroidCard image containers
   (zelfde fix als LayoutOverlap)
8. **H10**: `<AuthGuard>` wrapper voor ResultPage en gerelateerde routes

### Sprint C (post-beta) — graveyard cleanup
9. ResultPage vs TimelineStoryPage decision (mergen of duidelijk maken)
10. Pattern drift normaliseren (loading/error/empty)
11. Date formatting helper, design tokens i.p.v. hardcoded colors
12. Mobile/iOS safe areas + breakpoint harmonisatie
