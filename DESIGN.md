---
name: Nostalgic Timeline
description: A warm, editorial design system that evokes vintage photo albums, parchment, and sepia-toned memory — built for a 40+ audience reflecting on their life story.
version: 1.0.0

color:
  mode: light-default-with-dark
  light:
    background: "hsl(39, 45%, 96%)"          # warm cream paper
    foreground: "hsl(25, 30%, 15%)"          # deep ink brown
    card: "hsl(40, 40%, 98%)"
    card-foreground: "hsl(25, 30%, 15%)"
    popover: "hsl(40, 40%, 98%)"
    popover-foreground: "hsl(25, 30%, 15%)"
    primary: "hsl(25, 55%, 28%)"             # rich sepia brown
    primary-foreground: "hsl(39, 45%, 96%)"
    secondary: "hsl(35, 30%, 88%)"           # warm beige
    secondary-foreground: "hsl(25, 40%, 20%)"
    muted: "hsl(35, 25%, 90%)"
    muted-foreground: "hsl(25, 15%, 45%)"
    accent: "hsl(38, 70%, 50%)"              # vintage gold highlight
    accent-foreground: "hsl(25, 40%, 12%)"
    destructive: "hsl(0, 65%, 50%)"
    destructive-foreground: "hsl(39, 45%, 96%)"
    border: "hsl(35, 25%, 85%)"
    input: "hsl(35, 25%, 85%)"
    ring: "hsl(25, 55%, 28%)"
    sepia: "hsl(30, 45%, 35%)"
    sepia-light: "hsl(35, 40%, 75%)"
    vintage-gold: "hsl(43, 75%, 55%)"
    vintage-gold-dark: "hsl(40, 65%, 40%)"
    parchment: "hsl(42, 50%, 94%)"
    ink: "hsl(25, 35%, 18%)"
    faded-photo: "hsl(30, 20%, 70%)"
  dark:
    background: "hsl(25, 30%, 8%)"           # deep warm-brown night
    foreground: "hsl(35, 30%, 90%)"
    card: "hsl(25, 25%, 12%)"
    card-foreground: "hsl(35, 30%, 90%)"
    popover: "hsl(25, 25%, 12%)"
    popover-foreground: "hsl(35, 30%, 90%)"
    primary: "hsl(38, 65%, 55%)"             # gold becomes the lead in dark
    primary-foreground: "hsl(25, 30%, 8%)"
    secondary: "hsl(25, 20%, 18%)"
    secondary-foreground: "hsl(35, 30%, 85%)"
    muted: "hsl(25, 20%, 18%)"
    muted-foreground: "hsl(35, 20%, 55%)"
    accent: "hsl(43, 70%, 50%)"
    accent-foreground: "hsl(25, 30%, 8%)"
    destructive: "hsl(0, 55%, 45%)"
    destructive-foreground: "hsl(35, 30%, 90%)"
    border: "hsl(25, 20%, 20%)"
    input: "hsl(25, 20%, 20%)"
    ring: "hsl(43, 70%, 50%)"
    sepia: "hsl(35, 35%, 55%)"
    sepia-light: "hsl(30, 25%, 35%)"
    vintage-gold: "hsl(43, 70%, 50%)"
    vintage-gold-dark: "hsl(40, 60%, 35%)"
    parchment: "hsl(25, 20%, 15%)"
    ink: "hsl(35, 30%, 85%)"
    faded-photo: "hsl(30, 15%, 40%)"
  era-accents:
    polaroid-pink: "hsl(330, 100%, 54%)"
    polaroid-cyan: "hsl(180, 100%, 50%)"
    polaroid-yellow: "hsl(50, 100%, 50%)"
    polaroid-purple: "hsl(280, 100%, 60%)"
    polaroid-orange: "hsl(25, 100%, 55%)"
    polaroid-mint: "hsl(160, 100%, 45%)"
    polaroid-bg-dark: "hsl(260, 30%, 8%)"
  # Adaptive era themes — drive homepage background, accents and font choice
  # based on the user's birth year. Applied as ambient tinting, never as raw UI chrome.
  era-themes:
    pre70s:    # < 1970 — sepia parchment
      primary:    "hsl(16, 25%, 30%)"   # sepia brown
      secondary:  "hsl(19, 25%, 47%)"   # warm brown
      accent:     "hsl(46, 65%, 52%)"   # vintage gold
      background: "hsl(40, 50%, 93%)"   # parchment
      font:       "'Playfair Display', serif"
      pattern:    "noise"
    "70s":     # 1970–1979 — burnt orange & goldenrod
      primary:    "hsl(33, 100%, 37%)"  # burnt orange
      secondary:  "hsl(28, 53%, 36%)"   # saddle brown
      accent:     "hsl(43, 74%, 49%)"   # goldenrod
      background: "hsl(39, 86%, 95%)"   # old lace
      font:       "'Playfair Display', serif"
      pattern:    "none"
    "80s":     # 1980–1989 — neon on dark
      primary:    "hsl(328, 100%, 54%)" # deep neon pink
      secondary:  "hsl(181, 100%, 41%)" # cyan / turquoise
      accent:     "hsl(51, 100%, 50%)"  # gold
      background: "hsl(235, 40%, 14%)"  # dark blue-black
      font:       "'VT323', monospace"
      pattern:    "grid"
    "90s":     # 1990–1999 — Memphis pop
      primary:    "hsl(210, 100%, 40%)" # primary blue
      secondary:  "hsl(48, 100%, 50%)"  # yellow
      accent:     "hsl(345, 100%, 60%)" # hot pink
      background: "hsl(0, 0%, 100%)"    # white
      font:       "'Anton', sans-serif"
      pattern:    "memphis"
    "2000s":   # 2000–2009 — early-web confidence
      primary:    "hsl(0, 0%, 20%)"
      secondary:  "hsl(204, 100%, 50%)" # bright blue
      accent:     "hsl(84, 100%, 40%)"  # lime
      background: "hsl(0, 0%, 94%)"
      font:       "'Source Sans 3', sans-serif"
      pattern:    "dots"
    "2010s":   # 2010–2019 — flat design
      primary:    "hsl(210, 29%, 24%)"
      secondary:  "hsl(6, 78%, 57%)"    # flat red
      accent:     "hsl(168, 76%, 42%)"  # turquoise
      background: "hsl(0, 0%, 98%)"
      font:       "'Source Sans 3', sans-serif"
      pattern:    "none"
    modern:    # ≥ 2020 — contemporary
      primary:    "hsl(239, 84%, 67%)"  # indigo
      secondary:  "hsl(330, 81%, 60%)"  # pink
      accent:     "hsl(160, 84%, 39%)"  # emerald
      background: "hsl(0, 0%, 98%)"
      font:       "'Source Sans 3', sans-serif"
      pattern:    "none"

  # Cinematic video module — three full-screen decade theatres applied
  # only inside the Remotion player, never to the surrounding UI.
  video-eras:
    "70s":  { bg: "hsl(15, 47%, 19%)",  text: "hsl(36, 100%, 95%)", accent: "hsl(26, 100%, 50%)",  font: "'Cooper Black', serif",      filter: "sepia(0.4) contrast(1.1) brightness(0.9)" }
    "80s":  { bg: "hsl(0, 0%, 4%)",     text: "hsl(168, 100%, 50%)", accent: "hsl(300, 100%, 50%)", font: "'Orbitron', sans-serif",    filter: "saturate(1.5) contrast(1.2) hue-rotate(-10deg)" }
    "90s":  { bg: "hsl(0, 0%, 13%)",    text: "hsl(0, 0%, 100%)",    accent: "hsl(0, 100%, 50%)",   font: "Impact, sans-serif",        filter: "contrast(1.3) grayscale(0.2)" }
    modern: { bg: "hsl(0, 0%, 100%)",   text: "hsl(0, 0%, 0%)",      accent: "hsl(217, 91%, 60%)",  font: "Inter, sans-serif",         filter: "none" }

