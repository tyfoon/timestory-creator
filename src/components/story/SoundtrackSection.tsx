/**
 * SoundtrackSection - Inline section showing soundtrack generation status and player
 * Displayed at the bottom of TimelineStoryPage (not fixed, part of page flow)
 */

import { useState, useRef, useEffect } from 'react';
import { motion } from 'framer-motion';
import { Music, Loader2, Play, Pause, Sparkles, AlertCircle, RefreshCw, Volume2 } from 'lucide-react';
import { Button } from '@/components/ui/button';
import { Progress } from '@/components/ui/progress';
import { useSoundtrackGeneration, clearSoundtrackState } from '@/hooks/useSoundtrackGeneration';
import { TimelineEvent } from '@/types/timeline';
import { FormData } from '@/types/form';

interface SoundtrackSectionProps {
  events: TimelineEvent[];
  summary: string;
  formData: FormData | null;
  onOpenPersonalizeDialog: () => void;
}

export const SoundtrackSection = ({ 
  events, 
  summary, 
  formData,
  onOpenPersonalizeDialog,
}: SoundtrackSectionProps) => {
  const soundtrack = useSoundtrackGeneration();
  const [isPlaying, setIsPlaying] = useState(false);
  const [currentTime, setCurrentTime] = useState(0);
  const [duration, setDuration] = useState(0);
  const audioRef = useRef<HTMLAudioElement | null>(null);

  // Setup audio element when URL is available
  useEffect(() => {
    if (soundtrack.audioUrl && !audioRef.current) {
      const audio = new Audio(soundtrack.audioUrl);
      audio.addEventListener('ended', () => setIsPlaying(false));
      audio.addEventListener('timeupdate', () => setCurrentTime(audio.currentTime));
      audio.addEventListener('loadedmetadata', () => setDuration(audio.duration));
      audio.addEventListener('error', (e) => {
        console.error('Audio playback error:', e);
        setIsPlaying(false);
      });
      audioRef.current = audio;
    }

    return () => {
      if (audioRef.current) {
        audioRef.current.pause();
        audioRef.current = null;
      }
    };
  }, [soundtrack.audioUrl]);

  // Don't show if no generation has started
  if (soundtrack.status === 'idle') {
    return null;
  }

  const handlePlayPause = () => {
    if (!audioRef.current) return;

    if (isPlaying) {
      audioRef.current.pause();
      setIsPlaying(false);
    } else {
      audioRef.current.play();
      setIsPlaying(true);
    }
  };

  const handleReset = () => {
    if (audioRef.current) {
      audioRef.current.pause();
      audioRef.current = null;
    }
    clearSoundtrackState();
    soundtrack.reset();
  };

  const getStatusMessage = (): string => {
    switch (soundtrack.status) {
      case 'generating_lyrics':
        return 'Songtekst wordt geschreven...';
      case 'generating_music':
        return 'Muziek wordt gestart...';
      case 'polling':
        return 'Jouw persoonlijke soundtrack wordt gecomponeerd...';
      case 'completed':
        return soundtrack.title || 'Je soundtrack is klaar!';
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

  const formatTime = (seconds: number): string => {
    const mins = Math.floor(seconds / 60);
    const secs = Math.floor(seconds % 60);
    return `${mins}:${secs.toString().padStart(2, '0')}`;
  };

  return (
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
          <div className="flex items-center gap-3 mb-6">
            <div className="p-2.5 rounded-full bg-primary/10">
              <Music className="h-5 w-5 text-primary" />
            </div>
            <div>
              <h2 className="font-serif text-xl sm:text-2xl font-bold text-foreground">
                Jouw Soundtrack
              </h2>
              <p className="text-sm text-muted-foreground">
                {soundtrack.version === 'v1' ? 'Preview versie' : 'Gepersonaliseerde versie'}
              </p>
            </div>
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

          {/* Completed state */}
          {soundtrack.isComplete && (
            <div className="space-y-6">
              {/* Player */}
              <div className="flex items-center gap-4 p-4 bg-muted/30 rounded-xl">
                <button
                  onClick={handlePlayPause}
                  className="flex-shrink-0 w-14 h-14 rounded-full bg-primary text-primary-foreground hover:bg-primary/90 transition-all shadow-lg hover:shadow-xl hover:scale-105 flex items-center justify-center"
                >
                  {isPlaying ? (
                    <Pause className="h-6 w-6" />
                  ) : (
                    <Play className="h-6 w-6 ml-1" />
                  )}
                </button>
                
                <div className="flex-1 min-w-0">
                  <h3 className="font-semibold text-foreground truncate text-lg">
                    {soundtrack.title}
                  </h3>
                  <p className="text-sm text-muted-foreground">
                    {soundtrack.style}
                  </p>
                  
                  {/* Progress bar */}
                  {duration > 0 && (
                    <div className="flex items-center gap-2 mt-2">
                      <span className="text-xs text-muted-foreground font-mono">
                        {formatTime(currentTime)}
                      </span>
                      <div className="flex-1 h-1 bg-muted rounded-full overflow-hidden">
                        <div 
                          className="h-full bg-primary transition-all duration-200"
                          style={{ width: `${(currentTime / duration) * 100}%` }}
                        />
                      </div>
                      <span className="text-xs text-muted-foreground font-mono">
                        {formatTime(duration)}
                      </span>
                    </div>
                  )}
                </div>

                {isPlaying && (
                  <div className="flex-shrink-0">
                    <Volume2 className="h-5 w-5 text-primary animate-pulse" />
                  </div>
                )}
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
  );
};
