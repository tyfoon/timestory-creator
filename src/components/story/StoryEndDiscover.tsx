/**
 * StoryEndDiscover — replacement layout for the bottom-of-page carousels.
 *
 * Two-tier layout:
 *  1. Hero card (state-aware): shows the user's freshly-generated music video
 *     prominently when it's READY but NOT YET VIEWED. Disappears once viewed
 *     (the music video then takes its place as a regular tile in the row).
 *  2. Tiles row: a horizontal scroll of compact tiles for everything else
 *     (Music, TV/Film, Polaroid, PDF, Roast, Spoken story, Personalized).
 *
 * Why hero instead of "card 1 in carousel": the original StoryEndCarousel
 * presented all 8 cards at equal visual weight; users couldn't distinguish
 * "the wow we made for you right now" from "more things you can do later".
 *
 * Why state-aware: once the user has watched their music video, the wow is
 * consumed — the big hero is no longer warranted, but the asset remains
 * accessible as a tile.
 *
 * The pill component (`MusicVideoReadyNotifier`) handles the *generation*
 * status (progress, "klaar"-toast). This component handles the *consumption*
 * surface (hero + tiles).
 *
 * Iteration 1 scope (MVP):
 *   - Hero CTA only — no inline Remotion player. User clicks → /muziek-video
 *     for the full player. Trade-off accepted to keep this commit small.
 *   - Wired only on /story. Other pages keep SharedExperienceCarousel for
 *     now; consolidation is iteration 2.
 *   - Old StoryEndCarousel stays in place as rollback target.
 */

import { useEffect, useRef, useState, useMemo } from 'react';
import { useNavigate } from 'react-router-dom';
import { motion, useInView } from 'framer-motion';
import {
  Music, Mic, Image, FileText, Sparkles, ChevronLeft, ChevronRight,
  Crown, Gift, Lock, Flame, ListMusic, Tv, Film, Play, Loader2,
} from 'lucide-react';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import { useLanguage } from '@/contexts/LanguageContext';
import { useSoundtrackGeneration } from '@/hooks/useSoundtrackGeneration';

export type DiscoverPage =
  | 'story'
  | 'polaroid'
  | 'music-overview'
  | 'tv-film-overview'
  | 'music-video';

export type DiscoverTileId =
  | 'music-video'
  | 'music-overview'
  | 'tv-film-overview'
  | 'polaroids'
  | 'personalized'
  | 'roast'
  | 'spoken-story'
  | 'presentation';

interface TileDef {
  id: DiscoverTileId;
  title: string;
  subtitle: string;
  icon: React.ReactNode;
  isPremium: boolean;
  accentColor: string;
}

interface StoryEndDiscoverProps {
  /** Which page this is being rendered on — used to (a) hide the redundant
   *  current-page tile and (b) suppress the hero on /muziek-video itself. */
  currentPage: DiscoverPage;
  /** Search params to preserve in navigation links (year-range, city, etc.) */
  searchParams?: URLSearchParams;
  /** Optional click overrides — e.g. /story passes a callback for "polaroids"
   *  that opens an inline modal instead of navigating. */
  tileActions?: Partial<Record<DiscoverTileId, () => void>>;
  /** Optional override for the hero "Bekijk video" click (defaults to
   *  navigate('/muziek-video')). */
  onWatchMusicVideo?: () => void;
}

const VIEWED_KEY = (audioUrl: string) => `music_video_viewed_${audioUrl}`;

