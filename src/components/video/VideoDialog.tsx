import React, { useState, useCallback, useMemo, useRef, useEffect } from 'react';
import { Player } from '@remotion/player';
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogDescription } from '@/components/ui/dialog';
import { Button } from '@/components/ui/button';
import { Progress } from '@/components/ui/progress';
import { Loader2, Video, Volume2, AlertCircle, Music, Tv, Camera, Layers, Mic, Share2, Maximize } from 'lucide-react';
import { Switch } from '@/components/ui/switch';
import { Label } from '@/components/ui/label';
import { TimelineEvent } from '@/types/timeline';
import { 
  TimelineVideoComponent, 
  calculateTotalDuration, 
  ScrapbookVideoComponent,
  calculateScrapbookDuration,
  VideoEvent 
} from '@/remotion';
import { generateSpeech, base64ToAudioUrl, VoiceProvider } from '@/remotion/lib/speechApi';
import { measureAudioDuration } from '@/remotion/lib/audioUtils';
import { ShareDialog } from '@/components/video/ShareDialog';
import { StoryContent, StorySettings } from '@/hooks/useSaveStory';
import { useWakeLock } from '@/hooks/useWakeLock';

// Fallback Supabase configuration for sound effects
const SUPABASE_URL = import.meta.env.VITE_SUPABASE_URL || 'https://koeoboygsssyajpdstel.supabase.co';
const SUPABASE_ANON_KEY = import.meta.env.VITE_SUPABASE_PUBLISHABLE_KEY || 'eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZSIsInJlZiI6ImtvZW9ib3lnc3NzeWFqcGRzdGVsIiwicm9sZSI6ImFub24iLCJpYXQiOjE3NjkyNTY2NjEsImV4cCI6MjA4NDgzMjY2MX0.KuFaWF4r_cxZRiOumPGMChLVmwgyhT9vR5s7L52zr5s';

type VideoVariant = 'slideshow' | 'scrapbook';

interface VideoDialogProps {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  events: TimelineEvent[];
  storyTitle?: string;
  storyIntroduction?: string;
  /** Background music URL (e.g., from Suno AI) */
  backgroundMusicUrl?: string;
  /** Duration of background music in seconds */
  backgroundMusicDuration?: number;
}

// Fetch sound effect from Freesound and proxy it to avoid CORS issues
const fetchSoundEffect = async (query: string): Promise<string | null> => {
  try {
    // First, search for the sound effect
    const searchResponse = await fetch(`${SUPABASE_URL}/functions/v1/search-freesound`, {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        'Authorization': `Bearer ${SUPABASE_ANON_KEY}`,
        'apikey': SUPABASE_ANON_KEY,
      },
      body: JSON.stringify({ query }),
    });

    if (!searchResponse.ok) return null;
    
    const data = await searchResponse.json();
    if (!data.success || !data.sound?.previewUrl) return null;

    // Proxy the audio through our edge function to avoid CORS issues
    const proxyResponse = await fetch(`${SUPABASE_URL}/functions/v1/proxy-audio`, {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        'Authorization': `Bearer ${SUPABASE_ANON_KEY}`,
        'apikey': SUPABASE_ANON_KEY,
      },
      body: JSON.stringify({ url: data.sound.previewUrl }),
    });

    if (!proxyResponse.ok) {
      console.error('Failed to proxy audio:', proxyResponse.status);
      return null;
    }

    // Convert the proxied audio to a data URL.
    // Remotion's audio pipeline is more reliable with data URLs than blob: URLs in some browsers.
    const audioBlob = await proxyResponse.blob();
    const dataUrl = await new Promise<string>((resolve, reject) => {
      const reader = new FileReader();
      reader.onloadend = () => resolve(reader.result as string);
      reader.onerror = () => reject(new Error('Failed to read audio blob'));
      reader.readAsDataURL(audioBlob);
    });

    return dataUrl;
  } catch (error) {
    console.error('Sound effect fetch error:', error);
    return null;
  }
};

const FPS = 30;
const DEFAULT_EVENT_DURATION_SECONDS = 5;

