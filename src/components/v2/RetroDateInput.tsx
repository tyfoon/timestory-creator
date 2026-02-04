import { useRef, useState, useEffect } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import { BirthDateData } from '@/types/form';
import { EraTheme } from '@/lib/eraThemes';

interface RetroDateInputProps {
  value: BirthDateData;
  onChange: (value: BirthDateData) => void;
  eraTheme: EraTheme;
  onComplete?: () => void;
}

// Get day of week in Dutch
const getDayOfWeek = (day: number, month: number, year: number): string | null => {
  if (!day || !month || !year || year < 1900) return null;
  
  try {
    const date = new Date(year, month - 1, day);
    if (isNaN(date.getTime())) return null;
    
    const days = ['Zondag', 'Maandag', 'Dinsdag', 'Woensdag', 'Donderdag', 'Vrijdag', 'Zaterdag'];
    return days[date.getDay()];
  } catch {
    return null;
  }
};

export const RetroDateInput = ({ value, onChange, eraTheme, onComplete }: RetroDateInputProps) => {
  const dayRef = useRef<HTMLInputElement>(null);
  const monthRef = useRef<HTMLInputElement>(null);
  const yearRef = useRef<HTMLInputElement>(null);
  
  const [dayInput, setDayInput] = useState(value.day ? String(value.day).padStart(2, '0') : '');
  const [monthInput, setMonthInput] = useState(value.month ? String(value.month).padStart(2, '0') : '');
  const [yearInput, setYearInput] = useState(value.year ? String(value.year) : '');
  const [showCelebration, setShowCelebration] = useState(false);
  
  const currentYear = new Date().getFullYear();
  
  // Check if date is complete
  const isComplete = value.day > 0 && value.month > 0 && value.year >= 1900 && value.year <= currentYear;
  const dayOfWeek = isComplete ? getDayOfWeek(value.day, value.month, value.year) : null;
  
  // Trigger celebration on complete
  useEffect(() => {
    if (isComplete && dayOfWeek) {
      setShowCelebration(true);
      const timer = setTimeout(() => {
        onComplete?.();
      }, 1500);
      return () => clearTimeout(timer);
    }
  }, [isComplete, dayOfWeek, onComplete]);
  
  const handleDayChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    const rawVal = e.target.value.replace(/\D/g, '').slice(0, 2);
    setDayInput(rawVal);
    
    const val = parseInt(rawVal) || 0;
    const day = Math.min(31, Math.max(0, val));
    onChange({ ...value, day: day || 0 });
    
    const shouldAdvance = 
      (rawVal.length === 1 && val >= 4 && val <= 9) ||
      (rawVal.length >= 2);
    
    if (shouldAdvance && day >= 1 && day <= 31) {
      setDayInput(String(day).padStart(2, '0'));
      monthRef.current?.focus();
      monthRef.current?.select();
    }
  };

  const handleMonthChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    const rawVal = e.target.value.replace(/\D/g, '').slice(0, 2);
    setMonthInput(rawVal);
    
    const val = parseInt(rawVal) || 0;
    const month = Math.min(12, Math.max(0, val));
    onChange({ ...value, month: month || 0 });
    
    const shouldAdvance = 
      (rawVal.length === 1 && val >= 2 && val <= 9) ||
      (rawVal.length >= 2);
    
    if (shouldAdvance && month >= 1 && month <= 12) {
      setMonthInput(String(month).padStart(2, '0'));
      yearRef.current?.focus();
      yearRef.current?.select();
    }
  };

  const handleYearChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    const rawVal = e.target.value.replace(/\D/g, '').slice(0, 4);
    setYearInput(rawVal);
    
    const val = parseInt(rawVal) || 0;
    onChange({ ...value, year: val });
    
    if (rawVal.length >= 4 && val >= 1900 && val <= currentYear) {
      yearRef.current?.blur();
    }
  };

  const handleDayBlur = () => {
    if (dayInput && value.day) {
      setDayInput(String(value.day).padStart(2, '0'));
    }
  };

  const handleMonthBlur = () => {
    if (monthInput && value.month) {
      setMonthInput(String(value.month).padStart(2, '0'));
    }
  };
  
  // Retro digit display styling based on era
  const getDigitStyle = () => {
    if (eraTheme.era === '80s') {
      return {
        background: 'linear-gradient(180deg, #1a1a2e 0%, #0f0f1a 100%)',
        border: '2px solid #00ced1',
        boxShadow: '0 0 15px rgba(0, 206, 209, 0.4), inset 0 2px 4px rgba(0,0,0,0.5)',
        color: '#00ced1',
        textShadow: '0 0 10px rgba(0, 206, 209, 0.8)',
      };
    }
    if (eraTheme.era === '90s') {
      return {
        background: 'linear-gradient(180deg, #2a2a2a 0%, #1a1a1a 100%)',
        border: '3px solid #ffd700',
        boxShadow: '0 4px 12px rgba(0,0,0,0.3), inset 0 2px 4px rgba(0,0,0,0.5)',
        color: '#ffd700',
        textShadow: '0 0 5px rgba(255, 215, 0, 0.6)',
      };
    }
    // Pre-70s / default - Flip clock style
    return {
      background: 'linear-gradient(180deg, #2d2d2d 0%, #1a1a1a 50%, #0a0a0a 100%)',
      border: '2px solid #444',
      boxShadow: '0 4px 12px rgba(0,0,0,0.5), inset 0 1px 0 rgba(255,255,255,0.1)',
      color: '#f5f5dc',
      textShadow: 'none',
    };
  };
  
  const digitStyle = getDigitStyle();

  return (
    <div className="space-y-4">
      {/* Title */}
      <div className="text-center">
        <h2 
          className="text-xl sm:text-2xl font-bold mb-1"
          style={{ 
            color: 'var(--era-primary)',
            fontFamily: eraTheme.fontFamily,
          }}
        >
          Wanneer begon jouw verhaal?
        </h2>
        <p className="text-sm text-muted-foreground">
          Vul je geboortedatum in om de tijdmachine te starten
        </p>
      </div>
      
      {/* Retro scoreboard display */}
      <div 
        className="relative mx-auto p-6 rounded-xl"
        style={{
          background: eraTheme.era === '80s' 
            ? 'linear-gradient(135deg, #1a1a2e 0%, #16213e 100%)'
            : eraTheme.era === '90s'
            ? 'linear-gradient(135deg, #1e1e1e 0%, #2d2d2d 100%)'
            : 'linear-gradient(135deg, #3d3d3d 0%, #1a1a1a 100%)',
          border: `2px solid ${eraTheme.era === '80s' ? '#00ced1' : eraTheme.era === '90s' ? '#ffd700' : '#666'}`,
          boxShadow: '0 10px 40px rgba(0,0,0,0.4)',
        }}
      >
        {/* LED indicator lights */}
        <div className="absolute top-3 right-3 flex gap-1.5">
          <div 
            className="w-2 h-2 rounded-full animate-pulse"
            style={{ 
              background: isComplete ? '#00ff00' : '#ff0000',
              boxShadow: `0 0 8px ${isComplete ? '#00ff00' : '#ff0000'}`,
            }}
          />
        </div>
        
        {/* Date inputs in scoreboard style */}
        <div className="flex items-center justify-center gap-2 sm:gap-4">
          {/* Day */}
          <div className="flex flex-col items-center">
            <span className="text-xs text-muted-foreground mb-1 uppercase tracking-wider">Dag</span>
            <input
              ref={dayRef}
              type="text"
              inputMode="numeric"
              pattern="[0-9]*"
              maxLength={2}
              placeholder="DD"
              value={dayInput}
              onChange={handleDayChange}
              onBlur={handleDayBlur}
              className="w-16 sm:w-20 h-14 sm:h-16 text-center text-3xl sm:text-4xl font-mono font-bold rounded-lg outline-none focus:ring-2 focus:ring-offset-2"
              style={{
                ...digitStyle,
                fontFamily: "'Courier New', monospace",
              }}
            />
          </div>
          
          {/* Separator */}
          <div 
            className="text-3xl sm:text-4xl font-bold mt-5"
            style={{ color: digitStyle.color }}
          >
            /
          </div>
          
          {/* Month */}
          <div className="flex flex-col items-center">
            <span className="text-xs text-muted-foreground mb-1 uppercase tracking-wider">Maand</span>
            <input
              ref={monthRef}
              type="text"
              inputMode="numeric"
              pattern="[0-9]*"
              maxLength={2}
              placeholder="MM"
              value={monthInput}
              onChange={handleMonthChange}
              onBlur={handleMonthBlur}
              className="w-16 sm:w-20 h-14 sm:h-16 text-center text-3xl sm:text-4xl font-mono font-bold rounded-lg outline-none focus:ring-2 focus:ring-offset-2"
              style={{
                ...digitStyle,
                fontFamily: "'Courier New', monospace",
              }}
            />
          </div>
          
          {/* Separator */}
          <div 
            className="text-3xl sm:text-4xl font-bold mt-5"
            style={{ color: digitStyle.color }}
          >
            /
          </div>
          
          {/* Year */}
          <div className="flex flex-col items-center">
            <span className="text-xs text-muted-foreground mb-1 uppercase tracking-wider">Jaar</span>
            <input
              ref={yearRef}
              type="text"
              inputMode="numeric"
              pattern="[0-9]*"
              maxLength={4}
              placeholder="JJJJ"
              value={yearInput}
              onChange={handleYearChange}
              className="w-20 sm:w-28 h-14 sm:h-16 text-center text-3xl sm:text-4xl font-mono font-bold rounded-lg outline-none focus:ring-2 focus:ring-offset-2"
              style={{
                ...digitStyle,
                fontFamily: "'Courier New', monospace",
              }}
            />
          </div>
        </div>
        
        {/* Decorative bottom strip */}
        <div 
          className="mt-4 h-1 rounded-full"
          style={{ 
            background: eraTheme.era === '80s'
              ? 'linear-gradient(90deg, #ff1493, #00ced1)'
              : eraTheme.era === '90s'
              ? 'linear-gradient(90deg, #0066ff, #ffd700, #ff0000)'
              : 'linear-gradient(90deg, #8b4513, #d2691e, #8b4513)',
          }}
        />
      </div>
      
      {/* Day of week celebration */}
      <AnimatePresence>
        {showCelebration && dayOfWeek && (
          <motion.div
            initial={{ opacity: 0, scale: 0.8, y: 20 }}
            animate={{ opacity: 1, scale: 1, y: 0 }}
            exit={{ opacity: 0, scale: 0.8, y: -20 }}
            className="text-center"
          >
            <div 
              className="inline-block px-6 py-3 rounded-xl shadow-lg"
              style={{
                background: `linear-gradient(135deg, var(--era-primary), var(--era-secondary))`,
              }}
            >
              <p 
                className="text-lg font-bold"
                style={{ 
                  color: eraTheme.era === 'pre70s' || eraTheme.era === '80s' ? '#fff' : '#000',
                  fontFamily: eraTheme.fontFamily,
                }}
              >
                ✨ Ah, {dayOfWeek}!
              </p>
              <p 
                className="text-sm opacity-90"
                style={{ color: eraTheme.era === 'pre70s' || eraTheme.era === '80s' ? '#fff' : '#000' }}
              >
                Een legendarische dag om mee te beginnen.
              </p>
            </div>
          </motion.div>
        )}
      </AnimatePresence>
    </div>
  );
};
