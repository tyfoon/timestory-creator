import { useState } from 'react';
import { Play, Loader2, X } from 'lucide-react';
import { SpotifyPlayer } from '@/components/SpotifyPlayer';
import { searchYouTube } from '@/lib/api/youtube';
import { useToast } from '@/hooks/use-toast';

interface MediaButtonsProps {
  spotifySearchQuery?: string;
  movieSearchQuery?: string;
  eventTitle: string;
  /** Optional callback when trailer starts playing */
  onTrailerPlay?: () => void;
  /** Optional callback when trailer stops */
  onTrailerStop?: () => void;
}

/**
 * Shared media buttons component for Spotify and YouTube trailer playback
 * Used across all Timeline Story layout patterns
 */
export const MediaButtons = ({
  spotifySearchQuery,
  movieSearchQuery,
  eventTitle,
  onTrailerPlay,
  onTrailerStop,
}: MediaButtonsProps) => {
  const { toast } = useToast();
  const [isLoadingTrailer, setIsLoadingTrailer] = useState(false);
  const [isPlayingTrailer, setIsPlayingTrailer] = useState(false);
  const [youtubeVideoId, setYoutubeVideoId] = useState<string | null>(null);
  const [trailerError, setTrailerError] = useState(false);

  const handlePlayTrailer = async (e: React.MouseEvent) => {
    e.stopPropagation();
    if (!movieSearchQuery) return;
    
    // Reset error state on retry
    setTrailerError(false);
    setIsLoadingTrailer(true);
    
    try {
      const result = await searchYouTube(movieSearchQuery);
      if (result.success && result.videoId) {
        setYoutubeVideoId(result.videoId);
        setIsPlayingTrailer(true);
        onTrailerPlay?.();
      } else if (result.error) {
        console.warn('YouTube search error:', result.error);
        setTrailerError(true);
        toast({
          title: "Trailer niet gevonden",
          description: "Kon geen trailer vinden voor deze film.",
          variant: "destructive",
        });
      } else {
        console.warn('No YouTube video found for:', movieSearchQuery);
        setTrailerError(true);
      }
    } catch (error) {
      console.error('Error fetching YouTube video:', error);
      setTrailerError(true);
      toast({
        title: "Verbindingsfout",
        description: "Kon geen verbinding maken met de server. Probeer het later opnieuw.",
        variant: "destructive",
      });
    } finally {
      setIsLoadingTrailer(false);
    }
  };

  const handleStopTrailer = (e: React.MouseEvent) => {
    e.stopPropagation();
    setIsPlayingTrailer(false);
    setYoutubeVideoId(null);
    onTrailerStop?.();
  };

  const hasMedia = spotifySearchQuery || movieSearchQuery;
  if (!hasMedia) return null;

  // When trailer is playing, show just the video player
  if (isPlayingTrailer && youtubeVideoId) {
    return (
      <div className="relative w-full aspect-video rounded-lg overflow-hidden shadow-2xl">
        <iframe
          src={`https://www.youtube.com/embed/${youtubeVideoId}?autoplay=1&rel=0`}
          title={`${eventTitle} trailer`}
          className="w-full h-full"
          allow="accelerometer; autoplay; clipboard-write; encrypted-media; gyroscope; picture-in-picture"
          allowFullScreen
        />
        <button
          onClick={handleStopTrailer}
          className="absolute top-3 right-3 z-20 p-2 rounded-full bg-black/70 text-white hover:bg-black/90 transition-colors"
          aria-label="Trailer sluiten"
        >
          <X className="h-4 w-4" />
        </button>
      </div>
    );
  }

  // Default: show media buttons
  return (
    <div className="flex items-center gap-2 flex-wrap">
      {/* Spotify Player */}
      {spotifySearchQuery && (
        <SpotifyPlayer searchQuery={spotifySearchQuery} compact />
      )}
      
      {/* Play Trailer Button */}
      {movieSearchQuery && (
        <button
          onClick={handlePlayTrailer}
          disabled={isLoadingTrailer}
          className="inline-flex items-center gap-1.5 h-7 px-3 bg-destructive hover:bg-destructive/90 text-destructive-foreground rounded-full text-xs font-medium transition-colors shadow-md"
          aria-label="Trailer afspelen"
        >
          {isLoadingTrailer ? (
            <Loader2 className="h-3.5 w-3.5 animate-spin" />
          ) : (
            <>
              <Play className="h-3.5 w-3.5 fill-current" />
              <span>Trailer</span>
            </>
          )}
        </button>
      )}
    </div>
  );
};
