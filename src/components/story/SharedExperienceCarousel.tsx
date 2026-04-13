/**
 * SharedExperienceCarousel - Reusable carousel of experience cards
 * Used on /muziek, /tv-film, and as the generic cards section of StoryEndCarousel.
 * Renders the exact same card style as StoryEndCarousel's generic cards.
 */
import { useRef, useState, useCallback, useEffect } from 'react';
import { motion, useInView } from 'framer-motion';
import { useNavigate } from 'react-router-dom';
import {
  Music, Mic, Image, FileText, Sparkles, ChevronLeft, ChevronRight,
  Crown, Gift, Lock, Download, Flame, ListMusic, Tv,
} from 'lucide-react';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import { useLanguage } from '@/contexts/LanguageContext';
import polaroidPreview from '@/assets/polaroid-preview.png';

export type ExperiencePage = 'music-video' | 'music-overview' | 'tv-film-overview' | 'personalized' | 'roast' | 'spoken-story' | 'polaroids' | 'presentation';

interface CardDef {
  id: ExperiencePage;
  title: string;
  subtitle: string;
  description: string;
  icon: React.ReactNode;
  isPremium: boolean;
  actionLabel: string;
  gradient: string;
  accentColor: string;
  previewImage?: string;
}

interface SharedExperienceCarouselProps {
  /** IDs of cards to exclude (e.g. the current page) */
  excludeCards?: ExperiencePage[];
  /** Search params to preserve in navigation links */
  searchParams?: URLSearchParams;
  /** Override actions for specific cards (used by StoryEndCarousel) */
  cardActions?: Partial<Record<ExperiencePage, () => void>>;
}

