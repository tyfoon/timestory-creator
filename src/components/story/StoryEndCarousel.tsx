/**
 * StoryEndCarousel - Swipeable carousel at the bottom of /story with 5 experience cards
 */
import { useState, useRef, useEffect, useCallback } from 'react';
import { motion, useInView } from 'framer-motion';
import { 
  Music, Video, Mic, Image, FileText, 
  Share2, Sparkles, ChevronLeft, ChevronRight, 
  Crown, Gift, Lock, Download
} from 'lucide-react';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import { useLanguage } from '@/contexts/LanguageContext';
import { TimelineEvent } from '@/types/timeline';
import { FormData } from '@/types/form';

interface StoryEndCarouselProps {
  events: TimelineEvent[];
  formData: FormData | null;
  storyTitle?: string;
  storyIntroduction?: string;
  onOpenMusicVideo: () => void;       // Opens the SoundtrackSection / existing music video
  onOpenPersonalize: () => void;      // Opens personalization dialog + regenerates with 40 events
  onOpenSpokenVideo: () => void;      // Opens VideoDialog (spoken narration)
  onOpenPolaroids: () => void;        // Navigate to polaroid page
  onDownloadPDF: () => void;          // Trigger PDF download
  hasSoundtrack?: boolean;            // Whether soundtrack is already generated
}

interface CarouselCard {
  id: string;
  title: string;
  subtitle: string;
  description: string;
  icon: React.ReactNode;
  isPremium: boolean;
  isFree: boolean;
  action: () => void;
  actionLabel: string;
  shareLabel?: string;
  gradient: string;
  accentColor: string;
}

export const StoryEndCarousel = ({
  events,
  formData,
  storyTitle,
  storyIntroduction,
  onOpenMusicVideo,
  onOpenPersonalize,
  onOpenSpokenVideo,
  onOpenPolaroids,
  onDownloadPDF,
  hasSoundtrack = false,
}: StoryEndCarouselProps) => {
  const { t } = useLanguage();
  const scrollRef = useRef<HTMLDivElement>(null);
  const sectionRef = useRef<HTMLDivElement>(null);
  const isInView = useInView(sectionRef, { once: true, margin: '-80px' });
  const [activeIndex, setActiveIndex] = useState(0);
  const [canScrollLeft, setCanScrollLeft] = useState(false);
  const [canScrollRight, setCanScrollRight] = useState(true);

  const cards: CarouselCard[] = [
    {
      id: 'music-video',
      title: 'Mijn Muziekvideo',
      subtitle: `${events.length} gebeurtenissen • AI-muziek`,
      description: 'Jouw levensverhaal als muziekvideo met AI-gegenereerde muziek en beelden.',
      icon: <Music className="h-6 w-6" />,
      isPremium: false,
      isFree: true,
      action: onOpenMusicVideo,
      actionLabel: 'Bekijk video',
      shareLabel: 'Delen',
      gradient: 'from-violet-500/20 via-fuchsia-500/10 to-transparent',
      accentColor: 'text-violet-400',
    },
    {
      id: 'personalized',
      title: 'Volledig Gepersonaliseerd',
      subtitle: '40 gebeurtenissen • Jouw details',
      description: 'Maak je verhaal uniek met persoonlijke details, 40 gebeurtenissen en een langere muziekvideo.',
      icon: <Sparkles className="h-6 w-6" />,
      isPremium: true,
      isFree: false,
      action: onOpenPersonalize,
      actionLabel: 'Personaliseer',
      shareLabel: 'Delen',
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
      isFree: false,
      action: onOpenSpokenVideo,
      actionLabel: 'Bekijk video',
      shareLabel: 'Delen',
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
      isFree: true,
      action: onOpenPolaroids,
      actionLabel: 'Bekijk polaroids',
      shareLabel: 'Delen',
      gradient: 'from-sky-500/20 via-blue-500/10 to-transparent',
      accentColor: 'text-sky-400',
    },
    {
      id: 'presentation',
      title: 'Mijn Leven als Presentatie',
      subtitle: 'PDF • A4 Album',
      description: 'Download een prachtig A4 album van je levensverhaal als PDF, klaar om te printen of te delen.',
      icon: <FileText className="h-6 w-6" />,
      isPremium: true,
      isFree: false,
      action: onDownloadPDF,
      actionLabel: 'Download PDF',
      gradient: 'from-rose-500/20 via-pink-500/10 to-transparent',
      accentColor: 'text-rose-400',
    },
  ];

  const updateScrollState = useCallback(() => {
    if (!scrollRef.current) return;
    const { scrollLeft, scrollWidth, clientWidth } = scrollRef.current;
    setCanScrollLeft(scrollLeft > 10);
    setCanScrollRight(scrollLeft < scrollWidth - clientWidth - 10);

    // Detect active card
    const cardWidth = scrollRef.current.children[0]?.getBoundingClientRect().width || 300;
    const gap = 16;
    const index = Math.round(scrollLeft / (cardWidth + gap));
    setActiveIndex(Math.min(index, cards.length - 1));
  }, [cards.length]);

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
    const amount = direction === 'left' ? -cardWidth - 16 : cardWidth + 16;
    scrollRef.current.scrollBy({ left: amount, behavior: 'smooth' });
  };

  return (
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
        {/* Swipe hint arrow */}
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
          className="flex gap-4 overflow-x-auto px-8 sm:px-12 snap-x snap-mandatory pb-4"
          style={{ scrollbarWidth: 'none', msOverflowStyle: 'none', WebkitOverflowScrolling: 'touch' }}
        >
          {cards.map((card, index) => (
            <motion.div
              key={card.id}
              initial={{ opacity: 0, y: 30, scale: 0.95 }}
              animate={isInView ? { opacity: 1, y: 0, scale: 1 } : {}}
              transition={{ duration: 0.5, delay: index * 0.1 }}
              className="flex-shrink-0 w-[280px] sm:w-[320px] snap-center"
            >
              <div className={`relative h-full rounded-2xl border border-border bg-card overflow-hidden group hover:border-primary/30 transition-all duration-300 hover:shadow-xl hover:shadow-primary/5`}>
                {/* Gradient bg */}
                <div className={`absolute inset-0 bg-gradient-to-br ${card.gradient} opacity-60 group-hover:opacity-100 transition-opacity`} />
                
                {/* Premium / Free badge */}
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

                {/* Content */}
                <div className="relative z-10 p-5 sm:p-6 flex flex-col h-full min-h-[320px]">
                  {/* Icon */}
                  <div className={`w-12 h-12 rounded-xl bg-background/80 backdrop-blur-sm flex items-center justify-center mb-4 ${card.accentColor} border border-border/50`}>
                    {card.icon}
                  </div>

                  {/* Text */}
                  <h3 className="font-serif text-lg font-bold text-foreground mb-1 leading-tight">
                    {card.title}
                  </h3>
                  <p className="text-xs text-muted-foreground font-mono mb-3">
                    {card.subtitle}
                  </p>
                  <p className="text-sm text-muted-foreground leading-relaxed flex-1">
                    {card.description}
                  </p>

                  {/* Actions */}
                  <div className="flex gap-2 mt-5">
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
        {cards.map((_, index) => (
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
              scrollRef.current.scrollTo({ left: index * (cardWidth + 16), behavior: 'smooth' });
            }}
          />
        ))}
      </div>
    </motion.section>
  );
};
