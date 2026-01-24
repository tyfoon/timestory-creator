import { useRef, useMemo } from 'react';
import { TimelineEvent } from '@/types/timeline';
import { Cake } from 'lucide-react';

interface TimelineScrubberBottomProps {
  events: TimelineEvent[];
  currentEventIndex: number;
  onEventSelect: (index: number) => void;
  birthDate?: { day: number; month: number; year: number };
  mode?: 'birthdate' | 'range';
}

const MONTH_LABELS = ['Jan', 'Feb', 'Mrt', 'Apr', 'Mei', 'Jun', 'Jul', 'Aug', 'Sep', 'Okt', 'Nov', 'Dec'];

export const TimelineScrubberBottom = ({ 
  events, 
  currentEventIndex, 
  onEventSelect,
  birthDate,
  mode = 'birthdate'
}: TimelineScrubberBottomProps) => {
  const scrubberRef = useRef<HTMLDivElement>(null);

  // For birthdate mode: show the birth year as a 12-month timeline
  const birthYear = birthDate?.year || events[0]?.year || new Date().getFullYear();
  const birthMonth = birthDate?.month || 1;
  const birthDay = birthDate?.day || 1;

  // Calculate position in the year (0-100%)
  const getYearPosition = (month: number, day: number = 15) => {
    // Each month is ~8.33% of the year
    const monthStart = ((month - 1) / 12) * 100;
    const dayOffset = ((day - 1) / 30) * (100 / 12);
    return Math.min(100, monthStart + dayOffset);
  };

  // Birthday position
  const birthdayPosition = getYearPosition(birthMonth, birthDay);

  // Group events by their position in the year
  const eventPositions = useMemo(() => {
    return events.map((event, index) => {
      const eventMonth = event.month || 6; // Default to middle of year if no month
      const eventDay = event.day || 15;
      return {
        index,
        event,
        position: getYearPosition(eventMonth, eventDay),
        isBirthday: event.eventScope === 'birthdate',
        isBirthMonth: event.eventScope === 'birthmonth',
      };
    });
  }, [events]);

  // Current event position
  const currentEvent = events[currentEventIndex];
  const currentPosition = currentEvent 
    ? getYearPosition(currentEvent.month || 6, currentEvent.day || 15)
    : 0;

  // Find event at position
  const findEventAtPosition = (percentage: number) => {
    let closestIndex = 0;
    let closestDistance = Infinity;
    
    eventPositions.forEach(({ index, position }) => {
      const distance = Math.abs(position - percentage * 100);
      if (distance < closestDistance) {
        closestDistance = distance;
        closestIndex = index;
      }
    });
    
    return closestIndex;
  };

  const handleScrubberClick = (e: React.MouseEvent<HTMLDivElement>) => {
    if (!scrubberRef.current) return;
    
    const rect = scrubberRef.current.getBoundingClientRect();
    const percentage = (e.clientX - rect.left) / rect.width;
    const closestIndex = findEventAtPosition(Math.max(0, Math.min(1, percentage)));
    onEventSelect(closestIndex);
  };

  const handleMouseDown = (e: React.MouseEvent<HTMLDivElement>) => {
    e.preventDefault();
    handleScrubberClick(e);
    
    const handleMouseMove = (moveEvent: MouseEvent) => {
      if (!scrubberRef.current) return;
      const rect = scrubberRef.current.getBoundingClientRect();
      const percentage = Math.max(0, Math.min(1, (moveEvent.clientX - rect.left) / rect.width));
      const closestIndex = findEventAtPosition(percentage);
      onEventSelect(closestIndex);
    };
    
    const handleMouseUp = () => {
      document.removeEventListener('mousemove', handleMouseMove);
      document.removeEventListener('mouseup', handleMouseUp);
    };
    
    document.addEventListener('mousemove', handleMouseMove);
    document.addEventListener('mouseup', handleMouseUp);
  };

  // Touch support
  const handleTouchStart = (e: React.TouchEvent<HTMLDivElement>) => {
    const touch = e.touches[0];
    if (!scrubberRef.current) return;
    
    const rect = scrubberRef.current.getBoundingClientRect();
    const percentage = Math.max(0, Math.min(1, (touch.clientX - rect.left) / rect.width));
    const closestIndex = findEventAtPosition(percentage);
    onEventSelect(closestIndex);
    
    const handleTouchMove = (moveEvent: TouchEvent) => {
      const moveTouch = moveEvent.touches[0];
      if (!scrubberRef.current) return;
      const rect = scrubberRef.current.getBoundingClientRect();
      const percentage = Math.max(0, Math.min(1, (moveTouch.clientX - rect.left) / rect.width));
      const closestIndex = findEventAtPosition(percentage);
      onEventSelect(closestIndex);
    };
    
    const handleTouchEnd = () => {
      document.removeEventListener('touchmove', handleTouchMove);
      document.removeEventListener('touchend', handleTouchEnd);
    };
    
    document.addEventListener('touchmove', handleTouchMove);
    document.addEventListener('touchend', handleTouchEnd);
  };

  return (
    <div className="fixed bottom-0 left-0 right-0 z-50 bg-card/98 backdrop-blur-lg border-t border-border shadow-elevated">
      <div className="container mx-auto max-w-5xl px-4 py-3">
        {/* Year indicator */}
        <div className="flex items-center justify-between mb-2">
          <span className="text-xs font-medium text-muted-foreground">
            Jouw jaar: <span className="text-foreground font-semibold">{birthYear}</span>
          </span>
          <span className="text-xs text-muted-foreground">
            {currentEventIndex + 1} / {events.length} gebeurtenissen
          </span>
        </div>

        {/* Month labels */}
        <div className="relative h-4 mb-1">
          {MONTH_LABELS.map((label, index) => {
            const position = (index / 12) * 100 + (100 / 24); // Center in month
            const isCurrentMonth = currentEvent?.month === index + 1;
            const isBirthMonth = index + 1 === birthMonth;
            return (
              <span
                key={label}
                className={`absolute text-[10px] transform -translate-x-1/2 transition-colors ${
                  isCurrentMonth 
                    ? 'text-accent font-bold' 
                    : isBirthMonth 
                      ? 'text-accent/70 font-medium'
                      : 'text-muted-foreground'
                }`}
                style={{ left: `${position}%` }}
              >
                {label}
              </span>
            );
          })}
        </div>

        {/* Scrubber track */}
        <div 
          ref={scrubberRef}
          onMouseDown={handleMouseDown}
          onTouchStart={handleTouchStart}
          className="relative h-8 bg-secondary/50 rounded-lg cursor-pointer group overflow-hidden"
        >
          {/* Month grid lines */}
          {[...Array(12)].map((_, index) => {
            const position = ((index + 1) / 12) * 100;
            return (
              <div
                key={index}
                className="absolute top-0 bottom-0 w-px bg-border/50"
                style={{ left: `${position}%` }}
              />
            );
          })}

          {/* Birthday marker - prominent */}
          <div 
            className="absolute top-0 bottom-0 w-1 bg-accent/30 z-[5]"
            style={{ left: `calc(${birthdayPosition}% - 2px)` }}
          >
            <div className="absolute -top-0.5 left-1/2 -translate-x-1/2 bg-accent rounded-full p-1 shadow-lg">
              <Cake className="h-3 w-3 text-accent-foreground" />
            </div>
          </div>

          {/* Progress fill - from start of year to current position */}
          <div 
            className="absolute left-0 top-0 h-full bg-gradient-to-r from-accent/20 to-accent/40 transition-all duration-200"
            style={{ width: `${currentPosition}%` }}
          />

          {/* Event markers */}
          {eventPositions.map(({ index, event, position, isBirthday, isBirthMonth }) => {
            const isActive = index === currentEventIndex;
            return (
              <button
                key={event.id}
                onClick={(e) => {
                  e.stopPropagation();
                  onEventSelect(index);
                }}
                className={`
                  absolute top-1/2 -translate-y-1/2 rounded-full transition-all duration-150 z-10
                  ${isActive 
                    ? 'w-4 h-4 bg-accent ring-2 ring-accent/30 ring-offset-1 ring-offset-background scale-110' 
                    : isBirthday
                      ? 'w-3 h-3 bg-accent hover:bg-accent/80 hover:scale-125'
                      : isBirthMonth
                        ? 'w-2.5 h-2.5 bg-accent/60 hover:bg-accent/80 hover:scale-125'
                        : event.importance === 'high'
                          ? 'w-2 h-2 bg-muted-foreground/60 hover:bg-accent/60 hover:scale-150'
                          : 'w-1.5 h-1.5 bg-muted-foreground/40 hover:bg-muted-foreground/70 hover:scale-150'
                  }
                `}
                style={{ left: `${position}%`, transform: `translateX(-50%) translateY(-50%)` }}
                title={`${event.day || ''}${event.day && event.month ? '-' : ''}${event.month || ''}: ${event.title}`}
                aria-label={event.title}
              />
            );
          })}

          {/* Current position thumb */}
          <div 
            className="absolute top-1/2 -translate-y-1/2 w-5 h-5 bg-accent rounded-full shadow-lg transition-all duration-200 group-hover:scale-110 cursor-grab active:cursor-grabbing z-20 flex items-center justify-center"
            style={{ left: `${currentPosition}%`, transform: `translateX(-50%) translateY(-50%)` }}
          >
            <div className="w-2 h-2 bg-accent-foreground rounded-full" />
          </div>
        </div>

        {/* Current event info */}
        <div className="mt-2 flex items-center justify-between text-xs">
          <div className="flex items-center gap-2">
            {currentEvent?.month && (
              <span className="px-2 py-0.5 rounded-full bg-accent/20 text-accent font-medium">
                {currentEvent.day && `${currentEvent.day} `}
                {MONTH_LABELS[currentEvent.month - 1]}
              </span>
            )}
            <span className="text-muted-foreground truncate max-w-[200px] sm:max-w-[400px]">
              {currentEvent?.title}
            </span>
          </div>
          <div className="flex items-center gap-1 text-muted-foreground">
            <span className="hidden sm:inline">Sleep om te navigeren</span>
            <span className="sm:hidden">Swipe</span>
            <span className="text-accent">→</span>
          </div>
        </div>
      </div>
    </div>
  );
};
