import { useRef, useEffect, useState } from 'react';
import { TimelineEvent } from '@/types/timeline';
import { TimelineCard } from './TimelineCard';
import { ChevronLeft, ChevronRight } from 'lucide-react';
import { Button } from '@/components/ui/button';

interface TimelineCarouselProps {
  events: TimelineEvent[];
  currentEventIndex: number;
  onEventSelect: (index: number) => void;
  birthDate?: { day: number; month: number; year: number };
}

export const TimelineCarousel = ({ 
  events, 
  currentEventIndex, 
  onEventSelect,
  birthDate 
}: TimelineCarouselProps) => {
  const scrollContainerRef = useRef<HTMLDivElement>(null);
  const cardRefs = useRef<(HTMLDivElement | null)[]>([]);
  const [canScrollLeft, setCanScrollLeft] = useState(false);
  const [canScrollRight, setCanScrollRight] = useState(true);

  // Scroll to current event when it changes
  useEffect(() => {
    const cardElement = cardRefs.current[currentEventIndex];
    if (cardElement && scrollContainerRef.current) {
      const container = scrollContainerRef.current;
      const cardLeft = cardElement.offsetLeft;
      const cardWidth = cardElement.offsetWidth;
      const containerWidth = container.offsetWidth;
      
      // Center the card in view
      const scrollPosition = cardLeft - (containerWidth / 2) + (cardWidth / 2);
      container.scrollTo({ left: scrollPosition, behavior: 'smooth' });
    }
  }, [currentEventIndex]);

  // Check scroll buttons state
  const updateScrollButtons = () => {
    if (scrollContainerRef.current) {
      const { scrollLeft, scrollWidth, clientWidth } = scrollContainerRef.current;
      setCanScrollLeft(scrollLeft > 0);
      setCanScrollRight(scrollLeft < scrollWidth - clientWidth - 10);
    }
  };

  useEffect(() => {
    const container = scrollContainerRef.current;
    if (container) {
      container.addEventListener('scroll', updateScrollButtons);
      updateScrollButtons();
      return () => container.removeEventListener('scroll', updateScrollButtons);
    }
  }, [events]);

  const scrollByAmount = (direction: 'left' | 'right') => {
    if (scrollContainerRef.current) {
      const scrollAmount = scrollContainerRef.current.offsetWidth * 0.8;
      scrollContainerRef.current.scrollBy({
        left: direction === 'left' ? -scrollAmount : scrollAmount,
        behavior: 'smooth'
      });
    }
  };

  // Get scope label for event
  const getScopeLabel = (event: TimelineEvent) => {
    if (event.isCelebrityBirthday) return 'Jarige';
    switch (event.eventScope) {
      case 'birthdate': return 'Op je geboortedag';
      case 'birthmonth': return 'In je geboortemaand';
      case 'birthyear': return 'In je geboortejaar';
      default: return null;
    }
  };

  return (
    <div className="relative h-full">
      {/* Navigation buttons */}
      <Button
        variant="outline"
        size="icon"
        className={`absolute left-2 top-1/2 -translate-y-1/2 z-10 bg-background/95 shadow-lg transition-opacity ${
          canScrollLeft ? 'opacity-100' : 'opacity-0 pointer-events-none'
        }`}
        onClick={() => scrollByAmount('left')}
      >
        <ChevronLeft className="h-5 w-5" />
      </Button>

      <Button
        variant="outline"
        size="icon"
        className={`absolute right-2 top-1/2 -translate-y-1/2 z-10 bg-background/95 shadow-lg transition-opacity ${
          canScrollRight ? 'opacity-100' : 'opacity-0 pointer-events-none'
        }`}
        onClick={() => scrollByAmount('right')}
      >
        <ChevronRight className="h-5 w-5" />
      </Button>

      {/* Scroll container - taller cards */}
      <div
        ref={scrollContainerRef}
        className="flex gap-4 overflow-x-auto h-full px-12 scroll-smooth snap-x snap-mandatory hide-scrollbar items-stretch"
        style={{ scrollbarWidth: 'none', msOverflowStyle: 'none' }}
      >
        {events.map((event, index) => (
          <div
            key={event.id}
            ref={(el) => (cardRefs.current[index] = el)}
            className="flex-shrink-0 w-[320px] sm:w-[380px] lg:w-[420px] snap-center cursor-pointer transition-transform hover:scale-[1.01] h-full"
            onClick={() => onEventSelect(index)}
          >
            <TimelineCard 
              event={event} 
              isActive={index === currentEventIndex}
              scopeLabel={getScopeLabel(event)}
            />
          </div>
        ))}
      </div>

      {/* Gradient overlays for scroll indication */}
      <div className="absolute left-0 top-0 bottom-0 w-12 bg-gradient-to-r from-background to-transparent pointer-events-none" />
      <div className="absolute right-0 top-0 bottom-0 w-12 bg-gradient-to-l from-background to-transparent pointer-events-none" />
    </div>
  );
};
