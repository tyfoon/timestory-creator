import { useLanguage } from '@/contexts/LanguageContext';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from '@/components/ui/select';
import { BirthDateData } from '@/types/form';

interface DateInputProps {
  label: string;
  value: BirthDateData;
  onChange: (value: BirthDateData) => void;
  error?: string;
}

export const DateInput = ({ label, value, onChange, error }: DateInputProps) => {
  const { t } = useLanguage();
  const months = t('months') as readonly string[];
  const currentYear = new Date().getFullYear();

  const days = Array.from({ length: 31 }, (_, i) => i + 1);
  const years = Array.from({ length: currentYear - 1899 }, (_, i) => currentYear - i);

  return (
    <div className="space-y-2">
      <Label className="text-sm font-medium text-foreground">{label}</Label>
      <div className="grid grid-cols-3 gap-2">
        <Select
          value={value.day?.toString() || ''}
          onValueChange={(v) => onChange({ ...value, day: parseInt(v) })}
        >
          <SelectTrigger className="bg-card">
            <SelectValue placeholder={t('dayLabel') as string} />
          </SelectTrigger>
          <SelectContent>
            {days.map((day) => (
              <SelectItem key={day} value={day.toString()}>
                {day}
              </SelectItem>
            ))}
          </SelectContent>
        </Select>

        <Select
          value={value.month?.toString() || ''}
          onValueChange={(v) => onChange({ ...value, month: parseInt(v) })}
        >
          <SelectTrigger className="bg-card">
            <SelectValue placeholder={t('monthLabel') as string} />
          </SelectTrigger>
          <SelectContent>
            {months.map((month, index) => (
              <SelectItem key={index} value={(index + 1).toString()}>
                {month}
              </SelectItem>
            ))}
          </SelectContent>
        </Select>

        <Input
          type="number"
          placeholder={t('yearLabel') as string}
          value={value.year || ''}
          onChange={(e) => onChange({ ...value, year: parseInt(e.target.value) || 0 })}
          min={1900}
          max={currentYear}
          className="bg-card"
        />
      </div>
      {error && <p className="text-sm text-destructive">{error}</p>}
    </div>
  );
};
