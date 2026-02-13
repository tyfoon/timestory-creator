/**
 * SoundtrackSection - Inline section showing soundtrack generation status and video player
 * Displayed at the bottom of TimelineStoryPage (not fixed, part of page flow)
 * 
 * Shows the Remotion video with generated music as background when complete
 */

import { useState, useMemo, useEffect } from 'react';
import { motion } from 'framer-motion';
import { Music, Loader2, Play, Sparkles, AlertCircle, RefreshCw, Film, Share2, Tv } from 'lucide-react';
import { Player } from '@remotion/player';
import { Button } from '@/components/ui/button';
import { Progress } from '@/components/ui/progress';
import { Switch } from '@/components/ui/switch';
import { Label } from '@/components/ui/label';
import { useSoundtrackGeneration, clearSoundtrackState } from '@/hooks/useSoundtrackGeneration';
import { TimelineEvent } from '@/types/timeline';
import { FormData } from '@/types/form';
import { TimelineVideoComponent, VideoEvent } from '@/remotion';
import { ShareDialog } from '@/components/video/ShareDialog';

const FPS = 30;

interface SoundtrackSectionProps {
  events: TimelineEvent[];
  summary: string;
  formData: FormData | null;
  storyTitle?: string;
  storyIntroduction?: string;
  onOpenPersonalizeDialog: () => void;
}

