import { useRef } from 'react';
import { useLanguage } from '@/contexts/LanguageContext';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { BirthDateData } from '@/types/form';

interface DateInputProps {
  label: string;
  value: BirthDateData;
  onChange: (value: BirthDateData) => void;
  error?: string;
}

export const DateInput = ({ label, value, onChange, error }: DateInputProps) => {
  const { t } = useLanguage();
  const currentYear = new Date().getFullYear();
  
  const dayRef = useRef<HTMLInputElement>(null);
  const monthRef = useRef<HTMLInputElement>(null);
  const yearRef = useRef<HTMLInputElement>(null);

  // Get month names for display
  const months = t('months') as readonly string[];

  const handleDayChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    const rawVal = e.target.value;
    const val = parseInt(rawVal) || 0;
    // Clamp between 0-31
    const day = Math.min(31, Math.max(0, val));
    onChange({ ...value, day });
    
    // Auto-advance to month if we have a complete 2-digit day (01-31)
    if (rawVal.length >= 2 && day >= 1 && day <= 31) {
      monthRef.current?.focus();
      monthRef.current?.select();
    }
  };

  const handleMonthChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    const rawVal = e.target.value;
    const val = parseInt(rawVal) || 0;
    // Clamp between 0-12
    const month = Math.min(12, Math.max(0, val));
    onChange({ ...value, month });
    
    // Auto-advance to year if we have a complete 2-digit month (01-12)
    if (rawVal.length >= 2 && month >= 1 && month <= 12) {
      yearRef.current?.focus();
      yearRef.current?.select();
    }
  };

  const handleYearChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    const rawVal = e.target.value;
    const val = parseInt(rawVal) || 0;
    onChange({ ...value, year: val });
    
    // Blur when year is complete (4 digits and valid year)
    if (rawVal.length >= 4 && val >= 1900 && val <= currentYear) {
      yearRef.current?.blur();
    }
  };

  // Get month name for display in input
  const monthName = value.month >= 1 && value.month <= 12 ? months[value.month - 1] : '';

  return (
    <div className="space-y-2">
      <Label className="text-sm font-medium text-foreground">{label}</Label>
      <div className="grid grid-cols-3 gap-2">
        {/* Day input */}
        <div>
          <Input
            ref={dayRef}
            type="number"
            inputMode="numeric"
            placeholder={t('dayLabel') as string}
            value={value.day || ''}
            onChange={handleDayChange}
            min={1}
            max={31}
            className="bg-card text-center text-lg font-medium"
          />
        </div>

        {/* Month input - shows month name when valid */}
        <div className="relative">
          {/* Hidden numeric input for actual value */}
          <Input
            ref={monthRef}
            type="number"
            inputMode="numeric"
            placeholder={t('monthLabel') as string}
            value={value.month || ''}
            onChange={handleMonthChange}
            min={1}
            max={12}
            className={`bg-card text-center text-lg font-medium ${monthName ? 'text-transparent caret-foreground' : ''}`}
          />
          {/* Overlay showing month name */}
          {monthName && (
            <div 
              className="absolute inset-0 flex items-center justify-center pointer-events-none text-lg font-medium text-foreground"
              aria-hidden="true"
            >
              {monthName}
            </div>
          )}
        </div>

        {/* Year input */}
        <div>
          <Input
            ref={yearRef}
            type="number"
            inputMode="numeric"
            placeholder={t('yearLabel') as string}
            value={value.year || ''}
            onChange={handleYearChange}
            min={1900}
            max={currentYear}
            className="bg-card text-center text-lg font-medium"
          />
        </div>
      </div>
      {error && <p className="text-sm text-destructive">{error}</p>}
    </div>
  );
};