export const SharedExperienceCarousel = ({
  excludeCards = [],
  searchParams,
  cardActions,
}: SharedExperienceCarouselProps) => {
  const navigate = useNavigate();
  const { t } = useLanguage();
  const scrollRef = useRef<HTMLDivElement>(null);
  const sectionRef = useRef<HTMLDivElement>(null);
  const isInView = useInView(sectionRef, { once: true, margin: '-80px' });
  const [canScrollLeft, setCanScrollLeft] = useState(false);
  const [canScrollRight, setCanScrollRight] = useState(true);
  const [activeIndex, setActiveIndex] = useState(0);

  const params = searchParams?.toString() ? `?${searchParams.toString()}` : '';

  const allCards: CardDef[] = [
    {
      id: 'music-overview',
      title: t('myLifeInMusic') as string,
      subtitle: t('allNumberOneHits') as string,
      description: t('discoverIconicHits') as string,
      icon: <ListMusic className="h-6 w-6" />,
      isPremium: false,
      actionLabel: t('discoverHits') as string,
      gradient: 'from-[#1DB954]/20 via-emerald-500/10 to-transparent',
      accentColor: 'text-[#1DB954]',
    },
    {
      id: 'tv-film-overview',
      title: t('myLifeInTvFilm') as string,
      subtitle: t('seriesAndFilms') as string,
      description: t('reliveIconicTv') as string,
      icon: <Tv className="h-6 w-6" />,
      isPremium: false,
      actionLabel: t('discoverTitles') as string,
      gradient: 'from-red-500/20 via-rose-500/10 to-transparent',
      accentColor: 'text-red-400',
    },
    {
      id: 'personalized',
      title: t('fullyPersonalized') as string,
      subtitle: t('fortyEvents') as string,
      description: t('makeStoryUnique') as string,
      icon: <Sparkles className="h-6 w-6" />,
      isPremium: true,
      actionLabel: t('personalize') as string,
      gradient: 'from-amber-500/20 via-orange-500/10 to-transparent',
      accentColor: 'text-amber-400',
    },
    {
      id: 'roast',
      title: t('roastMyLife') as string,
      subtitle: t('aiHumorShareable') as string,
      description: t('letAiRoast') as string,
      icon: <Flame className="h-6 w-6" />,
      isPremium: false,
      actionLabel: t('roastMe') as string,
      gradient: 'from-orange-500/20 via-red-500/10 to-transparent',
      accentColor: 'text-orange-400',
    },
    {
      id: 'spoken-story',
      title: t('spokenStory') as string,
      subtitle: t('aiVoiceNarration') as string,
      description: t('listenToStory') as string,
      icon: <Mic className="h-6 w-6" />,
      isPremium: true,
      actionLabel: t('watchVideo') as string,
      gradient: 'from-emerald-500/20 via-teal-500/10 to-transparent',
      accentColor: 'text-emerald-400',
    },
    {
      id: 'polaroids',
      title: t('myLifeInPolaroids') as string,
      subtitle: t('retroStyle') as string,
      description: t('relivePolaroids') as string,
      icon: <Image className="h-6 w-6" />,
      isPremium: false,
      actionLabel: t('viewPolaroids') as string,
      gradient: 'from-sky-500/20 via-blue-500/10 to-transparent',
      accentColor: 'text-sky-400',
      previewImage: polaroidPreview,
    },
    {
      id: 'presentation',
      title: t('myLifeAsPresentation') as string,
      subtitle: t('pdfAlbum') as string,
      description: t('downloadAlbumDesc') as string,
      icon: <FileText className="h-6 w-6" />,
      isPremium: true,
      actionLabel: t('downloadPdf') as string,
      gradient: 'from-rose-500/20 via-pink-500/10 to-transparent',
      accentColor: 'text-rose-400',
    },
  ];

  const cards = allCards.filter(c => !excludeCards.includes(c.id));

  const defaultActions: Record<ExperiencePage, () => void> = {
    'music-video': () => navigate(`/story${params}`),
    'music-overview': () => navigate(`/muziek${params}`),
    'tv-film-overview': () => navigate(`/tv-film${params}`),
    'personalized': () => navigate(`/story${params}`),
    'roast': () => navigate(`/story${params}`),
    'spoken-story': () => navigate(`/story${params}`),
    'polaroids': () => navigate(`/polaroid${params}`),
    'presentation': () => navigate(`/story${params}`),
  };

  const getAction = (id: ExperiencePage) => cardActions?.[id] || defaultActions[id];

  const updateScrollState = useCallback(() => {
    if (!scrollRef.current) return;
    const { scrollLeft, scrollWidth, clientWidth } = scrollRef.current;
    setCanScrollLeft(scrollLeft > 10);
    setCanScrollRight(scrollLeft < scrollWidth - clientWidth - 10);
    const cardWidth = scrollRef.current.children[0]?.getBoundingClientRect().width || 300;
    const gap = 20;
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
    const amount = direction === 'left' ? -cardWidth - 20 : cardWidth + 20;
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
          {t('discoverMore') as string || 'Ontdek meer'}
        </p>
        <h2 className="font-serif text-2xl sm:text-3xl font-bold text-foreground mb-2">
          {t('takeYourStory')}
        </h2>
        <p className="text-sm text-muted-foreground max-w-md mx-auto">
          {t('swipeToDiscover')}
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

        <div
          ref={scrollRef}
          className="flex gap-5 overflow-x-auto px-8 sm:px-12 snap-x snap-mandatory pb-4"
          style={{ scrollbarWidth: 'none', msOverflowStyle: 'none', WebkitOverflowScrolling: 'touch' }}
        >
          {cards.map((card, index) => (
            <motion.div
              key={card.id}
              initial={{ opacity: 0, y: 30, scale: 0.95 }}
              animate={isInView ? { opacity: 1, y: 0, scale: 1 } : {}}
              transition={{ duration: 0.5, delay: index * 0.1 }}
              className="flex-shrink-0 w-[340px] sm:w-[400px] snap-center"
            >
              <div className="relative h-full rounded-2xl border border-border bg-card overflow-hidden group hover:border-primary/30 transition-all duration-300 hover:shadow-xl hover:shadow-primary/5">
                <div className={`absolute inset-0 bg-gradient-to-br ${card.gradient} opacity-60 group-hover:opacity-100 transition-opacity`} />

                {/* Badge */}
                <div className="absolute top-3 right-3 z-10">
                  {card.isPremium ? (
                    <Badge variant="secondary" className="bg-amber-500/90 text-white border-amber-400 gap-1 text-[11px] font-bold uppercase tracking-wide shadow-md shadow-amber-900/30 px-3 py-1">
                      <Crown className="h-3.5 w-3.5" />
                      Premium
                    </Badge>
                  ) : (
                    <Badge variant="secondary" className="bg-emerald-500/90 text-white border-emerald-400 gap-1 text-[11px] font-bold uppercase tracking-wide shadow-md shadow-emerald-900/30 px-3 py-1">
                      <Gift className="h-3.5 w-3.5" />
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

                  {card.previewImage && (
                    <div className="rounded-lg overflow-hidden shadow-md border border-border/50 my-3 flex-1">
                      <img src={card.previewImage} alt={card.title} className="w-full h-full object-cover" />
                    </div>
                  )}

                  {!card.previewImage && <div className="flex-1" />}

                  <div className="flex gap-2 mt-6">
                    <Button
                      onClick={getAction(card.id)}
                      size="sm"
                      className={`flex-1 gap-1.5 text-xs font-semibold ${
                        card.isPremium
                          ? 'bg-gradient-to-r from-amber-500 to-orange-500 hover:from-amber-600 hover:to-orange-600 text-white border-0'
                          : ''
                      }`}
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
              scrollRef.current.scrollTo({ left: index * (cardWidth + 20), behavior: 'smooth' });
            }}
          />
        ))}
      </div>
    </motion.section>
  );
};
