import { useRef, useState, useEffect, useCallback } from "react";
import { motion, AnimatePresence } from "framer-motion";
import { getYearFact, getNearestYearFact, type EraTheme } from "@/lib/eraThemes";
import { ChevronLeft, ChevronRight } from "lucide-react";

interface TimeDialProps {
  selectedYear: number;
  onYearChange: (year: number) => void;
  eraTheme: EraTheme;
}

const MIN_YEAR = 1940;
const MAX_YEAR = new Date().getFullYear();

export const TimeDial = ({ selectedYear, onYearChange, eraTheme }: TimeDialProps) => {
  const scrollRef = useRef<HTMLDivElement>(null);
  const [isDragging, setIsDragging] = useState(false);
  const [showFlashCard, setShowFlashCard] = useState(true);
  
  // Center selected year on mount
  useEffect(() => {
    if (scrollRef.current) {
      const yearWidth = 80; // approximate width per year
      const containerWidth = scrollRef.current.offsetWidth;
      const scrollPosition = (selectedYear - MIN_YEAR) * yearWidth - containerWidth / 2 + yearWidth / 2;
      scrollRef.current.scrollLeft = Math.max(0, scrollPosition);
    }
  }, []);
  
  // Handle scroll to update selected year
  const handleScroll = useCallback(() => {
    if (!scrollRef.current) return;
    
    const containerWidth = scrollRef.current.offsetWidth;
    const scrollLeft = scrollRef.current.scrollLeft;
    const yearWidth = 80;
    
    // Calculate which year is in the center
    const centerOffset = scrollLeft + containerWidth / 2;
    const yearIndex = Math.round(centerOffset / yearWidth) - 1;
    const newYear = Math.max(MIN_YEAR, Math.min(MAX_YEAR, MIN_YEAR + yearIndex));
    
    if (newYear !== selectedYear) {
      onYearChange(newYear);
    }
  }, [selectedYear, onYearChange]);
  
  // Snap to nearest year on scroll end
  const handleScrollEnd = useCallback(() => {
    if (!scrollRef.current) return;
    
    const yearWidth = 80;
    const containerWidth = scrollRef.current.offsetWidth;
    const targetScroll = (selectedYear - MIN_YEAR) * yearWidth - containerWidth / 2 + yearWidth / 2;
    
    scrollRef.current.scrollTo({
      left: Math.max(0, targetScroll),
      behavior: 'smooth'
    });
  }, [selectedYear]);
  
  // Navigate with arrows
  const navigateYear = (direction: 'prev' | 'next') => {
    const newYear = direction === 'prev' 
      ? Math.max(MIN_YEAR, selectedYear - 1)
      : Math.min(MAX_YEAR, selectedYear + 1);
    onYearChange(newYear);
    
    // Scroll to center
    if (scrollRef.current) {
      const yearWidth = 80;
      const containerWidth = scrollRef.current.offsetWidth;
      const targetScroll = (newYear - MIN_YEAR) * yearWidth - containerWidth / 2 + yearWidth / 2;
      scrollRef.current.scrollTo({
        left: Math.max(0, targetScroll),
        behavior: 'smooth'
      });
    }
  };
  
  // Get flash card content
  const factData = getNearestYearFact(selectedYear, 'nl');
  
  // Generate years array
  const years = Array.from({ length: MAX_YEAR - MIN_YEAR + 1 }, (_, i) => MIN_YEAR + i);
  
  return (
    <div className="relative">
      {/* Flash card with year fact */}
      <AnimatePresence mode="wait">
        {showFlashCard && factData && (
          <motion.div
            key={factData.year}
            initial={{ opacity: 0, y: -10, scale: 0.95 }}
            animate={{ opacity: 1, y: 0, scale: 1 }}
            exit={{ opacity: 0, y: 10, scale: 0.95 }}
            transition={{ duration: 0.2 }}
            className="mb-6 mx-auto max-w-md"
          >
            <div 
              className="relative p-4 rounded-lg shadow-lg border-2 overflow-hidden"
              style={{
                background: eraTheme.era === '80s' 
                  ? 'linear-gradient(135deg, #1a1a2e 0%, #16213e 100%)'
                  : 'linear-gradient(135deg, #fff 0%, #f5f5f5 100%)',
                borderColor: 'var(--era-accent)',
              }}
            >
              {/* Decorative corner fold */}
              <div 
                className="absolute top-0 right-0 w-8 h-8"
                style={{
                  background: `linear-gradient(135deg, transparent 50%, var(--era-secondary) 50%)`,
                }}
              />
              
              <div className="flex items-start gap-3">
                <span 
                  className="text-2xl font-bold font-serif shrink-0"
                  style={{ color: 'var(--era-primary)' }}
                >
                  {factData.year}
                </span>
                <p 
                  className="text-sm leading-relaxed"
                  style={{ 
                    color: eraTheme.era === '80s' ? '#e0e0e0' : '#333',
                  }}
                >
                  {factData.fact}
                </p>
              </div>
            </div>
          </motion.div>
        )}
      </AnimatePresence>
      
      {/* Time dial container */}
      <div className="relative">
        {/* Navigation arrows */}
        <button
          onClick={() => navigateYear('prev')}
          disabled={selectedYear <= MIN_YEAR}
          className="absolute left-0 top-1/2 -translate-y-1/2 z-10 p-2 rounded-full bg-card/90 backdrop-blur shadow-lg border border-border disabled:opacity-30 transition-all hover:scale-110"
          style={{ color: 'var(--era-primary)' }}
        >
          <ChevronLeft className="w-6 h-6" />
        </button>
        
        <button
          onClick={() => navigateYear('next')}
          disabled={selectedYear >= MAX_YEAR}
          className="absolute right-0 top-1/2 -translate-y-1/2 z-10 p-2 rounded-full bg-card/90 backdrop-blur shadow-lg border border-border disabled:opacity-30 transition-all hover:scale-110"
          style={{ color: 'var(--era-primary)' }}
        >
          <ChevronRight className="w-6 h-6" />
        </button>
        
        {/* Center indicator */}
        <div className="absolute left-1/2 top-0 bottom-0 w-[2px] -translate-x-1/2 z-10 pointer-events-none">
          <div 
            className="w-full h-full"
            style={{ background: 'var(--era-accent)' }}
          />
          <div 
            className="absolute -top-2 left-1/2 -translate-x-1/2 w-0 h-0"
            style={{
              borderLeft: '8px solid transparent',
              borderRight: '8px solid transparent',
              borderTop: '10px solid var(--era-accent)',
            }}
          />
        </div>
        
        {/* Scrollable dial */}
        <div
          ref={scrollRef}
          className="overflow-x-auto hide-scrollbar py-8 px-12"
          onScroll={handleScroll}
          onMouseDown={() => setIsDragging(true)}
          onMouseUp={handleScrollEnd}
          onMouseLeave={() => {
            if (isDragging) {
              setIsDragging(false);
              handleScrollEnd();
            }
          }}
          onTouchEnd={handleScrollEnd}
          style={{ cursor: isDragging ? 'grabbing' : 'grab' }}
        >
          <div className="flex items-center" style={{ width: `${years.length * 80}px` }}>
            {years.map((year) => {
              const isSelected = year === selectedYear;
              const distance = Math.abs(year - selectedYear);
              const opacity = Math.max(0.3, 1 - distance * 0.15);
              const scale = isSelected ? 1.3 : Math.max(0.7, 1 - distance * 0.08);
              
              return (
                <button
                  key={year}
                  onClick={() => onYearChange(year)}
                  className="w-[80px] flex flex-col items-center justify-center transition-all duration-200"
                  style={{ 
                    opacity,
                    transform: `scale(${scale})`,
                  }}
                >
                  {/* Decade marker */}
                  {year % 10 === 0 && (
                    <div 
                      className="w-1 h-4 mb-1 rounded-full"
                      style={{ background: 'var(--era-secondary)' }}
                    />
                  )}
                  
                  {/* Year number */}
                  <span 
                    className={`font-bold transition-all ${isSelected ? 'text-3xl' : 'text-lg'}`}
                    style={{ 
                      color: isSelected ? 'var(--era-primary)' : 'var(--era-secondary)',
                      fontFamily: eraTheme.fontFamily,
                      textShadow: isSelected ? '0 2px 8px rgba(0,0,0,0.2)' : 'none',
                    }}
                  >
                    {year}
                  </span>
                  
                  {/* Era indicator for decades */}
                  {year % 10 === 0 && (
                    <span 
                      className="text-xs mt-1 opacity-60"
                      style={{ color: 'var(--era-primary)' }}
                    >
                      {year < 1970 ? '✦' : year < 1990 ? '◆' : '●'}
                    </span>
                  )}
                </button>
              );
            })}
          </div>
        </div>
        
        {/* Gradient fades */}
        <div 
          className="absolute left-10 top-0 bottom-0 w-16 pointer-events-none"
          style={{
            background: `linear-gradient(to right, ${eraTheme.era === '80s' ? 'rgba(26,26,46,1)' : 'rgba(255,255,255,0.95)'}, transparent)`,
          }}
        />
        <div 
          className="absolute right-10 top-0 bottom-0 w-16 pointer-events-none"
          style={{
            background: `linear-gradient(to left, ${eraTheme.era === '80s' ? 'rgba(26,26,46,1)' : 'rgba(255,255,255,0.95)'}, transparent)`,
          }}
        />
      </div>
      
      {/* Selected year display */}
      <motion.div 
        key={selectedYear}
        initial={{ scale: 0.8, opacity: 0 }}
        animate={{ scale: 1, opacity: 1 }}
        className="text-center mt-4"
      >
        <div 
          className="inline-block px-6 py-3 rounded-2xl shadow-lg"
          style={{
            background: eraTheme.era === '80s' 
              ? 'linear-gradient(135deg, #ff1493 0%, #00ced1 100%)'
              : `linear-gradient(135deg, var(--era-primary), var(--era-secondary))`,
          }}
        >
          <span 
            className="text-4xl font-bold"
            style={{ 
              fontFamily: eraTheme.fontFamily,
              color: eraTheme.era === 'pre70s' ? '#fff' : eraTheme.era === '80s' ? '#fff' : '#000',
            }}
          >
            {selectedYear}
          </span>
        </div>
      </motion.div>
    </div>
  );
};
