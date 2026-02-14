/**
 * ParallaxMusicColumn - Right sidebar with parallax-scrolling album covers
 * Uses embedded Spotify player (same as main storyline) for playback
 */

import { useEffect, useRef, useState } from 'react';
import { motion, useScroll, useTransform } from 'framer-motion';
import { Play, Pause, Loader2, Music, X } from 'lucide-react';
import { supabase } from '@/integrations/supabase/client';
import { numberOneHits } from '@/data/numberOneHits';

interface HitTrack {
  year: number;
  trackId: string;
  trackName: string;
  artistName: string;
  albumImage: string | null;
  previewUrl: string | null;
  spotifyUrl: string;
}

interface ParallaxMusicColumnProps {
  startYear: number;
  endYear: number;
}

const getHitQueries = (year: number): { year: number; query: string }[] => {
  const hits = numberOneHits[year];
  if (!hits) return [];
  return hits.map(hit => ({ year, query: `${hit.artist} - ${hit.title}` }));
};

export const ParallaxMusicColumn = ({ startYear, endYear }: ParallaxMusicColumnProps) => {
  const [tracks, setTracks] = useState<HitTrack[]>([]);
  const [isLoading, setIsLoading] = useState(true);
  const [activeTrackId, setActiveTrackId] = useState<string | null>(null);
  const columnRef = useRef<HTMLDivElement>(null);

  const [columnHeight, setColumnHeight] = useState(0);
  const { scrollYProgress } = useScroll();

  // Measure the actual height of the music content
  useEffect(() => {
    if (!columnRef.current) return;
    const observer = new ResizeObserver((entries) => {
      for (const entry of entries) {
        setColumnHeight(entry.contentRect.height);
      }
    });
    observer.observe(columnRef.current);
    return () => observer.disconnect();
  }, [tracks.length]);

  // The sticky container is ~100vh tall. We need to scroll the column content
  // by (columnHeight - viewportHeight) over the full page scroll.
  // Using a slower factor so covers scroll at ~60% of main content speed.
  const viewportHeight = typeof window !== 'undefined' ? window.innerHeight : 900;
  const maxScroll = Math.max(0, columnHeight - viewportHeight + 100);
  const parallaxY = useTransform(scrollYProgress, [0, 1], [0, -maxScroll]);

  // Fetch tracks on mount
  useEffect(() => {
    let cancelled = false;

    const fetchAllHits = async () => {
      setIsLoading(true);
      const currentYear = new Date().getFullYear();
      const end = Math.min(endYear, currentYear);

      // Build flat list of all hit queries across all years
      const allQueries: { year: number; query: string }[] = [];
      for (let y = startYear; y <= end; y++) {
        allQueries.push(...getHitQueries(y));
      }

      // Cap at ~60
      const selected = allQueries.length > 60
        ? Array.from({ length: 60 }, (_, i) => allQueries[Math.floor(i * allQueries.length / 60)])
        : allQueries;

      const results: HitTrack[] = [];
      const seenTrackIds = new Set<string>();
      const batchSize = 5;

      for (let i = 0; i < selected.length; i += batchSize) {
        if (cancelled) return;
        const batch = selected.slice(i, i + batchSize);
        const batchResults = await Promise.allSettled(
          batch.map(async ({ year, query }) => {
            try {
              const { data, error } = await supabase.functions.invoke('search-spotify', {
                body: { query }
              });
              if (error || !data?.trackId) return null;
              if (seenTrackIds.has(data.trackId)) return null;
              seenTrackIds.add(data.trackId);
              return {
                year,
                trackId: data.trackId,
                trackName: data.trackName,
                artistName: data.artistName,
                albumImage: data.albumImage,
                previewUrl: data.previewUrl,
                spotifyUrl: data.spotifyUrl,
              } as HitTrack;
            } catch {
              return null;
            }
          })
        );

        for (const r of batchResults) {
          if (r.status === 'fulfilled' && r.value) {
            results.push(r.value);
          }
        }

        if (!cancelled) setTracks([...results]);
      }

      if (!cancelled) setIsLoading(false);
    };

    fetchAllHits();
    return () => { cancelled = true; };
  }, [startYear, endYear]);

  const handleToggleEmbed = (trackId: string) => {
    setActiveTrackId(prev => prev === trackId ? null : trackId);
  };

  return (
    <div ref={columnRef} className="relative w-full">

      <motion.div style={{ y: parallaxY }} className="space-y-8 pb-32 flex flex-col items-end pr-2">
        {isLoading && tracks.length === 0 && (
          <div className="flex flex-col items-center gap-4 py-12">
            <Loader2 className="h-6 w-6 animate-spin text-muted-foreground" />
            <span className="text-xs text-muted-foreground font-mono">Hits laden...</span>
          </div>
        )}

        {tracks.map((track, index) => (
          <AlbumCard
            key={`${track.trackId}-${track.year}`}
            track={track}
            index={index}
            isEmbedActive={activeTrackId === track.trackId}
            onToggleEmbed={() => handleToggleEmbed(track.trackId)}
          />
        ))}

        {isLoading && tracks.length > 0 && (
          <div className="flex items-center justify-center gap-2 py-4">
            <Loader2 className="h-4 w-4 animate-spin text-muted-foreground" />
            <span className="text-[10px] text-muted-foreground font-mono">
              {tracks.length} / ~40 hits
            </span>
          </div>
        )}
      </motion.div>
    </div>
  );
};

