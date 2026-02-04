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

  const handleDayChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    const rawVal = e.target.value.replace(/\D/g, ''); // Remove non-digits
    const val = parseInt(rawVal) || 0;
    const day = Math.min(31, Math.max(0, val));
    onChange({ ...value, day });
    
    // Auto-advance to month if we have 2 digits and valid day
    if (rawVal.length >= 2 && day >= 1 && day <= 31) {
      monthRef.current?.focus();
      monthRef.current?.select();
    }
  };

  const handleMonthChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    const rawVal = e.target.value.replace(/\D/g, ''); // Remove non-digits
    const val = parseInt(rawVal) || 0;
    const month = Math.min(12, Math.max(0, val));
    onChange({ ...value, month });
    
    // Auto-advance logic:
    // - Single digit 3-9: immediately advance (can only be months 03-09)
    // - "1" or "2" alone: wait for potential second digit (10-12 or 01-02)
    // - Two digits (01, 02, 10-12, etc.): advance immediately
    const shouldAdvance = 
      (rawVal.length === 1 && val >= 3 && val <= 9) || // Single digit 3-9
      (rawVal.length >= 2 && month >= 1 && month <= 12); // Two digits valid month
    
    if (shouldAdvance) {
      yearRef.current?.focus();
      yearRef.current?.select();
    }
  };

  const handleYearChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    const rawVal = e.target.value.replace(/\D/g, ''); // Remove non-digits
    const val = parseInt(rawVal) || 0;
    onChange({ ...value, year: val });
    
    // Blur when year is complete (4 digits and valid year)
    if (rawVal.length >= 4 && val >= 1900 && val <= currentYear) {
      yearRef.current?.blur();
    }
  };

  return (
    <div className="space-y-2">
      <Label className="text-sm font-medium text-foreground">{label}</Label>
      <div className="grid grid-cols-3 gap-2">
        {/* Day input - use text type to preserve leading zeros for length check */}
        <div>
          <Input
            ref={dayRef}
            type="text"
            inputMode="numeric"
            pattern="[0-9]*"
            maxLength={2}
            placeholder={t('dayLabel') as string}
            value={value.day ? String(value.day).padStart(2, '0') : ''}
            onChange={handleDayChange}
            className="bg-card text-center text-lg font-medium"
          />
        </div>

        {/* Month input - use text type to preserve leading zeros for length check */}
        <div>
          <Input
            ref={monthRef}
            type="text"
            inputMode="numeric"
            pattern="[0-9]*"
            maxLength={2}
            placeholder={t('monthLabel') as string}
            value={value.month ? String(value.month).padStart(2, '0') : ''}
            onChange={handleMonthChange}
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
            value={value.year || ''}
            onChange={handleYearChange}
            className="bg-card text-center text-lg font-medium"
          />
        </div>
      </div>
      {error && <p className="text-sm text-destructive">{error}</p>}
    </div>
  );
};
