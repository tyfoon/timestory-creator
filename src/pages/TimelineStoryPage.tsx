import { useCallback, useEffect, useRef, useState } from 'react';
import { useNavigate } from 'react-router-dom';
import { motion, useScroll, useTransform, useInView } from 'framer-motion';
import { FormData, OptionalData } from '@/types/form';
import { TimelineEvent, FamousBirthday, SearchTraceEntry } from '@/types/timeline';
import { generateTimelineStreaming } from '@/lib/api/timeline';
import { useClientImageSearch } from '@/hooks/useClientImageSearch';
import { getCachedTimeline, cacheTimeline, updateCachedEvents } from '@/lib/timelineCache';
import { useLanguage } from '@/contexts/LanguageContext';
import { ArrowLeft, ChevronDown, Loader2, AlertCircle, RefreshCw, Clock, Ban, Video, Music } from 'lucide-react';
import { TimeTravelCounter } from '@/components/TimeTravelCounter';
import { Button } from '@/components/ui/button';
import { useToast } from '@/hooks/use-toast';
import { getCacheKey } from '@/lib/timelineCache';
import { DebugInfoDialog } from '@/components/DebugInfoDialog';
import { PromptViewerDialog } from '@/components/PromptViewerDialog';
import { MediaButtons } from '@/components/story/MediaButtons';
import { addToBlacklist } from '@/hooks/useImageBlacklist';
import { VideoDialog } from '@/components/video/VideoDialog';

import { SoundtrackSection } from '@/components/story/SoundtrackSection';
import { PersonalizeSoundtrackDialog } from '@/components/story/PersonalizeSoundtrackDialog';
import { startQuickSoundtrackGeneration, clearSoundtrackState } from '@/hooks/useSoundtrackGeneration';

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
// STAGGERED TEXT REVEAL - Word by word animation
// =============================================
interface StaggeredTextProps {
  text: string;
  className?: string;
  as?: 'h1' | 'h2' | 'h3' | 'p' | 'span';
  highlightWords?: number[];
  style?: React.CSSProperties;
}

const StaggeredText = ({ text, className = '', as: Component = 'h2', highlightWords = [], style }: StaggeredTextProps) => {
  const ref = useRef(null);
  const isInView = useInView(ref, { once: true, margin: '-50px' });
  
  // Guard against undefined text
  if (!text) return null;
  
  const words = text.split(' ');

  return (
    <Component ref={ref} className={className} style={style}>
      {words.map((word, i) => (
        <motion.span
          key={i}
          initial={{ opacity: 0, y: 20, filter: 'blur(4px)' }}
          animate={isInView ? { opacity: 1, y: 0, filter: 'blur(0px)' } : {}}
          transition={{ 
            duration: 0.5, 
            delay: i * 0.08,
            ease: [0.25, 0.1, 0.25, 1] 
          }}
          className={`inline-block mr-[0.25em] ${highlightWords.includes(i) ? 'font-black' : 'font-light'}`}
        >
          {word}
        </motion.span>
      ))}
    </Component>
  );
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
  speed?: number;
}

const ParallaxImage = ({ src, alt, className = '', speed = 0.5 }: ParallaxImageProps) => {
  const ref = useRef<HTMLDivElement>(null);
  const [containerAspect, setContainerAspect] = useState<number | null>(null);
  const [imageAspect, setImageAspect] = useState<number | null>(null);
  const [fitMode, setFitMode] = useState<'cover' | 'contain'>('cover');

  // Measure container aspect ratio (reacts to responsive layout changes)
  useEffect(() => {
    if (!ref.current) return;
    const el = ref.current;

    const update = () => {
      const rect = el.getBoundingClientRect();
      if (rect.width > 0 && rect.height > 0) setContainerAspect(rect.width / rect.height);
    };

    update();
    const ro = new ResizeObserver(update);
    ro.observe(el);
    return () => ro.disconnect();
  }, []);

  const { scrollYProgress } = useScroll({
    target: ref,
    offset: ['start end', 'end start'],
  });

  // Reduced parallax range to prevent excessive zooming
  const y = useTransform(scrollYProgress, [0, 1], ['0%', `${speed * 15}%`]);

  // Switch to object-contain when the image ratio is very different from the container ratio.
  // This prevents “extreme crop/zoom” on panoramic or very tall images.
  useEffect(() => {
    if (!containerAspect || !imageAspect) return;
    const mismatch = Math.max(imageAspect / containerAspect, containerAspect / imageAspect);
    setFitMode(mismatch >= 1.75 ? 'contain' : 'cover');
  }, [containerAspect, imageAspect]);

  return (
    <div ref={ref} className={`overflow-hidden bg-muted ${className}`}>
      <motion.img
        src={src}
        alt={alt}
        onLoad={(e) => {
          const img = e.currentTarget;
          if (img.naturalWidth && img.naturalHeight) {
            setImageAspect(img.naturalWidth / img.naturalHeight);
          }
        }}
        style={{ y: fitMode === 'contain' ? 0 : y }}
        className={`w-full h-full bg-muted ${
          fitMode === 'contain'
            ? 'object-contain scale-100'
            : 'object-cover object-top scale-[1.02]'
        }`}
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
    <div className="hidden lg:block fixed left-4 xl:left-8 top-1/2 -translate-y-1/2 z-40 pointer-events-none">
      <motion.div
        initial={{ opacity: 0, x: -20 }}
        animate={{ opacity: 1, x: 0 }}
        className={`${theme.fontDisplay} text-[8rem] xl:text-[12rem] font-black text-muted-foreground/10 tracking-tighter leading-none`}
        style={{ writingMode: 'vertical-rl', textOrientation: 'mixed' }}
      >
        {year}
      </motion.div>
    </div>
  );
};

