import { useLanguage } from '@/contexts/LanguageContext';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { RadioGroup, RadioGroupItem } from '@/components/ui/radio-group';
import { OptionalData, GeographicFocus, BirthDateData } from '@/types/form';
import { DateInput } from './DateInput';
import { MapPin, Heart, Users, Compass, Sparkles, User } from 'lucide-react';

interface OptionalInfoFormProps {
  value: OptionalData;
  onChange: (value: OptionalData) => void;
}

export const OptionalInfoForm = ({ value, onChange }: OptionalInfoFormProps) => {
  const { t } = useLanguage();

  const updateChild = (index: number, field: 'name' | 'birthDate', fieldValue: string | BirthDateData) => {
    const newChildren = [...value.children];
    if (!newChildren[index]) {
      newChildren[index] = { name: '' };
    }
    if (field === 'name') {
      newChildren[index].name = fieldValue as string;
    } else {
      newChildren[index].birthDate = fieldValue as BirthDateData;
    }
    onChange({ ...value, children: newChildren });
  };

  return (
    <div className="space-y-8">
      {/* Name */}
      <div className="space-y-4 p-4 rounded-lg bg-secondary/30 border border-border/50">
        <Label className="flex items-center gap-2 text-sm font-medium text-foreground">
          <User className="h-4 w-4 text-accent" />
          {t('nameLabel') as string}
        </Label>
        <div className="grid gap-4 sm:grid-cols-2">
          <div className="space-y-2">
            <Label className="text-xs text-muted-foreground">
              {t('firstNameLabel') as string}
            </Label>
            <Input
              placeholder={t('firstNamePlaceholder') as string}
              value={value.firstName || ''}
              onChange={(e) => onChange({ ...value, firstName: e.target.value })}
              className="bg-card"
            />
          </div>
          <div className="space-y-2">
            <Label className="text-xs text-muted-foreground">
              {t('lastNameLabel') as string}
            </Label>
            <Input
              placeholder={t('lastNamePlaceholder') as string}
              value={value.lastName || ''}
              onChange={(e) => onChange({ ...value, lastName: e.target.value })}
              className="bg-card"
            />
          </div>
        </div>
      </div>

      {/* City */}
      <div className="space-y-2">
        <Label className="flex items-center gap-2 text-sm font-medium text-foreground">
          <MapPin className="h-4 w-4 text-accent" />
          {t('cityLabel') as string}
        </Label>
        <Input
          placeholder={t('cityPlaceholder') as string}
          value={value.city || ''}
          onChange={(e) => onChange({ ...value, city: e.target.value })}
          className="bg-card"
        />
      </div>

      {/* Partner */}
      <div className="space-y-4 p-4 rounded-lg bg-secondary/30 border border-border/50">
        <Label className="flex items-center gap-2 text-sm font-medium text-foreground">
          <Heart className="h-4 w-4 text-accent" />
          Partner
        </Label>
        <div className="grid gap-4 sm:grid-cols-2">
          <div className="space-y-2">
            <Label className="text-xs text-muted-foreground">
              {t('partnerNameLabel') as string}
            </Label>
            <Input
              value={value.partnerName || ''}
              onChange={(e) => onChange({ ...value, partnerName: e.target.value })}
              className="bg-card"
            />
          </div>
          <DateInput
            label={t('partnerBirthLabel') as string}
            value={value.partnerBirthDate || { day: 0, month: 0, year: 0 }}
            onChange={(date) => onChange({ ...value, partnerBirthDate: date })}
          />
        </div>
      </div>

      {/* Children */}
      <div className="space-y-4 p-4 rounded-lg bg-secondary/30 border border-border/50">
        <Label className="flex items-center gap-2 text-sm font-medium text-foreground">
          <Users className="h-4 w-4 text-accent" />
          Kinderen
        </Label>
        
        {[0, 1, 2].map((index) => (
          <div key={index} className="grid gap-4 sm:grid-cols-2 pb-4 border-b border-border/30 last:border-0 last:pb-0">
            <div className="space-y-2">
              <Label className="text-xs text-muted-foreground">
                {t(`child${index + 1}NameLabel` as any) as string}
              </Label>
              <Input
                value={value.children[index]?.name || ''}
                onChange={(e) => updateChild(index, 'name', e.target.value)}
                className="bg-card"
              />
            </div>
            <DateInput
              label={t(`child${index + 1}BirthLabel` as any) as string}
              value={value.children[index]?.birthDate || { day: 0, month: 0, year: 0 }}
              onChange={(date) => updateChild(index, 'birthDate', date)}
            />
          </div>
        ))}
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
          className="bg-card"
        />
      </div>

      {/* Geographic Focus */}
      <div className="space-y-3">
        <Label className="flex items-center gap-2 text-sm font-medium text-foreground">
          <Compass className="h-4 w-4 text-accent" />
          {t('focusLabel') as string}
        </Label>
        <RadioGroup
          value={value.focus}
          onValueChange={(v) => onChange({ ...value, focus: v as GeographicFocus })}
          className="grid grid-cols-3 gap-3"
        >
          {(['netherlands', 'europe', 'world'] as GeographicFocus[]).map((focus) => (
            <Label
              key={focus}
              className={`
                flex items-center justify-center gap-2 p-3 rounded-lg cursor-pointer
                border-2 transition-all duration-200
                ${value.focus === focus 
                  ? 'border-accent bg-accent/10 text-foreground' 
                  : 'border-border bg-card hover:border-muted-foreground/30 text-muted-foreground'
                }
              `}
            >
              <RadioGroupItem value={focus} className="sr-only" />
              <span className="text-sm font-medium">
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