gradient:
  warm: "linear-gradient(135deg, hsl(39, 45%, 96%) 0%, hsl(35, 40%, 90%) 100%)"
  sepia: "linear-gradient(180deg, hsl(35, 30%, 92%) 0%, hsl(30, 35%, 85%) 100%)"
  gold: "linear-gradient(135deg, hsl(43, 75%, 55%) 0%, hsl(38, 70%, 45%) 100%)"
  hero: "linear-gradient(180deg, hsl(35, 35%, 88%) 0%, hsl(39, 45%, 96%) 100%)"
  photo-vignette: "linear-gradient(180deg, transparent 60%, hsl(30, 35%, 20%, 0.15) 100%)"
  divider-ornament: "linear-gradient(90deg, transparent, hsl(border) 50%, transparent)"

typography:
  families:
    serif-display: "'Playfair Display', Georgia, serif"   # all H1–H6, editorial titles
    sans-body: "'Source Sans 3', system-ui, sans-serif"   # body, UI
    handwriting: "'Caveat', cursive"                      # polaroid captions, signatures
    mono-flap: "'Courier Prime', 'VT323', monospace"      # split-flap counter
    video-display: "'Anton', 'Abril Fatface', 'Permanent Marker', 'Orbitron'"
  weights:
    display: [400, 500, 600, 700]
    body: [300, 400, 500, 600]
    handwriting: [400, 500, 600, 700]
  scale:
    base: "16px"
    body: "1rem"
    small: "0.875rem"
    h1: "clamp(2.25rem, 5vw, 3.75rem)"
    h2: "clamp(1.75rem, 3.5vw, 2.5rem)"
    h3: "1.5rem"
    h4: "1.25rem"
  tracking:
    headings: "-0.01em"   # Tailwind tracking-tight
    flap: "0.05em"
  leading:
    body: 1.6
    display: 1.15
  italics: "Playfair Display Italic used sparingly for editorial pull-quotes"

