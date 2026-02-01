import { useCallback, useEffect, useRef, useState } from 'react';
import { useNavigate } from 'react-router-dom';
import { motion, useScroll, useTransform, useInView } from 'framer-motion';
import { FormData } from '@/types/form';
import { TimelineEvent, FamousBirthday, SearchTraceEntry } from '@/types/timeline';
import { generateTimelineStreaming } from '@/lib/api/timeline';
import { useClientImageSearch } from '@/hooks/useClientImageSearch';
import { getCachedTimeline, cacheTimeline, updateCachedEvents } from '@/lib/timelineCache';
import { useLanguage } from '@/contexts/LanguageContext';
import { ArrowLeft, ChevronDown, Loader2, AlertCircle } from 'lucide-react';
import { Button } from '@/components/ui/button';
import { useToast } from '@/hooks/use-toast';

// Placeholder images by category
import birthdayPlaceholder from '@/assets/placeholders/birthday.jpg';
import politicsPlaceholder from '@/assets/placeholders/politics.jpg';
import sportsPlaceholder from '@/assets/placeholders/sports.jpg';
import entertainmentPlaceholder from '@/assets/placeholders/entertainment.jpg';
import sciencePlaceholder from '@/assets/placeholders/science.jpg';
import culturePlaceholder from '@/assets/placeholders/culture.jpg';
import worldPlaceholder from '@/assets/placeholders/world.jpg';
import localPlaceholder from '@/assets/placeholders/local.jpg';
import musicPlaceholder from '@/assets/placeholders/music.jpg';
import technologyPlaceholder from '@/assets/placeholders/technology.jpg';
import celebrityPlaceholder from '@/assets/placeholders/celebrity.jpg';

// =============================================
// THEMING SYSTEM - Easy to swap for era themes
// =============================================
interface EditorialTheme {
  name: string;
  // Colors (HSL values to use with Tailwind)
  background: string;      // Page background
  foreground: string;      // Primary text
  muted: string;           // Secondary text
  accent: string;          // Accent color for highlights
  cardBg: string;          // Card/section backgrounds
  // Typography
  fontDisplay: string;     // Hero/title font
  fontBody: string;        // Body text font
  fontMono: string;        // Date/numbers font
}

// Default "timeless editorial" theme
const defaultTheme: EditorialTheme = {
  name: 'editorial',
  background: 'hsl(var(--background))',
  foreground: 'hsl(var(--foreground))',
  muted: 'hsl(var(--muted-foreground))',
  accent: 'hsl(var(--accent))',
  cardBg: 'hsl(var(--card))',
  fontDisplay: 'font-serif',
  fontBody: 'font-sans',
  fontMono: 'font-mono',
};

// Placeholder lookup
const getCategoryPlaceholder = (category: TimelineEvent['category']): string => {
  const placeholders: Record<TimelineEvent['category'], string> = {
    politics: politicsPlaceholder,
    sports: sportsPlaceholder,
    entertainment: entertainmentPlaceholder,
    science: sciencePlaceholder,
    culture: culturePlaceholder,
    world: worldPlaceholder,
    local: localPlaceholder,
    personal: birthdayPlaceholder,
    music: musicPlaceholder,
    technology: technologyPlaceholder,
    celebrity: celebrityPlaceholder,
  };
  return placeholders[category] || culturePlaceholder;
};

// =============================================
// REVEAL ANIMATION COMPONENT
// =============================================
interface RevealProps {
  children: React.ReactNode;
  className?: string;
  delay?: number;
}

const Reveal = ({ children, className = '', delay = 0 }: RevealProps) => {
  const ref = useRef(null);
  const isInView = useInView(ref, { once: true, margin: '-100px' });

  return (
    <motion.div
      ref={ref}
      initial={{ opacity: 0, y: 40 }}
      animate={isInView ? { opacity: 1, y: 0 } : { opacity: 0, y: 40 }}
      transition={{ duration: 0.8, delay, ease: [0.25, 0.1, 0.25, 1] }}
      className={className}
    >
      {children}
    </motion.div>
  );
};

// =============================================
// PARALLAX IMAGE COMPONENT
// =============================================
interface ParallaxImageProps {
  src: string;
  alt: string;
  className?: string;
  speed?: number; // 0.5 = slower, 1 = normal, 2 = faster
}

