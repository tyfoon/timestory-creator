import { useLanguage } from '@/contexts/LanguageContext';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { RadioGroup, RadioGroupItem } from '@/components/ui/radio-group';
import { OptionalData, GeographicFocus } from '@/types/form';
import { Compass, Sparkles, User, Users, GraduationCap, PartyPopper } from 'lucide-react';

interface OptionalInfoFormProps {
  value: OptionalData;
  onChange: (value: OptionalData) => void;
}

export const OptionalInfoForm = ({ value, onChange }: OptionalInfoFormProps) => {
  const { t } = useLanguage();

  return (
    <div className="space-y-4">
      {/* Name */}
      <div className="space-y-2">
        <Label className="flex items-center gap-2 text-sm font-medium text-foreground">
          <User className="h-4 w-4 text-accent" />
          {t('nameLabel') as string}
        </Label>
        <div className="grid gap-3 sm:grid-cols-2">
          <Input
            placeholder={t('firstNamePlaceholder') as string}
            value={value.firstName || ''}
            onChange={(e) => onChange({ ...value, firstName: e.target.value })}
            className="bg-card h-9"
          />
          <Input
            placeholder={t('lastNamePlaceholder') as string}
            value={value.lastName || ''}
            onChange={(e) => onChange({ ...value, lastName: e.target.value })}
            className="bg-card h-9"
          />
        </div>
      </div>

      {/* Interests */}
      <div className="space-y-2">
        <Label className="flex items-center gap-2 text-sm font-medium text-foreground">
          <Sparkles className="h-4 w-4 text-accent" />
          {t('interestsLabel') as string}
        </Label>
        <Input
          placeholder={t('interestsPlaceholder') as string}
          value={value.interests || ''}
          onChange={(e) => onChange({ ...value, interests: e.target.value })}
          className="bg-card h-9"
        />
      </div>

      {/* Personal Details Section */}
      <div className="space-y-3">
        {/* Friends */}
        <div className="space-y-2">
          <Label className="flex items-center gap-2 text-sm font-medium text-foreground">
            <Users className="h-4 w-4 text-accent" />
            {t('friendsLabel') as string}
          </Label>
          <Input
            placeholder={t('friendsInputPlaceholder') as string}
            value={value.friends || ''}
            onChange={(e) => onChange({ ...value, friends: e.target.value })}
            className="bg-card h-9"
          />
        </div>

        {/* School */}
        <div className="space-y-2">
          <Label className="flex items-center gap-2 text-sm font-medium text-foreground">
            <GraduationCap className="h-4 w-4 text-accent" />
            {t('schoolLabel') as string}
          </Label>
          <Input
            placeholder={t('schoolInputPlaceholder') as string}
            value={value.school || ''}
            onChange={(e) => onChange({ ...value, school: e.target.value })}
            className="bg-card h-9"
          />
        </div>

        {/* Nightlife */}
        <div className="space-y-2">
          <Label className="flex items-center gap-2 text-sm font-medium text-foreground">
            <PartyPopper className="h-4 w-4 text-accent" />
            {t('nightlifeLabel') as string}
          </Label>
          <Input
            placeholder={t('nightlifeInputPlaceholder') as string}
            value={value.nightlife || ''}
            onChange={(e) => onChange({ ...value, nightlife: e.target.value })}
            className="bg-card h-9"
          />
        </div>
      </div>

      {/* Geographic Focus */}
      <div className="space-y-2">
        <Label className="flex items-center gap-2 text-sm font-medium text-foreground">
          <Compass className="h-4 w-4 text-accent" />
          {t('focusLabel') as string}
        </Label>
        <RadioGroup
          value={value.focus}
          onValueChange={(v) => onChange({ ...value, focus: v as GeographicFocus })}
          className="grid grid-cols-3 gap-2"
        >
          {(['netherlands', 'europe', 'world'] as GeographicFocus[]).map((focus) => (
            <Label
              key={focus}
              className={`
                flex items-center justify-center p-2 rounded-md cursor-pointer
                border-2 transition-all duration-200
                ${value.focus === focus 
                  ? 'border-accent bg-accent/10 text-foreground' 
                  : 'border-border bg-card hover:border-muted-foreground/30 text-muted-foreground'
                }
              `}
            >
              <RadioGroupItem value={focus} className="sr-only" />
              <span className="text-xs font-medium">
                {focus === 'netherlands' && (t('focusNetherlands') as string)}
                {focus === 'europe' && (t('focusEurope') as string)}
                {focus === 'world' && (t('focusWorld') as string)}
              </span>
            </Label>
          ))}
        </RadioGroup>
      </div>
    </div>
  );
};