spacing:
  unit: "0.25rem"          # 4px base (Tailwind scale)
  container-padding: "2rem"
  container-max: "1400px"  # 2xl
  section-y: "clamp(3rem, 8vw, 6rem)"
  card-padding: "1.5rem"
  divider-y: "2rem"

radius:
  base: "0.625rem"         # --radius (10px)
  lg: "0.625rem"
  md: "calc(0.625rem - 2px)"
  sm: "calc(0.625rem - 4px)"
  photo: "2px"             # near-square for vintage photo frames
  pill: "9999px"

elevation:
  soft: "0 4px 20px -4px hsl(25, 30%, 15%, 0.10)"
  card: "0 8px 30px -8px hsl(25, 30%, 15%, 0.12)"
  elevated: "0 12px 40px -12px hsl(25, 30%, 15%, 0.15)"
  photo: "0 4px 15px -2px hsl(30, 30%, 20%, 0.20), 0 2px 4px -1px hsl(30, 30%, 20%, 0.10)"
  polaroid: "0 4px 20px -4px rgba(0,0,0,0.4), 0 8px 40px -8px rgba(0,0,0,0.3), inset 0 0 0 1px rgba(0,0,0,0.05)"
  vintage-button: "0 4px 12px -2px hsl(40, 65%, 40%, 0.40)"

motion:
  easing:
    standard: "cubic-bezier(0.4, 0, 0.2, 1)"   # ease-out
    in-out: "ease-in-out"
  duration:
    fast: "200ms"
    base: "300ms"
    slow: "500ms"
    fade-in: "600ms"
  signature-animations:
    fade-in: "0 → 1 opacity, translateY(20px → 0), 600ms ease-out"
    stagger-children: "100ms cascade, up to 5 siblings"
    float: "translateY(0 ↔ -10px), 6s ease-in-out infinite"
    accordion: "200ms ease-out"
    polaroid-flip: "rotateY 180deg, 500ms ease-out, preserve-3d"
    choice-card-hover: "translateY(-4px) + shadow elevate, 300ms"
    vintage-button-hover: "translateY(-1px) + shadow grow"
  reduced-motion: "Honour prefers-reduced-motion; disable float, stagger, parallax."

