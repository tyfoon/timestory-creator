import { useState, useEffect } from 'react';
import { Play, Loader2, ExternalLink } from 'lucide-react';
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

  // Compact version - just a play button that opens Spotify
  if (compact) {
    if (isLoading) {
      return (
        <div className="inline-flex items-center gap-1.5 px-2.5 py-1.5 bg-[#1DB954]/20 text-[#1DB954] rounded-full text-xs">
          <Loader2 className="h-3 w-3 animate-spin" />
          <span>Zoeken...</span>
        </div>
      );
    }

    if (!track) return null;

    return (
      <a
        href={track.spotifyUrl}
        target="_blank"
        rel="noopener noreferrer"
        className="inline-flex items-center gap-1.5 px-3 py-1.5 bg-[#1DB954] hover:bg-[#1ed760] text-white rounded-full text-xs font-medium transition-colors shadow-md"
        onClick={(e) => e.stopPropagation()}
        title={`${track.trackName} - ${track.artistName}`}
      >
        <Play className="h-3 w-3 fill-current" />
        <span>Beluister op Spotify</span>
      </a>
    );
  }

  // Full version with album art
  if (isLoading) {
    return (
      <div className="flex items-center gap-3 p-3 bg-zinc-900/80 backdrop-blur rounded-lg">
        <div className="w-12 h-12 bg-zinc-800 rounded flex items-center justify-center">
          <Loader2 className="h-5 w-5 text-[#1DB954] animate-spin" />
        </div>
        <div className="flex-1">
          <div className="h-4 w-24 bg-zinc-800 rounded animate-pulse" />
          <div className="h-3 w-16 bg-zinc-800 rounded animate-pulse mt-1" />
        </div>
      </div>
    );
  }

  if (error || !track) return null;

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
      <a
        href={track.spotifyUrl}
        target="_blank"
        rel="noopener noreferrer"
        className="flex items-center gap-1.5 px-3 py-2 bg-[#1DB954] hover:bg-[#1ed760] text-white rounded-full text-xs font-medium transition-colors"
        onClick={(e) => e.stopPropagation()}
      >
        <Play className="h-3.5 w-3.5 fill-current" />
        <span className="hidden sm:inline">Spotify</span>
        <ExternalLink className="h-3 w-3 sm:hidden" />
      </a>
    </div>
  );
};
