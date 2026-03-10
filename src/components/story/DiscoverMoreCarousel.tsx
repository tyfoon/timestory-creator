/**
 * DiscoverMoreCarousel - Lightweight carousel shown at the bottom of standalone pages
 * (Music, TV/Film) linking to other experiences.
 */
import { useRef, useState, useCallback } from 'react';
import { motion } from 'framer-motion';
import { useNavigate } from 'react-router-dom';
import { Music, Tv, Image, FileText, Flame, ChevronLeft, ChevronRight, Gift, Crown } from 'lucide-react';
import { Badge } from '@/components/ui/badge';

interface CardDef {
  id: string;
  title: string;
  description: string;
  icon: React.ReactNode;
  badge: 'free' | 'premium';
  action: () => void;
}

interface DiscoverMoreCarouselProps {
  /** Which page we're on, so we can exclude it from the list */
  currentPage: 'music' | 'tv-film' | 'story' | 'polaroid';
  /** Pass search params to preserve context */
  searchParams?: URLSearchParams;
}

export const DiscoverMoreCarousel = ({ currentPage, searchParams }: DiscoverMoreCarouselProps) => {
  const navigate = useNavigate();
  const scrollRef = useRef<HTMLDivElement>(null);
  const [canScrollLeft, setCanScrollLeft] = useState(false);
  const [canScrollRight, setCanScrollRight] = useState(true);

  const params = searchParams?.toString() ? `?${searchParams.toString()}` : '';

  const allCards: CardDef[] = [
    {
      id: 'music',
      title: 'Mijn Leven in Muziek',
      description: 'Ontdek de #1 hits uit jouw jaren',
      icon: <Music className="h-6 w-6" />,
      badge: 'free',
      action: () => navigate(`/muziek${params}`),
    },
    {
      id: 'tv-film',
      title: 'Mijn Leven in TV & Film',
      description: 'Iconische films en series uit jouw tijd',
      icon: <Tv className="h-6 w-6" />,
      badge: 'free',
      action: () => navigate(`/tv-film${params}`),
    },
    {
      id: 'polaroid',
      title: 'Mijn Leven in Polaroids',
      description: 'Jouw verhaal als polaroid collage',
      icon: <Image className="h-6 w-6" />,
      badge: 'free',
      action: () => navigate(`/polaroid${params}`),
    },
    {
      id: 'story',
      title: 'Mijn Tijdlijn Verhaal',
      description: 'Het volledige verhaal van jouw leven',
      icon: <FileText className="h-6 w-6" />,
      badge: 'free',
      action: () => navigate(`/story${params}`),
    },
  ];

  const cards = allCards.filter(c => c.id !== currentPage);

  const updateScroll = useCallback(() => {
    const el = scrollRef.current;
    if (!el) return;
    setCanScrollLeft(el.scrollLeft > 10);
    setCanScrollRight(el.scrollLeft < el.scrollWidth - el.clientWidth - 10);
  }, []);

  const scroll = useCallback((dir: 'left' | 'right') => {
    const el = scrollRef.current;
    if (!el) return;
    el.scrollBy({ left: dir === 'left' ? -280 : 280, behavior: 'smooth' });
  }, []);

  return (
    <motion.section
      initial={{ opacity: 0, y: 30 }}
      animate={{ opacity: 1, y: 0 }}
      transition={{ duration: 0.5, delay: 0.2 }}
      className="mt-12 mb-8"
    >
      <div className="flex items-center justify-between mb-4">
        <h2 className="font-serif text-xl font-bold text-foreground">Ontdek meer</h2>
        <div className="flex gap-1">
          <button
            onClick={() => scroll('left')}
            disabled={!canScrollLeft}
            className="p-1.5 rounded-full bg-muted text-muted-foreground disabled:opacity-30 hover:bg-accent transition-colors"
          >
            <ChevronLeft className="h-4 w-4" />
          </button>
          <button
            onClick={() => scroll('right')}
            disabled={!canScrollRight}
            className="p-1.5 rounded-full bg-muted text-muted-foreground disabled:opacity-30 hover:bg-accent transition-colors"
          >
            <ChevronRight className="h-4 w-4" />
          </button>
        </div>
      </div>

      <div
        ref={scrollRef}
        onScroll={updateScroll}
        className="flex gap-4 overflow-x-auto pb-2 -mx-4 px-4 sm:-mx-6 sm:px-6 snap-x snap-mandatory"
        style={{ scrollbarWidth: 'thin' }}
      >
        {cards.map((card) => (
          <div
            key={card.id}
            onClick={card.action}
            className="flex-shrink-0 w-[240px] sm:w-[280px] snap-start cursor-pointer group"
          >
            <div className="relative rounded-xl border border-border bg-card p-5 h-full transition-all duration-300 hover:shadow-lg hover:border-primary/30 hover:-translate-y-1">
              <Badge
                variant="secondary"
                className={`absolute top-3 right-3 text-[10px] ${
                  card.badge === 'free'
                    ? 'bg-emerald-500/15 text-emerald-600 border-emerald-500/30'
                    : 'bg-amber-500/15 text-amber-600 border-amber-500/30'
                }`}
              >
                {card.badge === 'free' ? (
                  <><Gift className="h-2.5 w-2.5 mr-0.5" /> Gratis</>
                ) : (
                  <><Crown className="h-2.5 w-2.5 mr-0.5" /> Premium</>
                )}
              </Badge>

              <div className="p-2.5 rounded-lg bg-primary/10 text-primary w-fit mb-3 group-hover:bg-primary/20 transition-colors">
                {card.icon}
              </div>

              <h3 className="font-semibold text-sm text-foreground mb-1">{card.title}</h3>
              <p className="text-xs text-muted-foreground">{card.description}</p>
            </div>
          </div>
        ))}
      </div>
    </motion.section>
  );
};
