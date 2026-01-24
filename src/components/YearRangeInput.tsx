import { useLanguage } from '@/contexts/LanguageContext';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { YearRangeData } from '@/types/form';
import { ArrowRight } from 'lucide-react';

interface YearRangeInputProps {
  value: YearRangeData;
  onChange: (value: YearRangeData) => void;
  error?: string;
}

export const YearRangeInput = ({ value, onChange, error }: YearRangeInputProps) => {
  const { t } = useLanguage();
  const currentYear = new Date().getFullYear();

  return (
    <div className="space-y-3">
      <div className="flex items-end gap-4">
        <div className="flex-1 space-y-2">
          <Label className="text-sm font-medium text-foreground">
            {t('startYearLabel') as string}
          </Label>
          <Input
            type="number"
            placeholder="1970"
            value={value.startYear || ''}
            onChange={(e) => onChange({ ...value, startYear: parseInt(e.target.value) || 0 })}
            min={1900}
            max={currentYear}
            className="bg-card text-center text-lg font-medium"
          />
        </div>

        <div className="pb-2">
          <ArrowRight className="h-6 w-6 text-muted-foreground" />
        </div>

        <div className="flex-1 space-y-2">
          <Label className="text-sm font-medium text-foreground">
            {t('endYearLabel') as string}
          </Label>
          <Input
            type="number"
            placeholder={currentYear.toString()}
            value={value.endYear || ''}
            onChange={(e) => onChange({ ...value, endYear: parseInt(e.target.value) || 0 })}
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