// =============================================
// DROP CAP COMPONENT - Magazine style initial
// =============================================
const DropCap = ({ children, theme }: { children: string; theme: EditorialTheme }) => {
  const firstLetter = children.charAt(0);
  const rest = children.slice(1);
  
  return (
    <p className={`${theme.fontBody} text-base sm:text-lg lg:text-xl text-muted-foreground leading-relaxed`}>
      <span className={`${theme.fontDisplay} float-left text-6xl sm:text-7xl lg:text-8xl font-black leading-none mr-3 mt-1 text-foreground`}>
        {firstLetter}
      </span>
      {rest}
    </p>
  );
};

// =============================================
// LAYOUT PROPS INTERFACE
// =============================================
interface LayoutPatternProps {
  event: TimelineEvent;
  theme: EditorialTheme;
  imageUrl: string;
  onBlacklistImage?: (eventId: string) => void;
}

// =============================================
// IMAGE WITH BLACKLIST BUTTON
// =============================================
interface ImageWithBlacklistProps {
  src: string;
  alt: string;
  className?: string;
  event: TimelineEvent;
  onBlacklistImage?: (eventId: string) => void;
}

const ImageWithBlacklist = ({ src, alt, className = '', event, onBlacklistImage }: ImageWithBlacklistProps) => {
  // Check if this is a placeholder (not a real searched image)
  const isPlaceholder = !event.imageUrl || event.imageStatus !== 'found';

  const imgRef = useRef<HTMLImageElement>(null);
  const [boxAspect, setBoxAspect] = useState<number | null>(null);
  const [imgAspect, setImgAspect] = useState<number | null>(null);
  const [fitMode, setFitMode] = useState<'cover' | 'contain'>('cover');

  // Measure the rendered box aspect ratio (responds to resize/breakpoints)
  useEffect(() => {
    if (!imgRef.current) return;
    const el = imgRef.current;

    const update = () => {
      const rect = el.getBoundingClientRect();
      if (rect.width > 0 && rect.height > 0) setBoxAspect(rect.width / rect.height);
    };

    update();
    const ro = new ResizeObserver(update);
    ro.observe(el);
    return () => ro.disconnect();
  }, []);

  useEffect(() => {
    if (!boxAspect || !imgAspect) return;
    const mismatch = Math.max(imgAspect / boxAspect, boxAspect / imgAspect);
    setFitMode(mismatch >= 1.75 ? 'contain' : 'cover');
  }, [boxAspect, imgAspect]);
  
  return (
    <div className="relative group/img">
      <img
        ref={imgRef}
        src={src}
        alt={alt}
        onLoad={(e) => {
          const img = e.currentTarget;
          if (img.naturalWidth && img.naturalHeight) {
            setImgAspect(img.naturalWidth / img.naturalHeight);
          }
        }}
        className={`${className} bg-muted ${fitMode === 'contain' ? 'object-contain' : 'object-cover'}`}
      />
      {/* Blacklist button - only for real images */}
      {!isPlaceholder && event.imageUrl && onBlacklistImage && (
        <button
          onClick={async (e) => {
            e.stopPropagation();
            if (event.imageUrl) {
              await addToBlacklist(event.imageUrl, event.title, event.imageSearchQuery);
              onBlacklistImage(event.id);
            }
          }}
          className="absolute top-2 left-2 z-20 w-7 h-7 rounded-full bg-black/60 hover:bg-destructive/90 text-white/70 hover:text-white flex items-center justify-center transition-all duration-200 opacity-0 group-hover/img:opacity-100 backdrop-blur-sm"
          title="Foto blacklisten (globaal) en nieuwe zoeken"
          aria-label="Blacklist afbeelding"
        >
          <Ban className="h-3.5 w-3.5" />
        </button>
      )}
    </div>
  );
};

// =============================================
// EVENT LAYOUT PATTERNS - Dramatic variations
// =============================================