const ParallaxImage = ({ src, alt, className = '', speed = 0.5 }: ParallaxImageProps) => {
  const ref = useRef(null);
  const { scrollYProgress } = useScroll({
    target: ref,
    offset: ['start end', 'end start'],
  });

  const y = useTransform(scrollYProgress, [0, 1], ['0%', `${speed * 30}%`]);

  return (
    <div ref={ref} className={`overflow-hidden ${className}`}>
      <motion.img
        src={src}
        alt={alt}
        style={{ y }}
        className="w-full h-full object-cover scale-110"
      />
    </div>
  );
};

// =============================================
// STICKY YEAR INDICATOR
// =============================================
interface StickyYearProps {
  year: number;
  theme: EditorialTheme;
}

const StickyYear = ({ year, theme }: StickyYearProps) => {
  return (
    <div className="hidden lg:block fixed left-8 top-1/2 -translate-y-1/2 z-40">
      <motion.div
        initial={{ opacity: 0, x: -20 }}
        animate={{ opacity: 1, x: 0 }}
        className={`${theme.fontMono} text-7xl font-bold text-muted-foreground/20 tracking-tighter`}
        style={{ writingMode: 'vertical-rl', textOrientation: 'mixed' }}
      >
        {year}
      </motion.div>
    </div>
  );
};

// =============================================
// EVENT LAYOUT PATTERNS
// =============================================

// Pattern A: Text far left, small image far right (asymmetric)
const LayoutPatternA = ({ event, theme, imageUrl }: { event: TimelineEvent; theme: EditorialTheme; imageUrl: string }) => (
  <div className="grid grid-cols-1 lg:grid-cols-12 gap-8 lg:gap-12 items-start py-24 lg:py-32">
    <Reveal className="lg:col-span-6 lg:col-start-1 space-y-6">
      <span className={`${theme.fontMono} text-sm uppercase tracking-widest text-muted-foreground`}>
        {event.date}
      </span>
      <h2 className={`${theme.fontDisplay} text-3xl lg:text-5xl font-bold leading-tight text-foreground`}>
        {event.title}
      </h2>
      <p className={`${theme.fontBody} text-lg lg:text-xl text-muted-foreground leading-relaxed`}>
        {event.description}
      </p>
    </Reveal>
    <Reveal className="lg:col-span-4 lg:col-start-8 lg:mt-16" delay={0.2}>
      <div className="relative aspect-[4/5] max-w-xs ml-auto rounded-2xl overflow-hidden shadow-2xl">
        <ParallaxImage src={imageUrl} alt={event.title} className="absolute inset-0" speed={0.3} />
      </div>
    </Reveal>
  </div>
);

// Pattern B: Full-width background image with text left-aligned
const LayoutPatternB = ({ event, theme, imageUrl }: { event: TimelineEvent; theme: EditorialTheme; imageUrl: string }) => (
  <div className="relative min-h-[70vh] flex items-center py-24">
    {/* Background parallax image */}
    <div className="absolute inset-0 -z-10">
      <ParallaxImage src={imageUrl} alt="" className="absolute inset-0 h-full" speed={0.2} />
      <div className="absolute inset-0 bg-gradient-to-r from-background via-background/70 to-transparent" />
    </div>
    
    <Reveal className="max-w-2xl space-y-6">
      <span className={`${theme.fontMono} text-sm uppercase tracking-widest text-muted-foreground`}>
        {event.date}
      </span>
      <h2 className={`${theme.fontDisplay} text-4xl lg:text-6xl font-bold leading-tight text-foreground`}>
        {event.title}
      </h2>
      <p className={`${theme.fontBody} text-lg lg:text-xl text-muted-foreground leading-relaxed`}>
        {event.description}
      </p>
    </Reveal>
  </div>
);

