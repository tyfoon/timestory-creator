import React, { useState, useCallback, useMemo } from 'react';
import { Player } from '@remotion/player';
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogDescription } from '@/components/ui/dialog';
import { Button } from '@/components/ui/button';
import { Progress } from '@/components/ui/progress';
import { Loader2, Video, Volume2, Download, AlertCircle } from 'lucide-react';
import { TimelineEvent } from '@/types/timeline';
import { TimelineVideoComponent, calculateTotalDuration, VideoEvent } from '@/remotion';
import { generateSpeech, base64ToAudioUrl } from '@/remotion/lib/speechApi';

interface VideoDialogProps {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  events: TimelineEvent[];
  storyTitle?: string;
  storyIntroduction?: string;
}

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

      // Generate audio for each event
      const newVideoEvents: VideoEvent[] = [];

      for (const event of events) {
        let audioUrl: string | undefined;
        let audioDurationFrames = Math.round(DEFAULT_EVENT_DURATION_SECONDS * FPS);

        // Generate speech for event description
        const speechText = `${event.title}. ${event.description}`;
        
        try {
          const result = await generateSpeech({ text: speechText });
          audioUrl = base64ToAudioUrl(result.audioContent);
          // Tight buffer - almost no gap between events
          audioDurationFrames = Math.round(result.estimatedDurationSeconds * FPS) + 3; // Only 3 frames (~0.1s) buffer
        } catch (error) {
          console.error(`Failed to generate audio for event ${event.id}:`, error);
          // Use default duration if audio fails
        }

        newVideoEvents.push({
          ...event,
          audioUrl,
          audioDurationFrames,
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

  // Calculate total video duration
  const totalDuration = useMemo(() => {
    if (!isReady || videoEvents.length === 0) {
      return 300; // Default 10 seconds
    }
    return calculateTotalDuration(videoEvents, introDurationFrames, FPS);
  }, [videoEvents, introDurationFrames, isReady]);

  // Reset state when dialog closes
  const handleOpenChange = useCallback((newOpen: boolean) => {
    if (!newOpen) {
      setIsReady(false);
      setVideoEvents([]);
      setIntroAudioUrl(undefined);
      setAudioProgress(0);
      setAudioError(null);
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
                  component={TimelineVideoComponent as any}
                  inputProps={{
                    events: videoEvents,
                    storyTitle,
                    storyIntroduction,
                    introAudioUrl,
                    introDurationFrames,
                    fps: FPS,
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
                <span>{videoEvents.length} scenes</span>
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
