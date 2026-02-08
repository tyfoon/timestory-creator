/**
 * SoundtrackFooter - Fixed footer section showing soundtrack generation status and player
 * Used on TimelineStoryPage to display V1/V2 soundtrack experience
 */

import { useState } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import { Music, Loader2, Play, Pause, Sparkles, AlertCircle, RefreshCw, X, ChevronUp, ChevronDown } from 'lucide-react';
import { Button } from '@/components/ui/button';
import { Progress } from '@/components/ui/progress';
import { useSoundtrackGeneration, clearSoundtrackState } from '@/hooks/useSoundtrackGeneration';
import { TimelineEvent } from '@/types/timeline';
import { FormData, OptionalData } from '@/types/form';

interface SoundtrackFooterProps {
  events: TimelineEvent[];
  summary: string;
  formData: FormData | null;
  onOpenPersonalizeDialog: () => void;
}

export const SoundtrackFooter = ({ 
  events, 
  summary, 
  formData,
  onOpenPersonalizeDialog,
}: SoundtrackFooterProps) => {
  const soundtrack = useSoundtrackGeneration();
  const [isPlaying, setIsPlaying] = useState(false);
  const [audioElement, setAudioElement] = useState<HTMLAudioElement | null>(null);
  const [isMinimized, setIsMinimized] = useState(false);

  // Don't show if no generation has started
  if (soundtrack.status === 'idle') {
    return null;
  }

  const handlePlayPause = () => {
    if (!soundtrack.audioUrl) return;

    if (!audioElement) {
      const audio = new Audio(soundtrack.audioUrl);
      audio.addEventListener('ended', () => setIsPlaying(false));
      audio.addEventListener('error', (e) => {
        console.error('Audio playback error:', e);
        setIsPlaying(false);
      });
      setAudioElement(audio);
      audio.play();
      setIsPlaying(true);
    } else {
      if (isPlaying) {
        audioElement.pause();
        setIsPlaying(false);
      } else {
        audioElement.play();
        setIsPlaying(true);
      }
    }
  };

  const handleClose = () => {
    if (audioElement) {
      audioElement.pause();
      setAudioElement(null);
    }
    clearSoundtrackState();
    soundtrack.reset();
  };

  const getStatusMessage = (): string => {
    switch (soundtrack.status) {
      case 'generating_lyrics':
        return 'Songtekst wordt geschreven...';
      case 'generating_music':
        return 'Muziek wordt gecomponeerd...';
      case 'polling':
        return 'Jouw persoonlijke soundtrack wordt gecomponeerd...';
      case 'completed':
        return soundtrack.title || 'Je soundtrack is klaar!';
      case 'error':
        return soundtrack.error || 'Er ging iets mis';
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
        // Estimate based on time elapsed (typically 2-4 minutes)
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

  // Minimized view (just a small floating player)
  if (isMinimized && soundtrack.status === 'completed') {
    return (
      <motion.div
        initial={{ y: 100, opacity: 0 }}
        animate={{ y: 0, opacity: 1 }}
        className="fixed bottom-4 right-4 z-50"
      >
        <div className="flex items-center gap-2 bg-card border border-border rounded-full shadow-lg px-3 py-2">
          <button
            onClick={handlePlayPause}
            className="p-2 rounded-full bg-primary text-primary-foreground hover:bg-primary/90 transition-colors"
          >
            {isPlaying ? <Pause className="h-4 w-4" /> : <Play className="h-4 w-4" />}
          </button>
          <span className="text-xs font-medium text-foreground max-w-[120px] truncate">
            {soundtrack.title}
          </span>
          <button
            onClick={() => setIsMinimized(false)}
            className="p-1 text-muted-foreground hover:text-foreground transition-colors"
          >
            <ChevronUp className="h-4 w-4" />
          </button>
        </div>
      </motion.div>
    );
  }

  return (
    <AnimatePresence>
      <motion.div
        initial={{ y: 100, opacity: 0 }}
        animate={{ y: 0, opacity: 1 }}
        exit={{ y: 100, opacity: 0 }}
        className="fixed bottom-0 left-0 right-0 z-50 bg-gradient-to-t from-card via-card to-card/95 border-t border-border shadow-2xl"
      >
        {/* Compact header with minimize/close */}
        <div className="container mx-auto max-w-4xl px-4">
          <div className="flex items-center justify-between py-2 border-b border-border/50">
            <div className="flex items-center gap-2">
              <Music className="h-4 w-4 text-primary" />
              <span className="text-xs font-semibold text-muted-foreground uppercase tracking-wider">
                {soundtrack.version === 'v1' ? 'Soundtrack Preview' : 'Persoonlijke Soundtrack'}
              </span>
            </div>
            <div className="flex items-center gap-1">
              {soundtrack.status === 'completed' && (
                <button
                  onClick={() => setIsMinimized(true)}
                  className="p-1.5 text-muted-foreground hover:text-foreground transition-colors rounded-md hover:bg-muted/50"
                  title="Minimaliseren"
                >
                  <ChevronDown className="h-4 w-4" />
                </button>
              )}
              <button
                onClick={handleClose}
                className="p-1.5 text-muted-foreground hover:text-foreground transition-colors rounded-md hover:bg-muted/50"
                title="Sluiten"
              >
                <X className="h-4 w-4" />
              </button>
            </div>
          </div>
        </div>

        {/* Main content */}
        <div className="container mx-auto max-w-4xl px-4 py-4">
          {/* Generating state */}
          {soundtrack.isGenerating && (
            <div className="space-y-3">
              <div className="flex items-center gap-3">
                <div className="relative">
                  <Loader2 className="h-8 w-8 text-primary animate-spin" />
                  <div className="absolute inset-0 flex items-center justify-center">
                    <Music className="h-4 w-4 text-primary/50" />
                  </div>
                </div>
                <div className="flex-1">
                  <p className="text-sm font-medium text-foreground">
                    {getStatusMessage()}
                  </p>
                  <p className="text-xs text-muted-foreground mt-0.5">
                    Dit kan 2-4 minuten duren
                  </p>
                </div>
              </div>
              <Progress value={getProgress()} className="h-1" />
            </div>
          )}

          {/* Error state */}
          {soundtrack.hasError && (
            <div className="flex items-center gap-3">
              <div className="p-2 rounded-full bg-destructive/10">
                <AlertCircle className="h-5 w-5 text-destructive" />
              </div>
              <div className="flex-1">
                <p className="text-sm font-medium text-foreground">Er ging iets mis</p>
                <p className="text-xs text-muted-foreground">{soundtrack.error}</p>
              </div>
              <Button
                variant="outline"
                size="sm"
                onClick={handleClose}
                className="gap-1.5"
              >
                <RefreshCw className="h-3.5 w-3.5" />
                Opnieuw
              </Button>
            </div>
          )}

          {/* Completed state */}
          {soundtrack.isComplete && (
            <div className="space-y-3">
              {/* Player row */}
              <div className="flex items-center gap-4">
                <button
                  onClick={handlePlayPause}
                  className="flex-shrink-0 p-3 rounded-full bg-primary text-primary-foreground hover:bg-primary/90 transition-all shadow-lg hover:shadow-xl hover:scale-105"
                >
                  {isPlaying ? <Pause className="h-5 w-5" /> : <Play className="h-5 w-5 ml-0.5" />}
                </button>
                
                <div className="flex-1 min-w-0">
                  <h3 className="font-semibold text-foreground truncate">
                    {soundtrack.title}
                  </h3>
                  <p className="text-xs text-muted-foreground">
                    {soundtrack.style} • {soundtrack.version === 'v1' ? 'Preview versie' : 'Gepersonaliseerd'}
                  </p>
                </div>

                {/* V1: Show upgrade button */}
                {soundtrack.version === 'v1' && formData && (
                  <Button
                    variant="default"
                    size="sm"
                    onClick={onOpenPersonalizeDialog}
                    className="gap-1.5 bg-gradient-to-r from-primary to-accent hover:from-primary/90 hover:to-accent/90"
                  >
                    <Sparkles className="h-3.5 w-3.5" />
                    <span className="hidden sm:inline">Maak persoonlijker</span>
                    <span className="sm:hidden">Upgrade</span>
                  </Button>
                )}
              </div>

              {/* Lyrics preview (collapsible) */}
              {soundtrack.lyrics && (
                <details className="group">
                  <summary className="text-xs text-muted-foreground cursor-pointer hover:text-foreground transition-colors list-none flex items-center gap-1">
                    <ChevronDown className="h-3 w-3 group-open:rotate-180 transition-transform" />
                    Bekijk songtekst
                  </summary>
                  <div className="mt-2 p-3 bg-muted/30 rounded-lg max-h-32 overflow-y-auto">
                    <pre className="text-xs text-muted-foreground whitespace-pre-wrap font-sans leading-relaxed">
                      {soundtrack.lyrics}
                    </pre>
                  </div>
                </details>
              )}
            </div>
          )}
        </div>
      </motion.div>
    </AnimatePresence>
  );
};