breakpoints:
  xs: "375px"     # custom — small phones
  sm: "640px"
  md: "768px"
  lg: "1024px"
  xl: "1280px"
  "2xl": "1536px"
  container-cap: "1400px"

borders:
  hairline: "1px solid hsl(border)"
  photo-frame: "6px solid hsl(card) + 1px outline hsl(border)"
  ring-focus: "2px ring hsl(ring), offset 2px"
  selected-card: "2px ring hsl(accent), offset 2px"

textures:
  parchment-noise: "SVG fractalNoise, baseFrequency 0.9, blend soft-light over hsl(parchment)"
  polaroid-scratches: "SVG fractalNoise 0.8 + diagonal light/dark gradients, opacity 0.2"
  polaroid-grid-bg: "20px grid lines on hsl(260, 30%, 8%)"
  scanline-80s: "linear-gradient(transparent 50%, rgba(0,0,0,0.5) 50%)"
  vignette-90s: "radial-gradient(circle, transparent 60%, black 100%)"

components:
  button:
    primary: "bg primary, fg primary-foreground, radius md, h 2.5rem, px 1rem"
    vintage: "gradient-gold background, lifted shadow, -1px on hover, settles on press"
    sizes: { sm: "h 2.25rem px 0.75rem", default: "h 2.5rem px 1rem", lg: "h 2.75rem px 2rem", icon: "2.5rem square" }
  card:
    default: "bg card, border hairline, radius lg, shadow card"
    photo-frame: "white inner, 6px frame, 1px outline, photo shadow"
    polaroid: "white frame, 1.5–2px padding, handwriting caption, slight rotation, scratched overlay"
    choice: "lifts -4px on hover, ring-accent when selected"
  divider:
    ornament: "horizontal line that fades in/out via transparent → border → transparent, 2rem vertical margin"
  timeline-marker:
    dot: "12px accent disc, 4px background ring, 6px translucent accent halo"
  split-flap-counter:
    panel-bg: "hsl(25, 20%, 12%)"
    panel-fg: "hsl(43, 70%, 50%)"
    font: "Courier Prime / VT323 monospace, bold, tracking 0.05em"
  inputs:
    default: "h 2.5rem, border input, radius md, focus ring 2px hsl(ring) offset 2px"
  scrollbars:
    hide-utility: "available via .hide-scrollbar (no visible track)"

iconography:
  set: "lucide-react"
  size-default: "1rem (16px)"
  stroke: "current"
  voice: "Friendly, light line weight; never neon or technical."

imagery:
  treatment: "Sepia-overlaid photographs, soft vignettes, subtle grain. Polaroid frames for personal moments. Era-specific filters in video module (sepia ’70s, neon-VHS ’80s, grunge ’90s, modern clean post-2000)."
  ratios: "16:10 hero, 4:5 polaroid, 1:1 grid thumbnails, 9:16 social-share portraits (1080×1920)"
  loading: "Always referrerPolicy=no-referrer; lazy by default; reserve aspect-ratio to prevent layout shift"

accessibility:
  contrast: "Body text foreground vs background ≥ 11:1; primary on bg ≥ 7:1; gold accent reserved for non-essential highlights and large UI."
  focus: "Visible 2px ring in hsl(ring) on every interactive element."
  motion: "Respect prefers-reduced-motion."
  hit-target: "Minimum 40px on mobile."
---

# Nostalgic Timeline — Design System

## 1. Voice & Intent

This product invites someone — typically 40 years and older — to look back on the years
that shaped them. The interface should feel like opening a hand-bound family album: paper
you can almost touch, ink that has aged warmly, gilded accents on the spine, and the
faint imperfections that make memories feel real. Nothing here should look "AI-generated,"
neon-bright, or pastel-tech. Think *editorial magazine meets shoebox of photographs*.

Three emotional notes guide every screen:

1. **Reverence** — the user's life is the subject. White space, generous typography and
   editorial pacing keep the experience calm and dignified.