// Pattern: "THE SHOUT" - Giant year, bold statement, minimal
const LayoutShout = ({ event, theme, imageUrl, onBlacklistImage }: LayoutPatternProps) => {
  const ref = useRef(null);
  const isInView = useInView(ref, { once: true, margin: '-100px' });
  
  return (
    <div ref={ref} className="relative min-h-[80vh] flex items-center justify-center py-16 overflow-hidden">
      {/* Giant background year */}
      <motion.div
        initial={{ opacity: 0, scale: 0.8 }}
        animate={isInView ? { opacity: 0.05, scale: 1 } : {}}
        transition={{ duration: 1.2 }}
        className={`absolute inset-0 flex items-center justify-center pointer-events-none select-none`}
      >
        <span 
          className={`${theme.fontDisplay} font-black text-foreground`}
          style={{ fontSize: 'clamp(10rem, 40vw, 35rem)', lineHeight: 0.8 }}
        >
          {event.year}
        </span>
      </motion.div>
      
      {/* Content overlay - must be above floating image (z-20 -> z-30) */}
      <div className="relative z-30 text-center max-w-4xl mx-auto px-6">
        <motion.span
          initial={{ opacity: 0, y: 20 }}
          animate={isInView ? { opacity: 1, y: 0 } : {}}
          transition={{ delay: 0.3 }}
          className={`${theme.fontMono} text-xs sm:text-sm uppercase tracking-[0.3em] text-muted-foreground block mb-6`}
        >
          {event.date}
        </motion.span>
        
        <StaggeredText
          text={event.title}
          className={`${theme.fontDisplay} font-black text-foreground leading-none mb-8`}
          style={{ fontSize: 'clamp(2rem, 8vw, 6rem)' }}
          as="h2"
        />
        
        <motion.p
          initial={{ opacity: 0 }}
          animate={isInView ? { opacity: 1 } : {}}
          transition={{ delay: 0.8 }}
          className={`${theme.fontBody} text-lg sm:text-xl text-muted-foreground max-w-2xl mx-auto font-light mb-8`}
        >
          {event.description}
        </motion.p>
        
        {/* Media buttons centered */}
        <motion.div
          initial={{ opacity: 0, y: 10 }}
          animate={isInView ? { opacity: 1, y: 0 } : {}}
          transition={{ delay: 1 }}
          className="flex justify-center"
        >
          <MediaButtons 
            spotifySearchQuery={event.spotifySearchQuery}
            movieSearchQuery={event.movieSearchQuery}
            eventTitle={event.title}
          />
        </motion.div>
      </div>
      
      {/* Small floating image */}
      <motion.div
        initial={{ opacity: 0, x: 50, rotate: 3 }}
        animate={isInView ? { opacity: 1, x: 0, rotate: 3 } : {}}
        transition={{ delay: 0.5, duration: 0.8 }}
        className="absolute bottom-8 right-8 w-32 sm:w-48 lg:w-64 z-20"
      >
        <ImageWithBlacklist 
          src={imageUrl} 
          alt={event.title}
          className="w-full h-auto rounded-lg shadow-2xl"
          event={event}
          onBlacklistImage={onBlacklistImage}
        />
      </motion.div>
    </div>
  );
};

// Pattern: "THE WHISPER" - Minimal, lots of whitespace, text in corner
const LayoutWhisper = ({ event, theme, imageUrl, onBlacklistImage }: LayoutPatternProps) => {
  const ref = useRef(null);
  const isInView = useInView(ref, { once: true, margin: '-100px' });
  
  return (
    <div ref={ref} className="relative min-h-[60vh] sm:min-h-[50vh] max-h-[80vh] sm:max-h-[70vh] flex items-end py-12 sm:py-16 px-4 sm:px-12 lg:px-24">
      {/* Large image - more visible on mobile with smaller inset */}
      <motion.div
        initial={{ opacity: 0, scale: 1.05 }}
        animate={isInView ? { opacity: 1, scale: 1 } : {}}
        transition={{ duration: 1.2 }}
        className="absolute inset-4 sm:inset-16 lg:inset-24"
      >
        <ImageWithBlacklist 
          src={imageUrl} 
          alt={event.title}
          className="w-full h-full object-cover object-top rounded-xl sm:rounded-2xl max-h-[60vh] sm:max-h-[50vh]"
          event={event}
          onBlacklistImage={onBlacklistImage}
        />
      </motion.div>
      
      {/* Text whispered in corner - smaller on mobile to show more image */}
      <motion.div
        initial={{ opacity: 0, x: -30 }}
        animate={isInView ? { opacity: 1, x: 0 } : {}}
        transition={{ delay: 0.6 }}
        className="relative z-10 max-w-[200px] sm:max-w-xs bg-background/95 backdrop-blur-sm p-4 sm:p-6 rounded-lg shadow-lg space-y-2 sm:space-y-3"
      >
        <span className={`${theme.fontMono} text-[9px] sm:text-[10px] uppercase tracking-[0.2em] text-muted-foreground block`}>
          {event.date}
        </span>
        <h2 className={`${theme.fontDisplay} text-base sm:text-xl font-bold text-foreground leading-tight`}>
          {event.title}
        </h2>
        <p className={`${theme.fontBody} text-xs sm:text-sm text-muted-foreground leading-relaxed font-light line-clamp-3 sm:line-clamp-none`}>
          {event.description}
        </p>
        <MediaButtons 
          spotifySearchQuery={event.spotifySearchQuery}
          movieSearchQuery={event.movieSearchQuery}
          eventTitle={event.title}
        />
      </motion.div>
    </div>
  );
};

