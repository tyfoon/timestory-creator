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

export const TimelineScrubberBottom = ({ 
  events, 
  currentEventIndex, 
  onEventSelect,
  birthDate,
  mode = 'birthdate'
}: TimelineScrubberBottomProps) => {
  const scrubberRef = useRef<HTMLDivElement>(null);

  const parseEventDateParts = (event: TimelineEvent): { year: number; month?: number; day?: number } => {
    // Prefer explicit fields
    const year = event.year;
    const month = event.month;
    const day = event.day;
    if (month || day) return { year, month, day };

    // Fallback: parse event.date (YYYY, YYYY-MM, YYYY-MM-DD)
    const raw = (event.date || '').trim();
    const m = raw.match(/^(\d{4})(?:-(\d{1,2})(?:-(\d{1,2}))?)?$/);
    if (!m) return { year };
    const parsedYear = Number(m[1]);
    const parsedMonth = m[2] ? Number(m[2]) : undefined;
    const parsedDay = m[3] ? Number(m[3]) : undefined;
    return {
      year: Number.isFinite(parsedYear) ? parsedYear : year,
      month: Number.isFinite(parsedMonth ?? NaN) ? parsedMonth : undefined,
      day: Number.isFinite(parsedDay ?? NaN) ? parsedDay : undefined,
    };
  };

  // For birthdate mode: show the birth year as a 12-month timeline
  const birthYear = birthDate?.year || events[0]?.year || new Date().getFullYear();
  const birthMonth = birthDate?.month || 1;
  const birthDay = birthDate?.day || 1;

  const rangeYears = useMemo(() => {
    if (!events.length) return { minYear: new Date().getFullYear(), maxYear: new Date().getFullYear() };
    let minYear = Infinity;
    let maxYear = -Infinity;
    for (const e of events) {
      minYear = Math.min(minYear, e.year);
      maxYear = Math.max(maxYear, e.year);
    }
    if (!Number.isFinite(minYear) || !Number.isFinite(maxYear)) {
      const y = new Date().getFullYear();
      return { minYear: y, maxYear: y };
    }
    return { minYear, maxYear };
  }, [events]);

  // Calculate position in the year (0-100%)
  const getYearPosition = (month: number, day: number = 15) => {
    // Each month is ~8.33% of the year
    const monthStart = ((month - 1) / 12) * 100;
    const dayOffset = ((day - 1) / 30) * (100 / 12);
    return Math.min(100, monthStart + dayOffset);
  };

  const getRangePosition = (year: number, month?: number, day?: number) => {
    const { minYear, maxYear } = rangeYears;
    const span = Math.max(1, maxYear - minYear);
    const base = ((year - minYear) / span) * 100;
    // optional intra-year offset
    if (!month) return Math.max(0, Math.min(100, base));
    const intra = ((month - 1) / 12) * (100 / span) + (((day ?? 15) - 1) / 30) * ((100 / span) / 12);
    return Math.max(0, Math.min(100, base + intra));
  };

  const getEventPosition = (event: TimelineEvent) => {
    const parts = parseEventDateParts(event);
    if (mode === 'range') {
      return getRangePosition(parts.year, parts.month, parts.day);
    }
    // birthdate mode
    return getYearPosition(parts.month || 6, parts.day || 15);
  };

  // Birthday position
  const birthdayPosition = getYearPosition(birthMonth, birthDay);

  // Group events by their position in the year
  const eventPositions = useMemo(() => {
    return events.map((event, index) => {
      return {
        index,
        event,
        position: getEventPosition(event),
        isBirthday: event.eventScope === 'birthdate',
        isBirthMonth: event.eventScope === 'birthmonth',
      };
    });
  }, [events, mode, rangeYears]);

  // Current event position
  const currentEvent = events[currentEventIndex];
  const currentEventParts = useMemo(
    () => (currentEvent ? parseEventDateParts(currentEvent) : null),
    [currentEvent]
  );
  const currentPosition = currentEvent ? getEventPosition(currentEvent) : 0;

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

  // Pointer events (works for mouse + touch + pen) for reliable dragging
  const handlePointerDown = (e: React.PointerEvent<HTMLDivElement>) => {
    if (!scrubberRef.current) return;
    if (e.pointerType === 'mouse' && e.button !== 0) return;
    e.preventDefault();

    const selectAt = (clientX: number) => {
      if (!scrubberRef.current) return;
      const rect = scrubberRef.current.getBoundingClientRect();
      const percentage = Math.max(0, Math.min(1, (clientX - rect.left) / rect.width));
      const closestIndex = findEventAtPosition(percentage);
      onEventSelect(closestIndex);
    };

    selectAt(e.clientX);

    const pointerId = e.pointerId;
    const handlePointerMove = (moveEvent: PointerEvent) => {
      if (moveEvent.pointerId !== pointerId) return;
      selectAt(moveEvent.clientX);
    };

    const handlePointerUp = (upEvent: PointerEvent) => {
      if (upEvent.pointerId !== pointerId) return;
      document.removeEventListener('pointermove', handlePointerMove);
      document.removeEventListener('pointerup', handlePointerUp);
      document.removeEventListener('pointercancel', handlePointerUp);
    };

    // Attach to document so dragging keeps working even if the pointer leaves the bar.
    document.addEventListener('pointermove', handlePointerMove, { passive: true });
    document.addEventListener('pointerup', handlePointerUp, { passive: true });
    document.addEventListener('pointercancel', handlePointerUp, { passive: true });
  };

  return (
    <div className="fixed bottom-4 left-4 right-4 z-50">
      <div className="mx-auto max-w-3xl bg-card/95 backdrop-blur-lg border border-border rounded-full shadow-elevated px-4 py-2">
        {/* Main scrubber row - compact */}
        <div className="flex items-center gap-3">
          {/* Year badge */}
          <span className="text-xs font-bold text-accent whitespace-nowrap">
            {mode === 'range' ? `${rangeYears.minYear}–${rangeYears.maxYear}` : birthYear}
          </span>

          {/* Scrubber track */}
          <div 
            ref={scrubberRef}
            onPointerDown={handlePointerDown}
            className="relative flex-1 h-6 bg-secondary/50 rounded-full cursor-pointer group overflow-visible touch-none select-none"
          >
            {/* Month grid lines - subtle */}
            {mode === 'birthdate' ? (
              [...Array(11)].map((_, index) => {
                const position = ((index + 1) / 12) * 100;
                return (
                  <div
                    key={index}
                    className="absolute top-1 bottom-1 w-px bg-border/40 pointer-events-none"
                    style={{ left: `${position}%` }}
                  />
                );
              })
            ) : (
              // Range mode: 4 interior tick lines for quick orientation
              [...Array(4)].map((_, i) => {
                const position = ((i + 1) / 5) * 100;
                return (
                  <div
                    key={i}
                    className="absolute top-1 bottom-1 w-px bg-border/40 pointer-events-none"
                    style={{ left: `${position}%` }}
                  />
                );
              })
            )}

            {/* Birthday marker */}
            {mode === 'birthdate' && (
              <div 
                className="absolute top-1/2 -translate-y-1/2 z-[5] flex flex-col items-center pointer-events-none"
                style={{ left: `${birthdayPosition}%` }}
              >
                <div className="w-0.5 h-4 bg-accent/50" />
                <Cake className="h-3 w-3 text-accent -mt-0.5" />
              </div>
            )}

            {/* Progress fill */}
            <div 
              className="absolute left-0 top-1 bottom-1 bg-accent/20 rounded-full transition-all duration-150 pointer-events-none"
              style={{ width: `${currentPosition}%` }}
            />

            {/* Event markers - minimal dots */}
            {eventPositions.map(({ index, event, position, isBirthday }) => {
              const isActive = index === currentEventIndex;
              if (isActive) return null; // Don't show dot for active (thumb is there)
              return (
                <button
                  key={event.id}
                  onClick={(e) => {
                    e.stopPropagation();
                    onEventSelect(index);
                  }}
                  className={`
                    absolute top-1/2 rounded-full transition-all duration-100 z-10
                    ${isBirthday
                      ? 'w-2 h-2 bg-accent hover:scale-150'
                      : event.importance === 'high'
                        ? 'w-1.5 h-1.5 bg-muted-foreground/50 hover:bg-accent hover:scale-150'
                        : 'w-1 h-1 bg-muted-foreground/30 hover:bg-muted-foreground/60 hover:scale-150'
                    }
                  `}
                  style={{ left: `${position}%`, transform: 'translate(-50%, -50%)' }}
                  title={event.title}
                />
              );
            })}

            {/* Current position thumb */}
            <div 
              className="absolute top-1/2 w-4 h-4 bg-accent rounded-full shadow-md transition-all duration-150 cursor-grab active:cursor-grabbing z-20 flex items-center justify-center ring-2 ring-background"
              style={{ left: `${currentPosition}%`, transform: 'translate(-50%, -50%)' }}
            >
              <div className="w-1.5 h-1.5 bg-accent-foreground rounded-full" />
            </div>

            {/* Month labels - positioned above */}
            {mode === 'birthdate' ? (
              <div className="absolute -top-4 left-0 right-0 flex justify-between px-1 pointer-events-none">
                {['J', 'F', 'M', 'A', 'M', 'J', 'J', 'A', 'S', 'O', 'N', 'D'].map((label, index) => {
                  const isCurrentMonth = (currentEventParts?.month ?? currentEvent?.month) === index + 1;
                  return (
                    <span
                      key={index}
                      className={`text-[8px] ${
                        isCurrentMonth ? 'text-accent font-bold' : 'text-muted-foreground/60'
                      }`}
                    >
                      {label}
                    </span>
                  );
                })}
              </div>
            ) : (
              <div className="absolute -top-4 left-0 right-0 flex justify-between px-1 pointer-events-none">
                {[
                  rangeYears.minYear,
                  Math.round(rangeYears.minYear + (rangeYears.maxYear - rangeYears.minYear) * 0.25),
                  Math.round(rangeYears.minYear + (rangeYears.maxYear - rangeYears.minYear) * 0.5),
                  Math.round(rangeYears.minYear + (rangeYears.maxYear - rangeYears.minYear) * 0.75),
                  rangeYears.maxYear,
                ].map((y, i) => (
                  <span key={i} className="text-[8px] text-muted-foreground/60">
                    {y}
                  </span>
                ))}
              </div>
            )}
          </div>

          {/* Current event info - compact */}
          <div className="flex items-center gap-2 text-xs whitespace-nowrap">
            {currentEvent?.month && (
              <span className="px-1.5 py-0.5 rounded bg-accent/20 text-accent font-medium text-[10px]">
                {currentEvent.day && `${currentEvent.day}/`}{currentEvent.month}
              </span>
            )}
            <span className="text-muted-foreground hidden sm:inline max-w-[120px] truncate">
              {currentEventIndex + 1}/{events.length}
            </span>
          </div>
        </div>
      </div>
    </div>
  );
};
