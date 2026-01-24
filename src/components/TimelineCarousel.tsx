import { useRef, useEffect, useState, useCallback } from 'react';
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
  const [cardRotations, setCardRotations] = useState<number[]>([]);

  // Calculate rotation for each card based on its position
  const updateCardRotations = useCallback(() => {
    if (!scrollContainerRef.current) return;
    
    const container = scrollContainerRef.current;
    const containerRect = container.getBoundingClientRect();
    const containerCenter = containerRect.left + containerRect.width / 2;
    
    const rotations = cardRefs.current.map((cardEl) => {
      if (!cardEl) return 0;
      
      const cardRect = cardEl.getBoundingClientRect();
      const cardCenter = cardRect.left + cardRect.width / 2;
      
      // Distance from container center (-1 to 1 range, clamped)
      const distanceFromCenter = (cardCenter - containerCenter) / (containerRect.width / 2);
      const clampedDistance = Math.max(-1, Math.min(1, distanceFromCenter));
      
      // Max rotation of 35 degrees at edges, negative on left, positive on right
      const rotation = clampedDistance * -35;
      
      return rotation;
    });
    
    setCardRotations(rotations);
  }, []);

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

  // Check scroll buttons state and update rotations
  const updateScrollState = useCallback(() => {
    if (scrollContainerRef.current) {
      const { scrollLeft, scrollWidth, clientWidth } = scrollContainerRef.current;
      setCanScrollLeft(scrollLeft > 0);
      setCanScrollRight(scrollLeft < scrollWidth - clientWidth - 10);
    }
    updateCardRotations();
  }, [updateCardRotations]);

  // Detect which card is most centered and sync with scrubber
  const detectCenteredCard = useCallback(() => {
    if (!scrollContainerRef.current) return;
    
    const container = scrollContainerRef.current;
    const containerRect = container.getBoundingClientRect();
    const containerCenter = containerRect.left + containerRect.width / 2;
    
    let closestIndex = 0;
    let closestDistance = Infinity;
    
    cardRefs.current.forEach((cardEl, index) => {
      if (!cardEl) return;
      const cardRect = cardEl.getBoundingClientRect();
      const cardCenter = cardRect.left + cardRect.width / 2;
      const distance = Math.abs(cardCenter - containerCenter);
      
      if (distance < closestDistance) {
        closestDistance = distance;
        closestIndex = index;
      }
    });
    
    if (closestIndex !== currentEventIndex) {
      onEventSelect(closestIndex);
    }
  }, [currentEventIndex, onEventSelect]);

  useEffect(() => {
    const container = scrollContainerRef.current;
    if (container) {
      let scrollTimeout: ReturnType<typeof setTimeout>;
      
      const handleScroll = () => {
        updateScrollState();
        // Debounce: detect centered card after scroll stops
        clearTimeout(scrollTimeout);
        scrollTimeout = setTimeout(detectCenteredCard, 100);
      };
      
      container.addEventListener('scroll', handleScroll);
      window.addEventListener('resize', updateScrollState);
      // Initial calculation
      requestAnimationFrame(updateScrollState);
      
      return () => {
        container.removeEventListener('scroll', handleScroll);
        window.removeEventListener('resize', updateScrollState);
        clearTimeout(scrollTimeout);
      };
    }
  }, [events, updateScrollState, detectCenteredCard]);

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
    <div className="relative h-full" style={{ perspective: '1200px' }}>
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

      {/* Scroll container - taller cards with 3D perspective */}
      <div
        ref={scrollContainerRef}
        className="flex gap-4 overflow-x-auto h-full px-12 scroll-smooth snap-x snap-mandatory hide-scrollbar items-stretch"
        style={{ scrollbarWidth: 'none', msOverflowStyle: 'none', transformStyle: 'preserve-3d' }}
      >
        {events.map((event, index) => {
          const rotation = cardRotations[index] || 0;
          const absRotation = Math.abs(rotation);
          // Fade cards as they rotate more
          const opacity = 1 - (absRotation / 35) * 0.4;
          // Scale down slightly as they rotate
          const scale = 1 - (absRotation / 35) * 0.1;
          
          return (
            <div
              key={event.id}
              ref={(el) => (cardRefs.current[index] = el)}
              className="flex-shrink-0 w-[320px] sm:w-[380px] lg:w-[420px] snap-center cursor-pointer h-full"
              style={{
                transform: `rotateY(${rotation}deg) scale(${scale})`,
                opacity,
                transition: 'transform 0.15s ease-out, opacity 0.15s ease-out',
                transformStyle: 'preserve-3d',
              }}
              onClick={() => onEventSelect(index)}
            >
              <TimelineCard 
                event={event} 
                isActive={index === currentEventIndex}
                scopeLabel={getScopeLabel(event)}
                shouldLoadImage={event.imageStatus === 'found' || Math.abs(index - currentEventIndex) <= 2}
              />
            </div>
          );
        })}
      </div>

      {/* Gradient overlays for scroll indication */}
      <div className="absolute left-0 top-0 bottom-0 w-12 bg-gradient-to-r from-background to-transparent pointer-events-none" />
      <div className="absolute right-0 top-0 bottom-0 w-12 bg-gradient-to-l from-background to-transparent pointer-events-none" />
    </div>
  );
};
