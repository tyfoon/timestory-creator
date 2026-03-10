/**
 * TvFilmOverviewPage - "Mijn Leven in TV & Film"
 * Year-by-year overview of iconic TV shows and films with YouTube trailers.
 */
import { useEffect, useState, useMemo, useCallback } from 'react';
import { useNavigate, useSearchParams } from 'react-router-dom';
import { motion } from 'framer-motion';
import { ArrowLeft, Heart, Loader2, Tv, Film, Play, X, Bookmark, BookmarkCheck, MapPin, ListVideo } from 'lucide-react';
import { DiscoverMoreCarousel } from '@/components/story/DiscoverMoreCarousel';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import { supabase } from '@/integrations/supabase/client';
import { AccountLink } from '@/components/AccountLink';
import { useToast } from '@/hooks/use-toast';
import { useAuth } from '@/contexts/AuthContext';

interface YouTubeResult {
  videoId: string;
  title: string;
  thumbnail: string | null;
}

interface TvFilmItem {
  title: string;
  type: 'film' | 'tv';
  description: string;
}

interface ResolvedItem {
  year: number;
  item: TvFilmItem;
  youtube: YouTubeResult | null;
  loading: boolean;
}

const TvFilmOverviewPage = () => {
  const navigate = useNavigate();
  const [searchParams] = useSearchParams();
  const { toast } = useToast();
  const { user } = useAuth();

  const startYear = parseInt(searchParams.get('start') || '1980', 10);
  const endYear = parseInt(searchParams.get('end') || String(new Date().getFullYear()), 10);
  const city = searchParams.get('city') || '';

  const [resolvedItems, setResolvedItems] = useState<ResolvedItem[]>([]);
  const [favorites, setFavorites] = useState<Set<string>>(new Set());
  const [savedItems, setSavedItems] = useState<Set<string>>(new Set());
  const [activeVideoId, setActiveVideoId] = useState<string | null>(null);
  const [isLoading, setIsLoading] = useState(true);
  const [loadedCount, setLoadedCount] = useState(0);
  const [country, setCountry] = useState<string | null>(null);

  // Fetch TV/films from AI
  useEffect(() => {
    let cancelled = false;

    const fetchItems = async () => {
      setIsLoading(true);
      try {
        const { data, error } = await supabase.functions.invoke('generate-tv-films', {
          body: { startYear, endYear, city }
        });

        if (cancelled || error || !data?.items) {
          if (!cancelled) setIsLoading(false);
          return;
        }

        setCountry(data.country || null);

        const allItems: ResolvedItem[] = [];
        for (const [yearStr, items] of Object.entries(data.items)) {
          const yr = parseInt(yearStr, 10);
          if (Array.isArray(items)) {
            (items as TvFilmItem[]).forEach(item => {
              if (item.title) {
                allItems.push({ year: yr, item, youtube: null, loading: true });
              }
            });
          }
        }

        allItems.sort((a, b) => a.year - b.year);
        setResolvedItems(allItems);

        // Fetch YouTube trailers in batches of 10
        const batchSize = 10;
        let loaded = 0;
        for (let i = 0; i < allItems.length; i += batchSize) {
          if (cancelled) return;
          const batch = allItems.slice(i, i + batchSize);

          const results = await Promise.allSettled(
            batch.map(async ({ item }) => {
              const query = `${item.title} ${item.type === 'film' ? 'official trailer' : 'trailer intro'}`;
              try {
                const { data, error } = await supabase.functions.invoke('search-youtube', { body: { query } });
                if (error || !data?.videoId) return null;
                return data as YouTubeResult;
              } catch { return null; }
            })
          );

          if (cancelled) return;
          loaded += batch.length;
          setLoadedCount(loaded);

          setResolvedItems(prev => {
            const updated = [...prev];
            for (let j = 0; j < batch.length; j++) {
              const idx = i + j;
              if (idx < updated.length) {
                const r = results[j];
                updated[idx] = {
                  ...updated[idx],
                  youtube: r.status === 'fulfilled' ? r.value : null,
                  loading: false,
                };
              }
            }
            return updated;
          });
        }
      } catch (err) {
        console.error('[TvFilmOverview] Failed to fetch:', err);
      } finally {
        if (!cancelled) setIsLoading(false);
      }
    };

    fetchItems();
    return () => { cancelled = true; };
  }, [startYear, endYear, city]);

  // Group by year
  const itemsByYear = useMemo(() => {
    const map = new Map<number, ResolvedItem[]>();
    for (const ri of resolvedItems) {
      if (!map.has(ri.year)) map.set(ri.year, []);
      map.get(ri.year)!.push(ri);
    }
    return Array.from(map.entries()).sort((a, b) => a[0] - b[0]);
  }, [resolvedItems]);

  const toggleFavorite = useCallback((key: string) => {
    setFavorites(prev => {
      const next = new Set(prev);
      if (next.has(key)) next.delete(key);
      else next.add(key);
      return next;
    });
  }, []);

  const handleBookmark = useCallback(async (ri: ResolvedItem) => {
    if (!user) return;
    const key = `${ri.year}-${ri.item.title}`;
    if (savedItems.has(key)) return;

    try {
      const { error } = await (supabase.from('saved_events' as any) as any).insert({
        user_id: user.id,
        event_title: `${ri.item.type === 'film' ? '🎬' : '📺'} ${ri.item.title}`,
        event_year: ri.year,
        event_description: ri.item.description,
        event_category: ri.item.type === 'film' ? 'entertainment' : 'culture',
        image_url: ri.youtube?.thumbnail || null,
      });
      if (error) throw error;
      setSavedItems(prev => new Set(prev).add(key));
      toast({ title: 'Opgeslagen!', description: `${ri.item.title} staat nu op je accountpagina.` });
    } catch (err: any) {
      toast({ title: 'Fout', description: err.message, variant: 'destructive' });
    }
  }, [user, savedItems, toast]);

  const totalItems = resolvedItems.length;

  // Collect all YouTube video IDs
  const allVideoIds = useMemo(() =>
    resolvedItems.filter(ri => ri.youtube?.videoId).map(ri => ri.youtube!.videoId),
    [resolvedItems]
  );

  const favoriteVideoIds = useMemo(() =>
    resolvedItems
      .filter(ri => ri.youtube?.videoId && favorites.has(`${ri.year}-${ri.item.title}`))
      .map(ri => ri.youtube!.videoId),
    [resolvedItems, favorites]
  );

  const handleOpenYouTubePlaylist = useCallback((videoIds: string[], label: string) => {
    if (videoIds.length === 0) {
      toast({ title: 'Geen video\'s', description: 'Er zijn geen trailers beschikbaar.' });
      return;
    }
    // YouTube watch_videos URL plays multiple videos in sequence
    const url = `https://www.youtube.com/watch_videos?video_ids=${videoIds.join(',')}`;
    const opened = window.open(url, '_blank');
    if (!opened) {
      const links = videoIds.map(id => `https://youtu.be/${id}`).join('\n');
      navigator.clipboard.writeText(links);
      toast({
        title: 'Links gekopieerd!',
        description: `${videoIds.length} YouTube-links gekopieerd naar je klembord.`
      });
    }
  }, [toast]);

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
                <Tv className="h-5 w-5 text-primary" />
                Mijn Leven in TV & Film
              </h1>
              <p className="text-xs text-muted-foreground font-mono">
                {startYear} – {endYear}
                {city && <span className="ml-2 inline-flex items-center gap-1"><MapPin className="h-3 w-3" />{city}</span>}
              </p>
            </div>
          </div>
          <div className="flex items-center gap-2">
            {country && (
              <Badge variant="secondary" className="gap-1 text-xs">
                <MapPin className="h-3 w-3" />
                {country}
              </Badge>
            )}
            {favorites.size > 0 && (
              <Badge variant="secondary" className="bg-primary/15 text-primary border-primary/30 gap-1">
                <Heart className="h-3 w-3 fill-current" />
                {favorites.size}
              </Badge>
            )}
            <AccountLink />
          </div>
        </div>
      </header>

      {/* Loading */}
      {isLoading && (
        <div className="max-w-7xl mx-auto px-4 sm:px-6 py-4">
          <div className="flex items-center gap-3 text-sm text-muted-foreground">
            <Loader2 className="h-4 w-4 animate-spin" />
            <span className="font-mono text-xs">
              {loadedCount === 0
                ? `TV-series en films laden${city ? ` voor ${city}` : ''}...`
                : `${loadedCount} / ${totalItems} trailers gezocht...`
              }
            </span>
          </div>
          <div className="mt-2 h-1 bg-muted rounded-full overflow-hidden">
            <div
              className="h-full bg-primary transition-all duration-300 rounded-full"
              style={{ width: `${totalItems > 0 ? (loadedCount / totalItems) * 100 : 30}%` }}
            />
          </div>
        </div>
      )}

      {/* Year-by-year rows */}
      <main className="max-w-7xl mx-auto px-4 sm:px-6 py-8 space-y-10">
        {itemsByYear.map(([year, items], yearIdx) => (
          <motion.section
            key={year}
            initial={{ opacity: 0, y: 20 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ duration: 0.4, delay: yearIdx * 0.05 }}
          >
            <div className="flex items-center gap-4 mb-4">
              <span className="font-mono text-3xl sm:text-4xl font-black text-foreground/20 tabular-nums select-none">
                {year}
              </span>
              <div className="h-px flex-1 bg-border/50" />
            </div>

            <div
              className="flex gap-3 sm:gap-4 overflow-x-auto pb-2 -mx-4 px-4 sm:-mx-6 sm:px-6"
              style={{ scrollbarWidth: 'thin' }}
            >
              {items.map((ri) => {
                const key = `${ri.year}-${ri.item.title}`;
                const isFav = favorites.has(key);
                const isSaved = savedItems.has(key);

                return (
                  <div key={key} className="flex-shrink-0 w-[140px] sm:w-[180px] md:w-[200px] group">
                    {/* Thumbnail */}
                    <div
                      className="relative aspect-video overflow-hidden rounded-xl shadow-lg bg-muted cursor-pointer mb-2"
                      onClick={() => {
                        if (ri.youtube?.videoId) {
                          setActiveVideoId(prev => prev === ri.youtube!.videoId ? null : ri.youtube!.videoId);
                        }
                      }}
                    >
                      {ri.loading ? (
                        <div className="w-full h-full flex items-center justify-center">
                          <Loader2 className="h-6 w-6 animate-spin text-muted-foreground/40" />
                        </div>
                      ) : ri.youtube?.thumbnail ? (
                        <img
                          src={ri.youtube.thumbnail}
                          alt={ri.item.title}
                          className="w-full h-full object-cover transition-transform duration-500 group-hover:scale-105"
                          loading="lazy"
                        />
                      ) : (
                        <div className="w-full h-full flex items-center justify-center bg-muted">
                          {ri.item.type === 'film' ? (
                            <Film className="h-8 w-8 text-muted-foreground/30" />
                          ) : (
                            <Tv className="h-8 w-8 text-muted-foreground/30" />
                          )}
                        </div>
                      )}

                      {/* Type badge */}
                      <div className="absolute bottom-2 left-2 px-1.5 py-0.5 rounded-md bg-black/70 text-white text-[9px] font-medium flex items-center gap-0.5">
                        {ri.item.type === 'film' ? (
                          <><Film className="h-2.5 w-2.5" /> Film</>
                        ) : (
                          <><Tv className="h-2.5 w-2.5" /> TV</>
                        )}
                      </div>

                      {/* Play overlay */}
                      {ri.youtube && (
                        <div className={`absolute inset-0 flex items-center justify-center transition-opacity duration-300 ${
                          activeVideoId === ri.youtube.videoId ? 'opacity-100 bg-black/40' : 'opacity-0 group-hover:opacity-100 bg-black/30'
                        }`}>
                          <div className="p-3 rounded-full backdrop-blur-sm bg-red-600 group-hover:scale-110 transition-transform">
                            <Play className="h-4 w-4 text-white fill-current ml-0.5" />
                          </div>
                        </div>
                      )}

                      {/* Favorite */}
                      <button
                        onClick={(e) => { e.stopPropagation(); toggleFavorite(key); }}
                        className={`absolute top-2 right-2 p-1.5 rounded-full transition-all duration-200 ${
                          isFav
                            ? 'bg-red-600 text-white scale-110'
                            : 'bg-black/40 text-white/70 opacity-0 group-hover:opacity-100 hover:bg-black/60'
                        }`}
                      >
                        <Heart className={`h-3.5 w-3.5 ${isFav ? 'fill-current' : ''}`} />
                      </button>

                      {/* Bookmark */}
                      {user && (
                        <button
                          onClick={(e) => { e.stopPropagation(); handleBookmark(ri); }}
                          disabled={isSaved}
                          className={`absolute top-2 left-2 p-1.5 rounded-full transition-all duration-200 ${
                            isSaved
                              ? 'bg-accent text-accent-foreground scale-110'
                              : 'bg-black/40 text-white/70 opacity-0 group-hover:opacity-100 hover:bg-black/60'
                          }`}
                        >
                          {isSaved ? <BookmarkCheck className="h-3.5 w-3.5" /> : <Bookmark className="h-3.5 w-3.5" />}
                        </button>
                      )}
                    </div>

                    {/* Info */}
                    <p className="text-xs font-medium text-foreground truncate leading-tight">
                      {ri.item.title}
                    </p>
                    <p className="text-[10px] text-muted-foreground truncate">
                      {ri.item.description}
                    </p>

                    {/* YouTube embed */}
                    {activeVideoId === ri.youtube?.videoId && ri.youtube && (
                      <div className="relative mt-2 w-[280px] sm:w-[320px]" onClick={(e) => e.stopPropagation()}>
                        <button
                          onClick={() => setActiveVideoId(null)}
                          className="absolute -top-2 -right-1 z-20 p-1 bg-zinc-800 hover:bg-zinc-700 text-white rounded-full shadow-lg transition-colors"
                        >
                          <X className="h-3 w-3" />
                        </button>
                        <iframe
                          src={`https://www.youtube.com/embed/${ri.youtube.videoId}?autoplay=1&rel=0`}
                          width="100%"
                          height="180"
                          frameBorder="0"
                          allow="autoplay; encrypted-media"
                          allowFullScreen
                          loading="lazy"
                          className="rounded-lg"
                          title={ri.item.title}
                        />
                      </div>
                    )}
                  </div>
                );
              })}
            </div>
          </motion.section>
        ))}

        {/* Summary + playlist actions */}
        {!isLoading && resolvedItems.length > 0 && (
          <motion.div
            initial={{ opacity: 0, y: 30 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ duration: 0.6, delay: 0.3 }}
            className="rounded-2xl border border-border bg-card p-6 sm:p-8 text-center space-y-4"
          >
            <h2 className="font-serif text-2xl font-bold mb-2">Jouw TV & Film Overzicht</h2>
            <p className="text-sm text-muted-foreground">
              {resolvedItems.length} titels gevonden • {favorites.size} favorieten
              {country && ` • ${country}`}
            </p>

            <div className="flex flex-col sm:flex-row gap-3 justify-center">
              <Button
                onClick={() => handleOpenYouTubePlaylist(allVideoIds, 'Mijn Leven in TV & Film')}
                className="gap-2 bg-[#FF0000] hover:bg-[#cc0000] text-white"
                disabled={allVideoIds.length === 0}
              >
                <ListVideo className="h-4 w-4" />
                Alle {allVideoIds.length} trailers afspelen
              </Button>

              {favorites.size > 0 && (
                <Button
                  onClick={() => handleOpenYouTubePlaylist(favoriteVideoIds, 'Mijn Favorieten')}
                  variant="outline"
                  className="gap-2 border-[#FF0000]/30 text-[#FF0000] hover:bg-[#FF0000]/10"
                  disabled={favoriteVideoIds.length === 0}
                >
                  <Heart className="h-4 w-4 fill-current" />
                  {favoriteVideoIds.length} favorieten afspelen
                </Button>
              )}
            </div>
          </motion.div>
        )}
      </main>
    </div>
  );
};

export default TvFilmOverviewPage;
