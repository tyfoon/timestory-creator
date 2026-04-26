# Inline Music-Video Player in Hero — Project Plan

> Apart project, geparkeerd na de carousel-harmonisatie (commit
> `7969bfc`). Eerder had `/story` een inline Remotion player in de
> muziekvideo-card; nu is de hero CTA-only ("Bekijk video" → klik →
> `/muziek-video`). Deze 1-extra-klik is een mini-regressie die we
> bewust accepteerden om de harmonisatie klein te houden — dit project
> brengt 'm terug.
>
> Datum bewaard: 2026-04-26

---

## Context

Tot commit `c8aad15` had `/story` (en `/polaroid`) een rijke
muziekvideo-card via `StoryEndCarousel`:
- Inline Remotion `<Player>` met de tijdlijn-events als frames
- VHS-effect toggle
- "Bekijk fullscreen" knop (Dialog met grotere player)
- "Delen" knop
- Stream-preview tijdens Suno polling

Tijdens de carousel-harmonisatie (commit `7969bfc`) hebben we de
**hero** in de nieuwe `StoryEndDiscover` simpel gehouden:
- Grote card met play-icoon, titel, "Net klaar"-badge
- Eén "Bekijk video" CTA → navigeert naar `/muziek-video`
- Geen Remotion player

Reden voor de keuze: `renderMusicVideoContent()` in
`StoryEndCarousel.tsx` is ~160 regels en heeft veel local state
(isFullscreen, isShareDialogOpen, enableVhsEffect, plus de Remotion
mounting). Dat extracten = significant werk dat de scope van de
harmonisatie zou hebben opgeblazen. We accepteerden de mini-regressie
en gingen door.

## Wat dit project doet

Eén nieuwe component `MusicVideoHeroCard.tsx` extracten uit
`StoryEndCarousel.tsx`, en die laten gebruiken door `StoryEndDiscover`
in plaats van de huidige CTA-only hero.

### Concreet

Nieuwe file: `src/components/story/MusicVideoHeroCard.tsx`

**Verantwoordelijkheden:**
- Render de music-video-card UI (idle / generating / error / completed states)
- Bevat de Remotion `<Player>` voor inline preview
- VHS-toggle (lokale state)
- "Bekijk fullscreen" Dialog (lokale state)
- "Delen" knop opent ShareDialog (state-only via prop callback?)
- Streaming-preview audio tijdens Suno polling
- Status-aware: zelfde `isComplete && !hasViewed` triggers als nu

**Props:**
```ts
interface MusicVideoHeroCardProps {
  events: TimelineEvent[];
  formData: FormData | null;
  storyTitle?: string;
  storyIntroduction?: string;
  // optional: controls voor share, fullscreen — kunnen ook intern blijven
}
```

**Update `StoryEndDiscover`:**
- Vervang de huidige hero-render met `<MusicVideoHeroCard ... />` als
  `showHero === true`
- Pass events + formData + storyTitle + storyIntroduction door
- StoryEndDiscover blijft de host die beslist *of* de hero wordt
  getoond (op basis van currentPage, hasViewed, isMusicVideoReady);
  MusicVideoHeroCard zelf is dom over die logica

### Bron-code

De referentie-implementatie staat **nog volledig in**
`src/components/story/StoryEndCarousel.tsx` — specifiek de
`renderMusicVideoContent()` functie (lines ~160-330). Plus alle
state declaraties bovenaan (isFullscreen, isShareDialogOpen,
enableVhsEffect, isRoastOpen). Plus de imports (Player from
`@remotion/player`, TimelineVideoComponent, ShareDialog, etc.).

Beste aanpak: kopieer de hele rendering function + relevante state +
imports naar de nieuwe file. Behoud namen voor traceability.

## Effort

~3-4 uur:
- 1 uur: bestaande renderMusicVideoContent uitkleden uit StoryEndCarousel
  en in MusicVideoHeroCard plakken
- 1 uur: imports + dependencies opruimen, props design
- 1 uur: integratie in StoryEndDiscover (hero-block vervangen)
- 30 min: testen op alle 5 pages dat de hero werkt zoals voorheen +
  geen regressies elders

## Open vragen voor wanneer we dit oppakken

1. **ShareDialog binnen of buiten MusicVideoHeroCard?**
   Huidige StoryEndCarousel heeft 'm intern. Voor consistentie met
   andere dialogs (RoastDialog, VideoDialog) misschien beter de
   page-owner van de share-state maken. Of houd 'm intern omdat
   ShareDialog alleen relevant is voor de music-video → past bij de
   hero.
2. **Fullscreen Dialog idem.** Kandidaat voor intern (alleen relevant
   voor de music-video-hero).
3. **VHS-toggle persistence.** Lokale state of in user-settings? Voor
   nu: lokale state, zelfde als origineel.
4. **Hoe exporteert StoryEndDiscover het feit dat de hero is shown?**
   Mogelijk wil de page weten of er een hero rendert om bv. de tiles
   header anders te plaatsen — bestaande implementatie doet dit al
   via de section header die "Ook voor jou" vs "Ontdek meer" laat
   zien.

## Niet doen tot er een trigger is

Triggers die deze extractie urgent maken:
- Beta-feedback dat de 1-extra-klik naar `/muziek-video` voor afspelen
  als friction wordt ervaren
- Engagement-metrics (PostHog/analytics) tonen dat users die "Bekijk
  video" klikken vaker afhaken dan vroeger toen 'ie inline speelde
- Closed beta open gaat en we willen de "wow" zo direct mogelijk
  presenteren (daadwerkelijke playback in de carousel)

Tot één van die triggers: **niet bouwen.** De huidige CTA-card werkt
prima, de pill rechts onder verwijst óók naar `/muziek-video`, en de
extra klik is geen gigantische friction.

## Status

- ⏸️ Geparkeerd na carousel-harmonisatie (commit `7969bfc`)
- 🎯 Op te pakken zodra triggers hierboven oppoppen
- 📌 Bron-code beschikbaar in `src/components/story/StoryEndCarousel.tsx`
  (orphaned na harmonisatie, niet gearchiveerd)

## Referentie naar andere geparkeerde projecten

- `ADMIN_ROLE_PLAN.md` — admin-role + debug-UI gating
- `LAZY_LOAD_TRAILERS_PLAN.md` — IntersectionObserver-based YouTube
  trailer lazy-load
- Dit document — inline music-video player in carousel-hero

Alle drie blijven bewust geparkeerd tot signaal dat ze gebouwd
moeten worden. Niets is kritiek voor closed beta.
