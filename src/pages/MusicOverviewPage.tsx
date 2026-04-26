/**
 * MusicOverviewPage - "Mijn Leven in Muziek"
 * Shows a year-by-year horizontal grid of #1 hits with Spotify embeds,
 * favorites, bookmark-to-account, and playlist export.
 * Includes country-specific local hits based on user's city.
 */
import { useEffect, useState, useMemo, useCallback } from 'react';
import { useNavigate, useSearchParams } from 'react-router-dom';
import { motion } from 'framer-motion';
import { ArrowLeft, Heart, Loader2, Music, Play, Pause, X, ListMusic, Bookmark, BookmarkCheck, Globe, MapPin } from 'lucide-react';
import { SharedExperienceCarousel } from '@/components/story/SharedExperienceCarousel';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import { supabase } from '@/integrations/supabase/client';
import { invokeWithRetry } from '@/lib/api/invokeWithRetry';
import { numberOneHits, NumberOneHit } from '@/data/numberOneHits';
import { AccountLink } from '@/components/AccountLink';
import { useToast } from '@/hooks/use-toast';
import { useAuth } from '@/contexts/AuthContext';
import { useLanguage } from '@/contexts/LanguageContext';
import { readOverviewCache, writeOverviewCache } from '@/lib/overviewCache';

interface SpotifyTrackResult {
  trackId: string;
  trackName: string;
  artistName: string;
  albumName: string;
  albumImage: string | null;
  previewUrl: string | null;
  spotifyUrl: string;
}

interface ResolvedHit {
  year: number;
  hit: NumberOneHit;
  spotify: SpotifyTrackResult | null;
  loading: boolean;
  isLocal?: boolean; // true = country-specific hit
}