// Pattern C: Large portrait image far left, text far right
const LayoutPatternC = ({ event, theme, imageUrl }: { event: TimelineEvent; theme: EditorialTheme; imageUrl: string }) => (
  <div className="grid grid-cols-1 lg:grid-cols-12 gap-8 lg:gap-12 items-center py-24 lg:py-32">
    <Reveal className="lg:col-span-5 lg:col-start-1 order-2 lg:order-1">
      <div className="relative aspect-[3/4] max-w-md rounded-3xl overflow-hidden shadow-2xl">
        <ParallaxImage src={imageUrl} alt={event.title} className="absolute inset-0" speed={0.4} />
      </div>
    </Reveal>
    <Reveal className="lg:col-span-5 lg:col-start-8 order-1 lg:order-2 space-y-6" delay={0.2}>
      <span className={`${theme.fontMono} text-sm uppercase tracking-widest text-muted-foreground`}>
        {event.date}
      </span>
      <h2 className={`${theme.fontDisplay} text-3xl lg:text-5xl font-bold leading-tight text-foreground`}>
        {event.title}
      </h2>
      <p className={`${theme.fontBody} text-lg lg:text-xl text-muted-foreground leading-relaxed`}>
        {event.description}
      </p>
    </Reveal>
  </div>
);

// Pattern D: Quote style with subtle background
const LayoutPatternD = ({ event, theme, imageUrl }: { event: TimelineEvent; theme: EditorialTheme; imageUrl: string }) => (
  <div className="relative py-32 lg:py-48">
    {/* Subtle background image */}
    <div className="absolute inset-0 -z-10 opacity-10">
      <ParallaxImage src={imageUrl} alt="" className="absolute inset-0 h-full" speed={0.1} />
    </div>
    
    <Reveal className="max-w-4xl mx-auto px-6 text-center space-y-8">
      <span className={`${theme.fontMono} text-sm uppercase tracking-widest text-muted-foreground`}>
        {event.date}
      </span>
      <blockquote className={`${theme.fontDisplay} text-3xl lg:text-5xl xl:text-6xl font-bold leading-tight text-foreground italic`}>
        "{event.title}"
      </blockquote>
      <p className={`${theme.fontBody} text-lg lg:text-xl text-muted-foreground leading-relaxed max-w-2xl mx-auto`}>
        {event.description}
      </p>
    </Reveal>
  </div>
);

// Pattern E: Circular image right, text left (flipped asymmetric)
const LayoutPatternE = ({ event, theme, imageUrl }: { event: TimelineEvent; theme: EditorialTheme; imageUrl: string }) => (
  <div className="grid grid-cols-1 lg:grid-cols-12 gap-8 lg:gap-12 items-center py-24 lg:py-32">
    <Reveal className="lg:col-span-6 lg:col-start-1 space-y-6">
      <span className={`${theme.fontMono} text-sm uppercase tracking-widest text-muted-foreground`}>
        {event.date}
      </span>
      <h2 className={`${theme.fontDisplay} text-3xl lg:text-4xl font-bold leading-tight text-foreground`}>
        {event.title}
      </h2>
      <p className={`${theme.fontBody} text-lg text-muted-foreground leading-relaxed`}>
        {event.description}
      </p>
    </Reveal>
    <Reveal className="lg:col-span-4 lg:col-start-9 flex justify-end" delay={0.2}>
      <div className="relative w-56 h-56 lg:w-72 lg:h-72 rounded-full overflow-hidden shadow-2xl ring-8 ring-background">
        <ParallaxImage src={imageUrl} alt={event.title} className="absolute inset-0" speed={0.2} />
      </div>
    </Reveal>
  </div>
);

// Layout selector based on index
const getLayoutPattern = (index: number) => {
  const patterns = [LayoutPatternA, LayoutPatternB, LayoutPatternC, LayoutPatternD, LayoutPatternE];
  return patterns[index % patterns.length];
};

// =============================================
// HERO SECTION
// =============================================
interface HeroSectionProps {
  storyTitle?: string;
  storyIntroduction?: string;
  theme: EditorialTheme;
  isLoading: boolean;
}