// =============================================
// ALBUM CARD - Single cover with embedded Spotify player
// =============================================
interface AlbumCardProps {
  track: HitTrack;
  index: number;
  isEmbedActive: boolean;
  onToggleEmbed: () => void;
}

const AlbumCard = ({ track, index, isEmbedActive, onToggleEmbed }: AlbumCardProps) => {
  return (
    <motion.div
      initial={{ opacity: 0, y: 30 }}
      whileInView={{ opacity: 1, y: 0 }}
      viewport={{ once: true, margin: '-50px' }}
      transition={{ duration: 0.6, delay: index * 0.03 }}
      className="group relative"
    >
      <span className="block font-mono text-[10px] text-muted-foreground/60 mb-1.5 tracking-widest">
        {track.year}
      </span>

      {/* Album cover with play overlay */}
      <div className="w-[55%]">
        <div
          className="relative aspect-square overflow-hidden rounded-lg shadow-lg bg-muted cursor-pointer"
          onClick={onToggleEmbed}
        >
          {track.albumImage ? (
            <img
              src={track.albumImage}
              alt={`${track.trackName} - ${track.artistName}`}
              className="w-full h-full object-cover transition-transform duration-500 group-hover:scale-105"
              loading="lazy"
            />
          ) : (
            <div className="w-full h-full flex items-center justify-center bg-muted">
              <Music className="h-8 w-8 text-muted-foreground/30" />
            </div>
          )}

          <div className={`absolute inset-0 flex items-center justify-center transition-opacity duration-300 ${
            isEmbedActive ? 'opacity-100 bg-black/40' : 'opacity-0 group-hover:opacity-100 bg-black/30'
          }`}>
            <div className={`p-3 rounded-full backdrop-blur-sm transition-transform duration-200 ${
              isEmbedActive
                ? 'bg-[#1DB954] scale-100'
                : 'bg-white/90 group-hover:scale-110'
            }`}>
              {isEmbedActive ? (
                <Pause className="h-5 w-5 text-white fill-current" />
              ) : (
                <Play className="h-5 w-5 text-zinc-900 fill-current ml-0.5" />
              )}
            </div>
          </div>

          {isEmbedActive && (
            <div className="absolute inset-0 rounded-lg ring-2 ring-[#1DB954] ring-offset-2 ring-offset-background animate-pulse pointer-events-none" />
          )}
        </div>

        {/* Spotify embed - breaks out of cover width to show full player */}
        {isEmbedActive && (
          <div
            className="relative mt-2"
            style={{ width: '300px', marginLeft: '-40px' }}
            onClick={(e) => e.stopPropagation()}
          >
            <button
              onClick={onToggleEmbed}
              className="absolute -top-1 right-0 z-20 p-0.5 bg-zinc-800 hover:bg-zinc-700 text-white rounded-full shadow-lg transition-colors"
              title="Sluiten"
            >
              <X className="h-2.5 w-2.5" />
            </button>
            <iframe
              src={`https://open.spotify.com/embed/track/${track.trackId}?utm_source=generator&theme=0&autoplay=1`}
              width="300"
              height="80"
              frameBorder="0"
              allow="autoplay; clipboard-write; encrypted-media; fullscreen; picture-in-picture"
              loading="lazy"
              className="rounded-lg"
              title={`${track.trackName} - ${track.artistName}`}
            />
          </div>
        )}
      </div>

      {/* Track info on hover */}
      <div className="mt-1.5 opacity-0 group-hover:opacity-100 transition-opacity duration-300">
        <p className="text-[10px] text-foreground/80 font-medium truncate">{track.trackName}</p>
        <p className="text-[9px] text-muted-foreground truncate">{track.artistName}</p>
      </div>
    </motion.div>
  );
};
