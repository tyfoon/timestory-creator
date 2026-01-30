import { useRef, useEffect, useState, useCallback } from 'react';
import { TimelineEvent } from '@/types/timeline';
import { TimelineCard } from './TimelineCard';
import { ChevronLeft, ChevronRight, Check } from 'lucide-react';
import { Button } from '@/components/ui/button';

interface TimelineCarouselProps {
  events: TimelineEvent[];
  currentEventIndex: number;
  onEventSelect: (index: number) => void;
  birthDate?: { day: number; month: number; year: number };
  /** When true, don't let carousel scroll-detection overwrite the selected index. */
  isScrubbing?: boolean;
  /** Selection mode for collage feature */
  isSelectingMode?: boolean;
  /** Selected event IDs for collage */
  selectedForCollage?: string[];
  /** Handler to toggle selection */
  onToggleSelection?: (eventId: string) => void;
}

export const TimelineCarousel = ({ 
  events, 
  currentEventIndex, 
  onEventSelect,
  birthDate,
  isScrubbing = false,
  isSelectingMode = false,
  selectedForCollage = [],
  onToggleSelection,
}: TimelineCarouselProps) => {
  const scrollContainerRef = useRef<HTMLDivElement>(null);
  const cardRefs = useRef<(HTMLDivElement | null)[]>([]);
  const currentIndexRef = useRef(currentEventIndex);
  const onEventSelectRef = useRef(onEventSelect);
  const programmaticScrollRef = useRef(false);
  const programmaticScrollTimeoutRef = useRef<number | null>(null);
  // Track if the index change was user-initiated (scrubber/click) vs data-driven
  const userInitiatedScrollRef = useRef(false);
  const [canScrollLeft, setCanScrollLeft] = useState(false);
  const [canScrollRight, setCanScrollRight] = useState(true);
  const [cardRotations, setCardRotations] = useState<number[]>([]);
  const hasInitializedRef = useRef(false);

  useEffect(() => {
    currentIndexRef.current = currentEventIndex;
  }, [currentEventIndex]);

  useEffect(() => {
    onEventSelectRef.current = onEventSelect;
  }, [onEventSelect]);

  // When scrubbing starts, mark as user-initiated
  useEffect(() => {
    if (isScrubbing) {
      userInitiatedScrollRef.current = true;
    }
  }, [isScrubbing]);

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

  // Scroll to current event when it changes - ONLY if user-initiated or initial mount
  useEffect(() => {
    // On first mount with events, scroll to initial position
    const isInitialMount = !hasInitializedRef.current && events.length > 0;
    if (isInitialMount) {
      hasInitializedRef.current = true;
      // Allow initial scroll to happen
    } else if (!userInitiatedScrollRef.current) {
      // Don't scroll if this is a data-driven update (e.g., image loading)
      return;
    }
    
    const cardElement = cardRefs.current[currentEventIndex];
    if (cardElement && scrollContainerRef.current) {
      const container = scrollContainerRef.current;
      const cardLeft = cardElement.offsetLeft;
      const cardWidth = cardElement.offsetWidth;
      const containerWidth = container.offsetWidth;
      
      // Center the card in view
      const scrollPosition = cardLeft - (containerWidth / 2) + (cardWidth / 2);

      // Mark programmatic scroll so centered-card detection doesn't fight the scrubber.
      programmaticScrollRef.current = true;
      if (programmaticScrollTimeoutRef.current) {
        window.clearTimeout(programmaticScrollTimeoutRef.current);
      }

      // While scrubbing, use immediate scroll for responsiveness.
      container.scrollTo({ left: scrollPosition, behavior: isScrubbing ? 'auto' : 'smooth' });

      // Release the lock shortly after the scroll starts.
      programmaticScrollTimeoutRef.current = window.setTimeout(() => {
        programmaticScrollRef.current = false;
        userInitiatedScrollRef.current = false;
      }, isScrubbing ? 100 : 500);
    }
  }, [currentEventIndex, isScrubbing, events.length]);

  // Check scroll buttons state and update rotations
  const updateScrollState = useCallback(() => {
    if (scrollContainerRef.current) {
      const { scrollLeft, scrollWidth, clientWidth } = scrollContainerRef.current;
      setCanScrollLeft(scrollLeft > 0);
      setCanScrollRight(scrollLeft < scrollWidth - clientWidth - 10);
    }
    updateCardRotations();
  }, [updateCardRotations]);

  // Detect which card is most centered and sync with scrubber (stable via refs)
  // This is called when the user manually scrolls the carousel
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

    if (closestIndex !== currentIndexRef.current) {
      // This is a user-initiated scroll, but we don't need to scroll again
      // because the user is already scrolling. Just update the index.
      onEventSelectRef.current(closestIndex);
    }
  }, []);

  useEffect(() => {
    const container = scrollContainerRef.current;
    if (container) {
      let rafId = 0;

      const handleScroll = () => {
        updateScrollState();
        // Sync active index while the user is scrolling (throttled to rAF)
        // but do not overwrite selection while scrubbing or during programmatic scroll.
        if (isScrubbing || programmaticScrollRef.current) return;
        if (rafId) cancelAnimationFrame(rafId);
        rafId = requestAnimationFrame(detectCenteredCard);
      };

      container.addEventListener('scroll', handleScroll, { passive: true });
      window.addEventListener('resize', updateScrollState);
      // Initial calculation
      requestAnimationFrame(updateScrollState);
      
      return () => {
        container.removeEventListener('scroll', handleScroll as any);
        window.removeEventListener('resize', updateScrollState);
        if (rafId) cancelAnimationFrame(rafId);

        if (programmaticScrollTimeoutRef.current) {
          window.clearTimeout(programmaticScrollTimeoutRef.current);
          programmaticScrollTimeoutRef.current = null;
        }
      };
    }
  }, [events, updateScrollState, detectCenteredCard, isScrubbing]);

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
        className="flex gap-4 overflow-x-auto h-full px-12 scroll-smooth snap-x snap-mandatory hide-scrollbar items-stretch overscroll-x-contain"
        style={{ scrollbarWidth: 'none', msOverflowStyle: 'none', transformStyle: 'preserve-3d', overscrollBehaviorX: 'contain' }}
      >
        {events.map((event, index) => {
          const rotation = cardRotations[index] || 0;
          const absRotation = Math.abs(rotation);
          // Fade cards as they rotate more
          const opacity = 1 - (absRotation / 35) * 0.4;
          // Scale down slightly as they rotate
          const scale = 1 - (absRotation / 35) * 0.1;
          
          const isSelected = selectedForCollage.includes(event.id);
          const hasImage = event.imageStatus === 'found' && !!event.imageUrl;
          
          return (
            <div
              key={event.id}
              ref={(el) => (cardRefs.current[index] = el)}
              className={`flex-shrink-0 w-[320px] sm:w-[380px] lg:w-[420px] snap-center cursor-pointer h-full relative ${
                isSelectingMode && !hasImage ? 'opacity-50 pointer-events-none' : ''
              }`}
              style={{
                transform: `rotateY(${rotation}deg) scale(${scale})`,
                opacity: isSelectingMode && !hasImage ? 0.4 : opacity,
                transition: 'transform 0.15s ease-out, opacity 0.15s ease-out',
                transformStyle: 'preserve-3d',
              }}
              onClick={() => {
                if (isSelectingMode && hasImage && onToggleSelection) {
                  onToggleSelection(event.id);
                } else if (!isSelectingMode) {
                  // Mark as user-initiated so the carousel scrolls to this card
                  userInitiatedScrollRef.current = true;
                  onEventSelect(index);
                }
              }}
            >
              {/* Selection overlay */}
              {isSelectingMode && hasImage && (
                <div className={`absolute inset-0 z-20 rounded-xl transition-all duration-200 ${
                  isSelected 
                    ? 'ring-4 ring-accent bg-accent/10' 
                    : 'ring-2 ring-white/30 hover:ring-accent/50'
                }`}>
                  {/* Checkbox indicator */}
                  <div className={`absolute top-4 right-4 w-8 h-8 rounded-full flex items-center justify-center transition-all ${
                    isSelected 
                      ? 'bg-accent text-accent-foreground shadow-lg' 
                      : 'bg-black/50 text-white/70'
                  }`}>
                    {isSelected ? (
                      <Check className="h-5 w-5" />
                    ) : (
                      <span className="text-sm font-medium">+</span>
                    )}
                  </div>
                </div>
              )}
              
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
