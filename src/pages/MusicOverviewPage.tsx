/**
 * MusicOverviewPage - "Mijn Leven in Muziek"
 * Shows a year-by-year horizontal grid of #1 hits with Spotify embeds,
 * favorites, and playlist export.
 */
import { useEffect, useState, useMemo, useCallback } from 'react';
import { useNavigate, useSearchParams } from 'react-router-dom';
import { motion } from 'framer-motion';
import { ArrowLeft, Heart, Loader2, Music, Share2, Download, Play, Pause, X, ListMusic } from 'lucide-react';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import { supabase } from '@/integrations/supabase/client';
import { numberOneHits, NumberOneHit } from '@/data/numberOneHits';
import { AccountLink } from '@/components/AccountLink';
import { useToast } from '@/hooks/use-toast';

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
}

const MusicOverviewPage = () => {
  const navigate = useNavigate();
  const [searchParams] = useSearchParams();
  const { toast } = useToast();

  const startYear = parseInt(searchParams.get('start') || '1980', 10);
  const endYear = parseInt(searchParams.get('end') || String(new Date().getFullYear()), 10);

  const [resolvedHits, setResolvedHits] = useState<ResolvedHit[]>([]);
  const [favorites, setFavorites] = useState<Set<string>>(new Set());
  const [activeTrackId, setActiveTrackId] = useState<string | null>(null);
  const [isLoading, setIsLoading] = useState(true);
  const [loadedCount, setLoadedCount] = useState(0);

  // Build the list of all hits for the year range
  const allHits = useMemo(() => {
    const currentYear = new Date().getFullYear();
    const end = Math.min(endYear, currentYear);
    const result: { year: number; hit: NumberOneHit }[] = [];
    for (let yr = startYear; yr <= end; yr++) {
      const hits = numberOneHits[yr];
      if (hits) {
        hits.forEach(hit => result.push({ year: yr, hit }));
      }
    }
    return result;
  }, [startYear, endYear]);

  // Group by year for rendering
  const hitsByYear = useMemo(() => {
    const map = new Map<number, ResolvedHit[]>();
    for (const rh of resolvedHits) {
      if (!map.has(rh.year)) map.set(rh.year, []);
      map.get(rh.year)!.push(rh);
    }
    return Array.from(map.entries()).sort((a, b) => a[0] - b[0]);
  }, [resolvedHits]);

  // Fetch Spotify data in batches
  useEffect(() => {
    let cancelled = false;

    const fetchAll = async () => {
      setIsLoading(true);
      
      // Initialize all hits as loading
      const initial: ResolvedHit[] = allHits.map(({ year, hit }) => ({
        year, hit, spotify: null, loading: true,
      }));
      setResolvedHits(initial);

      const batchSize = 5;
      let loaded = 0;

      for (let i = 0; i < allHits.length; i += batchSize) {
        if (cancelled) return;
        const batch = allHits.slice(i, i + batchSize);
        
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
  }, [allHits]);

  const toggleFavorite = useCallback((trackId: string) => {
    setFavorites(prev => {
      const next = new Set(prev);
      if (next.has(trackId)) next.delete(trackId);
      else next.add(trackId);
      return next;
    });
  }, []);

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

  const handleSharePlaylist = useCallback((trackIds: string[], label: string) => {
    if (trackIds.length === 0) {
      toast({ title: 'Geen nummers', description: 'Er zijn geen nummers om te delen.' });
      return;
    }
    // Spotify URI list - users can paste this in Spotify
    const spotifyUris = trackIds.map(id => `spotify:track:${id}`);
    const text = `🎵 ${label} (${startYear}-${endYear})\n\n${spotifyUris.join('\n')}`;
    
    if (navigator.share) {
      navigator.share({ title: label, text });
    } else {
      // Copy track URLs for easy sharing
      const urls = trackIds.map(id => `https://open.spotify.com/track/${id}`).join('\n');
      navigator.clipboard.writeText(urls);
      toast({ title: 'Gekopieerd!', description: `${trackIds.length} nummers gekopieerd naar klembord.` });
    }
  }, [startYear, endYear, toast]);

  const handleOpenSpotifyPlaylist = useCallback((trackIds: string[]) => {
    if (trackIds.length === 0) return;
    // Open first track, user can queue rest. Best we can do without Spotify auth.
    window.open(`https://open.spotify.com/track/${trackIds[0]}`, '_blank');
  }, []);

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
              <p className="text-xs text-muted-foreground font-mono">{startYear} – {endYear}</p>
            </div>
          </div>
          <div className="flex items-center gap-2">
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
      {isLoading && (
        <div className="max-w-7xl mx-auto px-4 sm:px-6 py-4">
          <div className="flex items-center gap-3 text-sm text-muted-foreground">
            <Loader2 className="h-4 w-4 animate-spin" />
            <span className="font-mono text-xs">
              {loadedCount} / {allHits.length} nummers geladen...
            </span>
          </div>
          <div className="mt-2 h-1 bg-muted rounded-full overflow-hidden">
            <div 
              className="h-full bg-[#1DB954] transition-all duration-300 rounded-full"
              style={{ width: `${(loadedCount / allHits.length) * 100}%` }}
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
                  key={`${rh.year}-${rh.hit.artist}-${rh.hit.title}`}
                  resolvedHit={rh}
                  isFavorite={!!rh.spotify && favorites.has(rh.spotify.trackId)}
                  isEmbedActive={activeTrackId === rh.spotify?.trackId}
                  onToggleFavorite={() => rh.spotify && toggleFavorite(rh.spotify.trackId)}
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
              </p>
            </div>

            <div className="flex flex-col sm:flex-row gap-3 justify-center">
              {/* Share all tracks */}
              <Button
                onClick={() => handleSharePlaylist(allTrackIds, 'Mijn Leven in Muziek')}
                className="gap-2 bg-[#1DB954] hover:bg-[#1ed760] text-white"
              >
                <Share2 className="h-4 w-4" />
                Deel alle {allTrackIds.length} nummers
              </Button>

              {/* Share favorites only */}
              {favorites.size > 0 && (
                <Button
                  onClick={() => handleSharePlaylist(favoriteTrackIds, 'Mijn Favorieten')}
                  variant="outline"
                  className="gap-2 border-[#1DB954]/30 text-[#1DB954] hover:bg-[#1DB954]/10"
                >
                  <Heart className="h-4 w-4 fill-current" />
                  Deel {favorites.size} favorieten
                </Button>
              )}

              {/* Open in Spotify */}
              <Button
                onClick={() => handleOpenSpotifyPlaylist(favorites.size > 0 ? favoriteTrackIds : allTrackIds)}
                variant="outline"
                className="gap-2"
              >
                <ListMusic className="h-4 w-4" />
                Open in Spotify
              </Button>
            </div>
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
  isEmbedActive: boolean;
  onToggleFavorite: () => void;
  onToggleEmbed: () => void;
  index: number;
}

const TrackCard = ({ resolvedHit, isFavorite, isEmbedActive, onToggleFavorite, onToggleEmbed, index }: TrackCardProps) => {
  const { hit, spotify, loading } = resolvedHit;

  return (
    <div className="flex-shrink-0 w-[160px] sm:w-[180px] group">
      {/* Album art */}
      <div
        className="relative aspect-square overflow-hidden rounded-xl shadow-lg bg-muted cursor-pointer mb-2"
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

        {/* Favorite button */}
        {spotify && (
          <button
            onClick={(e) => { e.stopPropagation(); onToggleFavorite(); }}
            className={`absolute top-2 right-2 p-1.5 rounded-full transition-all duration-200 ${
              isFavorite 
                ? 'bg-[#1DB954] text-white scale-110' 
                : 'bg-black/40 text-white/70 opacity-0 group-hover:opacity-100 hover:bg-black/60'
            }`}
          >
            <Heart className={`h-3.5 w-3.5 ${isFavorite ? 'fill-current' : ''}`} />
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
            title={`${spotify.trackName} - ${spotify.artistName}`}
          />
        </div>
      )}
    </div>
  );
};

export default MusicOverviewPage;