export const VideoDialog: React.FC<VideoDialogProps> = ({
  open,
  onOpenChange,
  events,
  storyTitle,
  storyIntroduction,
  backgroundMusicUrl,
  backgroundMusicDuration,
}) => {
  const [isGeneratingAudio, setIsGeneratingAudio] = useState(false);
  const [audioProgress, setAudioProgress] = useState(0);
  const [audioError, setAudioError] = useState<string | null>(null);
  const [videoEvents, setVideoEvents] = useState<VideoEvent[]>([]);
  const [introAudioUrl, setIntroAudioUrl] = useState<string | undefined>();
  const [introDurationFrames, setIntroDurationFrames] = useState(150); // Default 5 seconds
  const [isReady, setIsReady] = useState(false);
  const [enableVhsEffect, setEnableVhsEffect] = useState(false);
  const [videoVariant, setVideoVariant] = useState<VideoVariant>('slideshow');
  const [voiceProvider, setVoiceProvider] = useState<VoiceProvider>('google');
  const [isShareDialogOpen, setIsShareDialogOpen] = useState(false);
  const playerContainerRef = useRef<HTMLDivElement>(null);
  const [showFullscreenOverlay, setShowFullscreenOverlay] = useState(false);
  const [hasTriedAutoFullscreen, setHasTriedAutoFullscreen] = useState(false);
  const wakeLockRef = useRef<WakeLockSentinel | null>(null);

  // Generate audio for all events - PARALLEL for speed, EXACT durations via Web Audio API
  const handleGenerateAudio = useCallback(async () => {
    setIsGeneratingAudio(true);
    setAudioError(null);
    setAudioProgress(0);

    try {
      const totalSegments = events.length + (storyIntroduction ? 1 : 0);
      let completed = 0;

      // PARALLEL: Generate intro + all event audio simultaneously
      const introPromise = storyIntroduction
        ? generateSpeech({ 
            text: storyIntroduction,
            speakingRate: 1.0,
            provider: voiceProvider
          }).then(async (result) => {
            // Measure EXACT duration using Web Audio API
            const exactDuration = await measureAudioDuration(result.audioContent);
            return { ...result, exactDuration };
          }).catch(err => {
            console.error('Failed to generate intro audio:', err);
            return null;
          })
        : Promise.resolve(null);

      // All events in parallel (speech + sound effects)
      const eventPromises = events.map(async (event) => {
        const speechText = `${event.title}. ${event.description}`;
        
        const [speechResult, soundEffectResult] = await Promise.all([
          generateSpeech({ text: speechText, provider: voiceProvider })
            .then(async (result) => {
              // Measure EXACT duration using Web Audio API
              const exactDuration = await measureAudioDuration(result.audioContent);
              return { ...result, exactDuration };
            })
            .catch(err => {
              console.error(`Failed to generate audio for event ${event.id}:`, err);
              return null;
            }),
          event.soundEffectSearchQuery 
            ? fetchSoundEffect(event.soundEffectSearchQuery)
            : Promise.resolve(null),
        ]);

        // Update progress as each completes
        completed++;
        setAudioProgress((completed / totalSegments) * 100);

        return { event, speechResult, soundEffectResult };
      });

      // Wait for intro and all events to complete
      const [introResult, ...eventResults] = await Promise.all([
        introPromise.then(result => {
          if (storyIntroduction) {
            completed++;
            setAudioProgress((completed / totalSegments) * 100);
          }
          return result;
        }),
        ...eventPromises,
      ]);

      // Process intro result
      let newIntroAudioUrl: string | undefined;
      let newIntroDurationFrames = 150;

      if (introResult) {
        newIntroAudioUrl = base64ToAudioUrl(introResult.audioContent);
        // Use EXACT duration from Web Audio API + minimal 2-frame buffer
        const exactDuration = introResult.exactDuration || introResult.estimatedDurationSeconds;
        newIntroDurationFrames = Math.round(exactDuration * FPS) + 2;
        console.log(`Intro: exact=${introResult.exactDuration?.toFixed(2)}s, estimated=${introResult.estimatedDurationSeconds.toFixed(2)}s, frames=${newIntroDurationFrames}`);
      }

      // Process event results
      const newVideoEvents: VideoEvent[] = eventResults.map(({ event, speechResult, soundEffectResult }) => {
        let audioUrl: string | undefined;
        let audioDurationFrames = Math.round(DEFAULT_EVENT_DURATION_SECONDS * FPS);
        let soundEffectAudioUrl: string | undefined;

        if (speechResult) {
          audioUrl = base64ToAudioUrl(speechResult.audioContent);
          // Use EXACT duration from Web Audio API + minimal 2-frame buffer
          const exactDuration = speechResult.exactDuration || speechResult.estimatedDurationSeconds;
          audioDurationFrames = Math.round(exactDuration * FPS) + 2;
          console.log(`Event "${event.title}": exact=${speechResult.exactDuration?.toFixed(2)}s, estimated=${speechResult.estimatedDurationSeconds.toFixed(2)}s, frames=${audioDurationFrames}`);
        }

        if (soundEffectResult) {
          soundEffectAudioUrl = soundEffectResult;
          console.log(`Sound effect for "${event.title}": ${event.soundEffectSearchQuery}`);
        }

        return {
          ...event,
          audioUrl,
          audioDurationFrames,
          soundEffectAudioUrl,
        };
      });

      setVideoEvents(newVideoEvents);
      setIntroAudioUrl(newIntroAudioUrl);
      setIntroDurationFrames(newIntroDurationFrames);
      setIsReady(true);
    } catch (error) {
      console.error('Audio generation failed:', error);
      setAudioError(error instanceof Error ? error.message : 'Audio generatie mislukt');
    } finally {
      setIsGeneratingAudio(false);
    }
  }, [events, storyIntroduction, voiceProvider]);

  // Check if we're in music video mode (background music provided)
  const isMusicVideoMode = !!backgroundMusicUrl && !!backgroundMusicDuration;

  // Auto-enable VHS effect for 80s content
  useEffect(() => {
    if (events.length > 0) {
      const eightyEvents = events.filter(e => e.year >= 1980 && e.year < 1990).length;
      if (eightyEvents / events.length > 0.5) {
        setEnableVhsEffect(true);
      }
    }
  }, [events, open]);

  // Wake Lock: keep screen awake while video is playing
  useWakeLock(isReady || isMusicVideoMode);

  // Calculate total video duration based on variant and music mode
  const totalDuration = useMemo(() => {
    // In music video mode, the music duration drives the video
    if (isMusicVideoMode) {
      return Math.round(backgroundMusicDuration * FPS);
    }
    
    if (!isReady || videoEvents.length === 0) {
      return 300; // Default 10 seconds
    }
    // Scrapbook uses its own duration calculation (no transitions between events)
    if (videoVariant === 'scrapbook') {
      return calculateScrapbookDuration(videoEvents, introDurationFrames, FPS);
    }
    return calculateTotalDuration(videoEvents, introDurationFrames, FPS);
  }, [videoEvents, introDurationFrames, isReady, videoVariant, isMusicVideoMode, backgroundMusicDuration]);

  // Count sound effects found
  const soundEffectsCount = useMemo(() => {
    return videoEvents.filter(e => e.soundEffectAudioUrl).length;
  }, [videoEvents]);

  // Reset state when dialog closes
  const handleOpenChange = useCallback((newOpen: boolean) => {
    if (!newOpen) {
      setIsReady(false);
      setVideoEvents([]);
      setIntroAudioUrl(undefined);
      setAudioProgress(0);
      setAudioError(null);
      setEnableVhsEffect(false);
      setVideoVariant('slideshow');
      setVoiceProvider('google');
      setShowFullscreenOverlay(false);
      setHasTriedAutoFullscreen(false);
    }
    onOpenChange(newOpen);
  }, [onOpenChange]);

  return (
    <Dialog open={open} onOpenChange={handleOpenChange}>
      <DialogContent className="w-[95vw] max-w-4xl max-h-[90vh] overflow-y-auto p-4 sm:p-6">
        <DialogHeader className="pb-2">
          <div className="flex items-center justify-between gap-4">
            <DialogTitle className="flex items-center gap-2 text-sm sm:text-base">
              <Video className="h-4 w-4" />
              Video Preview
            </DialogTitle>
            
            {/* Share button - visible when video is ready */}
            {(isReady || isMusicVideoMode) && (
              <Button
                onClick={() => setIsShareDialogOpen(true)}
                size="sm"
                className="gap-2"
              >
                <Share2 className="h-4 w-4" />
                Delen
              </Button>
            )}
          </div>
        </DialogHeader>

        <div className="space-y-3">
          {/* Music Video Mode Banner - compact */}
          {isMusicVideoMode && (
            <div className="flex items-center gap-2 px-3 py-2 bg-primary/10 border border-primary/30 rounded-md text-sm">
              <Music className="h-4 w-4 text-primary flex-shrink-0" />
              <span className="text-primary font-medium">🎵 Muziekvideo</span>
              <span className="text-muted-foreground">
                ({Math.floor(backgroundMusicDuration / 60)}:{String(Math.floor(backgroundMusicDuration % 60)).padStart(2, '0')})
              </span>
            </div>
          )}

          {/* Step 1: Generate Audio - compact layout */}
          {!isReady && !isMusicVideoMode && (
            <div className="space-y-3">
              {/* Info line */}
              <div className="flex items-center gap-2 text-sm text-muted-foreground">
                <Volume2 className="h-4 w-4" />
                <span>Audio genereren voor {events.length} gebeurtenissen{storyIntroduction ? ' + intro' : ''}</span>
              </div>

              {/* Options - stacked on mobile, row on desktop */}
              <div className="flex flex-col sm:flex-row gap-2">
                {/* Video Style toggle buttons - full width on mobile */}
                <div className="flex items-center border rounded-md overflow-hidden flex-1 sm:flex-none">
                  <button
                    onClick={() => setVideoVariant('slideshow')}
                    className={`flex-1 sm:flex-none flex items-center justify-center gap-1.5 px-3 py-2.5 sm:py-1.5 text-sm sm:text-xs font-medium transition-colors ${
                      videoVariant === 'slideshow' 
                        ? 'bg-primary text-primary-foreground' 
                        : 'bg-muted/50 hover:bg-muted'
                    }`}
                  >
                    <Layers className="h-4 w-4 sm:h-3 sm:w-3" />
                    Slideshow
                  </button>
                  <button
                    onClick={() => setVideoVariant('scrapbook')}
                    className={`flex-1 sm:flex-none flex items-center justify-center gap-1.5 px-3 py-2.5 sm:py-1.5 text-sm sm:text-xs font-medium transition-colors ${
                      videoVariant === 'scrapbook' 
                        ? 'bg-primary text-primary-foreground' 
                        : 'bg-muted/50 hover:bg-muted'
                    }`}
                  >
                    <Camera className="h-4 w-4 sm:h-3 sm:w-3" />
                    Scrapbook
                  </button>
                </div>

                {/* Voice toggle buttons - full width on mobile */}
                <div className="flex items-center border rounded-md overflow-hidden flex-1 sm:flex-none">
                  <button
                    onClick={() => setVoiceProvider('google')}
                    className={`flex-1 sm:flex-none flex items-center justify-center gap-1.5 px-3 py-2.5 sm:py-1.5 text-sm sm:text-xs font-medium transition-colors ${
                      voiceProvider === 'google' 
                        ? 'bg-primary text-primary-foreground' 
                        : 'bg-muted/50 hover:bg-muted'
                    }`}
                  >
                    <Mic className="h-4 w-4 sm:h-3 sm:w-3" />
                    Google
                  </button>
                  <button
                    onClick={() => setVoiceProvider('elevenlabs')}
                    className={`flex-1 sm:flex-none flex items-center justify-center gap-1.5 px-3 py-2.5 sm:py-1.5 text-sm sm:text-xs font-medium transition-colors ${
                      voiceProvider === 'elevenlabs' 
                        ? 'bg-primary text-primary-foreground' 
                        : 'bg-muted/50 hover:bg-muted'
                    }`}
                  >
                    ElevenLabs
                  </button>
                </div>

                {/* VHS toggle */}
                <div className="flex items-center justify-center gap-2 px-3 py-2.5 sm:py-1.5 border rounded-md bg-muted/50">
                  <Tv className="h-4 w-4 sm:h-3 sm:w-3 text-muted-foreground" />
                  <Label htmlFor="vhs-toggle" className="text-sm sm:text-xs cursor-pointer">VHS Effect</Label>
                  <Switch
                    id="vhs-toggle"
                    checked={enableVhsEffect}
                    onCheckedChange={setEnableVhsEffect}
                    className="scale-90 sm:scale-75"
                  />
                </div>
              </div>

              {/* Progress or error */}
              {isGeneratingAudio && (
                <div className="space-y-1">
                  <div className="flex items-center gap-2 text-sm">
                    <Loader2 className="h-3 w-3 animate-spin" />
                    <span>Audio genereren... {Math.round(audioProgress)}%</span>
                  </div>
                  <Progress value={audioProgress} className="h-1.5" />
                </div>
              )}

              {audioError && (
                <div className="flex items-center gap-2 px-3 py-2 bg-destructive/10 text-destructive rounded-md text-sm">
                  <AlertCircle className="h-4 w-4" />
                  <span>{audioError}</span>
                </div>
              )}

              <Button
                onClick={handleGenerateAudio}
                disabled={isGeneratingAudio || events.length === 0}
                size="sm"
                className="w-full"
              >
                {isGeneratingAudio ? (
                  <><Loader2 className="mr-2 h-3 w-3 animate-spin" />Genereren...</>
                ) : (
                  <><Volume2 className="mr-2 h-3 w-3" />Genereer Audio</>
                )}
              </Button>
            </div>
          )}

          {/* Step 2: Video Preview */}
          {(isReady || isMusicVideoMode) && (
            <div className="space-y-2">
              {/* Video player - larger on mobile for better touch controls */}
              <div
                ref={playerContainerRef}
                className="aspect-video bg-black rounded-lg overflow-hidden min-h-[200px] sm:min-h-0 relative"
                onClick={() => {
                  // On mobile, try auto-fullscreen on first interaction with the player
                  if (!hasTriedAutoFullscreen && window.innerWidth < 768) {
                    setHasTriedAutoFullscreen(true);
                    const el = playerContainerRef.current;
                    if (el) {
                      const requestFs = el.requestFullscreen
                        || (el as any).webkitRequestFullscreen
                        || (el as any).webkitEnterFullscreen;
                      if (requestFs) {
                        requestFs.call(el).catch(() => {
                          // Fullscreen denied, show overlay button
                          setShowFullscreenOverlay(true);
                        });
                      } else {
                        setShowFullscreenOverlay(true);
                      }
                    }
                  }
                }}
              >
                <Player
                  // eslint-disable-next-line @typescript-eslint/no-explicit-any
                  component={videoVariant === 'scrapbook' ? ScrapbookVideoComponent as any : TimelineVideoComponent as any}
                  inputProps={{
                    events: isMusicVideoMode 
                      ? events.map(e => ({ ...e, audioDurationFrames: Math.round(5 * FPS) })) as VideoEvent[]
                      : videoEvents,
                    storyTitle,
                    storyIntroduction,
                    introAudioUrl: isMusicVideoMode ? undefined : introAudioUrl,
                    introDurationFrames: isMusicVideoMode ? 0 : introDurationFrames,
                    fps: FPS,
                    enableRetroEffect: enableVhsEffect,
                    retroIntensity: 0.85,
                    externalAudioUrl: isMusicVideoMode ? backgroundMusicUrl : undefined,
                    externalAudioDuration: isMusicVideoMode ? backgroundMusicDuration : undefined,
                  }}
                  durationInFrames={totalDuration}
                  compositionWidth={1920}
                  compositionHeight={1080}
                  fps={FPS}
                  style={{ width: '100%', height: '100%' }}
                  controls
                  autoPlay={false}
                />

                {/* Fullscreen overlay button - shown as fallback on mobile */}
                {showFullscreenOverlay && window.innerWidth < 768 && (
                  <button
                    onClick={(e) => {
                      e.stopPropagation();
                      const el = playerContainerRef.current;
                      if (el) {
                        const requestFs = el.requestFullscreen
                          || (el as any).webkitRequestFullscreen
                          || (el as any).webkitEnterFullscreen;
                        if (requestFs) {
                          requestFs.call(el).catch(() => {});
                        }
                      }
                      setShowFullscreenOverlay(false);
                    }}
                    className="absolute top-2 right-2 z-50 bg-black/70 text-white rounded-full p-2 animate-pulse"
                  >
                    <Maximize className="h-5 w-5" />
                  </button>
                )}
              </div>

              {/* Info bar - stacked on mobile */}
              <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-1 text-xs text-muted-foreground px-1">
                <span className="text-center sm:text-left">
                  {Math.floor(totalDuration / FPS / 60)}:{String(Math.floor((totalDuration / FPS) % 60)).padStart(2, '0')} • {videoEvents.length || events.length} scenes
                </span>
                <div className="flex items-center justify-center sm:justify-end gap-2">
                  {videoVariant === 'scrapbook' && <span className="flex items-center gap-1"><Camera className="h-3 w-3" />Scrapbook</span>}
                  {enableVhsEffect && <span className="flex items-center gap-1"><Tv className="h-3 w-3" />VHS</span>}
                  {soundEffectsCount > 0 && <span>{soundEffectsCount} SFX</span>}
                </div>
              </div>

            </div>
          )}
        </div>
      </DialogContent>

      {/* Share Dialog */}
      <ShareDialog
        open={isShareDialogOpen}
        onOpenChange={setIsShareDialogOpen}
        content={{
          events: isMusicVideoMode 
            ? events.map(e => ({ ...e, audioDurationFrames: Math.round(5 * FPS) })) as VideoEvent[]
            : videoEvents,
          storyTitle,
          storyIntroduction,
        }}
        settings={{
          variant: videoVariant,
          fps: FPS,
          enableVhsEffect,
          retroIntensity: 0.85,
          voiceProvider,
          isMusicVideo: isMusicVideoMode,
          backgroundMusicUrl: isMusicVideoMode ? backgroundMusicUrl : undefined,
          backgroundMusicDuration: isMusicVideoMode ? backgroundMusicDuration : undefined,
          introAudioUrl: isMusicVideoMode ? undefined : introAudioUrl,
          introDurationFrames: isMusicVideoMode ? 0 : introDurationFrames,
        }}
      />
    </Dialog>
  );
};
