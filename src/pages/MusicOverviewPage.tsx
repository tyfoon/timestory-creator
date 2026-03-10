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
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import { supabase } from '@/integrations/supabase/client';
import { numberOneHits, NumberOneHit } from '@/data/numberOneHits';
import { AccountLink } from '@/components/AccountLink';
import { useToast } from '@/hooks/use-toast';
import { useAuth } from '@/contexts/AuthContext';

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

  const startYear = parseInt(searchParams.get('start') || '1980', 10);
  const endYear = parseInt(searchParams.get('end') || String(new Date().getFullYear()), 10);
  const city = searchParams.get('city') || '';

  const [resolvedHits, setResolvedHits] = useState<ResolvedHit[]>([]);
  const [favorites, setFavorites] = useState<Set<string>>(new Set());
  const [savedTracks, setSavedTracks] = useState<Set<string>>(new Set());
  const [activeTrackId, setActiveTrackId] = useState<string | null>(null);
  const [isLoading, setIsLoading] = useState(true);
  const [loadedCount, setLoadedCount] = useState(0);
  const [localHitsCountry, setLocalHitsCountry] = useState<string | null>(null);
  const [localHitsLoading, setLocalHitsLoading] = useState(false);

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
    if (!city) return;
    let cancelled = false;

    const fetchLocalHits = async () => {
      setLocalHitsLoading(true);
      try {
        const { data, error } = await supabase.functions.invoke('generate-local-hits', {
          body: { startYear, endYear, city }
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
          
          // Fetch Spotify data for new local hits
          fetchSpotifyForHits(newLocalHits, merged.length - newLocalHits.length);
          
          return merged;
        });
      } catch (err) {
        console.error('[MusicOverview] Failed to fetch local hits:', err);
      } finally {
        if (!cancelled) setLocalHitsLoading(false);
      }
    };

    fetchLocalHits();
    return () => { cancelled = true; };
  }, [city, startYear, endYear]);

  // Fetch Spotify data for a batch of hits and update state at given offset
  const fetchSpotifyForHits = useCallback(async (hits: ResolvedHit[], startOffset: number) => {
    const batchSize = 5;
    for (let i = 0; i < hits.length; i += batchSize) {
      const batch = hits.slice(i, i + batchSize);
      const results = await Promise.allSettled(
        batch.map(async ({ hit }) => {
          const query = `${hit.artist} - ${hit.title}`;
          try {
            const { data, error } = await supabase.functions.invoke('search-spotify', {
              body: { query }
            });
            if (error || !data?.trackId) return null;
            return data as SpotifyTrackResult;
          } catch {
            return null;
          }
        })
      );

      setResolvedHits(prev => {
        const updated = [...prev];
        for (let j = 0; j < batch.length; j++) {
          const idx = startOffset + i + j;
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
    }
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
    let cancelled = false;

    const fetchAll = async () => {
      setIsLoading(true);
      
      const initial: ResolvedHit[] = globalHits.map(({ year, hit, isLocal }) => ({
        year, hit, spotify: null, loading: true, isLocal,
      }));
      setResolvedHits(initial);

      const batchSize = 5;
      let loaded = 0;

      for (let i = 0; i < globalHits.length; i += batchSize) {
        if (cancelled) return;
        const batch = globalHits.slice(i, i + batchSize);
        
        const results = await Promise.allSettled(
          batch.map(async ({ hit }) => {
            const query = `${hit.artist} - ${hit.title}`;
            try {
              const { data, error } = await supabase.functions.invoke('search-spotify', {
                body: { query }
              });
              if (error || !data?.trackId) return null;
              return data as SpotifyTrackResult;
            } catch {
              return null;
            }
          })
        );

        if (cancelled) return;

        loaded += batch.length;
        setLoadedCount(loaded);

        setResolvedHits(prev => {
          const updated = [...prev];
          for (let j = 0; j < batch.length; j++) {
            const idx = i + j;
            const r = results[j];
            updated[idx] = {
              ...updated[idx],
              spotify: r.status === 'fulfilled' ? r.value : null,
              loading: false,
            };
          }
          return updated;
        });
      }

      if (!cancelled) setIsLoading(false);
    };

    fetchAll();
    return () => { cancelled = true; };
  }, [globalHits]);

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
        event_description: `#1 hit uit ${rh.year}. Album: ${rh.spotify.albumName}`,
        event_category: 'music',
        image_url: rh.spotify.albumImage,
      });
      if (error) throw error;
      setSavedTracks(prev => new Set(prev).add(key));
      toast({ title: 'Opgeslagen!', description: `${rh.spotify!.trackName} staat nu op je accountpagina.` });
    } catch (err: any) {
      toast({ title: 'Fout', description: err.message, variant: 'destructive' });
    }
  }, [user, savedTracks, toast]);

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
      toast({ title: 'Geen nummers', description: 'Er zijn geen nummers beschikbaar.' });
      return;
    }
    const spotifyDeepLink = `spotify:trackset:${encodeURIComponent(label)}:${trackIds.join(',')}`;
    const opened = window.open(spotifyDeepLink, '_blank');
    if (!opened) {
      const urls = trackIds.map(id => `https://open.spotify.com/track/${id}`).join('\n');
      navigator.clipboard.writeText(urls);
      toast({ 
        title: 'Links gekopieerd!', 
        description: `${trackIds.length} Spotify-links gekopieerd naar je klembord. Plak ze in een Spotify-playlist.` 
      });
    }
  }, [toast]);

  return (
    <div className="min-h-screen bg-background text-foreground">
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
                Mijn Leven in Muziek
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
                ? `Lokale hits laden voor ${city}...` 
                : `${loadedCount} / ${globalHits.length} nummers geladen...`
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
              className="flex gap-4 overflow-x-auto pb-2"
              style={{ scrollbarWidth: 'none', msOverflowStyle: 'none' }}
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
              <h2 className="font-serif text-2xl font-bold mb-2">Jouw Muziek Overzicht</h2>
              <p className="text-sm text-muted-foreground">
                {allTrackIds.length} nummers gevonden • {favorites.size} favorieten
                {localHitsCountry && ` • incl. ${localHitsCountry} hits`}
              </p>
            </div>

            <div className="flex flex-col sm:flex-row gap-3 justify-center">
              {/* Playlist: all tracks */}
              <Button
                onClick={() => handleOpenSpotifyPlaylist(allTrackIds, 'Mijn Leven in Muziek')}
                className="gap-2 bg-[#1DB954] hover:bg-[#1ed760] text-white"
              >
                <ListMusic className="h-4 w-4" />
                Playlist alle {allTrackIds.length} nummers
              </Button>

              {/* Playlist: favorites only */}
              {favorites.size > 0 && (
                <Button
                  onClick={() => handleOpenSpotifyPlaylist(favoriteTrackIds, 'Mijn Favorieten')}
                  variant="outline"
                  className="gap-2 border-[#1DB954]/30 text-[#1DB954] hover:bg-[#1DB954]/10"
                >
                  <Heart className="h-4 w-4 fill-current" />
                  Playlist {favorites.size} favorieten
                </Button>
              )}
            </div>

            <p className="text-xs text-muted-foreground text-center mt-4">
              Opent de nummers in Spotify. Als dat niet lukt, worden de links naar je klembord gekopieerd.
            </p>
          </motion.div>
        )}
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
  const { hit, spotify, loading, isLocal } = resolvedHit;

  return (
    <div className="flex-shrink-0 w-[160px] sm:w-[180px] group">
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
            Lokaal
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
            title={isFavorite ? 'Verwijder uit favorieten' : 'Voeg toe aan favorieten'}
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
            title={isSaved ? 'Opgeslagen op je account' : 'Opslaan op je account'}
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

      {/* Spotify embed */}
      {isEmbedActive && spotify && (
        <div className="relative mt-2" onClick={(e) => e.stopPropagation()}>
          <button
            onClick={onToggleEmbed}
            className="absolute -top-1 right-0 z-20 p-0.5 bg-zinc-800 hover:bg-zinc-700 text-white rounded-full shadow-lg transition-colors"
          >
            <X className="h-2.5 w-2.5" />
          </button>
          <iframe
            src={`https://open.spotify.com/embed/track/${spotify.trackId}?utm_source=generator&theme=0&autoplay=1`}
            width="100%"
            height="80"
            frameBorder="0"
            allow="autoplay; clipboard-write; encrypted-media; fullscreen; picture-in-picture"
            loading="lazy"
            className="rounded-lg"
            style={{ overflow: 'hidden' }}
            scrolling="no"
            title={`${spotify.trackName} - ${spotify.artistName}`}
          />
        </div>
      )}
    </div>
  );
};

export default MusicOverviewPage;
