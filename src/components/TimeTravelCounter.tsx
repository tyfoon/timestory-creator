import { useEffect, useRef, useState } from 'react';
import Tick from '@pqina/flip';
import '@pqina/flip/dist/flip.min.css';

interface TimeTravelCounterProps {
  targetYear: number;
  onComplete: () => void;
}

/**
 * Split-flap display that counts down from current year to target year.
 * Uses easeOutQuart for a dramatic "braking" effect near the destination.
 */
export function TimeTravelCounter({ targetYear, onComplete }: TimeTravelCounterProps) {
  const containerRef = useRef<HTMLDivElement>(null);
  const tickRef = useRef<ReturnType<typeof Tick.DOM.create> | null>(null);
  const [currentDisplayYear, setCurrentDisplayYear] = useState(2026);
  const [isComplete, setIsComplete] = useState(false);

  useEffect(() => {
    if (!containerRef.current) return;

    const startYear = 2026;
    const totalYears = startYear - targetYear;
    const animationDuration = Math.min(4000, Math.max(2000, totalYears * 50)); // 2-4 seconds

    // Create the Tick instance
    tickRef.current = Tick.DOM.create(containerRef.current, {
      value: startYear,
      didInit: (tick: { value: number }) => {
        tick.value = startYear;
      }
    });

    let startTime: number | null = null;
    let animationFrame: number;

    // easeOutQuart: dramatic slowdown near the end
    const easeOutQuart = (t: number): number => {
      return 1 - Math.pow(1 - t, 4);
    };

    const animate = (timestamp: number) => {
      if (!startTime) startTime = timestamp;
      const elapsed = timestamp - startTime;
      const progress = Math.min(elapsed / animationDuration, 1);
      
      // Apply easing - slow down dramatically near the end
      const easedProgress = easeOutQuart(progress);
      
      // Calculate current year
      const currentYear = Math.round(startYear - (easedProgress * totalYears));
      
      // Update display if changed
      if (currentYear !== currentDisplayYear) {
        setCurrentDisplayYear(currentYear);
        
        if (tickRef.current) {
          tickRef.current.value = currentYear;
        }
      }

      if (progress < 1) {
        animationFrame = requestAnimationFrame(animate);
      } else {
        // Ensure we land exactly on target
        if (tickRef.current) {
          tickRef.current.value = targetYear;
        }
        setCurrentDisplayYear(targetYear);
        setIsComplete(true);
        
        // Delay onComplete slightly for visual effect
        setTimeout(() => {
          onComplete();
        }, 800);
      }
    };

    // Start animation after a short delay
    const timeout = setTimeout(() => {
      animationFrame = requestAnimationFrame(animate);
    }, 500);

    return () => {
      clearTimeout(timeout);
      if (animationFrame) cancelAnimationFrame(animationFrame);
      if (tickRef.current && containerRef.current) {
        Tick.DOM.destroy(containerRef.current);
      }
      tickRef.current = null;
    };
  }, [targetYear, onComplete]);

  return (
    <div className="fixed inset-0 z-50 flex flex-col items-center justify-center bg-black/95 backdrop-blur-sm">
      {/* Destination label */}
      <div className="mb-8 text-center">
        <p className="text-xs uppercase tracking-[0.3em] text-white/60 font-mono mb-2">
          Destination Year
        </p>
        <div className="w-32 h-px bg-gradient-to-r from-transparent via-white/30 to-transparent" />
      </div>

      {/* Flip counter container */}
      <div className="relative">
        {/* Glow effect behind counter */}
        <div 
          className={`absolute inset-0 blur-3xl transition-all duration-500 ${
            isComplete ? 'bg-accent/30 scale-150' : 'bg-accent/10 scale-100'
          }`} 
        />
        
        {/* The Tick counter */}
        <div 
          ref={containerRef}
          className="tick relative"
          data-value={currentDisplayYear}
          style={{
            fontSize: 'clamp(4rem, 15vw, 10rem)',
            fontFamily: "'Courier Prime', 'VT323', monospace",
          }}
        >
          <div data-repeat="true" data-transform="pad(0) -> arrive -> round">
            <span data-view="flip" className="tick-flip" />
          </div>
        </div>
      </div>

      {/* Arrival message */}
      {isComplete && (
        <div className="mt-8 text-center animate-fade-in">
          <p className="text-lg text-white/80 font-serif">
            Welkom in {targetYear}
          </p>
        </div>
      )}

      {/* Decorative elements */}
      <div className="absolute bottom-8 left-1/2 -translate-x-1/2 flex items-center gap-4">
        <div className="w-2 h-2 rounded-full bg-accent animate-pulse" />
        <p className="text-xs uppercase tracking-wider text-white/40 font-mono">
          {isComplete ? 'Tijdreis voltooid' : 'Tijdreis in uitvoering...'}
        </p>
        <div className="w-2 h-2 rounded-full bg-accent animate-pulse" />
      </div>
    </div>
  );
}
