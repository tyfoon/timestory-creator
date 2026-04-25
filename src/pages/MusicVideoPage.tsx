/**
 * MusicVideoPage - Dedicated page for the personalized AI music video.
 *
 * The music video is one of the "next actions" after viewing the timeline,
 * not embedded inside /story. This page hosts the full player and shows
 * the SharedExperienceCarousel below for further navigation.
 */
import { useEffect, useMemo, useState } from 'react';
import { useNavigate, useSearchParams } from 'react-router-dom';
import { motion } from 'framer-motion';
import { Player } from '@remotion/player';
import {
  ArrowLeft, Music, Loader2, AlertCircle, RefreshCw,
  Maximize2, Share2, Tv, Film,
} from 'lucide-react';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import { Progress } from '@/components/ui/progress';
import { Switch } from '@/components/ui/switch';
import { Label } from '@/components/ui/label';
import { Dialog, DialogContent } from '@/components/ui/dialog';
import { useLanguage } from '@/contexts/LanguageContext';
import { useSoundtrackGeneration, clearSoundtrackState } from '@/hooks/useSoundtrackGeneration';
import { TimelineVideoComponent, VideoEvent } from '@/remotion';
import { SharedExperienceCarousel } from '@/components/story/SharedExperienceCarousel';
import { getCachedTimeline } from '@/lib/timelineCache';
import { TimelineEvent } from '@/types/timeline';
import { FormData } from '@/types/form';

const FPS = 30;

