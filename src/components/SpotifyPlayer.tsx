import { useState, useEffect } from 'react';
import { Play, Loader2, X } from 'lucide-react';
import { supabase } from '@/integrations/supabase/client';

interface SpotifyTrack {
  trackId: string;
  trackName: string;
  artistName: string;
  albumName: string;
  albumImage: string | null;
  previewUrl: string | null;
  spotifyUrl: string;
}

interface SpotifyPlayerProps {
  searchQuery: string;
  compact?: boolean;
}

export const SpotifyPlayer = ({ searchQuery, compact = false }: SpotifyPlayerProps) => {
  const [track, setTrack] = useState<SpotifyTrack | null>(null);
  const [isLoading, setIsLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [hasSearched, setHasSearched] = useState(false);
  const [showPlayer, setShowPlayer] = useState(false);

  useEffect(() => {
    if (!searchQuery || hasSearched) return;

    const fetchTrack = async () => {
      setIsLoading(true);
      setError(null);
      
      try {
        const { data, error: fnError } = await supabase.functions.invoke('search-spotify', {
          body: { query: searchQuery }
        });

        if (fnError) {
          console.error('[SpotifyPlayer] Function error:', fnError);
          setError('Kon nummer niet vinden');
          return;
        }

        if (data?.trackId) {
          setTrack(data as SpotifyTrack);
        } else {
          setError('Geen resultaat gevonden');
        }
      } catch (err) {
        console.error('[SpotifyPlayer] Error:', err);
        setError('Fout bij zoeken');
      } finally {
        setIsLoading(false);
        setHasSearched(true);
      }
    };

    fetchTrack();
  }, [searchQuery, hasSearched]);

  const handlePlayClick = (e: React.MouseEvent) => {
    e.stopPropagation();
    e.preventDefault();
    setShowPlayer(true);
  };

  const handleClosePlayer = (e: React.MouseEvent) => {
    e.stopPropagation();
    e.preventDefault();
    setShowPlayer(false);
  };

  if (isLoading) {
    return (
      <div className="inline-flex items-center gap-1.5 px-2.5 py-1.5 bg-[#1DB954]/20 text-[#1DB954] rounded-full text-xs">
        <Loader2 className="h-3 w-3 animate-spin" />
        <span>Zoeken...</span>
      </div>
    );
  }

  if (error || !track) return null;

  // Show embedded player when activated
  if (showPlayer) {
    return (
      <div className="relative" onClick={(e) => e.stopPropagation()}>
        <button
          onClick={handleClosePlayer}
          className="absolute -top-2 -right-2 z-10 p-1 bg-zinc-800 hover:bg-zinc-700 text-white rounded-full shadow-lg transition-colors"
          title="Sluiten"
        >
          <X className="h-3.5 w-3.5" />
        </button>
        <iframe
          src={`https://open.spotify.com/embed/track/${track.trackId}?utm_source=generator&theme=0`}
          width="100%"
          height={compact ? "80" : "152"}
          frameBorder="0"
          allow="autoplay; clipboard-write; encrypted-media; fullscreen; picture-in-picture"
          loading="lazy"
          className="rounded-xl"
          title={`${track.trackName} - ${track.artistName}`}
        />
      </div>
    );
  }

  // Compact play button
  if (compact) {
    return (
      <button
        onClick={handlePlayClick}
        className="inline-flex items-center gap-1.5 px-3 py-1.5 bg-[#1DB954] hover:bg-[#1ed760] text-white rounded-full text-xs font-medium transition-colors shadow-md"
        title={`${track.trackName} - ${track.artistName}`}
      >
        <Play className="h-3 w-3 fill-current" />
        <span>Afspelen</span>
      </button>
    );
  }

  // Full version with album art
  return (
    <div className="flex items-center gap-3 p-3 bg-zinc-900/90 backdrop-blur rounded-lg border border-zinc-800">
      {track.albumImage && (
        <img 
          src={track.albumImage} 
          alt={track.albumName}
          className="w-12 h-12 rounded shadow-md"
        />
      )}
      <div className="flex-1 min-w-0">
        <p className="text-white text-sm font-medium truncate">{track.trackName}</p>
        <p className="text-zinc-400 text-xs truncate">{track.artistName}</p>
      </div>
      <button
        onClick={handlePlayClick}
        className="flex items-center gap-1.5 px-3 py-2 bg-[#1DB954] hover:bg-[#1ed760] text-white rounded-full text-xs font-medium transition-colors"
      >
        <Play className="h-3.5 w-3.5 fill-current" />
        <span>Afspelen</span>
      </button>
    </div>
  );
};
