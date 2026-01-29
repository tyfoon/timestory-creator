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
  const [showEmbed, setShowEmbed] = useState(false);

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
    
    if (!track) return;

    // User-initiated action: toggle embed with autoplay
    // Browser allows autoplay because user just clicked
    setShowEmbed(!showEmbed);
  };

  const handleClosePlayer = (e: React.MouseEvent) => {
    e.stopPropagation();
    e.preventDefault();
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

  // Show embedded player when user clicked play (user-initiated autoplay)
  if (showEmbed) {
    if (compact) {
      // For compact mode: scale down the iframe using CSS transform
      return (
        <div 
          className="relative"
          style={{ width: '152px', height: '80px' }}
          onClick={(e) => e.stopPropagation()}
        >
          <button
            onClick={handleClosePlayer}
            className="absolute -top-1 -right-1 z-20 p-0.5 bg-zinc-800 hover:bg-zinc-700 text-white rounded-full shadow-lg transition-colors"
            title="Sluiten"
          >
            <X className="h-2.5 w-2.5" />
          </button>
          <div 
            className="origin-top-left"
            style={{ 
              transform: 'scale(0.5)',
              width: '304px',
              height: '160px',
            }}
          >
            <iframe
              src={`https://open.spotify.com/embed/track/${track.trackId}?utm_source=generator&theme=0&autoplay=1`}
              width="304"
              height="160"
              frameBorder="0"
              allow="autoplay; clipboard-write; encrypted-media; fullscreen; picture-in-picture"
              loading="lazy"
              className="rounded-xl"
              title={`${track.trackName} - ${track.artistName}`}
            />
          </div>
        </div>
      );
    }
    
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
          src={`https://open.spotify.com/embed/track/${track.trackId}?utm_source=generator&theme=0&autoplay=1`}
          width="100%"
          height="152"
          frameBorder="0"
          allow="autoplay; clipboard-write; encrypted-media; fullscreen; picture-in-picture"
          loading="lazy"
          className="rounded-xl min-w-[250px]"
          title={`${track.trackName} - ${track.artistName}`}
        />
      </div>
    );
  }

  // Default: play button
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
