/**
 * StoryEndCarousel - Swipeable carousel at the bottom of /story with 5 experience cards
 * Card 1 embeds the full soundtrack player inline (replaces old SoundtrackSection)
 */
import { useState, useRef, useEffect, useCallback, useMemo } from 'react';
import { motion, useInView } from 'framer-motion';
import { 
  Music, Mic, Image, FileText, 
  Share2, Sparkles, ChevronLeft, ChevronRight, 
  Crown, Gift, Lock, Download, Loader2, AlertCircle,
  RefreshCw, Film, Tv, Play, X, Maximize2, Flame
} from 'lucide-react';
import { Player } from '@remotion/player';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import { Progress } from '@/components/ui/progress';
import { Switch } from '@/components/ui/switch';
import { Label } from '@/components/ui/label';
import { Dialog, DialogContent } from '@/components/ui/dialog';
import { useLanguage } from '@/contexts/LanguageContext';
import { TimelineEvent } from '@/types/timeline';
import { FormData } from '@/types/form';
import { useSoundtrackGeneration, clearSoundtrackState } from '@/hooks/useSoundtrackGeneration';
import { TimelineVideoComponent, VideoEvent } from '@/remotion';
import { ShareDialog } from '@/components/video/ShareDialog';
import polaroidPreview from '@/assets/polaroid-preview.png';
import { RoastDialog } from '@/components/story/RoastDialog';

const FPS = 30;

interface StoryEndCarouselProps {
  events: TimelineEvent[];
  formData: FormData | null;
  storyTitle?: string;
  storyIntroduction?: string;
  onOpenPersonalize: () => void;
  onOpenSpokenVideo: () => void;
  onOpenPolaroids: () => void;
  onDownloadPDF: () => void;
}

