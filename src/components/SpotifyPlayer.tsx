import { useState, useEffect, useRef } from 'react';
import { Play, Pause, Loader2, X, ExternalLink } from 'lucide-react';
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
  const [isPlaying, setIsPlaying] = useState(false);
  const [showEmbed, setShowEmbed] = useState(false);
  const audioRef = useRef<HTMLAudioElement | null>(null);

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

  // Cleanup audio on unmount
  useEffect(() => {
    return () => {
      if (audioRef.current) {
        audioRef.current.pause();
        audioRef.current = null;
      }
    };
  }, []);

  const handlePlayClick = (e: React.MouseEvent) => {
    e.stopPropagation();
    e.preventDefault();
    
    if (!track) return;

    // If we have a preview URL, use HTML5 audio for instant playback
    if (track.previewUrl) {
      if (isPlaying && audioRef.current) {
        audioRef.current.pause();
        setIsPlaying(false);
      } else {
        // Create audio element if not exists
        if (!audioRef.current) {
          audioRef.current = new Audio(track.previewUrl);
          audioRef.current.addEventListener('ended', () => setIsPlaying(false));
          audioRef.current.addEventListener('pause', () => setIsPlaying(false));
          audioRef.current.addEventListener('play', () => setIsPlaying(true));
        }
        audioRef.current.play().catch(err => {
          console.error('[SpotifyPlayer] Playback failed:', err);
          // Fallback to embed if direct playback fails
          setShowEmbed(true);
        });
      }
    } else {
      // No preview available, show embed
      setShowEmbed(true);
    }
  };

  const handleClosePlayer = (e: React.MouseEvent) => {
    e.stopPropagation();
    e.preventDefault();
    if (audioRef.current) {
      audioRef.current.pause();
    }
    setIsPlaying(false);
    setShowEmbed(false);
  };

  if (isLoading) {
    return (
      <div className={`inline-flex items-center gap-1 ${compact ? 'px-2 py-1 text-[10px]' : 'px-2.5 py-1.5 text-xs'} bg-[#1DB954]/20 text-[#1DB954] rounded-full`}>
        <Loader2 className={compact ? "h-2.5 w-2.5 animate-spin" : "h-3 w-3 animate-spin"} />
        {!compact && <span>Zoeken...</span>}
      </div>
    );
  }

  if (error || !track) return null;

  // Show embedded player when no preview available and user clicked play
  if (showEmbed && !track.previewUrl) {
    return (
      <div className="relative" onClick={(e) => e.stopPropagation()}>
        <button
          onClick={handleClosePlayer}
          className={`absolute z-10 bg-zinc-800 hover:bg-zinc-700 text-white rounded-full shadow-lg transition-colors ${compact ? '-top-1 -right-1 p-0.5' : '-top-2 -right-2 p-1'}`}
          title="Sluiten"
        >
          <X className={compact ? "h-2.5 w-2.5" : "h-3.5 w-3.5"} />
        </button>
        <iframe
          src={`https://open.spotify.com/embed/track/${track.trackId}?utm_source=generator&theme=0&autoplay=1`}
          width={compact ? "140" : "100%"}
          height={compact ? "80" : "152"}
          frameBorder="0"
          allow="autoplay; clipboard-write; encrypted-media; fullscreen; picture-in-picture"
          loading="lazy"
          className={compact ? "rounded-lg" : "rounded-xl min-w-[250px]"}
          title={`${track.trackName} - ${track.artistName}`}
        />
      </div>
    );
  }

  // Playing state with preview - show mini player
  if (isPlaying && track.previewUrl) {
    // Compact mode: smaller mini player
    if (compact) {
      return (
        <div 
          className="flex items-center gap-1.5 p-1.5 bg-[#1DB954]/10 border border-[#1DB954]/30 rounded-lg max-w-[140px]"
          onClick={(e) => e.stopPropagation()}
        >
          {track.albumImage && (
            <img 
              src={track.albumImage} 
              alt={track.albumName}
              className="w-6 h-6 rounded shadow-md flex-shrink-0"
            />
          )}
          <div className="flex-1 min-w-0">
            <p className="text-[10px] font-medium truncate">{track.trackName}</p>
          </div>
          <button
            onClick={handlePlayClick}
            className="p-1 bg-[#1DB954] hover:bg-[#1ed760] text-white rounded-full transition-colors flex-shrink-0"
            title="Pauzeren"
          >
            <Pause className="h-2.5 w-2.5 fill-current" />
          </button>
        </div>
      );
    }
    
    return (
      <div 
        className="flex items-center gap-2 p-2 bg-[#1DB954]/10 border border-[#1DB954]/30 rounded-lg"
        onClick={(e) => e.stopPropagation()}
      >
        {track.albumImage && (
          <img 
            src={track.albumImage} 
            alt={track.albumName}
            className="w-10 h-10 rounded shadow-md"
          />
        )}
        <div className="flex-1 min-w-0">
          <p className="text-sm font-medium truncate">{track.trackName}</p>
          <p className="text-xs text-muted-foreground truncate">{track.artistName}</p>
        </div>
        <button
          onClick={handlePlayClick}
          className="p-2 bg-[#1DB954] hover:bg-[#1ed760] text-white rounded-full transition-colors"
          title="Pauzeren"
        >
          <Pause className="h-4 w-4 fill-current" />
        </button>
        <a
          href={track.spotifyUrl}
          target="_blank"
          rel="noopener noreferrer"
          className="p-2 text-[#1DB954] hover:text-[#1ed760] transition-colors"
          title="Open in Spotify"
        >
          <ExternalLink className="h-4 w-4" />
        </a>
      </div>
    );
  }

  // Default: play button - match trailer button size in compact mode
  return (
    <button
      onClick={handlePlayClick}
      className={`inline-flex items-center gap-1 ${compact ? 'px-2 py-1 text-[10px]' : 'px-3 py-1.5 text-xs'} bg-[#1DB954] hover:bg-[#1ed760] text-white rounded-full font-medium transition-colors shadow-md`}
      title={`${track.trackName} - ${track.artistName}`}
    >
      <Play className={compact ? "h-2.5 w-2.5 fill-current" : "h-3 w-3 fill-current"} />
      <span>{compact ? "Song" : "Play song"}</span>
    </button>
  );
};