export const SoundtrackSection = ({ 
  events, 
  summary, 
  formData,
  storyTitle,
  storyIntroduction,
  onOpenPersonalizeDialog,
}: SoundtrackSectionProps) => {
  const soundtrack = useSoundtrackGeneration();
  const [isShareDialogOpen, setIsShareDialogOpen] = useState(false);
  const [enableVhsEffect, setEnableVhsEffect] = useState(false);

  // Auto-enable VHS for 80s-dominant content
  useEffect(() => {
    if (events.length > 0) {
      const eightyEvents = events.filter(e => e.year >= 1980 && e.year < 1990).length;
      if (eightyEvents / events.length > 0.5) {
        setEnableVhsEffect(true);
      }
    }
  }, [events]);

  // Convert timeline events to video events (with placeholder audio duration)
  const videoEvents: VideoEvent[] = useMemo(() => {
    return events.map(e => ({
      ...e,
      audioDurationFrames: Math.round(5 * FPS), // Default 5 seconds per event
    }));
  }, [events]);

  // Calculate total video duration based on music length
  const totalDuration = useMemo(() => {
    if (soundtrack.duration) {
      return Math.round(soundtrack.duration * FPS);
    }
    // Fallback: 3 minutes
    return 180 * FPS;
  }, [soundtrack.duration]);

  // Don't show if no generation has started
  if (soundtrack.status === 'idle') {
    return null;
  }

  const handleReset = () => {
    if (formData) {
      soundtrack.regenerateQuick(formData);
    } else {
      clearSoundtrackState();
      soundtrack.reset();
    }
  };

  const getStatusMessage = (): string => {
    switch (soundtrack.status) {
      case 'generating_lyrics':
        return 'Songtekst wordt geschreven...';
      case 'generating_music':
        return 'Muziek wordt gestart...';
      case 'polling':
        if (soundtrack.isStreaming) {
          return 'Jouw persoonlijke soundtrack speelt af (nog aan het afmaken)...';
        }
        return 'Jouw persoonlijke soundtrack wordt gecomponeerd...';
      case 'completed':
        return soundtrack.title || 'Je muziekvideo is klaar!';
      case 'error':
        return 'Er ging iets mis';
      default:
        return 'Laden...';
    }
  };

  const getProgress = (): number => {
    switch (soundtrack.status) {
      case 'generating_lyrics':
        return 15;
      case 'generating_music':
        return 35;
      case 'polling':
        // If streaming, progress is faster since playback already started
        if (soundtrack.isStreaming) {
          if (soundtrack.startedAt) {
            const elapsed = Date.now() - soundtrack.startedAt;
            const estimatedTotal = 120000; // 2 minutes for full generation after stream
            return Math.min(60 + (elapsed / estimatedTotal) * 35, 95);
          }
          return 70;
        }
        if (soundtrack.startedAt) {
          const elapsed = Date.now() - soundtrack.startedAt;
          const estimatedTotal = 180000; // 3 minutes
          return Math.min(35 + (elapsed / estimatedTotal) * 60, 95);
        }
        return 50;
      case 'completed':
        return 100;
      default:
        return 0;
    }
  };

  const formatDuration = (seconds: number): string => {
    const mins = Math.floor(seconds / 60);
    const secs = Math.floor(seconds % 60);
    return `${mins}:${secs.toString().padStart(2, '0')}`;
  };

  // Derive display title from formData if not provided
  const displayTitle = storyTitle || (formData?.birthDate 
    ? `Jouw jaren ${formData.birthDate.year}-${formData.birthDate.year + 25}`
    : 'Jouw Verhaal');

  return (
    <>
      <motion.section
        initial={{ opacity: 0, y: 40 }}
        animate={{ opacity: 1, y: 0 }}
        transition={{ duration: 0.6 }}
        className="container mx-auto max-w-4xl px-4 py-16"
      >
        <div className="relative overflow-hidden rounded-2xl bg-gradient-to-br from-card via-card to-primary/5 border border-border shadow-xl">
          {/* Decorative background */}
          <div className="absolute inset-0 opacity-5">
            <div className="absolute top-0 right-0 w-64 h-64 bg-primary rounded-full blur-3xl transform translate-x-1/2 -translate-y-1/2" />
            <div className="absolute bottom-0 left-0 w-48 h-48 bg-accent rounded-full blur-3xl transform -translate-x-1/2 translate-y-1/2" />
          </div>

          <div className="relative z-10 p-6 sm:p-8">
            {/* Header */}
            <div className="flex items-center justify-between gap-3 mb-6">
              <div className="flex items-center gap-3">
                <div className="p-2.5 rounded-full bg-primary/10">
                  <Music className="h-5 w-5 text-primary" />
                </div>
                <div>
                  <h2 className="font-serif text-xl sm:text-2xl font-bold text-foreground">
                    Jouw Muziekvideo
                  </h2>
                  <p className="text-sm text-muted-foreground">
                    {soundtrack.version === 'v1' ? 'Preview versie' : 'Gepersonaliseerde versie'}
                  </p>
                </div>
              </div>
              
              {/* Share button when complete */}
              {soundtrack.isComplete && (
                <Button
                  onClick={() => setIsShareDialogOpen(true)}
                  size="sm"
                  variant="outline"
                  className="gap-2"
                >
                  <Share2 className="h-4 w-4" />
                  <span className="hidden sm:inline">Delen</span>
                </Button>
              )}
            </div>

            {/* Generating state */}
            {soundtrack.isGenerating && (
              <div className="space-y-4">
                <div className="flex items-center gap-4">
                  <div className="relative flex-shrink-0">
                    <div className="w-16 h-16 rounded-full bg-primary/10 flex items-center justify-center">
                      <Loader2 className="h-8 w-8 text-primary animate-spin" />
                    </div>
                    <div className="absolute inset-0 rounded-full border-2 border-primary/20 animate-pulse" />
                  </div>
                  <div className="flex-1 min-w-0">
                    <p className="font-medium text-foreground mb-1">
                      {getStatusMessage()}
                    </p>
                    <p className="text-sm text-muted-foreground">
                      Dit kan 2-4 minuten duren. Je kunt ondertussen verder scrollen.
                    </p>
                  </div>
                </div>
                <Progress value={getProgress()} className="h-2" />
              </div>
            )}

            {/* Error state */}
            {soundtrack.hasError && (
              <div className="flex items-center gap-4 p-4 bg-destructive/5 border border-destructive/20 rounded-xl">
                <div className="p-3 rounded-full bg-destructive/10">
                  <AlertCircle className="h-6 w-6 text-destructive" />
                </div>
                <div className="flex-1">
                  <p className="font-medium text-foreground">Er ging iets mis</p>
                  <p className="text-sm text-muted-foreground">{soundtrack.error}</p>
                </div>
                <Button variant="outline" size="sm" onClick={handleReset} className="gap-1.5">
                  <RefreshCw className="h-4 w-4" />
                  Opnieuw
                </Button>
              </div>
            )}

            {/* Streaming preview - Audio player while track finishes */}
            {soundtrack.status === 'polling' && soundtrack.streamAudioUrl && (
              <div className="space-y-4">
                <div className="p-4 bg-accent/5 border border-accent/20 rounded-xl">
                  <p className="text-sm font-medium text-foreground mb-3 flex items-center gap-2">
                    <Music className="h-4 w-4 text-accent" />
                    Preview: Je nummer speelt af terwijl we de volledige versie afmaken
                  </p>
                  <audio
                    controls
                    className="w-full"
                    src={soundtrack.streamAudioUrl}
                    controlsList="nodownload"
                  />
                </div>
              </div>
            )}

            {/* Completed state - Video Player */}
            {soundtrack.isComplete && soundtrack.audioUrl && (
              <div className="space-y-6">
                {/* Song info bar */}
                <div className="flex items-center gap-3 p-3 bg-primary/5 rounded-lg border border-primary/10">
                  <Film className="h-5 w-5 text-primary flex-shrink-0" />
                  <div className="flex-1 min-w-0">
                    <p className="font-semibold text-foreground truncate">{soundtrack.title}</p>
                    <p className="text-xs text-muted-foreground">{soundtrack.style}</p>
                  </div>
                  <span className="text-xs text-muted-foreground font-mono">
                    {formatDuration(soundtrack.duration || 180)}
                  </span>
                </div>

                {/* VHS toggle */}
                <div className="flex items-center justify-between p-3 bg-muted/20 rounded-lg border border-border">
                  <div className="flex items-center gap-2">
                    <Tv className="h-4 w-4 text-muted-foreground" />
                    <Label htmlFor="vhs-toggle" className="text-sm text-muted-foreground cursor-pointer">
                      VHS / Retro effect
                    </Label>
                  </div>
                  <Switch
                    id="vhs-toggle"
                    checked={enableVhsEffect}
                    onCheckedChange={setEnableVhsEffect}
                  />
                </div>

                {/* Remotion Video Player */}
                <div className="aspect-video bg-black rounded-xl overflow-hidden shadow-lg">
                  <Player
                    // eslint-disable-next-line @typescript-eslint/no-explicit-any
                    component={TimelineVideoComponent as any}
                    inputProps={{
                      events: videoEvents,
                      storyTitle: displayTitle,
                      storyIntroduction: storyIntroduction || summary,
                      introAudioUrl: undefined,
                      introDurationFrames: 0,
                      fps: FPS,
                      enableRetroEffect: enableVhsEffect,
                      retroIntensity: 0.85,
                      externalAudioUrl: soundtrack.audioUrl,
                      externalAudioDuration: soundtrack.duration,
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

                {/* Info footer */}
                <div className="flex items-center justify-between text-xs text-muted-foreground px-1">
                  <span>
                    {formatDuration(soundtrack.duration || 180)} • {events.length} scenes
                  </span>
                  <span className="flex items-center gap-1">
                    <Music className="h-3 w-3" />
                    AI Muziekvideo
                  </span>
                </div>

                {/* V1: Upgrade prompt */}
                {soundtrack.version === 'v1' && formData && (
                  <div className="p-4 bg-gradient-to-r from-primary/5 to-accent/5 border border-primary/20 rounded-xl">
                    <div className="flex flex-col sm:flex-row items-start sm:items-center gap-4">
                      <div className="flex-1">
                        <h4 className="font-semibold text-foreground flex items-center gap-2">
                          <Sparkles className="h-4 w-4 text-primary" />
                          Maak het nog persoonlijker
                        </h4>
                        <p className="text-sm text-muted-foreground mt-1">
                          Voeg vrienden, school en uitgaansplekken toe voor een unieke songtekst 
                          met jouw herinneringen én de nieuwsfeiten uit je tijdlijn.
                        </p>
                      </div>
                      <Button
                        onClick={onOpenPersonalizeDialog}
                        className="gap-2 bg-gradient-to-r from-primary to-accent hover:from-primary/90 hover:to-accent/90 whitespace-nowrap"
                      >
                        <Sparkles className="h-4 w-4" />
                        Upgrade naar V2
                      </Button>
                    </div>
                  </div>
                )}

                {/* Lyrics preview */}
                {soundtrack.lyrics && (
                  <details className="group">
                    <summary className="text-sm text-muted-foreground cursor-pointer hover:text-foreground transition-colors list-none flex items-center gap-2">
                      <span className="text-xs">▶</span>
                      <span className="group-open:hidden">Bekijk songtekst</span>
                      <span className="hidden group-open:inline">Verberg songtekst</span>
                    </summary>
                    <div className="mt-4 p-4 bg-muted/20 rounded-xl max-h-64 overflow-y-auto">
                      <pre className="text-sm text-muted-foreground whitespace-pre-wrap font-sans leading-relaxed">
                        {soundtrack.lyrics}
                      </pre>
                    </div>
                  </details>
                )}
              </div>
            )}
          </div>
        </div>
      </motion.section>

      {/* Share Dialog */}
      <ShareDialog
        open={isShareDialogOpen}
        onOpenChange={setIsShareDialogOpen}
        content={{
          events: videoEvents,
          storyTitle: displayTitle,
          storyIntroduction: storyIntroduction || summary,
        }}
        settings={{
          variant: 'slideshow',
          fps: FPS,
          enableVhsEffect: enableVhsEffect,
          retroIntensity: 0.85,
          voiceProvider: 'google',
          isMusicVideo: true,
          backgroundMusicUrl: soundtrack.audioUrl || undefined,
          backgroundMusicDuration: soundtrack.duration || undefined,
          introAudioUrl: undefined,
          introDurationFrames: 0,
        }}
      />
    </>
  );
};
