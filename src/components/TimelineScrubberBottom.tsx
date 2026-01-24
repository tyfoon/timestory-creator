import { useRef } from 'react';
import { TimelineEvent } from '@/types/timeline';

interface TimelineScrubberBottomProps {
  events: TimelineEvent[];
  currentEventIndex: number;
  onEventSelect: (index: number) => void;
}

export const TimelineScrubberBottom = ({ 
  events, 
  currentEventIndex, 
  onEventSelect 
}: TimelineScrubberBottomProps) => {
  const scrubberRef = useRef<HTMLDivElement>(null);

  // Get unique years from events
  const years = [...new Set(events.map(e => e.year))].sort((a, b) => a - b);
  const minYear = years[0];
  const maxYear = years[years.length - 1];
  const yearRange = maxYear - minYear || 1;

  const currentEvent = events[currentEventIndex];
  const progress = currentEvent 
    ? ((currentEvent.year - minYear) / yearRange) * 100
    : 0;

  const handleScrubberClick = (e: React.MouseEvent<HTMLDivElement>) => {
    if (!scrubberRef.current) return;
    
    const rect = scrubberRef.current.getBoundingClientRect();
    const percentage = (e.clientX - rect.left) / rect.width;
    const targetYear = Math.round(minYear + (percentage * yearRange));
    
    // Find the closest event to this year
    let closestIndex = 0;
    let closestDistance = Infinity;
    
    events.forEach((event, index) => {
      const distance = Math.abs(event.year - targetYear);
      if (distance < closestDistance) {
        closestDistance = distance;
        closestIndex = index;
      }
    });
    
    onEventSelect(closestIndex);
  };

  // Handle drag on scrubber
  const handleMouseDown = (e: React.MouseEvent<HTMLDivElement>) => {
    e.preventDefault();
    handleScrubberClick(e);
    
    const handleMouseMove = (moveEvent: MouseEvent) => {
      if (!scrubberRef.current) return;
      const rect = scrubberRef.current.getBoundingClientRect();
      const percentage = Math.max(0, Math.min(1, (moveEvent.clientX - rect.left) / rect.width));
      const targetYear = Math.round(minYear + (percentage * yearRange));
      
      let closestIndex = 0;
      let closestDistance = Infinity;
      
      events.forEach((event, index) => {
        const distance = Math.abs(event.year - targetYear);
        if (distance < closestDistance) {
          closestDistance = distance;
          closestIndex = index;
        }
      });
      
      onEventSelect(closestIndex);
    };
    
    const handleMouseUp = () => {
      document.removeEventListener('mousemove', handleMouseMove);
      document.removeEventListener('mouseup', handleMouseUp);
    };
    
    document.addEventListener('mousemove', handleMouseMove);
    document.addEventListener('mouseup', handleMouseUp);
  };

  // Year markers to display
  const yearMarkers = years.filter((_, index) => {
    if (years.length <= 8) return true;
    const step = Math.ceil(years.length / 8);
    return index % step === 0 || index === years.length - 1;
  });

  return (
    <div className="fixed bottom-0 left-0 right-0 z-50 bg-background/95 backdrop-blur-md border-t border-border py-3 px-4">
      <div className="container mx-auto max-w-5xl">
        {/* Scrubber track */}
        <div 
          ref={scrubberRef}
          onMouseDown={handleMouseDown}
          className="relative h-2 bg-secondary rounded-full cursor-pointer group"
        >
          {/* Progress fill */}
          <div 
            className="absolute left-0 top-0 h-full bg-gradient-gold rounded-full transition-all duration-150"
            style={{ width: `${progress}%` }}
          />
          
          {/* Event markers */}
          {events.map((event, index) => {
            const position = ((event.year - minYear) / yearRange) * 100;
            const isBirthdate = event.eventScope === 'birthdate';
            return (
              <button
                key={event.id}
                onClick={(e) => {
                  e.stopPropagation();
                  onEventSelect(index);
                }}
                className={`
                  absolute top-1/2 -translate-y-1/2 rounded-full transition-all
                  ${index === currentEventIndex 
                    ? 'w-3 h-3 bg-accent scale-125 z-10' 
                    : isBirthdate
                      ? 'w-2 h-2 bg-accent/80 hover:bg-accent'
                      : event.importance === 'high'
                        ? 'w-1.5 h-1.5 bg-accent/50 hover:bg-accent/70'
                        : 'w-1 h-1 bg-muted-foreground/30 hover:bg-muted-foreground/50'
                  }
                `}
                style={{ left: `${position}%`, transform: `translateX(-50%) translateY(-50%)` }}
                title={event.title}
              />
            );
          })}

          {/* Thumb */}
          <div 
            className="absolute top-1/2 -translate-y-1/2 w-4 h-4 bg-accent rounded-full shadow-lg transition-all duration-150 group-hover:scale-110 cursor-grab active:cursor-grabbing"
            style={{ left: `calc(${progress}% - 8px)` }}
          >
            <div className="absolute inset-1 bg-primary-foreground rounded-full" />
          </div>
        </div>

        {/* Year labels */}
        <div className="relative mt-1.5 h-4 text-[10px]">
          {yearMarkers.map(year => {
            const position = ((year - minYear) / yearRange) * 100;
            return (
              <span
                key={year}
                className="absolute text-muted-foreground transform -translate-x-1/2 font-mono"
                style={{ left: `${position}%` }}
              >
                {year}
              </span>
            );
          })}
          
          {/* Current position indicator */}
          <span className="absolute right-0 text-foreground font-medium">
            {currentEventIndex + 1}/{events.length}
          </span>
        </div>
      </div>
    </div>
  );
};
