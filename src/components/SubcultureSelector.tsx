import { useMemo } from 'react';
import { Label } from '@/components/ui/label';
import { Music } from 'lucide-react';
import { SubcultureData } from '@/types/form';
import { getSubculturesForPeriod } from '@/lib/subcultureData';

interface SubcultureSelectorProps {
  startYear: number;
  endYear: number;
  periodType: string;
  focus: string;
  value: SubcultureData | undefined;
  onChange: (value: SubcultureData) => void;
}

export const SubcultureSelector = ({
  startYear,
  endYear,
  periodType,
  focus,
  value,
  onChange
}: SubcultureSelectorProps) => {
  // Get subcultures for this era
  const subcultureResult = useMemo(() => {
    if (!startYear || !endYear || !periodType) return null;
    return getSubculturesForPeriod(startYear, endYear, periodType, focus);
  }, [startYear, endYear, periodType, focus]);

  // Build the options: 5 subcultures + 1 neutral
  const options = useMemo(() => {
    if (!subcultureResult) return [];
    
    const subcultureOptions = subcultureResult.subcultures.slice(0, 5).map(name => ({
      value: name,
      label: name,
      isNeutral: false
    }));
    
    // Add neutral option
    subcultureOptions.push({
      value: 'neutral',
      label: 'Geen voorkeur',
      isNeutral: true
    });
    
    return subcultureOptions;
  }, [subcultureResult]);

  // Handle selection
  const handleSelect = (selectedValue: string) => {
    if (!subcultureResult) return;
    
    const isNeutral = selectedValue === 'neutral';
    const availableSubcultures = subcultureResult.subcultures.slice(0, 5);
    
    // Build otherGroupsFromEra: all options except the selected one
    const otherGroups = isNeutral 
      ? availableSubcultures 
      : availableSubcultures.filter(s => s !== selectedValue);
    
    onChange({
      myGroup: isNeutral ? null : selectedValue,
      otherGroupsFromEra: otherGroups.join(', '),
      availableOptions: availableSubcultures
    });
  };

  // Determine current selection
  const currentSelection = value?.myGroup || (value ? 'neutral' : null);

  if (!subcultureResult || options.length === 0) {
    return null;
  }

  return (
    <div className="space-y-2">
      <Label className="flex items-center gap-2 text-sm font-medium text-foreground">
        <Music className="h-4 w-4 text-accent" />
        Subcultuur
        <span className="text-xs text-muted-foreground font-normal">
          ({subcultureResult.period}, {subcultureResult.country})
        </span>
      </Label>
      
      {/* 2x3 Grid */}
      <div className="grid grid-cols-3 gap-2">
        {options.map((option) => (
          <button
            key={option.value}
            type="button"
            onClick={() => handleSelect(option.value)}
            className={`
              flex items-center justify-center py-2 px-2 rounded-md cursor-pointer
              border-2 transition-all duration-200 min-h-[44px]
              ${currentSelection === option.value
                ? 'border-accent bg-accent/10 text-foreground' 
                : 'border-border bg-card hover:border-muted-foreground/30 text-muted-foreground'
              }
              ${option.isNeutral ? 'col-span-1' : ''}
            `}
          >
            <span className="text-xs font-medium text-center leading-tight">
              {option.label}
            </span>
          </button>
        ))}
      </div>
    </div>
  );
};