export const StoryEndCarousel = ({
  events,
  formData,
  storyTitle,
  storyIntroduction,
  onOpenPersonalize,
  onOpenSpokenVideo,
  onOpenPolaroids,
  onDownloadPDF,
}: StoryEndCarouselProps) => {
  const { t, language } = useLanguage();
  const scrollRef = useRef<HTMLDivElement>(null);
  const sectionRef = useRef<HTMLDivElement>(null);
  const isInView = useInView(sectionRef, { once: true, margin: '-80px' });
  const [activeIndex, setActiveIndex] = useState(0);
  const [canScrollLeft, setCanScrollLeft] = useState(false);
  const [canScrollRight, setCanScrollRight] = useState(true);
  const [isFullscreen, setIsFullscreen] = useState(false);
  const [isShareDialogOpen, setIsShareDialogOpen] = useState(false);
  const [enableVhsEffect, setEnableVhsEffect] = useState(false);
  const [isRoastOpen, setIsRoastOpen] = useState(false);

  const soundtrack = useSoundtrackGeneration();

  // Auto-enable VHS for 80s-dominant content
  useEffect(() => {
    if (events.length > 0) {
      const eightyEvents = events.filter(e => e.year >= 1980 && e.year < 1990).length;
      if (eightyEvents / events.length > 0.5) setEnableVhsEffect(true);
    }
  }, [events]);

  const videoEvents: VideoEvent[] = useMemo(() => {
    return events.map(e => ({ ...e, audioDurationFrames: Math.round(5 * FPS) }));
  }, [events]);

  const totalDuration = useMemo(() => {
    return soundtrack.duration ? Math.round(soundtrack.duration * FPS) : 180 * FPS;
  }, [soundtrack.duration]);

  const displayTitle = storyTitle || (formData?.birthDate
    ? `${t('yourYears') as string} ${formData.birthDate.year}-${formData.birthDate.year + 25}`
    : t('yourStory') as string);

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
        if (soundtrack.isStreaming) {
          if (soundtrack.startedAt) {
            const elapsed = Date.now() - soundtrack.startedAt;
            return Math.min(60 + (elapsed / 120000) * 35, 95);
          }
          return 70;
        }
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
      case 'polling': return soundtrack.isStreaming ? t('soundtrackStreaming') as string : t('composingSoundtrack') as string;
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

  const CARD_COUNT = 6;

  const updateScrollState = useCallback(() => {
    if (!scrollRef.current) return;
    const { scrollLeft, scrollWidth, clientWidth } = scrollRef.current;
    setCanScrollLeft(scrollLeft > 10);
    setCanScrollRight(scrollLeft < scrollWidth - clientWidth - 10);
    const cardWidth = scrollRef.current.children[0]?.getBoundingClientRect().width || 300;
    const gap = 20;
    const index = Math.round(scrollLeft / (cardWidth + gap));
    setActiveIndex(Math.min(index, CARD_COUNT - 1));
  }, []);

  useEffect(() => {
    const el = scrollRef.current;
    if (!el) return;
    el.addEventListener('scroll', updateScrollState, { passive: true });
    updateScrollState();
    return () => el.removeEventListener('scroll', updateScrollState);
  }, [updateScrollState]);

  const scrollTo = (direction: 'left' | 'right') => {
    if (!scrollRef.current) return;
    const cardWidth = scrollRef.current.children[0]?.getBoundingClientRect().width || 300;
    const amount = direction === 'left' ? -cardWidth - 20 : cardWidth + 20;
    scrollRef.current.scrollBy({ left: amount, behavior: 'smooth' });
  };

  // Render the music video card content (card 1) - embeds the full soundtrack player
  const renderMusicVideoContent = () => {
    const isGenerating = soundtrack.isGenerating;
    const isComplete = soundtrack.isComplete && soundtrack.audioUrl;
    const hasError = soundtrack.hasError;
    const isIdle = soundtrack.status === 'idle';

    return (
      <div className="flex flex-col h-full">
        {/* Badge */}
        <div className="absolute top-3 right-3 z-10">
          <Badge variant="secondary" className="bg-emerald-500/15 text-emerald-400 border-emerald-500/30 gap-1 text-[10px] font-semibold uppercase tracking-wide">
            <Gift className="h-3 w-3" />
            Gratis
          </Badge>
        </div>

        {/* Header */}
        <div className="flex items-center gap-3 mb-4">
          <div className="w-12 h-12 rounded-xl bg-background/80 backdrop-blur-sm flex items-center justify-center text-violet-400 border border-border/50">
            <Music className="h-6 w-6" />
          </div>
          <div className="flex-1 min-w-0">
            <h3 className="font-serif text-lg font-bold text-foreground leading-tight">Mijn Muziekvideo</h3>
            <p className="text-xs text-muted-foreground font-mono">
              {events.length} gebeurtenissen • AI-muziek
            </p>
          </div>
        </div>

        {/* Idle state */}
        {isIdle && (
          <div className="flex-1 flex items-center justify-center">
            <p className="text-sm text-muted-foreground text-center">Je muziekvideo wordt voorbereid...</p>
          </div>
        )}

        {/* Generating state */}
        {isGenerating && (
          <div className="flex-1 space-y-3">
            <div className="flex items-center gap-3">
              <div className="relative flex-shrink-0">
                <div className="w-10 h-10 rounded-full bg-primary/10 flex items-center justify-center">
                  <Loader2 className="h-5 w-5 text-primary animate-spin" />
                </div>
              </div>
              <div className="flex-1 min-w-0">
                <p className="text-sm font-medium text-foreground">{getStatusMessage()}</p>
                <p className="text-xs text-muted-foreground">{t('generationTime') as string}</p>
              </div>
            </div>
            <Progress value={getProgress()} className="h-1.5" />

            {/* Streaming preview */}
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

        {/* Error state */}
        {hasError && (
          <div className="flex-1 flex flex-col justify-center gap-3">
            <div className="flex items-center gap-3 p-3 bg-destructive/5 border border-destructive/20 rounded-lg">
              <AlertCircle className="h-5 w-5 text-destructive flex-shrink-0" />
              <div className="flex-1 min-w-0">
                <p className="text-sm font-medium text-foreground">{t('somethingWentWrong') as string}</p>
              </div>
            </div>
            <Button variant="outline" size="sm" onClick={handleReset} className="gap-1.5 self-start">
              <RefreshCw className="h-3.5 w-3.5" />
              {t('retryButton') as string}
            </Button>
          </div>
        )}

        {/* Completed state - mini player + fullscreen button */}
        {isComplete && (
          <div className="flex-1 flex flex-col gap-3">
            {/* Song info */}
            <div className="flex items-center gap-2 p-2.5 bg-primary/5 rounded-lg border border-primary/10">
              <Film className="h-4 w-4 text-primary flex-shrink-0" />
              <div className="flex-1 min-w-0">
                <p className="text-sm font-semibold text-foreground truncate">{soundtrack.title}</p>
                <p className="text-[10px] text-muted-foreground truncate">{soundtrack.style}</p>
              </div>
              <span className="text-[10px] text-muted-foreground font-mono flex-shrink-0">
                {formatDuration(soundtrack.duration || 180)}
              </span>
            </div>

            {/* VHS toggle */}
            <div className="flex items-center justify-between p-2 bg-muted/20 rounded-lg border border-border">
              <div className="flex items-center gap-1.5">
                <Tv className="h-3.5 w-3.5 text-muted-foreground" />
                <Label htmlFor="vhs-toggle-carousel" className="text-xs text-muted-foreground cursor-pointer">
                  VHS / Retro
                </Label>
              </div>
              <Switch id="vhs-toggle-carousel" checked={enableVhsEffect} onCheckedChange={setEnableVhsEffect} />
            </div>

            {/* Mini video preview */}
            <div className="aspect-video bg-black rounded-lg overflow-hidden shadow-md flex-shrink-0">
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

            {/* Info footer */}
            <div className="flex items-center justify-between text-[10px] text-muted-foreground">
              <span>{formatDuration(soundtrack.duration || 180)} • {events.length} scenes</span>
              <span className="flex items-center gap-1">
                <Music className="h-2.5 w-2.5" />
                {t('aiMusicVideo') as string}
              </span>
            </div>

            {/* Action buttons */}
            <div className="flex gap-2 mt-auto">
              <Button onClick={() => setIsFullscreen(true)} size="sm" className="flex-1 gap-1.5 text-xs font-semibold">
                <Maximize2 className="h-3 w-3" />
                Bekijk video
              </Button>
              <Button onClick={() => setIsShareDialogOpen(true)} size="sm" variant="outline" className="gap-1.5 text-xs">
                <Share2 className="h-3 w-3" />
                Delen
              </Button>
            </div>

            {/* Lyrics */}
            {soundtrack.lyrics && (
              <details className="group">
                <summary className="text-xs text-muted-foreground cursor-pointer hover:text-foreground transition-colors list-none flex items-center gap-1.5">
                  <span className="text-[10px]">▶</span>
                  <span className="group-open:hidden">{t('viewLyrics') as string}</span>
                  <span className="hidden group-open:inline">{t('hideLyrics') as string}</span>
                </summary>
                <div className="mt-2 p-3 bg-muted/20 rounded-lg max-h-40 overflow-y-auto">
                  <pre className="text-[10px] text-muted-foreground whitespace-pre-wrap font-sans leading-relaxed">
                    {soundtrack.lyrics}
                  </pre>
                </div>
              </details>
            )}
          </div>
        )}
      </div>
    );
  };

  // Generic cards (2-5)
  const genericCards = [
    {
      id: 'personalized',
      title: 'Volledig Gepersonaliseerd',
      subtitle: '40 gebeurtenissen • Jouw details',
      description: 'Maak je verhaal uniek met persoonlijke details, 40 gebeurtenissen en een langere muziekvideo.',
      icon: <Sparkles className="h-6 w-6" />,
      isPremium: true,
      action: onOpenPersonalize,
      actionLabel: 'Personaliseer',
      gradient: 'from-amber-500/20 via-orange-500/10 to-transparent',
      accentColor: 'text-amber-400',
    },
    {
      id: 'spoken-story',
      title: 'Gesproken Verhaal',
      subtitle: 'AI-stem • Vertelling',
      description: 'Luister naar je levensverhaal als gesproken vertelling met beelden en sfeervolle muziek.',
      icon: <Mic className="h-6 w-6" />,
      isPremium: true,
      action: onOpenSpokenVideo,
      actionLabel: 'Bekijk video',
      gradient: 'from-emerald-500/20 via-teal-500/10 to-transparent',
      accentColor: 'text-emerald-400',
    },
    {
      id: 'polaroids',
      title: 'Mijn Leven in Polaroids',
      subtitle: `${events.length} foto's • Retro stijl`,
      description: 'Herleef je mooiste momenten als een verzameling nostalgische polaroid foto\'s.',
      icon: <Image className="h-6 w-6" />,
      isPremium: false,
      action: onOpenPolaroids,
      actionLabel: 'Bekijk polaroids',
      gradient: 'from-sky-500/20 via-blue-500/10 to-transparent',
      accentColor: 'text-sky-400',
      previewImage: polaroidPreview,
    },
    {
      id: 'presentation',
      title: 'Mijn Leven als Presentatie',
      subtitle: 'PDF • A4 Album',
      description: 'Download een prachtig A4 album van je levensverhaal als PDF, klaar om te printen of te delen.',
      icon: <FileText className="h-6 w-6" />,
      isPremium: true,
      action: onDownloadPDF,
      actionLabel: 'Download PDF',
      gradient: 'from-rose-500/20 via-pink-500/10 to-transparent',
      accentColor: 'text-rose-400',
    },
  ];

  return (
    <>
      <motion.section
        ref={sectionRef}
        initial={{ opacity: 0, y: 60 }}
        animate={isInView ? { opacity: 1, y: 0 } : {}}
        transition={{ duration: 0.8, ease: [0.25, 0.1, 0.25, 1] }}
        className="py-16 -mx-4 sm:-mx-6 lg:-mx-8"
      >
        {/* Section header */}
        <div className="text-center mb-8 px-4">
          <p className="font-mono text-xs uppercase tracking-[0.2em] text-muted-foreground mb-3">
            Einde van je tijdreis
          </p>
          <h2 className="font-serif text-2xl sm:text-3xl font-bold text-foreground mb-2">
            Neem je verhaal mee
          </h2>
          <p className="text-sm text-muted-foreground max-w-md mx-auto">
            Swipe om alle manieren te ontdekken waarop je jouw verhaal kunt herbeleven en delen
          </p>
          <motion.div 
            className="flex items-center justify-center gap-1 mt-3 text-muted-foreground/60"
            animate={{ x: [0, 8, 0] }}
            transition={{ duration: 1.5, repeat: Infinity }}
          >
            <ChevronLeft className="h-4 w-4" />
            <span className="text-xs">swipe</span>
            <ChevronRight className="h-4 w-4" />
          </motion.div>
        </div>

        {/* Carousel */}
        <div className="relative">
          {/* Navigation arrows */}
          <Button
            variant="outline"
            size="icon"
            className={`absolute left-2 top-1/2 -translate-y-1/2 z-10 bg-background/90 backdrop-blur-sm shadow-lg h-10 w-10 rounded-full transition-opacity ${
              canScrollLeft ? 'opacity-100' : 'opacity-0 pointer-events-none'
            }`}
            onClick={() => scrollTo('left')}
          >
            <ChevronLeft className="h-5 w-5" />
          </Button>
          <Button
            variant="outline"
            size="icon"
            className={`absolute right-2 top-1/2 -translate-y-1/2 z-10 bg-background/90 backdrop-blur-sm shadow-lg h-10 w-10 rounded-full transition-opacity ${
              canScrollRight ? 'opacity-100' : 'opacity-0 pointer-events-none'
            }`}
            onClick={() => scrollTo('right')}
          >
            <ChevronRight className="h-5 w-5" />
          </Button>

          {/* Scroll container */}
          <div
            ref={scrollRef}
            className="flex gap-5 overflow-x-auto px-8 sm:px-12 snap-x snap-mandatory pb-4"
            style={{ scrollbarWidth: 'none', msOverflowStyle: 'none', WebkitOverflowScrolling: 'touch' }}
          >
            {/* Card 1: Music Video - special large card */}
            <motion.div
              initial={{ opacity: 0, y: 30, scale: 0.95 }}
              animate={isInView ? { opacity: 1, y: 0, scale: 1 } : {}}
              transition={{ duration: 0.5 }}
              className="flex-shrink-0 w-[340px] sm:w-[400px] snap-center"
            >
              <div className="relative h-full rounded-2xl border border-border bg-card overflow-hidden group hover:border-primary/30 transition-all duration-300 hover:shadow-xl hover:shadow-primary/5">
                <div className="absolute inset-0 bg-gradient-to-br from-violet-500/20 via-fuchsia-500/10 to-transparent opacity-60 group-hover:opacity-100 transition-opacity" />
                <div className="relative z-10 p-5 sm:p-6">
                  {renderMusicVideoContent()}
                </div>
              </div>
            </motion.div>

            {/* Cards 2-5: Generic cards */}
            {genericCards.map((card, index) => (
              <motion.div
                key={card.id}
                initial={{ opacity: 0, y: 30, scale: 0.95 }}
                animate={isInView ? { opacity: 1, y: 0, scale: 1 } : {}}
                transition={{ duration: 0.5, delay: (index + 1) * 0.1 }}
                className="flex-shrink-0 w-[340px] sm:w-[400px] snap-center"
              >
                <div className="relative h-full rounded-2xl border border-border bg-card overflow-hidden group hover:border-primary/30 transition-all duration-300 hover:shadow-xl hover:shadow-primary/5">
                  <div className={`absolute inset-0 bg-gradient-to-br ${card.gradient} opacity-60 group-hover:opacity-100 transition-opacity`} />
                  
                  {/* Badge */}
                  <div className="absolute top-3 right-3 z-10">
                    {card.isPremium ? (
                      <Badge variant="secondary" className="bg-amber-500/15 text-amber-400 border-amber-500/30 gap-1 text-[10px] font-semibold uppercase tracking-wide">
                        <Crown className="h-3 w-3" />
                        Premium
                      </Badge>
                    ) : (
                      <Badge variant="secondary" className="bg-emerald-500/15 text-emerald-400 border-emerald-500/30 gap-1 text-[10px] font-semibold uppercase tracking-wide">
                        <Gift className="h-3 w-3" />
                        Gratis
                      </Badge>
                    )}
                  </div>

                  <div className="relative z-10 p-5 sm:p-6 flex flex-col h-full min-h-[400px]">
                    <div className={`w-12 h-12 rounded-xl bg-background/80 backdrop-blur-sm flex items-center justify-center mb-4 ${card.accentColor} border border-border/50`}>
                      {card.icon}
                    </div>

                    <h3 className="font-serif text-lg font-bold text-foreground mb-1 leading-tight">
                      {card.title}
                    </h3>
                    <p className="text-xs text-muted-foreground font-mono mb-3">
                      {card.subtitle}
                    </p>
                    <p className="text-sm text-muted-foreground leading-relaxed">
                      {card.description}
                    </p>

                    {/* Preview image */}
                    {card.previewImage && (
                      <div className="rounded-lg overflow-hidden shadow-md border border-border/50 my-3 flex-1">
                        <img src={card.previewImage} alt={card.title} className="w-full h-full object-cover" />
                      </div>
                    )}

                    {!card.previewImage && <div className="flex-1" />}

                    <div className="flex gap-2 mt-6">
                      <Button
                        onClick={card.action}
                        size="sm"
                        className={`flex-1 gap-1.5 text-xs font-semibold ${
                          card.isPremium 
                            ? 'bg-gradient-to-r from-amber-500 to-orange-500 hover:from-amber-600 hover:to-orange-600 text-white border-0' 
                            : ''
                        }`}
                        variant={card.isPremium ? 'default' : 'default'}
                      >
                        {card.isPremium && <Lock className="h-3 w-3" />}
                        {card.id === 'presentation' && <Download className="h-3 w-3" />}
                        {card.actionLabel}
                      </Button>
                    </div>
                  </div>
                </div>
              </motion.div>
            ))}
          </div>

          {/* Gradient edges */}
          <div className="absolute left-0 top-0 bottom-4 w-8 bg-gradient-to-r from-background to-transparent pointer-events-none" />
          <div className="absolute right-0 top-0 bottom-4 w-8 bg-gradient-to-l from-background to-transparent pointer-events-none" />
        </div>

        {/* Dot indicators */}
        <div className="flex items-center justify-center gap-2 mt-4">
          {Array.from({ length: CARD_COUNT }).map((_, index) => (
            <button
              key={index}
              className={`h-1.5 rounded-full transition-all duration-300 ${
                index === activeIndex 
                  ? 'w-6 bg-primary' 
                  : 'w-1.5 bg-muted-foreground/30 hover:bg-muted-foreground/50'
              }`}
              onClick={() => {
                if (!scrollRef.current) return;
                const cardWidth = scrollRef.current.children[0]?.getBoundingClientRect().width || 300;
                scrollRef.current.scrollTo({ left: index * (cardWidth + 20), behavior: 'smooth' });
              }}
            />
          ))}
        </div>
      </motion.section>

      {/* Fullscreen Video Dialog */}
      <Dialog open={isFullscreen} onOpenChange={setIsFullscreen}>
        <DialogContent className="max-w-[95vw] w-[95vw] h-[90vh] p-0 bg-black border-none overflow-hidden [&>button]:text-white [&>button]:hover:text-white/80">
          <div className="w-full h-full flex items-center justify-center">
            {soundtrack.isComplete && soundtrack.audioUrl && (
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

      {/* Share Dialog */}
      <ShareDialog
        open={isShareDialogOpen}
        onOpenChange={setIsShareDialogOpen}
        content={{
          events: videoEvents,
          storyTitle: displayTitle,
          storyIntroduction: storyIntroduction || '',
        }}
        settings={{
          variant: 'slideshow',
          fps: FPS,
          enableVhsEffect,
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