const MusicOverviewPage = () => {
  const navigate = useNavigate();
  const [searchParams] = useSearchParams();
  const { toast } = useToast();
  const { user } = useAuth();
  const { t, language } = useLanguage();
  const tStr = (k: Parameters<typeof t>[0], vars?: Record<string, string | number>) => {
    let s = t(k) as string;
    if (vars) for (const [key, val] of Object.entries(vars)) s = s.replace(`{${key}}`, String(val));
    return s;
  };

  const startYear = parseInt(searchParams.get('start') || '1980', 10);
  const endYear = parseInt(searchParams.get('end') || String(new Date().getFullYear()), 10);
  const city = searchParams.get('city') || '';

  // Try to hydrate from cache on first render
  const cached = useMemo(
    () => readOverviewCache<{ hits: ResolvedHit[]; country: string | null }>(
      'music-overview', startYear, endYear, city, language
    ),
    [startYear, endYear, city, language]
  );

  const [resolvedHits, setResolvedHits] = useState<ResolvedHit[]>(cached?.hits || []);
  const [favorites, setFavorites] = useState<Set<string>>(new Set());
  const [savedTracks, setSavedTracks] = useState<Set<string>>(new Set());
  const [activeTrackId, setActiveTrackId] = useState<string | null>(null);
  const [isLoading, setIsLoading] = useState(!cached);
  const [loadedCount, setLoadedCount] = useState(cached ? cached.hits.length : 0);
  const [localHitsCountry, setLocalHitsCountry] = useState<string | null>(cached?.country || null);
  const [localHitsLoading, setLocalHitsLoading] = useState(false);
  const hasCache = !!cached;

  // Build the list of global hits for the year range
  const globalHits = useMemo(() => {
    const currentYear = new Date().getFullYear();
    const end = Math.min(endYear, currentYear);
    const result: { year: number; hit: NumberOneHit; isLocal: boolean }[] = [];
    for (let yr = startYear; yr <= end; yr++) {
      const hits = numberOneHits[yr];
      if (hits) {
        hits.forEach(hit => result.push({ year: yr, hit, isLocal: false }));
      }
    }
    return result;
  }, [startYear, endYear]);

  // Fetch local hits from AI based on city
  useEffect(() => {
    if (!city || hasCache) return;
    let cancelled = false;

    const fetchLocalHits = async () => {
      setLocalHitsLoading(true);
      try {
        const { data, error } = await supabase.functions.invoke('generate-local-hits', {
          body: { startYear, endYear, city, language }
        });

        if (cancelled || error || !data?.hits) return;

        setLocalHitsCountry(data.country || null);

        // Convert AI response to hit entries
        const localEntries: { year: number; hit: NumberOneHit; isLocal: boolean }[] = [];
        for (const [yearStr, hits] of Object.entries(data.hits)) {
          const yr = parseInt(yearStr, 10);
          if (Array.isArray(hits)) {
            (hits as any[]).forEach((h: any) => {
              if (h.artist && h.title) {
                localEntries.push({
                  year: yr,
                  hit: { artist: h.artist, title: h.title },
                  isLocal: true,
                });
              }
            });
          }
        }

        // Merge with global hits - add local hits that aren't already in global
        setResolvedHits(prev => {
          const existingKeys = new Set(prev.map(rh => `${rh.year}-${rh.hit.artist}-${rh.hit.title}`.toLowerCase()));
          const newLocalHits: ResolvedHit[] = localEntries
            .filter(e => !existingKeys.has(`${e.year}-${e.hit.artist}-${e.hit.title}`.toLowerCase()))
            .map(e => ({ year: e.year, hit: e.hit, spotify: null, loading: true, isLocal: true }));
          
          if (newLocalHits.length === 0) return prev;

          const merged = [...prev, ...newLocalHits];

          // Fetch Spotify data for new local hits; surface a toast if any
          // calls actually errored out (errorCount excludes "no match" results).
          fetchSpotifyForHits(newLocalHits, merged.length - newLocalHits.length)
            .then(({ errorCount }) => {
              if (errorCount > 0 && !cancelled) {
                toast({
                  variant: 'destructive',
                  title: t('errorLabel') as string,
                  description: tStr('spotifyFailedSummary', { count: errorCount, total: newLocalHits.length }),
                });
              }
            })
            .catch(() => { /* fetchSpotifyForHits already swallows internal errors */ });

          return merged;
        });
      } catch (err) {
        console.error('[MusicOverview] Failed to fetch local hits:', err);
        if (!cancelled) {
          toast({
            variant: 'destructive',
            title: t('errorLabel') as string,
            description: t('localHitsFetchError') as string,
          });
        }
      } finally {
        if (!cancelled) setLocalHitsLoading(false);
      }
    };

    fetchLocalHits();
    return () => { cancelled = true; };
  }, [city, startYear, endYear]);

  // Fetch Spotify data for a batch of hits and update state at given offset.
  // Batches run with a concurrency cap so independent network round-trips
  // overlap (~7 batches at concurrency 4 ≈ 2× speedup vs the previous strict
  // sequential loop). Real upstream errors throw (counted as rejected by
  // Promise.allSettled); a successful response with no trackId resolves to
  // null (= no Spotify match for that song, not a failure). Caller can use
  // `errorCount` to surface a toast when the upstream is genuinely flaky.
  const fetchSpotifyForHits = useCallback(async (hits: ResolvedHit[], startOffset: number): Promise<{ errorCount: number }> => {
    const batchSize = 5;
    const concurrency = 4;
    let errorCount = 0;

    const batches: Array<{ relativeIdx: number; items: ResolvedHit[] }> = [];
    for (let i = 0; i < hits.length; i += batchSize) {
      batches.push({ relativeIdx: i, items: hits.slice(i, i + batchSize) });
    }

    const queue = [...batches];

    const runOneBatch = async ({ relativeIdx, items }: { relativeIdx: number; items: ResolvedHit[] }) => {
      const results = await Promise.allSettled(
        items.map(async ({ hit }) => {
          const query = `${hit.artist} - ${hit.title}`;
          const { data, error } = await invokeWithRetry<SpotifyTrackResult>('search-spotify', {
            body: { query },
          });
          if (error) throw error;             // real failure
          if (!data?.trackId) return null;    // no match (not a failure)
          return data;
        })
      );

      for (const r of results) {
        if (r.status === 'rejected') errorCount++;
      }

      // Functional state update — safe under concurrent batch completions.
      setResolvedHits(prev => {
        const updated = [...prev];
        for (let j = 0; j < items.length; j++) {
          const idx = startOffset + relativeIdx + j;
          if (idx < updated.length) {
            const r = results[j];
            updated[idx] = {
              ...updated[idx],
              spotify: r.status === 'fulfilled' ? r.value : null,
              loading: false,
            };
          }
        }
        return updated;
      });
    };

    const worker = async () => {
      while (queue.length > 0) {
        const next = queue.shift();
        if (!next) return;
        await runOneBatch(next);
      }
    };

    await Promise.all(
      Array.from({ length: Math.min(concurrency, batches.length) }, () => worker())
    );

    return { errorCount };
  }, []);

  // Group by year for rendering
  const hitsByYear = useMemo(() => {
    const map = new Map<number, ResolvedHit[]>();
    for (const rh of resolvedHits) {
      if (!map.has(rh.year)) map.set(rh.year, []);
      map.get(rh.year)!.push(rh);
    }
    // Sort each year's hits: local first, then global
    for (const [, hits] of map) {
      hits.sort((a, b) => {
        if (a.isLocal && !b.isLocal) return -1;
        if (!a.isLocal && b.isLocal) return 1;
        return 0;
      });
    }
    return Array.from(map.entries()).sort((a, b) => a[0] - b[0]);
  }, [resolvedHits]);

  // Fetch Spotify data for global hits in batches
  useEffect(() => {
    if (hasCache) {
      setIsLoading(false);
      return;
    }
    let cancelled = false;

    const fetchAll = async () => {
      setIsLoading(true);

      const initial: ResolvedHit[] = globalHits.map(({ year, hit, isLocal }) => ({
        year, hit, spotify: null, loading: true, isLocal,
      }));
      setResolvedHits(initial);

      // Spotify resolution: previously sequential batches (each batch waits
      // for the previous before kicking off). Run with a concurrency cap so
      // 4 batches resolve simultaneously — for the typical ~7-batch case
      // this halves total wait. Each batch updates resolvedHits + loadedCount
      // independently as soon as its results arrive.
      const batchSize = 5;
      const concurrency = 4;
      let errorCount = 0;

      const batches: Array<{ startIdx: number; items: typeof globalHits }> = [];
      for (let i = 0; i < globalHits.length; i += batchSize) {
        batches.push({ startIdx: i, items: globalHits.slice(i, i + batchSize) });
      }

      const queue = [...batches];

      const runOneBatch = async ({ startIdx, items }: { startIdx: number; items: typeof globalHits }) => {
        const results = await Promise.allSettled(
          items.map(async ({ hit }) => {
            const query = `${hit.artist} - ${hit.title}`;
            const { data, error } = await invokeWithRetry<SpotifyTrackResult>('search-spotify', {
              body: { query },
            });
            if (error) throw error;             // real failure → rejected
            if (!data?.trackId) return null;    // no Spotify match (OK)
            return data;
          })
        );

        if (cancelled) return;

        for (const r of results) {
          if (r.status === 'rejected') errorCount++;
        }

        // Functional state updates avoid races between concurrent batches.
        setResolvedHits(prev => {
          const updated = [...prev];
          for (let j = 0; j < items.length; j++) {
            const idx = startIdx + j;
            if (idx < updated.length) {
              const r = results[j];
              updated[idx] = {
                ...updated[idx],
                spotify: r.status === 'fulfilled' ? r.value : null,
                loading: false,
              };
            }
          }
          return updated;
        });
        setLoadedCount(prev => prev + items.length);
      };

      const worker = async () => {
        while (queue.length > 0) {
          const next = queue.shift();
          if (!next || cancelled) return;
          await runOneBatch(next);
        }
      };

      await Promise.all(
        Array.from({ length: Math.min(concurrency, batches.length) }, () => worker())
      );

      if (!cancelled) {
        setIsLoading(false);
        if (errorCount > 0) {
          toast({
            variant: 'destructive',
            title: t('errorLabel') as string,
            description: tStr('spotifyFailedSummary', { count: errorCount, total: globalHits.length }),
          });
        }
      }
    };

    fetchAll();
    return () => { cancelled = true; };
  }, [globalHits, hasCache]);

  // Persist to cache once everything is fully loaded
  useEffect(() => {
    if (hasCache) return;
    if (isLoading || localHitsLoading) return;
    if (resolvedHits.length === 0) return;
    if (resolvedHits.some(rh => rh.loading)) return;
    writeOverviewCache('music-overview', startYear, endYear, city, language, {
      hits: resolvedHits,
      country: localHitsCountry,
    });
  }, [hasCache, isLoading, localHitsLoading, resolvedHits, startYear, endYear, city, language, localHitsCountry]);

  const toggleFavorite = useCallback((trackId: string) => {
    setFavorites(prev => {
      const next = new Set(prev);
      if (next.has(trackId)) next.delete(trackId);
      else next.add(trackId);
      return next;
    });
  }, []);

  const handleBookmarkTrack = useCallback(async (rh: ResolvedHit) => {
    if (!user || !rh.spotify) return;
    const key = `${rh.year}-${rh.spotify.trackId}`;
    if (savedTracks.has(key)) return;

    try {
      const { error } = await (supabase.from('saved_events' as any) as any).insert({
        user_id: user.id,
        event_title: `${rh.spotify.trackName} – ${rh.spotify.artistName}`,
        event_year: rh.year,
        event_description: tStr('numberOneHitDesc', { year: rh.year, album: rh.spotify.albumName }),
        event_category: 'music',
        image_url: rh.spotify.albumImage,
      });
      if (error) throw error;
      setSavedTracks(prev => new Set(prev).add(key));
      toast({ title: t('savedToast') as string, description: tStr('savedDescriptionTrack', { name: rh.spotify!.trackName }) });
    } catch (err: any) {
      toast({ title: t('errorLabel') as string, description: err.message, variant: 'destructive' });
    }
  }, [user, savedTracks, toast, t, tStr]);

  const favoriteTrackIds = useMemo(() => {
    return resolvedHits
      .filter(rh => rh.spotify && favorites.has(rh.spotify.trackId))
      .map(rh => rh.spotify!.trackId);
  }, [resolvedHits, favorites]);

  const allTrackIds = useMemo(() => {
    return resolvedHits
      .filter(rh => rh.spotify)
      .map(rh => rh.spotify!.trackId);
  }, [resolvedHits]);

  const handleOpenSpotifyPlaylist = useCallback((trackIds: string[], label: string) => {
    if (trackIds.length === 0) {
      toast({ title: t('noTracksAvailable') as string });
      return;
    }
    const spotifyDeepLink = `spotify:trackset:${encodeURIComponent(label)}:${trackIds.join(',')}`;
    const opened = window.open(spotifyDeepLink, '_blank');
    if (!opened) {
      const urls = trackIds.map(id => `https://open.spotify.com/track/${id}`).join('\n');
      navigator.clipboard.writeText(urls);
      toast({
        title: t('linksCopiedTitle') as string,
        description: tStr('spotifyLinksCopiedDesc', { count: trackIds.length })
      });
    }
  }, [toast, t, tStr]);

  return (
    <div className="min-h-screen bg-background text-foreground overflow-x-hidden">
      {/* Sticky header */}
      <header className="sticky top-0 z-50 backdrop-blur-xl bg-background/80 border-b border-border/50">
        <div className="max-w-7xl mx-auto px-4 sm:px-6 py-3 flex items-center justify-between">
          <div className="flex items-center gap-3">
            <Button variant="ghost" size="icon" onClick={() => navigate(-1)} className="rounded-full">
              <ArrowLeft className="h-5 w-5" />
            </Button>
            <div>
              <h1 className="font-serif text-lg font-bold flex items-center gap-2">
                <Music className="h-5 w-5 text-[#1DB954]" />
                {t('myLifeInMusic') as string}
              </h1>
              <p className="text-xs text-muted-foreground font-mono">
                {startYear} – {endYear}
                {city && <span className="ml-2 inline-flex items-center gap-1"><MapPin className="h-3 w-3" />{city}</span>}
              </p>
            </div>
          </div>
          <div className="flex items-center gap-2">
            {localHitsCountry && (
              <Badge variant="secondary" className="gap-1 text-xs">
                <MapPin className="h-3 w-3" />
                {localHitsCountry}
              </Badge>
            )}
            {favorites.size > 0 && (
              <Badge variant="secondary" className="bg-[#1DB954]/15 text-[#1DB954] border-[#1DB954]/30 gap-1">
                <Heart className="h-3 w-3 fill-current" />
                {favorites.size}
              </Badge>
            )}
            <AccountLink />
          </div>
        </div>
      </header>

      {/* Loading progress */}
      {(isLoading || localHitsLoading) && (
        <div className="max-w-7xl mx-auto px-4 sm:px-6 py-4">
          <div className="flex items-center gap-3 text-sm text-muted-foreground">
            <Loader2 className="h-4 w-4 animate-spin" />
            <span className="font-mono text-xs">
              {localHitsLoading 
                ? tStr('loadingLocalHits', { city }) 
                : tStr('tracksLoaded', { loaded: loadedCount, total: globalHits.length })
              }
            </span>
          </div>
          <div className="mt-2 h-1 bg-muted rounded-full overflow-hidden">
            <div 
              className="h-full bg-[#1DB954] transition-all duration-300 rounded-full"
              style={{ width: `${localHitsLoading ? 50 : (loadedCount / globalHits.length) * 100}%` }}
            />
          </div>
        </div>
      )}

      {/* Year-by-year rows */}
      <main className="max-w-7xl mx-auto px-4 sm:px-6 py-8 space-y-10">
        {hitsByYear.map(([year, hits], yearIdx) => (
          <motion.section
            key={year}
            initial={{ opacity: 0, y: 20 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ duration: 0.4, delay: yearIdx * 0.05 }}
          >
            {/* Year label */}
            <div className="flex items-center gap-4 mb-4">
              <span className="font-mono text-3xl sm:text-4xl font-black text-foreground/20 tabular-nums select-none">
                {year}
              </span>
              <div className="h-px flex-1 bg-border/50" />
            </div>

            {/* Horizontal scroll of tracks */}
            <div 
              className="flex gap-3 sm:gap-4 overflow-x-auto pb-2 -mx-4 px-4 sm:-mx-6 sm:px-6"
              style={{ scrollbarWidth: 'thin' }}
            >
              {hits.map((rh, idx) => (
                <TrackCard
                  key={`${rh.year}-${rh.hit.artist}-${rh.hit.title}-${rh.isLocal ? 'local' : 'global'}`}
                  resolvedHit={rh}
                  isFavorite={!!rh.spotify && favorites.has(rh.spotify.trackId)}
                  isSaved={!!rh.spotify && savedTracks.has(`${rh.year}-${rh.spotify.trackId}`)}
                  isEmbedActive={activeTrackId === rh.spotify?.trackId}
                  isLoggedIn={!!user}
                  onToggleFavorite={() => rh.spotify && toggleFavorite(rh.spotify.trackId)}
                  onBookmark={() => handleBookmarkTrack(rh)}
                  onToggleEmbed={() => setActiveTrackId(prev => 
                    prev === rh.spotify?.trackId ? null : rh.spotify?.trackId || null
                  )}
                  index={idx}
                />
              ))}
            </div>
          </motion.section>
        ))}

        {/* Bottom playlist actions */}
        {!isLoading && resolvedHits.length > 0 && (
          <motion.div
            initial={{ opacity: 0, y: 30 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ duration: 0.6, delay: 0.3 }}
            className="rounded-2xl border border-border bg-card p-6 sm:p-8"
          >
            <div className="text-center mb-6">
              <h2 className="font-serif text-2xl font-bold mb-2">{t('yourMusicOverviewTitle') as string}</h2>
              <p className="text-sm text-muted-foreground">
                {tStr('tracksFoundFavorites', { count: allTrackIds.length, fav: favorites.size })}
                {localHitsCountry && tStr('inclLocalHitsSuffix', { country: localHitsCountry })}
              </p>
            </div>

            <div className="flex flex-col sm:flex-row gap-3 justify-center">
              {/* Playlist: all tracks */}
              <Button
                onClick={() => handleOpenSpotifyPlaylist(allTrackIds, t('myLifeInMusic') as string)}
                className="gap-2 bg-[#1DB954] hover:bg-[#1ed760] text-white"
              >
                <ListMusic className="h-4 w-4" />
                {tStr('playlistAllTracks', { count: allTrackIds.length })}
              </Button>

              {/* Playlist: favorites only */}
              {favorites.size > 0 && (
                <Button
                  onClick={() => handleOpenSpotifyPlaylist(favoriteTrackIds, t('myFavoritesPlaylistLabel') as string)}
                  variant="outline"
                  className="gap-2 border-[#1DB954]/30 text-[#1DB954] hover:bg-[#1DB954]/10"
                >
                  <Heart className="h-4 w-4 fill-current" />
                  {tStr('playlistFavoritesCount', { count: favorites.size })}
                </Button>
              )}
            </div>

            <p className="text-xs text-muted-foreground text-center mt-4">
              {t('spotifyOpenHint') as string}
            </p>
          </motion.div>
        )}

        {/* Discover more carousel */}
        <SharedExperienceCarousel excludeCards={['music-overview']} searchParams={searchParams} />
      </main>
    </div>
  );
};