const MusicVideoPage = () => {
  const navigate = useNavigate();
  const [searchParams] = useSearchParams();
  const { t, language } = useLanguage();
  const soundtrack = useSoundtrackGeneration();

  const [formData, setFormData] = useState<FormData | null>(null);
  const [events, setEvents] = useState<TimelineEvent[]>([]);
  const [storyTitle, setStoryTitle] = useState('');
  const [storyIntroduction, setStoryIntroduction] = useState('');
  const [isFullscreen, setIsFullscreen] = useState(false);
  const [enableVhsEffect, setEnableVhsEffect] = useState(false);

  // Load timeline data from sessionStorage cache
  useEffect(() => {
    const stored = sessionStorage.getItem('timelineFormData');
    if (!stored) return;
    try {
      const data = JSON.parse(stored) as FormData;
      setFormData(data);
      const cached = getCachedTimeline(data, language);
      if (cached) {
        setEvents(cached.events);
        setStoryTitle(cached.storyTitle || '');
        setStoryIntroduction(cached.storyIntroduction || '');
        // VHS effect is opt-in only (default off)
      }
    } catch (e) {
      console.error('[MusicVideoPage] Failed to load timeline data', e);
    }
  }, [language]);

  const videoEvents: VideoEvent[] = useMemo(
    () => events.map(e => ({ ...e, audioDurationFrames: Math.round(5 * FPS) })),
    [events]
  );

  const totalDuration = useMemo(
    () => (soundtrack.duration ? Math.round(soundtrack.duration * FPS) : 180 * FPS),
    [soundtrack.duration]
  );

  const displayTitle =
    storyTitle ||
    (formData?.birthDate
      ? `${t('yourYears') as string} ${formData.birthDate.year}-${formData.birthDate.year + 25}`
      : (t('yourStory') as string));

  const formatDuration = (seconds: number) => {
    const mins = Math.floor(seconds / 60);
    const secs = Math.floor(seconds % 60);
    return `${mins}:${secs.toString().padStart(2, '0')}`;
  };

  const getProgress = (): number => {
    switch (soundtrack.status) {
      case 'generating_lyrics': return 15;
      case 'generating_music': return 35;
      case 'polling':
        if (soundtrack.startedAt) {
          const elapsed = Date.now() - soundtrack.startedAt;
          return Math.min(35 + (elapsed / 180000) * 60, 95);
        }
        return 50;
      case 'completed': return 100;
      default: return 0;
    }
  };

  const getStatusMessage = (): string => {
    switch (soundtrack.status) {
      case 'generating_lyrics': return t('writingLyrics') as string;
      case 'generating_music': return t('startingMusic') as string;
      case 'polling':
        return soundtrack.isStreaming
          ? (t('soundtrackStreaming') as string)
          : (t('composingSoundtrack') as string);
      case 'completed': return soundtrack.title || (t('musicVideoReady') as string);
      case 'error': return t('somethingWentWrong') as string;
      default: return t('loading') as string;
    }
  };

  const handleReset = () => {
    if (formData) {
      soundtrack.regenerateQuick(formData, events, language);
    } else {
      clearSoundtrackState();
      soundtrack.reset();
    }
  };

  const isGenerating = soundtrack.isGenerating;
  const isComplete = soundtrack.isComplete && !!soundtrack.audioUrl;
  const hasError = soundtrack.hasError;
  const isIdle = soundtrack.status === 'idle';

  return (
    <div className="min-h-screen bg-background">
      {/* Header */}
      <header className="sticky top-0 z-30 bg-background/80 backdrop-blur-md border-b border-border">
        <div className="max-w-5xl mx-auto px-4 sm:px-6 py-3 flex items-center gap-3">
          <Button
            variant="ghost"
            size="sm"
            onClick={() => navigate(`/story?${searchParams.toString()}`)}
            className="gap-1.5"
          >
            <ArrowLeft className="h-4 w-4" />
            <span className="hidden sm:inline">{t('backButton') as string}</span>
          </Button>
          <div className="flex-1 min-w-0">
            <p className="font-mono text-[10px] uppercase tracking-wider text-muted-foreground">
              {t('aiMusicVideo') as string}
            </p>
            <h1 className="font-serif text-base sm:text-lg font-bold text-foreground truncate">
              {t('myMusicVideoTitle') as string}
            </h1>
          </div>
        </div>
      </header>

      <main className="max-w-5xl mx-auto px-4 sm:px-6 py-8">
        <motion.div
          initial={{ opacity: 0, y: 20 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ duration: 0.5 }}
        >
          {/* Hero card */}
          <div className="relative rounded-2xl border border-border bg-card overflow-hidden shadow-xl">
            <div className="absolute inset-0 bg-gradient-to-br from-violet-500/15 via-fuchsia-500/10 to-transparent pointer-events-none" />

            <div className="relative z-10 p-5 sm:p-8">
              <div className="flex items-center gap-3 mb-6">
                <div className="w-12 h-12 rounded-xl bg-background/80 backdrop-blur-sm flex items-center justify-center text-violet-400 border border-border/50">
                  <Music className="h-6 w-6" />
                </div>
                <div className="flex-1 min-w-0">
                  <h2 className="font-serif text-xl sm:text-2xl font-bold text-foreground leading-tight">
                    {displayTitle}
                  </h2>
                  <p className="text-xs text-muted-foreground font-mono">
                    {(t('eventsAiMusic') as string).replace('{count}', String(events.length))}
                  </p>
                </div>
              </div>

              {/* Idle */}
              {isIdle && (
                <div className="py-12 text-center">
                  <p className="text-sm text-muted-foreground">
                    {t('preparingMusicVideo') as string}
                  </p>
                </div>
              )}

              {/* Generating */}
              {isGenerating && (
                <div className="space-y-4">
                  <div className="flex items-center gap-3">
                    <div className="w-10 h-10 rounded-full bg-primary/10 flex items-center justify-center">
                      <Loader2 className="h-5 w-5 text-primary animate-spin" />
                    </div>
                    <div className="flex-1 min-w-0">
                      <p className="text-sm font-medium text-foreground">{getStatusMessage()}</p>
                      <p className="text-xs text-muted-foreground">{t('generationTime') as string}</p>
                    </div>
                  </div>
                  <Progress value={getProgress()} className="h-1.5" />

                  {soundtrack.status === 'polling' && soundtrack.streamAudioUrl && (
                    <div className="p-3 bg-accent/5 border border-accent/20 rounded-lg">
                      <p className="text-xs font-medium text-foreground mb-2 flex items-center gap-1.5">
                        <Music className="h-3 w-3 text-accent" />
                        {t('previewPlaying') as string}
                      </p>
                      <audio controls className="w-full h-8" src={soundtrack.streamAudioUrl} controlsList="nodownload" />
                    </div>
                  )}
                </div>
              )}

              {/* Error */}
              {hasError && (
                <div className="space-y-3">
                  <div className="flex items-center gap-3 p-3 bg-destructive/5 border border-destructive/20 rounded-lg">
                    <AlertCircle className="h-5 w-5 text-destructive flex-shrink-0" />
                    <p className="text-sm font-medium text-foreground">{t('somethingWentWrong') as string}</p>
                  </div>
                  <Button variant="outline" size="sm" onClick={handleReset} className="gap-1.5">
                    <RefreshCw className="h-3.5 w-3.5" />
                    {t('retryButton') as string}
                  </Button>
                </div>
              )}

              {/* Complete */}
              {isComplete && (
                <div className="space-y-4">
                  <div className="flex items-center gap-2 p-3 bg-primary/5 rounded-lg border border-primary/10">
                    <Film className="h-4 w-4 text-primary flex-shrink-0" />
                    <div className="flex-1 min-w-0">
                      <p className="text-sm font-semibold text-foreground truncate">{soundtrack.title}</p>
                      <p className="text-[11px] text-muted-foreground truncate">{soundtrack.style}</p>
                    </div>
                    <span className="text-[11px] text-muted-foreground font-mono flex-shrink-0">
                      {formatDuration(soundtrack.duration || 180)}
                    </span>
                  </div>

                  <div className="flex items-center justify-between p-2.5 bg-muted/20 rounded-lg border border-border">
                    <div className="flex items-center gap-1.5">
                      <Tv className="h-3.5 w-3.5 text-muted-foreground" />
                      <Label htmlFor="vhs-toggle-page" className="text-xs text-muted-foreground cursor-pointer">
                        VHS / Retro
                      </Label>
                    </div>
                    <Switch id="vhs-toggle-page" checked={enableVhsEffect} onCheckedChange={setEnableVhsEffect} />
                  </div>

                  <div className="aspect-video bg-black rounded-xl overflow-hidden shadow-lg">
                    <Player
                      // eslint-disable-next-line @typescript-eslint/no-explicit-any
                      component={TimelineVideoComponent as any}
                      inputProps={{
                        events: videoEvents,
                        storyTitle: displayTitle,
                        storyIntroduction: storyIntroduction || '',
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

                  <div className="flex gap-2">
                    <Button onClick={() => setIsFullscreen(true)} className="flex-1 gap-1.5 font-semibold">
                      <Maximize2 className="h-4 w-4" />
                      {t('watchVideo') as string}
                    </Button>
                  </div>

                  {soundtrack.lyrics && (
                    <details className="group rounded-lg border border-border bg-muted/10 p-3">
                      <summary className="text-xs text-muted-foreground cursor-pointer hover:text-foreground transition-colors list-none flex items-center gap-1.5">
                        <span className="text-[10px]">▶</span>
                        <span className="group-open:hidden">{t('viewLyrics') as string}</span>
                        <span className="hidden group-open:inline">{t('hideLyrics') as string}</span>
                      </summary>
                      <pre className="mt-2 text-[11px] text-muted-foreground whitespace-pre-wrap font-sans leading-relaxed max-h-60 overflow-y-auto">
                        {soundtrack.lyrics}
                      </pre>
                    </details>
                  )}
                </div>
              )}
            </div>
          </div>
        </motion.div>

        {/* Carousel of other actions below */}
        <SharedExperienceCarousel
          excludeCards={['music-video']}
          searchParams={searchParams}
        />
      </main>

      {/* Fullscreen player */}
      <Dialog open={isFullscreen} onOpenChange={setIsFullscreen}>
        <DialogContent className="max-w-6xl p-0 bg-black border-0">
          <div className="aspect-video w-full">
            {isComplete && (
              <Player
                // eslint-disable-next-line @typescript-eslint/no-explicit-any
                component={TimelineVideoComponent as any}
                inputProps={{
                  events: videoEvents,
                  storyTitle: displayTitle,
                  storyIntroduction: storyIntroduction || '',
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
                autoPlay
              />
            )}
          </div>
        </DialogContent>
      </Dialog>

    </div>
  );
};

export default MusicVideoPage;