export const StoryEndDiscover = ({
  currentPage,
  searchParams,
  tileActions,
  onWatchMusicVideo,
}: StoryEndDiscoverProps) => {
  const navigate = useNavigate();
  const { t } = useLanguage();
  const soundtrack = useSoundtrackGeneration();
  const sectionRef = useRef<HTMLDivElement>(null);
  const tilesRef = useRef<HTMLDivElement>(null);
  const isInView = useInView(sectionRef, { once: true, margin: '-80px' });
  const [canScrollLeft, setCanScrollLeft] = useState(false);
  const [canScrollRight, setCanScrollRight] = useState(true);

  const params = searchParams?.toString() ? `?${searchParams.toString()}` : '';

  // ─── Music-video viewed state ─────────────────────────────────────────
  // Tracked per audioUrl in localStorage so a user who has watched their
  // current track sees the hero demoted to a tile. Resets implicitly when
  // a new audioUrl arrives (different track = different key = false).
  const audioUrl = soundtrack.audioUrl ?? null;
  const isMusicVideoReady = soundtrack.isComplete && !!audioUrl;

  const [hasViewed, setHasViewed] = useState<boolean>(() => {
    if (!audioUrl) return false;
    try {
      return localStorage.getItem(VIEWED_KEY(audioUrl)) === '1';
    } catch {
      return false;
    }
  });

  useEffect(() => {
    if (!audioUrl) {
      setHasViewed(false);
      return;
    }
    try {
      setHasViewed(localStorage.getItem(VIEWED_KEY(audioUrl)) === '1');
    } catch {
      setHasViewed(false);
    }
  }, [audioUrl]);

  // ─── Layout decision ──────────────────────────────────────────────────
  // Hero shows when: video is ready AND user hasn't viewed it yet AND
  // we're not already on the dedicated music-video page.
  const showHero = isMusicVideoReady && !hasViewed && currentPage !== 'music-video';

  // ─── Tile definitions ─────────────────────────────────────────────────
  const allTiles: TileDef[] = useMemo(() => [
    {
      id: 'music-video',
      title: t('myMusicVideo') as string || 'Mijn Muziekvideo',
      subtitle: (t('aiMusicVideo') as string) || 'AI-muziek',
      icon: <Film className="h-5 w-5" />,
      isPremium: false,
      accentColor: 'text-violet-400',
    },
    {
      id: 'music-overview',
      title: t('myLifeInMusic') as string,
      subtitle: t('allNumberOneHits') as string,
      icon: <ListMusic className="h-5 w-5" />,
      isPremium: false,
      accentColor: 'text-[#1DB954]',
    },
    {
      id: 'tv-film-overview',
      title: t('myLifeInTvFilm') as string,
      subtitle: t('seriesAndFilms') as string,
      icon: <Tv className="h-5 w-5" />,
      isPremium: false,
      accentColor: 'text-red-400',
    },
    {
      id: 'polaroids',
      title: t('myLifeInPolaroids') as string,
      subtitle: t('retroStyle') as string,
      icon: <Image className="h-5 w-5" />,
      isPremium: false,
      accentColor: 'text-sky-400',
    },
    {
      id: 'personalized',
      title: t('fullyPersonalized') as string,
      subtitle: t('fortyEvents') as string,
      icon: <Sparkles className="h-5 w-5" />,
      isPremium: true,
      accentColor: 'text-amber-400',
    },
    {
      id: 'roast',
      title: t('roastMyLife') as string,
      subtitle: t('aiHumorShareable') as string,
      icon: <Flame className="h-5 w-5" />,
      isPremium: false,
      accentColor: 'text-orange-400',
    },
    {
      id: 'spoken-story',
      title: t('spokenStory') as string,
      subtitle: t('aiVoiceNarration') as string,
      icon: <Mic className="h-5 w-5" />,
      isPremium: true,
      accentColor: 'text-emerald-400',
    },
    {
      id: 'presentation',
      title: t('myLifeAsPresentation') as string,
      subtitle: t('pdfAlbum') as string,
      icon: <FileText className="h-5 w-5" />,
      isPremium: true,
      accentColor: 'text-rose-400',
    },
  ], [t]);

  // Filter rules:
  //   - Hide music-video tile if it's currently the hero (not viewed yet).
  //   - Hide the current-page tile (you're already there).
  //   - Hide music-video tile if not ready (pill handles in-progress state).
  const tiles = useMemo(() => {
    const currentPageToTileId: Partial<Record<DiscoverPage, DiscoverTileId>> = {
      'music-overview': 'music-overview',
      'tv-film-overview': 'tv-film-overview',
      'polaroid': 'polaroids',
      'music-video': 'music-video',
    };
    const hideId = currentPageToTileId[currentPage];

    return allTiles.filter((tile) => {
      if (tile.id === hideId) return false;
      if (tile.id === 'music-video') {
        if (!isMusicVideoReady) return false;  // not made yet → no tile
        if (showHero) return false;            // it's the hero → not also a tile
      }
      return true;
    });
  }, [allTiles, currentPage, isMusicVideoReady, showHero]);

  // ─── Default click actions ────────────────────────────────────────────
  const defaultActions: Record<DiscoverTileId, () => void> = {
    'music-video': () => navigate(`/muziek-video${params}`),
    'music-overview': () => navigate(`/muziek${params}`),
    'tv-film-overview': () => navigate(`/tv-film${params}`),
    'personalized': () => navigate(`/story${params}`),
    'roast': () => navigate(`/story${params}`),
    'spoken-story': () => navigate(`/story${params}`),
    'polaroids': () => navigate(`/polaroid${params}`),
    'presentation': () => navigate(`/story${params}`),
  };

  const getTileAction = (id: DiscoverTileId) => tileActions?.[id] || defaultActions[id];

  const handleWatchHero = () => {
    if (onWatchMusicVideo) onWatchMusicVideo();
    else navigate(`/muziek-video${params}`);
  };

  // ─── Tiles-row scroll bookkeeping ─────────────────────────────────────
  const updateScrollState = () => {
    const el = tilesRef.current;
    if (!el) return;
    setCanScrollLeft(el.scrollLeft > 10);
    setCanScrollRight(el.scrollLeft < el.scrollWidth - el.clientWidth - 10);
  };

  useEffect(() => {
    const el = tilesRef.current;
    if (!el) return;
    el.addEventListener('scroll', updateScrollState, { passive: true });
    updateScrollState();
    return () => el.removeEventListener('scroll', updateScrollState);
  }, [tiles.length]);

  const scrollTilesBy = (direction: 'left' | 'right') => {
    const el = tilesRef.current;
    if (!el) return;
    const amount = direction === 'left' ? -240 : 240;
    el.scrollBy({ left: amount, behavior: 'smooth' });
  };

  return (
    <motion.section
      ref={sectionRef}
      initial={{ opacity: 0, y: 60 }}
      animate={isInView ? { opacity: 1, y: 0 } : {}}
      transition={{ duration: 0.8, ease: [0.25, 0.1, 0.25, 1] }}
      className="py-12 sm:py-16"
    >
      {/* ─── Hero card (state-aware) ──────────────────────────────────── */}
      {showHero && (
        <motion.div
          initial={{ opacity: 0, y: 30, scale: 0.97 }}
          animate={isInView ? { opacity: 1, y: 0, scale: 1 } : {}}
          transition={{ duration: 0.6, delay: 0.1 }}
          className="mb-10"
          id="music-video-card"
        >
          <div className="relative overflow-hidden rounded-2xl border border-violet-500/30 bg-card shadow-xl shadow-primary/10">
            <div className="absolute inset-0 bg-gradient-to-br from-violet-500/15 via-fuchsia-500/8 to-transparent pointer-events-none" />

            {/* Top strip — fresh badge */}
            <div className="absolute top-3 right-3 z-10 flex items-center gap-2">
              <Badge className="bg-emerald-500/90 text-white border-emerald-400 gap-1 text-[11px] font-bold uppercase tracking-wide shadow-md shadow-emerald-900/30 px-3 py-1">
                <Sparkles className="h-3.5 w-3.5" />
                {t('justReady') as string || 'Net klaar'}
              </Badge>
              <Badge variant="secondary" className="bg-emerald-500/90 text-white border-emerald-400 gap-1 text-[11px] font-bold uppercase tracking-wide px-3 py-1">
                <Gift className="h-3.5 w-3.5" />
                Gratis
              </Badge>
            </div>

            <div className="relative z-[1] p-6 sm:p-8 grid grid-cols-1 sm:grid-cols-[auto_1fr] gap-5 sm:gap-7 items-center">
              {/* Big play visual */}
              <div className="relative flex-shrink-0 w-24 h-24 sm:w-32 sm:h-32 rounded-2xl bg-gradient-to-br from-violet-600 to-fuchsia-600 flex items-center justify-center shadow-lg shadow-violet-900/30">
                <Play className="h-10 w-10 sm:h-14 sm:w-14 text-white fill-white drop-shadow" />
                <motion.span
                  className="absolute inset-0 rounded-2xl border-2 border-violet-400/50"
                  animate={{ scale: [1, 1.06, 1], opacity: [0.5, 0, 0.5] }}
                  transition={{ duration: 2.2, repeat: Infinity }}
                />
              </div>

              <div className="flex-1 min-w-0">
                <p className="font-mono text-[11px] uppercase tracking-[0.18em] text-violet-300 mb-2">
                  {t('yourPersonalMusicVideo') as string || 'Jouw persoonlijke muziekvideo'}
                </p>
                <h3 className="font-serif text-2xl sm:text-3xl font-bold text-foreground leading-tight mb-2">
                  {soundtrack.title || (t('musicVideoReady') as string) || 'Klaar om af te spelen'}
                </h3>
                {soundtrack.style && (
                  <p className="text-sm text-muted-foreground line-clamp-1 mb-4">
                    {soundtrack.style}
                  </p>
                )}
                <div className="flex flex-wrap gap-2 mt-2">
                  <Button
                    size="lg"
                    onClick={handleWatchHero}
                    className="gap-2 bg-violet-600 hover:bg-violet-700 text-white border-0"
                  >
                    <Play className="h-4 w-4 fill-current" />
                    {t('watchVideo') as string || 'Bekijk video'}
                  </Button>
                </div>
              </div>
            </div>
          </div>
        </motion.div>
      )}

      {/* ─── Section header for the tiles ─────────────────────────────── */}
      <div className="px-4 sm:px-0 mb-5 flex items-end justify-between">
        <div>
          <p className="font-mono text-xs uppercase tracking-[0.2em] text-muted-foreground mb-1.5">
            {showHero
              ? (t('alsoForYou') as string || 'Ook voor jou')
              : (t('discoverMore') as string || 'Ontdek meer')}
          </p>
          <h2 className="font-serif text-xl sm:text-2xl font-bold text-foreground leading-tight">
            {t('takeYourStory') as string}
          </h2>
        </div>
        {/* Desktop scroll arrows */}
        <div className="hidden sm:flex items-center gap-2">
          <Button
            variant="outline"
            size="icon"
            className={`h-9 w-9 rounded-full transition-opacity ${canScrollLeft ? 'opacity-100' : 'opacity-30 pointer-events-none'}`}
            onClick={() => scrollTilesBy('left')}
            aria-label="Vorige"
          >
            <ChevronLeft className="h-4 w-4" />
          </Button>
          <Button
            variant="outline"
            size="icon"
            className={`h-9 w-9 rounded-full transition-opacity ${canScrollRight ? 'opacity-100' : 'opacity-30 pointer-events-none'}`}
            onClick={() => scrollTilesBy('right')}
            aria-label="Volgende"
          >
            <ChevronRight className="h-4 w-4" />
          </Button>
        </div>
      </div>

      {/* ─── Tiles row ────────────────────────────────────────────────── */}
      <div className="relative">
        <div
          ref={tilesRef}
          className="flex gap-3 sm:gap-4 overflow-x-auto pb-3 -mx-4 px-4 sm:mx-0 sm:px-0 snap-x snap-proximity"
          style={{ scrollbarWidth: 'thin', WebkitOverflowScrolling: 'touch' }}
        >
          {tiles.map((tile, index) => (
            <motion.button
              key={tile.id}
              type="button"
              initial={{ opacity: 0, y: 20 }}
              animate={isInView ? { opacity: 1, y: 0 } : {}}
              transition={{ duration: 0.4, delay: index * 0.04 }}
              onClick={getTileAction(tile.id)}
              className="group flex-shrink-0 snap-start w-[170px] sm:w-[200px] text-left rounded-xl border border-border bg-card hover:border-primary/40 hover:shadow-lg hover:shadow-primary/5 transition-all overflow-hidden"
            >
              <div className="relative p-4 h-full flex flex-col">
                {tile.isPremium && (
                  <Badge className="absolute top-2 right-2 bg-amber-500/90 text-white border-amber-400 gap-1 text-[9px] font-bold uppercase px-1.5 py-0 h-5">
                    <Crown className="h-2.5 w-2.5" />
                    Pro
                  </Badge>
                )}
                <div className={`w-9 h-9 rounded-lg bg-background/80 flex items-center justify-center mb-3 ${tile.accentColor} border border-border/50`}>
                  {tile.icon}
                </div>
                <h4 className="font-serif text-sm font-bold text-foreground leading-tight mb-0.5 line-clamp-2">
                  {tile.title}
                </h4>
                <p className="text-[11px] text-muted-foreground line-clamp-1 mb-3">
                  {tile.subtitle}
                </p>
                <div className="flex items-center gap-1 text-[11px] text-muted-foreground group-hover:text-primary transition-colors mt-auto">
                  {tile.isPremium ? <Lock className="h-3 w-3" /> : <ChevronRight className="h-3 w-3" />}
                  <span>{tile.isPremium ? (t('unlock') as string || 'Ontgrendel') : (t('open') as string || 'Open')}</span>
                </div>
              </div>
            </motion.button>
          ))}
        </div>

        {/* Edge gradients to hint scrollability */}
        <div className="pointer-events-none absolute left-0 top-0 bottom-3 w-6 bg-gradient-to-r from-background to-transparent sm:hidden" />
        <div className="pointer-events-none absolute right-0 top-0 bottom-3 w-6 bg-gradient-to-l from-background to-transparent sm:hidden" />
      </div>
    </motion.section>
  );
};

export default StoryEndDiscover;