const HeroSection = ({ storyTitle, storyIntroduction, theme, isLoading }: HeroSectionProps) => {
  const { scrollY } = useScroll();
  const opacity = useTransform(scrollY, [0, 400], [1, 0]);
  const y = useTransform(scrollY, [0, 400], [0, 100]);

  return (
    <motion.section 
      className="min-h-screen flex flex-col items-center justify-center relative px-6"
      style={{ opacity }}
    >
      <motion.div 
        className="text-center max-w-4xl mx-auto space-y-8"
        style={{ y }}
      >
        {isLoading ? (
          <div className="flex flex-col items-center gap-4">
            <Loader2 className="h-12 w-12 animate-spin text-muted-foreground" />
            <p className={`${theme.fontBody} text-lg text-muted-foreground`}>
              Je verhaal wordt geschreven...
            </p>
          </div>
        ) : (
          <>
            <motion.h1 
              className={`${theme.fontDisplay} text-4xl sm:text-5xl lg:text-7xl font-bold leading-tight text-foreground`}
              initial={{ opacity: 0, y: 30 }}
              animate={{ opacity: 1, y: 0 }}
              transition={{ duration: 1, delay: 0.2 }}
            >
              {storyTitle || 'Jouw Verhaal'}
            </motion.h1>
            
            {storyIntroduction && (
              <motion.p 
                className={`${theme.fontBody} text-lg lg:text-xl text-muted-foreground leading-relaxed max-w-3xl mx-auto`}
                initial={{ opacity: 0, y: 30 }}
                animate={{ opacity: 1, y: 0 }}
                transition={{ duration: 1, delay: 0.4 }}
              >
                {storyIntroduction}
              </motion.p>
            )}
          </>
        )}
      </motion.div>

      {/* Scroll indicator */}
      {!isLoading && (
        <motion.div 
          className="absolute bottom-12 left-1/2 -translate-x-1/2 flex flex-col items-center gap-2"
          initial={{ opacity: 0 }}
          animate={{ opacity: 1 }}
          transition={{ delay: 1.5 }}
        >
          <span className={`${theme.fontMono} text-xs uppercase tracking-widest text-muted-foreground`}>
            Scroll to begin
          </span>
          <motion.div
            animate={{ y: [0, 8, 0] }}
            transition={{ duration: 1.5, repeat: Infinity }}
          >
            <ChevronDown className="h-6 w-6 text-muted-foreground" />
          </motion.div>
        </motion.div>
      )}
    </motion.section>
  );
};

