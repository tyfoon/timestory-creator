import React, { useState, useCallback, useMemo } from 'react';
import { Player } from '@remotion/player';
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogDescription } from '@/components/ui/dialog';
import { Button } from '@/components/ui/button';
import { Progress } from '@/components/ui/progress';
import { Loader2, Video, Volume2, AlertCircle, Music, Tv, Camera, Layers, Mic } from 'lucide-react';
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
  const [voiceProvider, setVoiceProvider] = useState<VoiceProvider>('elevenlabs');

  // Generate audio for all events
  const handleGenerateAudio = useCallback(async () => {
    setIsGeneratingAudio(true);
    setAudioError(null);
    setAudioProgress(0);

    try {
      const totalSegments = events.length + (storyIntroduction ? 1 : 0);
      let completed = 0;

      // Generate intro audio if we have story introduction
      let newIntroAudioUrl: string | undefined;
      let newIntroDurationFrames = 150;

      if (storyIntroduction) {
        try {
          const introResult = await generateSpeech({ 
            text: storyIntroduction,
            speakingRate: 1.0, // Normal pace for snappier intro
            provider: voiceProvider
          });
          newIntroAudioUrl = base64ToAudioUrl(introResult.audioContent);
          // Tight buffer - audio ends, next starts almost immediately
          newIntroDurationFrames = Math.round(introResult.estimatedDurationSeconds * FPS) + 5; // Only 5 frames (~0.16s) buffer
          completed++;
          setAudioProgress((completed / totalSegments) * 100);
        } catch (error) {
          console.error('Failed to generate intro audio:', error);
          // Continue without intro audio
        }
      }

      // Generate audio for each event + fetch sound effects in parallel
      const newVideoEvents: VideoEvent[] = [];

      for (const event of events) {
        let audioUrl: string | undefined;
        let audioDurationFrames = Math.round(DEFAULT_EVENT_DURATION_SECONDS * FPS);
        let soundEffectAudioUrl: string | undefined;

        // Generate speech for event description
        const speechText = `${event.title}. ${event.description}`;
        
        // Run speech generation and sound effect fetch in parallel
        const [speechResult, soundEffectResult] = await Promise.all([
          generateSpeech({ text: speechText, provider: voiceProvider }).catch(err => {
            console.error(`Failed to generate audio for event ${event.id}:`, err);
            return null;
          }),
          // Only fetch sound effect if event has a query
          event.soundEffectSearchQuery 
            ? fetchSoundEffect(event.soundEffectSearchQuery)
            : Promise.resolve(null),
        ]);

        if (speechResult) {
          audioUrl = base64ToAudioUrl(speechResult.audioContent);
          // Tight buffer - almost no gap between events
          audioDurationFrames = Math.round(speechResult.estimatedDurationSeconds * FPS) + 3;
        }

        if (soundEffectResult) {
          soundEffectAudioUrl = soundEffectResult;
          console.log(`Sound effect for "${event.title}": ${event.soundEffectSearchQuery}`);
        }

        newVideoEvents.push({
          ...event,
          audioUrl,
          audioDurationFrames,
          soundEffectAudioUrl,
        });

        completed++;
        setAudioProgress((completed / totalSegments) * 100);
      }

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
      setVoiceProvider('elevenlabs');
    }
    onOpenChange(newOpen);
  }, [onOpenChange]);

  return (
    <Dialog open={open} onOpenChange={handleOpenChange}>
      <DialogContent className="max-w-4xl">
        <DialogHeader className="pb-2">
          <DialogTitle className="flex items-center gap-2 text-base">
            <Video className="h-4 w-4" />
            Video Preview
          </DialogTitle>
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

              {/* Options row - all in one line */}
              <div className="flex flex-wrap gap-2">
                {/* Video Style toggle buttons */}
                <div className="flex items-center border rounded-md overflow-hidden">
                  <button
                    onClick={() => setVideoVariant('slideshow')}
                    className={`flex items-center gap-1.5 px-3 py-1.5 text-xs font-medium transition-colors ${
                      videoVariant === 'slideshow' 
                        ? 'bg-primary text-primary-foreground' 
                        : 'bg-muted/50 hover:bg-muted'
                    }`}
                  >
                    <Layers className="h-3 w-3" />
                    Slideshow
                  </button>
                  <button
                    onClick={() => setVideoVariant('scrapbook')}
                    className={`flex items-center gap-1.5 px-3 py-1.5 text-xs font-medium transition-colors ${
                      videoVariant === 'scrapbook' 
                        ? 'bg-primary text-primary-foreground' 
                        : 'bg-muted/50 hover:bg-muted'
                    }`}
                  >
                    <Camera className="h-3 w-3" />
                    Scrapbook
                  </button>
                </div>

                {/* Voice toggle buttons */}
                <div className="flex items-center border rounded-md overflow-hidden">
                  <button
                    onClick={() => setVoiceProvider('elevenlabs')}
                    className={`flex items-center gap-1.5 px-3 py-1.5 text-xs font-medium transition-colors ${
                      voiceProvider === 'elevenlabs' 
                        ? 'bg-primary text-primary-foreground' 
                        : 'bg-muted/50 hover:bg-muted'
                    }`}
                  >
                    <Mic className="h-3 w-3" />
                    ElevenLabs
                  </button>
                  <button
                    onClick={() => setVoiceProvider('google')}
                    className={`flex items-center gap-1.5 px-3 py-1.5 text-xs font-medium transition-colors ${
                      voiceProvider === 'google' 
                        ? 'bg-primary text-primary-foreground' 
                        : 'bg-muted/50 hover:bg-muted'
                    }`}
                  >
                    Google
                  </button>
                </div>

                {/* VHS toggle */}
                <div className="flex items-center gap-2 px-3 py-1.5 border rounded-md bg-muted/50">
                  <Tv className="h-3 w-3 text-muted-foreground" />
                  <Label htmlFor="vhs-toggle" className="text-xs cursor-pointer">VHS</Label>
                  <Switch
                    id="vhs-toggle"
                    checked={enableVhsEffect}
                    onCheckedChange={setEnableVhsEffect}
                    className="scale-75"
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
              <div className="aspect-video bg-black rounded-lg overflow-hidden">
                <Player
                  // eslint-disable-next-line @typescript-eslint/no-explicit-any
                  component={videoVariant === 'scrapbook' ? ScrapbookVideoComponent as any : TimelineVideoComponent as any}
                  inputProps={{
                    events: isMusicVideoMode 
                      ? events.map(e => ({ ...e, audioDurationFrames: Math.round(5 * FPS) })) as VideoEvent[]
                      : videoEvents,
                    storyTitle,
                    storyIntroduction: isMusicVideoMode ? undefined : storyIntroduction,
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
              </div>

              {/* Compact info bar */}
              <div className="flex items-center justify-between text-xs text-muted-foreground px-1">
                <span>
                  {Math.floor(totalDuration / FPS / 60)}:{String(Math.floor((totalDuration / FPS) % 60)).padStart(2, '0')} • {videoEvents.length || events.length} scenes
                </span>
                <div className="flex items-center gap-2">
                  {videoVariant === 'scrapbook' && <span className="flex items-center gap-1"><Camera className="h-3 w-3" />Scrapbook</span>}
                  {enableVhsEffect && <span className="flex items-center gap-1"><Tv className="h-3 w-3" />VHS</span>}
                  {soundEffectsCount > 0 && <span>{soundEffectsCount} SFX</span>}
                </div>
              </div>
            </div>
          )}
        </div>
      </DialogContent>
    </Dialog>
  );
};