// Pattern: "THE MAGAZINE" - Drop cap, editorial columns, rotated date
const LayoutMagazine = ({ event, theme, imageUrl, onBlacklistImage }: LayoutPatternProps) => {
  const ref = useRef(null);
  const isInView = useInView(ref, { once: true, margin: '-100px' });
  
  return (
    <div ref={ref} className="relative py-16 sm:py-24 lg:py-32 px-6 sm:px-12 lg:px-24">
      <div className="flex flex-col sm:flex-row gap-8 sm:gap-12 lg:gap-20 items-start">
        {/* Left column: Image with rotated date - constrained height */}
        <div className="relative w-full sm:w-2/5 flex-shrink-0">
          {/* Rotated date along left edge */}
          <motion.div
            initial={{ opacity: 0 }}
            animate={isInView ? { opacity: 1 } : {}}
            transition={{ delay: 0.4 }}
            className="hidden sm:flex absolute -left-2 sm:-left-4 top-0 bottom-0 items-center"
            style={{ writingMode: 'vertical-rl', textOrientation: 'mixed' }}
          >
            <span className={`${theme.fontMono} text-xs uppercase tracking-[0.3em] text-muted-foreground/60 rotate-180`}>
              {event.date}
            </span>
          </motion.div>
          
          <motion.div
            initial={{ opacity: 0, y: 30 }}
            animate={isInView ? { opacity: 1, y: 0 } : {}}
            transition={{ duration: 0.8 }}
            className="space-y-4"
          >
            <ImageWithBlacklist 
              src={imageUrl} 
              alt={event.title}
              className="w-full h-auto max-h-[50vh] object-cover object-top rounded-sm shadow-xl"
              event={event}
              onBlacklistImage={onBlacklistImage}
            />
            {/* Media buttons below image */}
            <MediaButtons 
              spotifySearchQuery={event.spotifySearchQuery}
              movieSearchQuery={event.movieSearchQuery}
              eventTitle={event.title}
            />
          </motion.div>
        </div>
        
        {/* Right column: Editorial text */}
        <div className="flex-1 space-y-6">
          {/* Mobile date */}
          <span className={`sm:hidden ${theme.fontMono} text-xs uppercase tracking-[0.3em] text-muted-foreground block`}>
            {event.date}
          </span>
          
          <motion.h2
            initial={{ opacity: 0, x: -20 }}
            animate={isInView ? { opacity: 1, x: 0 } : {}}
            transition={{ delay: 0.3 }}
            className={`${theme.fontDisplay} font-bold text-foreground leading-tight`}
            style={{ fontSize: 'clamp(1.5rem, 4vw, 3.5rem)' }}
          >
            {event.title}
          </motion.h2>
          
          <motion.div
            initial={{ opacity: 0 }}
            animate={isInView ? { opacity: 1 } : {}}
            transition={{ delay: 0.5 }}
          >
            <DropCap theme={theme}>{event.description}</DropCap>
          </motion.div>
        </div>
      </div>
    </div>
  );
};

// Pattern: "THE OVERLAP" - Text bleeding over image (but NOT on mobile)
const LayoutOverlap = ({ event, theme, imageUrl, onBlacklistImage }: LayoutPatternProps) => {
  const ref = useRef(null);
  const isInView = useInView(ref, { once: true, margin: '-100px' });
  
  return (
    <div ref={ref} className="relative py-12 sm:py-32 lg:py-40 px-4 sm:px-12 my-4 sm:my-12 lg:my-16">
      <div className="relative max-w-6xl mx-auto">
        {/* Mobile: Stack layout (image then text) */}
        <div className="sm:hidden space-y-4">
          <ImageWithBlacklist 
            src={imageUrl} 
            alt={event.title}
            className="w-full h-48 object-cover object-top rounded-lg"
            event={event}
            onBlacklistImage={onBlacklistImage}
          />
          <div className="space-y-3">
            <span className={`${theme.fontMono} text-xs uppercase tracking-[0.2em] text-muted-foreground block`}>
              {event.date}
            </span>
            <h2 className={`${theme.fontDisplay} text-2xl font-black text-foreground leading-tight`}>
              {event.title}
            </h2>
            <p className={`${theme.fontBody} text-sm text-muted-foreground leading-relaxed`}>
              {event.description}
            </p>
            <MediaButtons 
              spotifySearchQuery={event.spotifySearchQuery}
              movieSearchQuery={event.movieSearchQuery}
              eventTitle={event.title}
            />
          </div>
        </div>

        {/* Desktop: Overlap layout */}
        <div className="hidden sm:block">
          {/* Image - constrained to max 50vh */}
          <motion.div
            initial={{ opacity: 0, scale: 1.02 }}
            animate={isInView ? { opacity: 1, scale: 1 } : {}}
            transition={{ duration: 1 }}
            className="w-3/4 lg:w-2/3 ml-auto"
          >
            <ImageWithBlacklist 
              src={imageUrl} 
              alt={event.title}
              className="w-full h-auto max-h-[50vh] object-cover object-top rounded-lg"
              event={event}
              onBlacklistImage={onBlacklistImage}
            />
          </motion.div>
          
          {/* Text overlapping from left - must be above image */}
          <motion.div
            initial={{ opacity: 0, x: -40 }}
            animate={isInView ? { opacity: 1, x: 0 } : {}}
            transition={{ delay: 0.4, duration: 0.8 }}
            className="absolute left-0 top-1/2 -translate-y-1/2 w-2/3 lg:w-1/2 z-20"
          >
            <div className="bg-background/95 backdrop-blur-md p-10 lg:p-12 rounded-r-2xl shadow-2xl space-y-4">
              <span className={`${theme.fontMono} text-xs uppercase tracking-[0.3em] text-muted-foreground block`}>
                {event.date}
              </span>
              
              <StaggeredText
                text={event.title}
                className={`${theme.fontDisplay} font-black text-foreground leading-none`}
                style={{ fontSize: 'clamp(1.5rem, 5vw, 3rem)' }}
                as="h2"
                highlightWords={[0, 1]}
              />
              
              <p className={`${theme.fontBody} text-base lg:text-lg text-muted-foreground leading-relaxed`}>
                {event.description}
              </p>
              
              <MediaButtons 
                spotifySearchQuery={event.spotifySearchQuery}
                movieSearchQuery={event.movieSearchQuery}
                eventTitle={event.title}
              />
            </div>
          </motion.div>
        </div>
      </div>
    </div>
  );
};