// =============================================
// TRACK CARD
// =============================================
interface TrackCardProps {
  resolvedHit: ResolvedHit;
  isFavorite: boolean;
  isSaved: boolean;
  isEmbedActive: boolean;
  isLoggedIn: boolean;
  onToggleFavorite: () => void;
  onBookmark: () => void;
  onToggleEmbed: () => void;
  index: number;
}

const TrackCard = ({ resolvedHit, isFavorite, isSaved, isEmbedActive, isLoggedIn, onToggleFavorite, onBookmark, onToggleEmbed, index }: TrackCardProps) => {
  const { t } = useLanguage();
  const { hit, spotify, loading, isLocal } = resolvedHit;

  return (
    <div className="flex-shrink-0 w-[120px] sm:w-[160px] md:w-[180px] group">
      {/* Album art */}
      <div
        className={`relative aspect-square overflow-hidden rounded-xl shadow-lg bg-muted cursor-pointer mb-2 ${
          isLocal ? 'ring-2 ring-accent/40' : ''
        }`}
        onClick={onToggleEmbed}
      >
        {loading ? (
          <div className="w-full h-full flex items-center justify-center">
            <Loader2 className="h-6 w-6 animate-spin text-muted-foreground/40" />
          </div>
        ) : spotify?.albumImage ? (
          <img
            src={spotify.albumImage}
            alt={`${hit.title} - ${hit.artist}`}
            className="w-full h-full object-cover transition-transform duration-500 group-hover:scale-105"
            loading="lazy"
          />
        ) : (
          <div className="w-full h-full flex items-center justify-center bg-muted">
            <Music className="h-8 w-8 text-muted-foreground/30" />
          </div>
        )}

        {/* Local hit badge */}
        {isLocal && !loading && (
          <div className="absolute bottom-2 left-2 px-1.5 py-0.5 rounded-md bg-accent/90 text-accent-foreground text-[9px] font-medium flex items-center gap-0.5">
            <MapPin className="h-2.5 w-2.5" />
            {t('localHitBadge') as string}
          </div>
        )}

        {/* Play overlay */}
        {spotify && (
          <div className={`absolute inset-0 flex items-center justify-center transition-opacity duration-300 ${
            isEmbedActive ? 'opacity-100 bg-black/40' : 'opacity-0 group-hover:opacity-100 bg-black/30'
          }`}>
            <div className={`p-3 rounded-full backdrop-blur-sm transition-transform duration-200 ${
              isEmbedActive ? 'bg-[#1DB954] scale-100' : 'bg-white/90 group-hover:scale-110'
            }`}>
              {isEmbedActive ? (
                <Pause className="h-4 w-4 text-white fill-current" />
              ) : (
                <Play className="h-4 w-4 text-zinc-900 fill-current ml-0.5" />
              )}
            </div>
          </div>
        )}

        {/* Top-right: Favorite (heart) button */}
        {spotify && (
          <button
            onClick={(e) => { e.stopPropagation(); onToggleFavorite(); }}
            className={`absolute top-2 right-2 p-1.5 rounded-full transition-all duration-200 ${
              isFavorite 
                ? 'bg-[#1DB954] text-white scale-110' 
                : 'bg-black/40 text-white/70 opacity-0 group-hover:opacity-100 hover:bg-black/60'
            }`}
            title={isFavorite ? t('removeFromFavorites') as string : t('addToFavorites') as string}
          >
            <Heart className={`h-3.5 w-3.5 ${isFavorite ? 'fill-current' : ''}`} />
          </button>
        )}

        {/* Top-left: Bookmark (save to account) button */}
        {spotify && isLoggedIn && (
          <button
            onClick={(e) => { e.stopPropagation(); onBookmark(); }}
            disabled={isSaved}
            className={`absolute top-2 left-2 p-1.5 rounded-full transition-all duration-200 ${
              isSaved
                ? 'bg-accent text-accent-foreground scale-110'
                : 'bg-black/40 text-white/70 opacity-0 group-hover:opacity-100 hover:bg-black/60'
            }`}
            title={isSaved ? t('savedToAccount') as string : t('saveToAccount') as string}
          >
            {isSaved ? (
              <BookmarkCheck className="h-3.5 w-3.5" />
            ) : (
              <Bookmark className="h-3.5 w-3.5" />
            )}
          </button>
        )}
      </div>

      {/* Track info */}
      <p className="text-xs font-medium text-foreground truncate leading-tight">
        {spotify?.trackName || hit.title}
      </p>
      <p className="text-[10px] text-muted-foreground truncate">
        {spotify?.artistName || hit.artist}
      </p>

      {/* Spotify embed - rendered wider than card */}
      {isEmbedActive && spotify && (
        <div className="relative mt-2 w-[280px] sm:w-[300px]" onClick={(e) => e.stopPropagation()}>
          <button
            onClick={onToggleEmbed}
            className="absolute -top-2 -right-1 z-20 p-1 bg-zinc-800 hover:bg-zinc-700 text-white rounded-full shadow-lg transition-colors"
          >
            <X className="h-3 w-3" />
          </button>
          <iframe
            src={`https://open.spotify.com/embed/track/${spotify.trackId}?utm_source=generator&theme=0&autoplay=1`}
            width="100%"
            height="152"
            frameBorder="0"
            allow="autoplay; clipboard-write; encrypted-media; fullscreen; picture-in-picture"
            loading="lazy"
            className="rounded-lg"
            title={`${spotify.trackName} - ${spotify.artistName}`}
          />
        </div>
      )}
    </div>
  );
};

export default MusicOverviewPage;
