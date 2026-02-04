import React, { useEffect, useState } from 'react';
import { useParams, Link } from 'react-router-dom';
import { Player } from '@remotion/player';
import { supabase } from '@/integrations/supabase/client';
import { Button } from '@/components/ui/button';
import { Loader2, Home, AlertCircle, Play, Pause, Volume2, VolumeX } from 'lucide-react';
import { 
  TimelineVideoComponent, 
  ScrapbookVideoComponent,
  calculateTotalDuration,
  calculateScrapbookDuration,
  VideoEvent 
} from '@/remotion';
import { StoryContent, StorySettings } from '@/hooks/useSaveStory';

const FPS = 30;

interface SavedStory {
  id: string;
  content: StoryContent;
  settings: StorySettings;
  created_at: string;
  view_count: number;
}

export default function SharedStoryPage() {
  const { id } = useParams<{ id: string }>();
  const [story, setStory] = useState<SavedStory | null>(null);
  const [isLoading, setIsLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [isPlaying, setIsPlaying] = useState(false);
  const [isMuted, setIsMuted] = useState(false);
  const playerRef = React.useRef<any>(null);

  useEffect(() => {
    const fetchStory = async () => {
      if (!id) {
        setError('Geen verhaal ID opgegeven');
        setIsLoading(false);
        return;
      }

      try {
        const { data, error: fetchError } = await supabase
          .from('saved_stories')
          .select('*')
          .eq('id', id)
          .single();

        if (fetchError) {
          console.error('Fetch error:', fetchError);
          setError('Verhaal niet gevonden');
          return;
        }

        // Parse the JSON fields
        const storyData: SavedStory = {
          id: data.id,
          content: data.content as unknown as StoryContent,
          settings: data.settings as unknown as StorySettings,
          created_at: data.created_at,
          view_count: data.view_count,
        };

        setStory(storyData);

        // Increment view count (fire-and-forget)
        supabase
          .from('saved_stories')
          .update({ view_count: (storyData.view_count || 0) + 1 })
          .eq('id', id)
          .then(() => {});

      } catch (err) {
        console.error('Error fetching story:', err);
        setError('Er ging iets mis bij het laden');
      } finally {
        setIsLoading(false);
      }
    };

    fetchStory();
  }, [id]);

  // Calculate video duration based on settings
  const calculateDuration = (): number => {
    if (!story) return 300;

    const { content, settings } = story;
    const events = content.events as VideoEvent[];

    // Music video mode
    if (settings.isMusicVideo && settings.backgroundMusicDuration) {
      return Math.round(settings.backgroundMusicDuration * FPS);
    }

    // Scrapbook variant
    if (settings.variant === 'scrapbook') {
      return calculateScrapbookDuration(
        events,
        settings.introDurationFrames || 150,
        FPS
      );
    }

    // Default slideshow
    return calculateTotalDuration(
      events,
      settings.introDurationFrames || 150,
      FPS
    );
  };

  const handlePlayPause = () => {
    if (playerRef.current) {
      if (isPlaying) {
        playerRef.current.pause();
      } else {
        playerRef.current.play();
      }
      setIsPlaying(!isPlaying);
    }
  };

  const handleMuteToggle = () => {
    if (playerRef.current) {
      playerRef.current.setVolume(isMuted ? 1 : 0);
      setIsMuted(!isMuted);
    }
  };

  // Loading state
  if (isLoading) {
    return (
      <div className="min-h-screen bg-background flex flex-col items-center justify-center p-4">
        <Loader2 className="h-12 w-12 animate-spin text-primary mb-4" />
        <p className="text-muted-foreground">Verhaal laden...</p>
      </div>
    );
  }

  // Error state
  if (error || !story) {
    return (
      <div className="min-h-screen bg-background flex flex-col items-center justify-center p-4">
        <AlertCircle className="h-12 w-12 text-destructive mb-4" />
        <h1 className="text-xl font-bold mb-2">Oeps!</h1>
        <p className="text-muted-foreground mb-6">{error || 'Verhaal niet gevonden'}</p>
        <Link to="/">
          <Button variant="outline" className="gap-2">
            <Home className="h-4 w-4" />
            Naar homepage
          </Button>
        </Link>
      </div>
    );
  }

  const { content, settings } = story;
  const events = content.events as VideoEvent[];
  const totalDuration = calculateDuration();

  // Prepare video props
  const videoProps = {
    events: events,
    storyTitle: content.storyTitle,
    storyIntroduction: content.storyIntroduction,
    introAudioUrl: settings.introAudioUrl,
    introDurationFrames: settings.introDurationFrames || 150,
    fps: FPS,
    enableRetroEffect: settings.enableVhsEffect,
    retroIntensity: settings.retroIntensity || 0.85,
    externalAudioUrl: settings.isMusicVideo ? settings.backgroundMusicUrl : undefined,
    externalAudioDuration: settings.isMusicVideo ? settings.backgroundMusicDuration : undefined,
  };

  const VideoComponent = settings.variant === 'scrapbook' 
    ? ScrapbookVideoComponent 
    : TimelineVideoComponent;

  return (
    <div className="min-h-screen bg-black flex flex-col">
      {/* Video Player - Full width, maintains aspect ratio */}
      <div className="flex-1 flex items-center justify-center p-0 sm:p-4">
        <div className="w-full max-w-6xl aspect-video bg-black rounded-none sm:rounded-lg overflow-hidden shadow-2xl relative group">
          <Player
            ref={playerRef}
            // eslint-disable-next-line @typescript-eslint/no-explicit-any
            component={VideoComponent as any}
            inputProps={videoProps}
            durationInFrames={totalDuration}
            compositionWidth={1920}
            compositionHeight={1080}
            fps={FPS}
            style={{ width: '100%', height: '100%' }}
            controls
            autoPlay={false}
            clickToPlay
            doubleClickToFullscreen
          />
          
          {/* Custom overlay controls - shown on hover */}
          <div className="absolute bottom-0 left-0 right-0 p-4 bg-gradient-to-t from-black/80 to-transparent opacity-0 group-hover:opacity-100 transition-opacity pointer-events-none">
            <div className="flex items-center gap-3 pointer-events-auto">
              <Button
                variant="ghost"
                size="icon"
                onClick={handlePlayPause}
                className="h-10 w-10 rounded-full bg-white/20 hover:bg-white/30 text-white"
              >
                {isPlaying ? <Pause className="h-5 w-5" /> : <Play className="h-5 w-5" />}
              </Button>
              <Button
                variant="ghost"
                size="icon"
                onClick={handleMuteToggle}
                className="h-10 w-10 rounded-full bg-white/20 hover:bg-white/30 text-white"
              >
                {isMuted ? <VolumeX className="h-5 w-5" /> : <Volume2 className="h-5 w-5" />}
              </Button>
              <div className="flex-1" />
              <span className="text-white/70 text-sm">
                {Math.floor(totalDuration / FPS / 60)}:{String(Math.floor((totalDuration / FPS) % 60)).padStart(2, '0')}
              </span>
            </div>
          </div>
        </div>
      </div>

      {/* Bottom bar with title and CTA */}
      <div className="bg-background border-t border-border p-4 sm:p-6">
        <div className="max-w-4xl mx-auto flex flex-col sm:flex-row items-center justify-between gap-4">
          <div className="text-center sm:text-left">
            <h1 className="text-lg sm:text-xl font-bold text-foreground truncate max-w-[300px] sm:max-w-none">
              {content.storyTitle || 'TimeStory Video'}
            </h1>
            <p className="text-sm text-muted-foreground">
              {settings.isMusicVideo ? '🎵 Muziekvideo' : '🎬 Verhaalvideo'} • {events.length} momenten
            </p>
          </div>
          
          <Link to="/">
            <Button className="gap-2 w-full sm:w-auto">
              <Home className="h-4 w-4" />
              Maak je eigen TimeStory
            </Button>
          </Link>
        </div>
      </div>
    </div>
  );
}
