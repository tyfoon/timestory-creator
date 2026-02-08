import { useRef, useState, useEffect } from 'react';
import { useLanguage } from '@/contexts/LanguageContext';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { BirthDateData } from '@/types/form';

interface DateInputProps {
  label: string;
  value: BirthDateData;
  onChange: (value: BirthDateData) => void;
  error?: string;
  onComplete?: () => void;
}

export const DateInput = ({ label, value, onChange, error, onComplete }: DateInputProps) => {
  const { t } = useLanguage();
  const currentYear = new Date().getFullYear();
  
  const dayRef = useRef<HTMLInputElement>(null);
  const monthRef = useRef<HTMLInputElement>(null);
  const yearRef = useRef<HTMLInputElement>(null);

  // Track raw input values separately to allow typing multi-digit numbers
  const [dayInput, setDayInput] = useState(value.day ? String(value.day).padStart(2, '0') : '');
  const [monthInput, setMonthInput] = useState(value.month ? String(value.month).padStart(2, '0') : '');
  const [yearInput, setYearInput] = useState(value.year ? String(value.year) : '');

  // Sync external value changes (e.g., form reset)
  useEffect(() => {
    if (value.day && String(value.day) !== dayInput.replace(/^0+/, '')) {
      setDayInput(String(value.day).padStart(2, '0'));
    }
    if (!value.day && dayInput !== '') {
      setDayInput('');
    }
  }, [value.day]);

  useEffect(() => {
    if (value.month && String(value.month) !== monthInput.replace(/^0+/, '')) {
      setMonthInput(String(value.month).padStart(2, '0'));
    }
    if (!value.month && monthInput !== '') {
      setMonthInput('');
    }
  }, [value.month]);

  useEffect(() => {
    if (value.year && String(value.year) !== yearInput) {
      setYearInput(String(value.year));
    }
    if (!value.year && yearInput !== '') {
      setYearInput('');
    }
  }, [value.year]);

  const handleDayChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    const rawVal = e.target.value.replace(/\D/g, '').slice(0, 2);
    setDayInput(rawVal);
    
    const val = parseInt(rawVal) || 0;
    const day = Math.min(31, Math.max(0, val));
    onChange({ ...value, day: day || 0 });
    
    // Auto-advance: if first digit is 4-9, can only be 04-09, advance immediately
    // If first digit is 0-3, wait for second digit
    const shouldAdvance = 
      (rawVal.length === 1 && val >= 4 && val <= 9) || // Single digit 4-9
      (rawVal.length >= 2); // Two digits entered
    
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
    
    // Auto-advance logic:
    // - Single digit 2-9: immediately advance (can only be months 02-09, as 1 could be 10-12)
    // - "1" alone: wait for potential second digit (10, 11, 12)
    // - "0" alone: wait for second digit (01-09)
    // - Two digits: advance immediately
    const shouldAdvance = 
      (rawVal.length === 1 && val >= 2 && val <= 9) || // Single digit 2-9
      (rawVal.length >= 2); // Two digits entered
    
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
    
    // When year is complete (4 digits and valid), blur and trigger onComplete
    if (rawVal.length >= 4 && val >= 1900 && val <= currentYear) {
      yearRef.current?.blur();
      // Only call onComplete if day and month are also filled
      if (value.day > 0 && value.month > 0) {
        onComplete?.();
      }
    }
  };

  const handleDayBlur = () => {
    // Format with leading zero on blur
    if (dayInput && value.day) {
      setDayInput(String(value.day).padStart(2, '0'));
    }
  };

  const handleMonthBlur = () => {
    // Format with leading zero on blur
    if (monthInput && value.month) {
      setMonthInput(String(value.month).padStart(2, '0'));
    }
  };

  return (
    <div className="space-y-2">
      <Label className="text-sm font-medium text-foreground">{label}</Label>
      <div className="grid grid-cols-3 gap-2">
        {/* Day input */}
        <div>
          <Input
            ref={dayRef}
            type="text"
            inputMode="numeric"
            pattern="[0-9]*"
            maxLength={2}
            placeholder={t('dayLabel') as string}
            value={dayInput}
            onChange={handleDayChange}
            onBlur={handleDayBlur}
            className="bg-card text-center text-lg font-medium"
          />
        </div>

        {/* Month input */}
        <div>
          <Input
            ref={monthRef}
            type="text"
            inputMode="numeric"
            pattern="[0-9]*"
            maxLength={2}
            placeholder={t('monthLabel') as string}
            value={monthInput}
            onChange={handleMonthChange}
            onBlur={handleMonthBlur}
            className="bg-card text-center text-lg font-medium"
          />
        </div>

        {/* Year input */}
        <div>
          <Input
            ref={yearRef}
            type="text"
            inputMode="numeric"
            pattern="[0-9]*"
            maxLength={4}
            placeholder={t('yearLabel') as string}
            value={yearInput}
            onChange={handleYearChange}
            className="bg-card text-center text-lg font-medium"
          />
        </div>
      </div>
      {error && <p className="text-sm text-destructive">{error}</p>}
    </div>
  );
};