2. **Warmth** — every neutral leans amber, every shadow is a soft brown rather than grey.
   Cold tech-blues and pure-black are forbidden in the day theme.
3. **Wonder** — small surprises (split-flap counter, polaroid flip, parallax music
   sidebar) reward attention without ever feeling gimmicky.

## 2. Light & Dark Modes

The default is **light** — a warm cream paper (≈ HSL 39 / 45 / 96) with deep ink-brown
text. Dark mode is supported but secondary; it is intentionally a dim, candlelit room
rather than a black OLED — backgrounds sit around HSL 25 / 30 / 8, and the gold accent
becomes the lead colour. Never invert sepia browns to greys; instead darken them while
preserving hue.

## 3. Colour Story

- **Primary — Sepia Brown.** Used for serious surfaces, dependable buttons and links.
  It is the ink the album is written in.
- **Accent — Vintage Gold.** Used sparingly: focus rings, key call-to-action buttons,
  timeline markers, decorative ornaments. Treat it as gold leaf — too much and it
  cheapens the whole piece.
- **Parchment & Faded Photo.** Backdrop colours behind cards and imagery. They give the
  composition tooth.
- **Era Accents (Polaroid neons).** Quarantined to the polaroid collage and shareable
  portrait artwork. They never appear in core navigation, body copy or buttons.
- **Video-mode era palettes.** Inside the Remotion video player, three additional
  themes activate per decade (warm sepia ’70s, neon-VHS ’80s, grunge ’90s). They live
  *only* inside the cinematic viewer and never bleed onto product chrome.

## 4. Typography

A two-voice system:

- **Playfair Display** is the storyteller — every heading, every editorial title, every
  pull-quote. Italic cuts are reserved for emotional emphasis, never for whole paragraphs.
- **Source Sans 3** is the narrator — UI labels, body, captions. Comfortable line-height
  (≈ 1.6) keeps long retrospective text readable on tablets and phones.

Two specialist voices appear in specific moments:

- **Caveat (handwriting)** writes the captions on Polaroid cards and signatures on the
  bottom of shareable images.
- **Courier Prime / VT323** drives the analog *split-flap* time-travel counter that
  ticks from the present year down to the user's birth year before the story loads.

Headings always use `tracking-tight`. Body text never goes below 14 px.

## 5. Layout & Rhythm

- The container caps at **1400 px** with **2 rem** side padding. Editorial pages use
  generous vertical rhythm — `clamp(3rem, 8vw, 6rem)` between major sections.
- The base spacing unit is **4 px**. Multiples of 4/8/12/16 are preferred; avoid odd
  values that break vertical alignment with photo frames and polaroids.
- A custom **`xs` breakpoint at 375 px** keeps small-phone grids honest. Mobile layouts
  prefer stacking over horizontal scroll, especially on the story page.
- Decorative **horizontal ornament dividers** (a hairline that fades in and out through
  the border colour) replace generic section breaks throughout long-form content.

## 6. Shape, Surface & Depth

- **Radii** are gentle: 10 px for cards and buttons, 2 px for the rectangular photo
  frames. Pills are reserved for tags and chips.
- **Shadows** are warm-brown, never neutral grey. Four levels — *soft → card → elevated
  → photo* — provide an obvious lift hierarchy. Photo and polaroid shadows include a
  subtle inner outline so cards read as physical objects on textured backgrounds.
- **Photo frames** wear a 6 px white card border plus a 1 px outline — the look of a
  matted print in an album sleeve.
- **Parchment texture** (SVG fractal noise, soft-light blend) lives behind hero
  surfaces. **Polaroid scratches** add diagonal highlights and grain to album artwork.

## 7. Motion

Motion is *theatrical but unhurried*. Default duration is 300 ms with an ease-out curve;
storytelling moments stretch to 500–600 ms.

Signature animations:

- **Fade-up entrance** (20 px → 0, 600 ms) for any content that scrolls into view, with
  a 100 ms stagger across siblings.
- **Polaroid 3D flip** (500 ms, preserve-3d) when a memory card reveals its back.
- **Choice-card lift** (–4 px translate + shadow upgrade) on hover.
- **Vintage-button press** — lifts on hover, settles on press, with a gold gradient
  interior.