// =============================================
// MAIN PAGE COMPONENT
// =============================================
const TimelineStoryPage = () => {
  const navigate = useNavigate();
  const { language, t } = useLanguage();
  const { toast } = useToast();
  
  const [theme] = useState<EditorialTheme>(defaultTheme);
  const [formData, setFormData] = useState<FormData | null>(null);
  const [events, setEvents] = useState<TimelineEvent[]>([]);
  const [storyTitle, setStoryTitle] = useState<string>('');
  const [storyIntroduction, setStoryIntroduction] = useState<string>('');
  const [isLoading, setIsLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [currentYear, setCurrentYear] = useState<number | null>(null);
  const [currentMaxEvents, setCurrentMaxEvents] = useState<number | undefined>(undefined);
  
  const formDataRef = useRef<FormData | null>(null);
  const receivedEventsRef = useRef<TimelineEvent[]>([]);
  const eventRefs = useRef<Map<string, HTMLDivElement>>(new Map());

  // Client-side image search
  const handleImageFound = useCallback((eventId: string, imageUrl: string, source: string | null, searchTrace?: SearchTraceEntry[]) => {
    receivedEventsRef.current = receivedEventsRef.current.map(event => {
      if (event.id !== eventId) return event;
      return {
        ...event,
        imageUrl: imageUrl || undefined,
        source: source || undefined,
        imageStatus: imageUrl ? 'found' as const : 'none' as const,
        searchTrace,
      };
    });

    setEvents(prev => {
      const updated = prev.map(event => {
        if (event.id !== eventId) return event;
        return {
          ...event,
          imageUrl: imageUrl || undefined,
          source: source || undefined,
          imageStatus: imageUrl ? 'found' as const : 'none' as const,
          searchTrace,
        };
      });

      if (formDataRef.current) {
        updateCachedEvents(formDataRef.current, language, () => updated);
      }

      return updated;
    });
  }, [language]);

  const { addToQueue: addImagesToQueue, reset: resetImageSearch } = useClientImageSearch({
    maxConcurrent: 3,
    onImageFound: handleImageFound,
  });

  const loadImagesForEvents = useCallback((newEvents: TimelineEvent[]) => {
    const eventsNeedingImages = newEvents.filter(
      e => e.imageSearchQuery && e.imageStatus !== 'found' && e.imageStatus !== 'none'
    );
    if (eventsNeedingImages.length === 0) return;
    addImagesToQueue(eventsNeedingImages);
  }, [addImagesToQueue]);

  // Track scroll position to update current year
  useEffect(() => {
    const handleScroll = () => {
      eventRefs.current.forEach((element, id) => {
        const rect = element.getBoundingClientRect();
        if (rect.top < window.innerHeight / 2 && rect.bottom > window.innerHeight / 2) {
          const event = events.find(e => e.id === id);
          if (event && event.year !== currentYear) {
            setCurrentYear(event.year);
          }
        }
      });
    };

    window.addEventListener('scroll', handleScroll, { passive: true });
    return () => window.removeEventListener('scroll', handleScroll);
  }, [events, currentYear]);

  // Load timeline data
  useEffect(() => {
    const stored = sessionStorage.getItem('timelineFormData');
    const storedLength = sessionStorage.getItem('timelineLength') || 'short';

    if (stored) {
      const data = JSON.parse(stored) as FormData;
      setFormData(data);
      formDataRef.current = data;

      // Check cache first
      const cached = getCachedTimeline(data, language);
      if (cached) {
        resetImageSearch();
        receivedEventsRef.current = [];

        const normalizedCachedEvents = cached.events.map((e) => {
          if (e.imageSearchQuery && (e.imageStatus === 'none' || e.imageStatus === 'error' || !e.imageUrl)) {
            return { ...e, imageStatus: 'loading' as const, imageUrl: undefined };
          }
          return e;
        });

        receivedEventsRef.current = normalizedCachedEvents;
        setEvents(normalizedCachedEvents);
        
        // Set story fields if available (from TimelineData type)
        // Note: These would need to be cached as well
        
        setIsLoading(false);

        const needImages = normalizedCachedEvents.filter(e => 
          e.imageSearchQuery && (!e.imageUrl || e.imageStatus === 'loading')
        );
        if (needImages.length > 0) {
          addImagesToQueue(needImages);
        }
        return;
      }

      const maxEvents = storedLength === 'short' ? 20 : undefined;
      setCurrentMaxEvents(maxEvents);
      loadTimelineStreaming(data, maxEvents);
    } else {
      setError(t('noDataFound') as string);
      setIsLoading(false);
    }
  // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  const loadTimelineStreaming = async (data: FormData, maxEvents?: number) => {
    setIsLoading(true);
    setError(null);
    receivedEventsRef.current = [];

    try {
      await generateTimelineStreaming(data, language, {
        onEvent: (event) => {
          const eventWithStatus: TimelineEvent = {
            ...event,
            imageStatus: event.imageSearchQuery ? 'loading' : 'idle'
          };

          receivedEventsRef.current.push(eventWithStatus);

          const sorted = [...receivedEventsRef.current].sort((a, b) => {
            if (a.year !== b.year) return a.year - b.year;
            if ((a.month || 0) !== (b.month || 0)) return (a.month || 0) - (b.month || 0);
            return (a.day || 0) - (b.day || 0);
          });

          setEvents(sorted);

          if (event.imageSearchQuery) {
            loadImagesForEvents([eventWithStatus]);
          }
        },
        onSummary: () => {
          // Summary is separate from storyTitle/storyIntroduction
        },
        onStoryTitle: (title) => {
          setStoryTitle(title);
        },
        onStoryIntroduction: (introduction) => {
          setStoryIntroduction(introduction);
        },
        onFamousBirthdays: () => {},
        onComplete: (completeData) => {
          // Use story fields from complete data
          if (completeData.storyTitle) setStoryTitle(completeData.storyTitle);
          if (completeData.storyIntroduction) setStoryIntroduction(completeData.storyIntroduction);

          setEvents(() => {
            const refMap = new Map(receivedEventsRef.current.map(e => [e.id, e]));

            const sorted = completeData.events
              .map(e => {
                const existing = refMap.get(e.id);
                if (existing && existing.imageUrl) {
                  return {
                    ...e,
                    imageUrl: existing.imageUrl,
                    source: existing.source,
                    imageStatus: 'found' as const
                  };
                }
                return {
                  ...e,
                  imageStatus: (e.imageSearchQuery ? 'loading' : 'idle') as TimelineEvent['imageStatus']
                };
              })
              .sort((a, b) => {
                if (a.year !== b.year) return a.year - b.year;
                if ((a.month || 0) !== (b.month || 0)) return (a.month || 0) - (b.month || 0);
                return (a.day || 0) - (b.day || 0);
              });

            cacheTimeline(data, language, sorted, completeData.summary, completeData.famousBirthdays || []);
            return sorted;
          });

          setIsLoading(false);

          toast({
            title: t('timelineLoaded') as string,
            description: `${completeData.events.length} ${t('eventsFound') as string}`,
          });
        },
        onError: (errorMsg) => {
          setError(errorMsg);
          setIsLoading(false);

          toast({
            variant: 'destructive',
            title: t('loadError') as string,
            description: errorMsg,
          });
        }
      }, { maxEvents });
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Er ging iets mis');
      setIsLoading(false);
    }
  };

  const handleRetry = () => {
    if (formData) {
      loadTimelineStreaming(formData, currentMaxEvents);
    }
  };

  // Get image URL for an event
  const getEventImageUrl = (event: TimelineEvent): string => {
    if (event.imageUrl) return event.imageUrl;
    return getCategoryPlaceholder(event.category);
  };

  if (error) {
    return (
      <div className="min-h-screen flex flex-col items-center justify-center gap-4 px-6 bg-background">
        <AlertCircle className="h-16 w-16 text-destructive" />
        <h1 className={`${theme.fontDisplay} text-2xl font-bold text-foreground`}>
          Er ging iets mis
        </h1>
        <p className="text-muted-foreground text-center max-w-md">{error}</p>
        <div className="flex gap-4">
          <Button variant="outline" onClick={() => navigate('/')}>
            <ArrowLeft className="mr-2 h-4 w-4" />
            Terug
          </Button>
          <Button onClick={handleRetry}>
            Opnieuw proberen
          </Button>
        </div>
      </div>
    );
  }

  // Lock scroll until hero is loaded (storyTitle available or loading complete)
  const isHeroReady = !isLoading || storyTitle || events.length > 0;

  return (
    <div className={`min-h-screen bg-background ${!isHeroReady ? 'overflow-hidden max-h-screen' : ''}`}>
      {/* Back button */}
      <div className="fixed top-6 left-6 z-50">
        <Button 
          variant="outline" 
          size="sm" 
          onClick={() => navigate('/')}
          className="bg-background/80 backdrop-blur-sm"
        >
          <ArrowLeft className="mr-2 h-4 w-4" />
          Terug
        </Button>
      </div>

      {/* Sticky year indicator */}
      {currentYear && !isLoading && (
        <StickyYear year={currentYear} theme={theme} />
      )}

      {/* Hero section */}
      <HeroSection 
        storyTitle={storyTitle}
        storyIntroduction={storyIntroduction}
        theme={theme}
        isLoading={isLoading && events.length === 0}
      />

      {/* Timeline events */}
      <div className="container mx-auto px-6 lg:px-12">
        {events.map((event, index) => {
          const LayoutPattern = getLayoutPattern(index);
          const imageUrl = getEventImageUrl(event);

          return (
            <div
              key={event.id}
              ref={(el) => {
                if (el) eventRefs.current.set(event.id, el);
              }}
              className="border-b border-border/30 last:border-0"
            >
              <LayoutPattern event={event} theme={theme} imageUrl={imageUrl} />
            </div>
          );
        })}
      </div>

      {/* Loading indicator for additional events */}
      {isLoading && events.length > 0 && (
        <div className="flex justify-center py-12">
          <Loader2 className="h-8 w-8 animate-spin text-muted-foreground" />
        </div>
      )}

      {/* Footer */}
      {!isLoading && events.length > 0 && (
        <footer className="py-24 text-center">
          <Reveal>
            <p className={`${theme.fontMono} text-sm uppercase tracking-widest text-muted-foreground`}>
              Einde van je tijdreis
            </p>
          </Reveal>
        </footer>
      )}
    </div>
  );
};

export default TimelineStoryPage;
