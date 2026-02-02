import React, { useState, useCallback, useMemo } from 'react';
import { Player } from '@remotion/player';
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogDescription } from '@/components/ui/dialog';
import { Button } from '@/components/ui/button';
import { Progress } from '@/components/ui/progress';
import { Loader2, Video, Volume2, Download, AlertCircle, Music, Tv, Camera, Layers } from 'lucide-react';
import { Switch } from '@/components/ui/switch';
import { Label } from '@/components/ui/label';
import { RadioGroup, RadioGroupItem } from '@/components/ui/radio-group';
import { TimelineEvent } from '@/types/timeline';
import { 
  TimelineVideoComponent, 
  calculateTotalDuration, 
  ScrapbookVideoComponent,
  calculateScrapbookDuration,
  VideoEvent 
} from '@/remotion';
import { generateSpeech, base64ToAudioUrl } from '@/remotion/lib/speechApi';

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
            speakingRate: 1.0 // Normal pace for snappier intro
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
          generateSpeech({ text: speechText }).catch(err => {
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
  }, [events, storyIntroduction]);

  // Calculate total video duration based on variant
  const totalDuration = useMemo(() => {
    if (!isReady || videoEvents.length === 0) {
      return 300; // Default 10 seconds
    }
    // Scrapbook uses its own duration calculation (no transitions between events)
    if (videoVariant === 'scrapbook') {
      return calculateScrapbookDuration(videoEvents, introDurationFrames, FPS);
    }
    return calculateTotalDuration(videoEvents, introDurationFrames, FPS);
  }, [videoEvents, introDurationFrames, isReady, videoVariant]);

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
    }
    onOpenChange(newOpen);
  }, [onOpenChange]);

  return (
    <Dialog open={open} onOpenChange={handleOpenChange}>
      <DialogContent className="max-w-5xl max-h-[90vh] overflow-y-auto">
        <DialogHeader>
          <DialogTitle className="flex items-center gap-2">
            <Video className="h-5 w-5" />
            Video Preview
          </DialogTitle>
          <DialogDescription>
            Genereer een video van je tijdlijn met voiceover.
          </DialogDescription>
        </DialogHeader>

        <div className="space-y-6">
          {/* Step 1: Generate Audio */}
          {!isReady && (
            <div className="space-y-4">
              <div className="flex items-center gap-3 p-4 bg-muted/50 rounded-lg">
                <Volume2 className="h-5 w-5 text-muted-foreground" />
                <div className="flex-1">
                  <p className="font-medium">Stap 1: Genereer Voiceover</p>
                  <p className="text-sm text-muted-foreground">
                    We genereren audio voor {events.length} gebeurtenissen
                    {storyIntroduction ? ' + intro' : ''}.
                  </p>
                </div>
              </div>

              {/* Video Variant Selector */}
              <div className="p-4 bg-muted/50 rounded-lg space-y-3">
                <div className="flex items-center gap-2 mb-2">
                  <Camera className="h-5 w-5 text-muted-foreground" />
                  <Label className="font-medium">Video Stijl</Label>
                </div>
                <RadioGroup
                  value={videoVariant}
                  onValueChange={(v) => setVideoVariant(v as VideoVariant)}
                  className="grid grid-cols-2 gap-3"
                >
                  <div className="flex items-start space-x-3 p-3 border rounded-lg hover:bg-muted/30 cursor-pointer">
                    <RadioGroupItem value="slideshow" id="slideshow" className="mt-0.5" />
                    <div className="flex-1">
                      <Label htmlFor="slideshow" className="font-medium cursor-pointer flex items-center gap-2">
                        <Layers className="h-4 w-4" />
                        Slideshow
                      </Label>
                      <p className="text-xs text-muted-foreground mt-1">
                        Klassieke presentatie met vloeiende overgangen
                      </p>
                    </div>
                  </div>
                  <div className="flex items-start space-x-3 p-3 border rounded-lg hover:bg-muted/30 cursor-pointer">
                    <RadioGroupItem value="scrapbook" id="scrapbook" className="mt-0.5" />
                    <div className="flex-1">
                      <Label htmlFor="scrapbook" className="font-medium cursor-pointer flex items-center gap-2">
                        <Camera className="h-4 w-4" />
                        Scrapbook Camera
                      </Label>
                      <p className="text-xs text-muted-foreground mt-1">
                        Virtuele camera vliegt over een plakboek
                      </p>
                    </div>
                  </div>
                </RadioGroup>
              </div>

              {/* VHS Effect Toggle */}
              <div className="flex items-center justify-between p-4 bg-muted/50 rounded-lg">
                <div className="flex items-center gap-3">
                  <Tv className="h-5 w-5 text-muted-foreground" />
                  <div>
                    <Label htmlFor="vhs-toggle" className="font-medium cursor-pointer">
                      VHS / Retro Effect
                    </Label>
                    <p className="text-sm text-muted-foreground">
                      Geef de video een authentieke jaren '80 CRT-look
                    </p>
                  </div>
                </div>
                <Switch
                  id="vhs-toggle"
                  checked={enableVhsEffect}
                  onCheckedChange={setEnableVhsEffect}
                />
              </div>

              {isGeneratingAudio ? (
                <div className="space-y-2">
                  <div className="flex items-center gap-2">
                    <Loader2 className="h-4 w-4 animate-spin" />
                    <span className="text-sm">Audio genereren...</span>
                  </div>
                  <Progress value={audioProgress} className="h-2" />
                  <p className="text-xs text-muted-foreground text-right">
                    {Math.round(audioProgress)}%
                  </p>
                </div>
              ) : audioError ? (
                <div className="flex items-center gap-2 p-3 bg-destructive/10 text-destructive rounded-lg">
                  <AlertCircle className="h-4 w-4" />
                  <span className="text-sm">{audioError}</span>
                </div>
              ) : null}

              <Button
                onClick={handleGenerateAudio}
                disabled={isGeneratingAudio || events.length === 0}
                className="w-full"
              >
                {isGeneratingAudio ? (
                  <>
                    <Loader2 className="mr-2 h-4 w-4 animate-spin" />
                    Genereren...
                  </>
                ) : (
                  <>
                    <Volume2 className="mr-2 h-4 w-4" />
                    Genereer Audio
                  </>
                )}
              </Button>
            </div>
          )}

          {/* Step 2: Video Preview */}
          {isReady && (
            <div className="space-y-4">
              <div className="aspect-video bg-black rounded-lg overflow-hidden">
                <Player
                  // eslint-disable-next-line @typescript-eslint/no-explicit-any
                  component={videoVariant === 'scrapbook' ? ScrapbookVideoComponent as any : TimelineVideoComponent as any}
                  inputProps={{
                    events: videoEvents,
                    storyTitle,
                    storyIntroduction,
                    introAudioUrl,
                    introDurationFrames,
                    fps: FPS,
                    enableRetroEffect: enableVhsEffect,
                    retroIntensity: 0.85,
                  }}
                  durationInFrames={totalDuration}
                  compositionWidth={1920}
                  compositionHeight={1080}
                  fps={FPS}
                  style={{
                    width: '100%',
                    height: '100%',
                  }}
                  controls
                  autoPlay={false}
                />
              </div>

              <div className="flex items-center justify-between text-sm text-muted-foreground">
                <span>
                  Duur: {Math.floor(totalDuration / FPS / 60)}:{String(Math.floor((totalDuration / FPS) % 60)).padStart(2, '0')}
                </span>
                <div className="flex items-center gap-4">
                  <span className="flex items-center gap-1 text-primary">
                    {videoVariant === 'scrapbook' ? (
                      <><Camera className="h-3 w-3" /> Scrapbook</>
                    ) : (
                      <><Layers className="h-3 w-3" /> Slideshow</>
                    )}
                  </span>
                  {enableVhsEffect && (
                    <span className="flex items-center gap-1 text-primary">
                      <Tv className="h-3 w-3" />
                      VHS
                    </span>
                  )}
                  {soundEffectsCount > 0 && (
                    <span className="flex items-center gap-1">
                      <Music className="h-3 w-3" />
                      {soundEffectsCount} geluidseffecten
                    </span>
                  )}
                  <span>{videoEvents.length} scenes</span>
                </div>
              </div>

              {/* Download instructions */}
              <div className="p-4 bg-muted/50 rounded-lg space-y-3">
                <div className="flex items-center gap-2">
                  <Download className="h-4 w-4" />
                  <span className="font-medium">Video exporteren</span>
                </div>
                <p className="text-sm text-muted-foreground">
                  Om de video als MP4 te downloaden, gebruik je Remotion CLI lokaal:
                </p>
                <code className="block p-2 bg-background rounded text-xs font-mono">
                  npx remotion render TimelineVideo out/video.mp4
                </code>
                <p className="text-xs text-muted-foreground">
                  Tip: De preview hierboven toont exact hoe je video eruit zal zien.
                </p>
              </div>
            </div>
          )}
        </div>
      </DialogContent>
    </Dialog>
  );
};