- **Float** (–10 px, 6 s loop) for ornamental decorations only.
- **Time-travel split-flap counter** as the cinematic load state — counts from the
  current year down to the user's birth year, then holds for ≈ 4 s before transitioning
  into the story.
- **Parallax music sidebar** drifts at ≈ 15 % of scroll velocity to feel weightless
  beside the main editorial column.

All decorative motion respects `prefers-reduced-motion` and degrades to instant fades.

## 8. Components

- **Buttons.** Default is solid primary. The bespoke *vintage* variant (gold gradient,
  lifted shadow) is reserved for hero CTAs and high-emotion moments (Save, Share,
  Generate). Outline and ghost variants handle secondary actions.
- **Cards.** Standard cards use a hairline border, large radius and the *card* shadow.
  *Photo* cards add the white frame and outline. *Polaroid* cards add scratches,
  handwriting captions and a slight random rotation.
- **Inputs.** 40 px height, hairline border, 2 px gold focus ring offset by 2 px on the
  background.
- **Timeline markers.** A 12 px gold disc surrounded by a 4 px background ring and a
  6 px translucent halo — the visual hook of the entire product.
- **Split-flap counter.** Dark warm-brown panels with gold digits, monospaced, bold,
  letter-spaced 0.05 em. Used exclusively for the loading countdown.
- **Dividers.** Always the ornament style — never a flat 1 px line in body copy.

## 9. Imagery & Iconography

- **Photographs** are the heroes. Apply a soft sepia-style overlay (15 % brown gradient
  toward the bottom) to harmonise mismatched sources.
- **Aspect ratios** are reserved up-front to prevent layout shift: 16:10 for hero
  banners, 4:5 for polaroids, 1:1 for grid thumbnails, 9:16 (1080×1920) for shareable
  portrait artwork.
- **Icons** come from lucide-react at 16 px, current colour, light stroke. They support
  the type — they never dominate.
- All `<img>` tags ship with `referrerPolicy="no-referrer"` to survive anti-hotlinking
  on heritage image sources.

## 10. Era Modes (Cinematic Only)

When the user enters the Remotion video player, the experience adopts a per-decade
visual identity that lives entirely within the player canvas:

- **’70s — Vintage Warmth:** chocolate background, cream text, orange accent, Cooper
  Black headings, sepia + warm contrast filter.
- **’80s — Neon VHS:** near-black background, cyan text, magenta accent, Orbitron
  headings, scanline overlay, hue-shifted saturation.
- **’90s — Grunge Pop:** charcoal background, white text, red accent, Impact + Comic
  Sans pairing, vignette overlay.
- **2000+ — Modern Clean:** white background, black text, blue accent, Inter throughout,
  no filters.

These themes never escape the cinematic surface — the surrounding product chrome
remains warm-cream-and-sepia at all times.

## 11. Accessibility & Restraint

- Body text contrast against the cream background exceeds 11:1; primary brown buttons
  exceed 7:1.
- Gold accent is decorative-first; when used as a foreground colour it is paired only
  with the deep ink background and at sizes ≥ 18 px bold.
- Every interactive element shows a visible 2 px gold focus ring offset by 2 px.
- Touch targets stay ≥ 40 px on mobile.
- Long retrospective copy is editorial in tone but constrained: event descriptions are
  capped at 40–60 words to prevent overwhelm.

## 12. What This Design Is *Not*

- Not a SaaS dashboard. No info-dense tables, no neon status pills, no Inter / Poppins.
- Not flat or pastel. Every surface should feel touched by light, paper, or grain.
- Not minimalist for minimalism's sake. Decoration (ornament dividers, polaroid
  rotations, split-flap counter) is part of the brand and should never be removed in
  the name of "cleaner UI."
- Not loud. Era neons, scanlines and VHS effects belong in the cinematic player only.

When in doubt: imagine printing the screen and pressing it between the pages of a
leather-bound album. If it looks at home there, it's on-brand.