// Pattern: "THE SPLIT" - Dramatic half-and-half with huge type
const LayoutSplit = ({ event, theme, imageUrl, onBlacklistImage }: LayoutPatternProps) => {
  const ref = useRef(null);
  const isInView = useInView(ref, { once: true, margin: '-100px' });
  
  return (
    <div ref={ref} className="relative min-h-[50vh] max-h-[60vh] flex flex-col sm:flex-row overflow-hidden">
      {/* Left half: Image - constrained height */}
      <motion.div
        initial={{ opacity: 0, x: -20 }}
        animate={isInView ? { opacity: 1, x: 0 } : {}}
        transition={{ duration: 0.8 }}
        className="w-full sm:w-1/2 h-64 sm:h-auto max-h-[50vh] relative overflow-hidden group/img"
      >
        <ParallaxImage 
          src={imageUrl} 
          alt={event.title}
          className="absolute inset-0"
          speed={0.3}
        />
        
        {/* Blacklist button - only for real images */}
        {event.imageUrl && event.imageStatus === 'found' && onBlacklistImage && (
          <button
            onClick={async (e) => {
              e.stopPropagation();
              if (event.imageUrl) {
                await addToBlacklist(event.imageUrl, event.title, event.imageSearchQuery);
                onBlacklistImage(event.id);
              }
            }}
            className="absolute top-2 left-2 z-20 w-7 h-7 rounded-full bg-black/60 hover:bg-destructive/90 text-white/70 hover:text-white flex items-center justify-center transition-all duration-200 opacity-0 group-hover/img:opacity-100 backdrop-blur-sm"
            title="Foto blacklisten (globaal) en nieuwe zoeken"
            aria-label="Blacklist afbeelding"
          >
            <Ban className="h-3.5 w-3.5" />
          </button>
        )}
        
        {/* Year bleeding across */}
        <div className="absolute bottom-4 right-0 translate-x-1/2 z-10 mix-blend-overlay">
          <span 
            className={`${theme.fontDisplay} font-black text-background/30`}
            style={{ fontSize: 'clamp(4rem, 15vw, 10rem)', lineHeight: 0.8 }}
          >
            {event.year.toString().slice(-2)}
          </span>
        </div>
      </motion.div>
      
      {/* Right half: Content */}
      <motion.div
        initial={{ opacity: 0, x: 20 }}
        animate={isInView ? { opacity: 1, x: 0 } : {}}
        transition={{ delay: 0.3, duration: 0.8 }}
        className="w-full sm:w-1/2 flex items-center px-6 sm:px-10 lg:px-16 py-8 sm:py-0"
      >
        <div className="space-y-4 sm:space-y-6">
          <span className={`${theme.fontMono} text-xs uppercase tracking-[0.2em] text-muted-foreground`}>
            {event.date}
          </span>
          
          <h2 
            className={`${theme.fontDisplay} font-bold text-foreground leading-tight`}
            style={{ fontSize: 'clamp(1.25rem, 3vw, 2.5rem)' }}
          >
            {event.title}
          </h2>
          
          <p className={`${theme.fontBody} text-sm sm:text-base text-muted-foreground leading-relaxed font-light`}>
            {event.description}
          </p>
          
          <MediaButtons 
            spotifySearchQuery={event.spotifySearchQuery}
            movieSearchQuery={event.movieSearchQuery}
            eventTitle={event.title}
          />
        </div>
      </motion.div>
    </div>
  );
};

// Layout selector based on index - cycles through dramatic patterns
const getLayoutPattern = (index: number) => {
  const patterns = [LayoutShout, LayoutMagazine, LayoutOverlap, LayoutWhisper, LayoutSplit];
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
  targetYear?: number;
  onTimeTravelComplete: () => void;
  timeTravelComplete: boolean;
}

