import { useRef, useEffect, useState } from 'react';
import { TimelineEvent } from '@/types/timeline';

interface TimelineScrubberProps {
  events: TimelineEvent[];
  currentEventIndex: number;
  onEventSelect: (index: number) => void;
}

export const TimelineScrubber = ({ events, currentEventIndex, onEventSelect }: TimelineScrubberProps) => {
  const scrubberRef = useRef<HTMLDivElement>(null);
  const [isDragging, setIsDragging] = useState(false);

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

  // Year markers to display
  const yearMarkers = years.filter((_, index) => {
    if (years.length <= 10) return true;
    // Show every Nth year based on total count
    const step = Math.ceil(years.length / 10);
    return index % step === 0 || index === years.length - 1;
  });

  return (
    <div className="sticky top-20 z-40 bg-background/95 backdrop-blur-md border-b border-border py-4">
      <div className="container mx-auto max-w-4xl px-4">
        {/* Current position indicator */}
        <div className="flex items-center justify-between mb-3">
          <span className="text-sm text-muted-foreground">
            {currentEventIndex + 1} van {events.length} gebeurtenissen
          </span>
          {currentEvent && (
            <span className="font-serif text-lg font-semibold text-foreground">
              {currentEvent.year}
            </span>
          )}
        </div>

        {/* Scrubber track */}
        <div 
          ref={scrubberRef}
          onClick={handleScrubberClick}
          className="relative h-3 bg-secondary rounded-full cursor-pointer group"
        >
          {/* Progress fill */}
          <div 
            className="absolute left-0 top-0 h-full bg-gradient-gold rounded-full transition-all duration-300"
            style={{ width: `${progress}%` }}
          />
          
          {/* Thumb */}
          <div 
            className="absolute top-1/2 -translate-y-1/2 w-5 h-5 bg-accent rounded-full shadow-lg transition-all duration-300 group-hover:scale-110"
            style={{ left: `calc(${progress}% - 10px)` }}
          >
            <div className="absolute inset-1 bg-primary-foreground rounded-full" />
          </div>

          {/* Event markers */}
          {events.map((event, index) => {
            const position = ((event.year - minYear) / yearRange) * 100;
            return (
              <button
                key={event.id}
                onClick={(e) => {
                  e.stopPropagation();
                  onEventSelect(index);
                }}
                className={`
                  absolute top-1/2 -translate-y-1/2 w-2 h-2 rounded-full transition-all
                  ${index === currentEventIndex 
                    ? 'bg-accent scale-150' 
                    : event.importance === 'high'
                      ? 'bg-accent/60 hover:bg-accent'
                      : 'bg-muted-foreground/30 hover:bg-muted-foreground/60'
                  }
                `}
                style={{ left: `${position}%` }}
                title={event.title}
              />
            );
          })}
        </div>

        {/* Year labels */}
        <div className="relative mt-2 h-6">
          {yearMarkers.map(year => {
            const position = ((year - minYear) / yearRange) * 100;
            return (
              <span
                key={year}
                className="absolute text-xs text-muted-foreground transform -translate-x-1/2"
                style={{ left: `${position}%` }}
              >
                {year}
              </span>
            );
          })}
        </div>
      </div>
    </div>
  );
};
