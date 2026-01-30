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

  const handleDayChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    const val = parseInt(e.target.value) || 0;
    // Clamp between 0-31
    const day = Math.min(31, Math.max(0, val));
    onChange({ ...value, day });
  };

  const handleMonthChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    const val = parseInt(e.target.value) || 0;
    // Clamp between 0-12
    const month = Math.min(12, Math.max(0, val));
    onChange({ ...value, month });
  };

  const handleYearChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    const val = parseInt(e.target.value) || 0;
    onChange({ ...value, year: val });
  };

  // Get month name for display below input
  const months = t('months') as readonly string[];
  const monthName = value.month >= 1 && value.month <= 12 ? months[value.month - 1] : '';

  return (
    <div className="space-y-2">
      <Label className="text-sm font-medium text-foreground">{label}</Label>
      <div className="grid grid-cols-3 gap-2">
        {/* Day input */}
        <div className="space-y-1">
          <Input
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

        {/* Month input */}
        <div className="space-y-1">
          <Input
            type="number"
            inputMode="numeric"
            placeholder={t('monthLabel') as string}
            value={value.month || ''}
            onChange={handleMonthChange}
            min={1}
            max={12}
            className="bg-card text-center text-lg font-medium"
          />
          {monthName && (
            <p className="text-xs text-muted-foreground text-center">{monthName}</p>
          )}
        </div>

        {/* Year input */}
        <div className="space-y-1">
          <Input
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