const HeroSection = ({ storyTitle, storyIntroduction, theme, isLoading, targetYear, onTimeTravelComplete, timeTravelComplete }: HeroSectionProps) => {
  const { scrollY } = useScroll();
  const opacity = useTransform(scrollY, [0, 400], [1, 0]);
  const y = useTransform(scrollY, [0, 400], [0, 100]);
  const scale = useTransform(scrollY, [0, 400], [1, 0.95]);

  // Show hero content as soon as storyTitle arrives
  const hasStoryContent = !!storyTitle;
  // Show time travel counter until story content is ready (not just until animation completes)
  const showTimeTravelCounter = !hasStoryContent && targetYear;

  return (
    <motion.section 
      className="min-h-screen flex flex-col items-center justify-center relative px-6 pb-24 overflow-hidden"
      style={{ opacity }}
    >
      {/* Time Travel Counter - fullscreen overlay until story content is ready */}
      {showTimeTravelCounter && (
        <TimeTravelCounter
          targetYear={targetYear}
          onComplete={onTimeTravelComplete}
        />
      )}

      {/* Background decorative year */}
      {storyTitle && timeTravelComplete && (
        <motion.div
          initial={{ opacity: 0 }}
          animate={{ opacity: 0.03 }}
          transition={{ delay: 1, duration: 1.5 }}
          className="absolute inset-0 flex items-center justify-center pointer-events-none select-none"
        >
          <span 
            className={`${theme.fontDisplay} font-black text-foreground`}
            style={{ fontSize: 'clamp(15rem, 50vw, 45rem)', lineHeight: 0.7 }}
          >
            ∞
          </span>
        </motion.div>
      )}
      
      <motion.div 
        className="text-center max-w-5xl mx-auto space-y-10 relative z-10"
        style={{ y, scale }}
      >
        {/* Show story content when available (counter handles the loading state) */}
        {hasStoryContent && (
          <>
            {storyTitle && (
              <StaggeredText
                text={storyTitle}
                className={`${theme.fontDisplay} font-black text-foreground leading-[0.9] tracking-tight`}
                style={{ fontSize: 'clamp(2rem, 7vw, 4.5rem)' }}
                as="h1"
                highlightWords={[0, 2, 4]} // Alternate weight pattern
              />
            )}
            
            {storyIntroduction && (
              <motion.div
                initial={{ opacity: 0, y: 40 }}
                animate={{ opacity: 1, y: 0 }}
                transition={{ duration: 1, delay: 0.8 }}
                className="max-w-3xl mx-auto"
              >
                <p className={`${theme.fontBody} text-lg lg:text-xl text-muted-foreground leading-relaxed font-light`}>
                  <span className={`${theme.fontDisplay} text-4xl lg:text-5xl font-black float-left mr-3 mt-1 leading-none text-foreground`}>
                    {storyIntroduction.charAt(0)}
                  </span>
                  {storyIntroduction.slice(1)}
                </p>
              </motion.div>
            )}

            {/* Events loading indicator - ONLY show if scroll indicator is NOT showing loading */}
            {/* Removed: showStoryLoading indicator here - it's now only shown in scroll indicator below */}
          </>
        )}
      </motion.div>

      {/* Scroll indicator - show loading state while fetching, then scroll prompt when done */}
      {hasStoryContent && (
        <motion.div 
          className="absolute bottom-12 left-1/2 -translate-x-1/2 flex flex-col items-center gap-2"
          initial={{ opacity: 0 }}
          animate={{ opacity: 1 }}
          transition={{ delay: 1.5 }}
        >
          {isLoading ? (
            <>
              <div className="flex items-center gap-2">
                <Loader2 className="h-4 w-4 animate-spin text-muted-foreground" />
                <span className={`${theme.fontMono} text-xs uppercase tracking-widest text-muted-foreground`}>
                  Gebeurtenissen ophalen...
                </span>
              </div>
              <motion.div
                animate={{ y: [0, 4, 0] }}
                transition={{ duration: 1, repeat: Infinity }}
              >
                <ChevronDown className="h-5 w-5 text-muted-foreground/50" />
              </motion.div>
            </>
          ) : (
            <>
              <span className={`${theme.fontMono} text-xs uppercase tracking-widest text-muted-foreground`}>
                Scroll to begin
              </span>
              <motion.div
                animate={{ y: [0, 8, 0] }}
                transition={{ duration: 1.5, repeat: Infinity }}
              >
                <ChevronDown className="h-6 w-6 text-muted-foreground" />
              </motion.div>
            </>
          )}
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
  const [timeTravelComplete, setTimeTravelComplete] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [currentYear, setCurrentYear] = useState<number | null>(null);
  const [currentMaxEvents, setCurrentMaxEvents] = useState<number | undefined>(undefined);
  const [isVideoDialogOpen, setIsVideoDialogOpen] = useState(false);
  const [isPersonalizeDialogOpen, setIsPersonalizeDialogOpen] = useState(false);
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

  const { 
    addToQueue: addImagesToQueue, 
    reset: resetImageSearch,
    forceResearch,
    isSearching: isLoadingImages,
  } = useClientImageSearch({
    maxConcurrent: 3,
    onImageFound: handleImageFound,
  });
  
  // Handler for blacklisting an image and triggering re-search
  const handleBlacklistImage = useCallback((eventId: string) => {
    const event = events.find(e => e.id === eventId);
    if (event) {
      // Reset the event's image status to loading
      setEvents(prev => prev.map(e => 
        e.id === eventId 
          ? { ...e, imageUrl: undefined, imageStatus: 'loading' as const }
          : e
      ));
      // Force a new search for this event
      forceResearch({ ...event, imageUrl: undefined, imageStatus: 'loading' });
    }
  }, [events, forceResearch]);

  const loadImagesForEvents = useCallback((newEvents: TimelineEvent[]) => {
    const eventsNeedingImages = newEvents.filter(
      e => e.imageSearchQuery && e.imageStatus !== 'found' && e.imageStatus !== 'none'
    );
    if (eventsNeedingImages.length === 0) return;
    addImagesToQueue(eventsNeedingImages);
  }, [addImagesToQueue]);

  // Force refresh all images (for debug purposes - to get search traces)
  const handleRefreshAllImages = useCallback(() => {
    const resetEvents = events.map(e => {
      if (!e.imageSearchQuery) return e;
      return {
        ...e,
        imageUrl: undefined,
        source: undefined,
        imageStatus: 'loading' as const,
        searchTrace: undefined,
      };
    });
    
    setEvents(resetEvents);
    receivedEventsRef.current = resetEvents;
    resetImageSearch();
    
    const eventsToSearch = resetEvents.filter(e => e.imageSearchQuery);
    if (eventsToSearch.length > 0) {
      addImagesToQueue(eventsToSearch);
    }
  }, [events, resetImageSearch, addImagesToQueue]);

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

        // Set story fields if available (cached by other pages)
        setStoryTitle(cached.storyTitle || '');
        setStoryIntroduction(cached.storyIntroduction || '');
        
        setIsLoading(false);

        const needImages = normalizedCachedEvents.filter(e => 
          e.imageSearchQuery && (!e.imageUrl || e.imageStatus === 'loading')
        );
        if (needImages.length > 0) {
          addImagesToQueue(needImages);
        }
        return;
      }

      const maxEvents = storedLength === 'short' ? 20 : 20; // Always default to 20 events
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

            cacheTimeline(data, language, sorted, completeData.summary, completeData.famousBirthdays || [], {
              storyTitle: completeData.storyTitle,
              storyIntroduction: completeData.storyIntroduction,
            });
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

  const handleClearCache = (forceMaxEvents?: number) => {
    if (formData) {
      const key = getCacheKey(formData, language);
      sessionStorage.removeItem(key);
      // Use forced count or fall back to stored preference
      const maxEvents = forceMaxEvents !== undefined
        ? forceMaxEvents
        : (sessionStorage.getItem('timelineLength') === 'short' ? 20 : undefined);
      setCurrentMaxEvents(maxEvents);
      resetImageSearch();
      receivedEventsRef.current = [];
      setEvents([]);
      setStoryTitle('');
      setStoryIntroduction('');
      setIsLoading(true);
      
      // Also regenerate the soundtrack when refreshing
      clearSoundtrackState();
      startQuickSoundtrackGeneration(formData).catch(err => {
        console.error('[TimelineStoryPage] Background soundtrack regeneration failed:', err);
      });
      
      loadTimelineStreaming(formData, maxEvents);
    }
  };

  const getTitle = () => {
    if (!formData) return t('yourTimeJourney') as string;
    
    if (formData.type === 'birthdate' && formData.birthDate) {
      const { day, month, year } = formData.birthDate;
      return `${day} - ${month} - ${year}`;
    } else if (formData.yearRange) {
      return `${formData.yearRange.startYear} - ${formData.yearRange.endYear}`;
    }
    return t('yourTimeJourney') as string;
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
      {/* Header - compact single row */}
      <section className="py-2 px-3 sm:px-4 relative z-50 bg-background/80 backdrop-blur-sm sticky top-0">
        <div className="container mx-auto max-w-6xl">
          <div className="flex items-center justify-between gap-2 fade-in">
            {/* Back button */}
            <button
              onClick={() => navigate('/')}
              className="flex items-center gap-1.5 text-xs sm:text-sm text-muted-foreground hover:text-foreground transition-colors flex-shrink-0"
            >
              <ArrowLeft className="h-3.5 w-3.5" />
              <span className="hidden sm:inline">{t('backToInput') as string}</span>
            </button>
            
            {/* Title + Small utility icons */}
            <div className="flex items-center gap-1.5">
              <h1 className="font-serif text-sm sm:text-xl lg:text-2xl font-bold text-foreground truncate">
                {getTitle()}
              </h1>
              
              {/* Debug dialogs - small icons after title */}
              {events.length > 0 && !isLoading && (
                <>
                  <PromptViewerDialog formData={formData} language={language} maxEvents={currentMaxEvents} />
                  <DebugInfoDialog 
                    events={events} 
                    onRefreshImages={handleRefreshAllImages}
                    isRefreshing={isLoadingImages}
                    onBlacklistImage={handleBlacklistImage}
                  />
                  <button
                    onClick={() => handleClearCache(20)}
                    className="p-1.5 text-muted-foreground hover:text-foreground transition-colors rounded-md hover:bg-muted/50"
                    title="Snel vernieuwen (20 events)"
                  >
                    <RefreshCw className="h-3.5 w-3.5" />
                    <span className="sr-only">20</span>
                  </button>
                  <button
                    onClick={() => handleClearCache()}
                    className="p-1.5 text-muted-foreground hover:text-foreground transition-colors rounded-md hover:bg-muted/50 relative"
                    title="Volledig vernieuwen (50 events)"
                  >
                    <RefreshCw className="h-3.5 w-3.5" />
                    <span className="absolute -top-1 -right-1 text-[8px] font-bold bg-muted text-muted-foreground rounded-full w-3.5 h-3.5 flex items-center justify-center leading-none">50</span>
                  </button>
                </>
              )}
            </div>
          </div>
        </div>
      </section>

      {/* Hero section - ALTIJD tonen, met loading state als nog geen content */}
      <HeroSection 
        storyTitle={storyTitle}
        storyIntroduction={storyIntroduction}
        theme={theme}
        isLoading={isLoading}
        targetYear={
          formData?.type === 'birthdate' && formData.birthDate
            ? formData.birthDate.year
            : formData?.yearRange?.startYear
        }
        onTimeTravelComplete={() => setTimeTravelComplete(true)}
        timeTravelComplete={timeTravelComplete}
      />

      {/* Image loading indicator - minimal */}
      {isLoadingImages && !isLoading && (
        <div className="container mx-auto max-w-6xl px-4 py-2 sticky top-12 z-40 bg-background/80 backdrop-blur-sm">
          <div className="flex items-center gap-2 text-xs text-muted-foreground">
            <Loader2 className="h-3 w-3 animate-spin" />
            <span>{t('loadingImages') as string}</span>
          </div>
        </div>
      )}

      {/* Sticky year indicator */}
      {currentYear && !isLoading && (
        <StickyYear year={currentYear} theme={theme} />
      )}

      {/* Timeline events */}
      <div className="container mx-auto px-4 sm:px-6 lg:px-12">
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
              <LayoutPattern event={event} theme={theme} imageUrl={imageUrl} onBlacklistImage={handleBlacklistImage} />
            </div>
          );
        })}
      </div>

      {/* Loading indicator for streaming events */}
      {isLoading && events.length > 0 && (
        <div className="container mx-auto max-w-6xl px-4 py-8">
          <div className="flex items-center justify-center gap-2 text-sm text-muted-foreground">
            <Loader2 className="h-4 w-4 animate-spin" />
            <span>{events.length} {t('eventsLoaded') as string}</span>
          </div>
        </div>
      )}

      {/* Soundtrack Section - inline at bottom of page, before footer */}
      {!isLoading && events.length > 0 && (
        <SoundtrackSection
          events={events}
          summary={storyIntroduction}
          formData={formData}
          storyTitle={storyTitle}
          storyIntroduction={storyIntroduction}
          onOpenPersonalizeDialog={() => setIsPersonalizeDialogOpen(true)}
        />
      )}

      {/* Footer */}
      {!isLoading && events.length > 0 && (
        <footer className="py-16 text-center space-y-8">
          <Reveal>
            <p className={`${theme.fontMono} text-sm uppercase tracking-widest text-muted-foreground`}>
              Einde van je tijdreis
            </p>
          </Reveal>
          
          {/* Video button - at the very bottom */}
          <Reveal delay={0.2}>
            <Button
              variant="outline"
              size="lg"
              onClick={() => setIsVideoDialogOpen(true)}
              className="gap-2"
            >
              <Video className="h-5 w-5" />
              Bekijk als Video
            </Button>
          </Reveal>
        </footer>
      )}

      {/* Video Dialog */}
      <VideoDialog
        open={isVideoDialogOpen}
        onOpenChange={setIsVideoDialogOpen}
        events={events}
        storyTitle={storyTitle}
        storyIntroduction={storyIntroduction}
      />

      {/* Personalize Soundtrack Dialog */}
      {formData && (
        <PersonalizeSoundtrackDialog
          open={isPersonalizeDialogOpen}
          onOpenChange={setIsPersonalizeDialogOpen}
          events={events}
          summary={storyIntroduction}
          formData={formData}
          startYear={formData.type === 'birthdate' && formData.birthDate 
            ? formData.birthDate.year 
            : formData.yearRange?.startYear || 1980}
          endYear={formData.type === 'birthdate' && formData.birthDate 
            ? formData.birthDate.year + 25 
            : formData.yearRange?.endYear || 2000}
        />
      )}
    </div>
  );
};

export default TimelineStoryPage;
