/**
 * ParallaxMusicColumn - Right sidebar with parallax-scrolling album covers
 * Fetches #1 hits via search-spotify for each year in the timeline range
 * Uses framer-motion useScroll/useTransform for a "floating" parallax effect
 */

import { useEffect, useRef, useState } from 'react';
import { motion, useScroll, useTransform } from 'framer-motion';
import { Play, Pause, Loader2, Music } from 'lucide-react';
import { supabase } from '@/integrations/supabase/client';

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

// Generate search queries for #1 hits per year
const getHitQuery = (year: number): string => {
  // Iconic #1 hit queries per year — use generic "hit [year]" approach
  return `nummer 1 hit ${year}`;
};

export const ParallaxMusicColumn = ({ startYear, endYear }: ParallaxMusicColumnProps) => {
  const [tracks, setTracks] = useState<HitTrack[]>([]);
  const [isLoading, setIsLoading] = useState(true);
  const [playingTrackId, setPlayingTrackId] = useState<string | null>(null);
  const columnRef = useRef<HTMLDivElement>(null);
  const audioRef = useRef<HTMLAudioElement | null>(null);

  // Parallax: use the column container as scroll target for reliable tracking
  const { scrollY } = useScroll();
  // Map window scroll pixels to a slower vertical offset for the music content
  const parallaxY = useTransform(scrollY, [0, 3000], [0, -600]);

  // Fetch tracks on mount
  useEffect(() => {
    let cancelled = false;

    const fetchAllHits = async () => {
      setIsLoading(true);
      const years: number[] = [];
      const currentYear = new Date().getFullYear();
      const end = Math.min(endYear, currentYear);

      for (let y = startYear; y <= end; y++) {
        years.push(y);
      }

      // Limit to ~40 hits, evenly distributed
      let selectedYears = years;
      if (years.length > 40) {
        const step = years.length / 40;
        selectedYears = Array.from({ length: 40 }, (_, i) => years[Math.floor(i * step)]);
      }

      // Fetch in parallel batches of 5, deduplicating by trackId
      const results: HitTrack[] = [];
      const seenTrackIds = new Set<string>();
      const batchSize = 5;

      for (let i = 0; i < selectedYears.length; i += batchSize) {
        if (cancelled) return;
        const batch = selectedYears.slice(i, i + batchSize);
        const batchResults = await Promise.allSettled(
          batch.map(async (year) => {
            try {
              const { data, error } = await supabase.functions.invoke('search-spotify', {
                body: { query: getHitQuery(year) }
              });
              if (error || !data?.trackId) {
                console.warn(`[ParallaxMusic] No result for year ${year}`);
                return null;
              }
              // Skip duplicates
              if (seenTrackIds.has(data.trackId)) {
                console.log(`[ParallaxMusic] Skipping duplicate: ${data.trackName} (${year})`);
                return null;
              }
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
            } catch (e) {
              console.error(`[ParallaxMusic] Error fetching year ${year}:`, e);
              return null;
            }
          })
        );

        for (const r of batchResults) {
          if (r.status === 'fulfilled' && r.value) {
            results.push(r.value);
          }
        }

        // Update UI progressively
        if (!cancelled) {
          setTracks([...results]);
        }
      }

      if (!cancelled) {
        setIsLoading(false);
      }
    };

    fetchAllHits();
    return () => { cancelled = true; };
  }, [startYear, endYear]);

  // Audio playback
  const handlePlay = (track: HitTrack) => {
    if (playingTrackId === track.trackId) {
      // Stop
      audioRef.current?.pause();
      setPlayingTrackId(null);
      return;
    }

    // Play new track
    if (audioRef.current) {
      audioRef.current.pause();
    }

    if (track.previewUrl) {
      const audio = new Audio(track.previewUrl);
      audio.play().catch(() => {});
      audio.onended = () => setPlayingTrackId(null);
      audioRef.current = audio;
      setPlayingTrackId(track.trackId);
    } else {
      // No preview, open Spotify
      window.open(track.spotifyUrl, '_blank');
    }
  };

  // Cleanup audio on unmount
  useEffect(() => {
    return () => {
      audioRef.current?.pause();
    };
  }, []);

  return (
    <div ref={columnRef} className="relative w-full">
      {/* Header */}
      <div className="sticky top-14 z-30 bg-background/90 backdrop-blur-sm py-3 px-2 border-b border-border/30 mb-6">
        <div className="flex items-center gap-2 text-muted-foreground">
          <Music className="h-4 w-4" />
          <span className="font-mono text-[10px] uppercase tracking-[0.2em]">
            Soundtrack {startYear}–{endYear}
          </span>
        </div>
      </div>

      {/* Parallax content wrapper - moves at slower speed than page scroll */}
      <motion.div style={{ y: parallaxY }} className="space-y-8 px-2 pb-32">
        {/* Loading skeleton */}
        {isLoading && tracks.length === 0 && (
          <div className="flex flex-col items-center gap-4 py-12">
            <Loader2 className="h-6 w-6 animate-spin text-muted-foreground" />
            <span className="text-xs text-muted-foreground font-mono">Hits laden...</span>
          </div>
        )}

        {/* Album covers */}
        {tracks.map((track, index) => (
          <AlbumCard
            key={`${track.trackId}-${track.year}`}
            track={track}
            index={index}
            isPlaying={playingTrackId === track.trackId}
            onPlay={() => handlePlay(track)}
          />
        ))}

        {/* Loading more indicator */}
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
// ALBUM CARD - Single cover with play button
// =============================================
interface AlbumCardProps {
  track: HitTrack;
  index: number;
  isPlaying: boolean;
  onPlay: () => void;
}

const AlbumCard = ({ track, index, isPlaying, onPlay }: AlbumCardProps) => {
  const ref = useRef(null);

  return (
    <motion.div
      ref={ref}
      initial={{ opacity: 0, y: 30 }}
      whileInView={{ opacity: 1, y: 0 }}
      viewport={{ once: true, margin: '-50px' }}
      transition={{ duration: 0.6, delay: index * 0.03 }}
      className="group relative cursor-pointer"
      onClick={onPlay}
    >
      {/* Year label - tiny, above cover */}
      <span className="block font-mono text-[10px] text-muted-foreground/60 mb-1.5 tracking-widest">
        {track.year}
      </span>

      {/* Album cover - compact size */}
      <div className="relative aspect-square w-[55%] overflow-hidden rounded-lg shadow-lg bg-muted">
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

        {/* Play/Pause overlay - visible on hover or when playing */}
        <div className={`absolute inset-0 flex items-center justify-center transition-opacity duration-300 ${
          isPlaying ? 'opacity-100 bg-black/40' : 'opacity-0 group-hover:opacity-100 bg-black/30'
        }`}>
          <div className={`p-3 rounded-full backdrop-blur-sm transition-transform duration-200 ${
            isPlaying 
              ? 'bg-[#1DB954] scale-100' 
              : 'bg-white/90 group-hover:scale-110'
          }`}>
            {isPlaying ? (
              <Pause className="h-5 w-5 text-white fill-current" />
            ) : (
              <Play className="h-5 w-5 text-zinc-900 fill-current ml-0.5" />
            )}
          </div>
        </div>

        {/* Playing indicator - pulsing ring */}
        {isPlaying && (
          <div className="absolute inset-0 rounded-lg ring-2 ring-[#1DB954] ring-offset-2 ring-offset-background animate-pulse pointer-events-none" />
        )}
      </div>

      {/* Track info on hover - subtle */}
      <div className="mt-1.5 opacity-0 group-hover:opacity-100 transition-opacity duration-300">
        <p className="text-[10px] text-foreground/80 font-medium truncate">{track.trackName}</p>
        <p className="text-[9px] text-muted-foreground truncate">{track.artistName}</p>
      </div>
    </motion.div>
  );
};
