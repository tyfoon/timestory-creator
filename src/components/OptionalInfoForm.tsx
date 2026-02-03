import { useLanguage } from '@/contexts/LanguageContext';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { RadioGroup, RadioGroupItem } from '@/components/ui/radio-group';
import { OptionalData, GeographicFocus } from '@/types/form';
import { MapPin, Compass, Sparkles, User, Users, GraduationCap, PartyPopper } from 'lucide-react';

interface OptionalInfoFormProps {
  value: OptionalData;
  onChange: (value: OptionalData) => void;
}

export const OptionalInfoForm = ({ value, onChange }: OptionalInfoFormProps) => {
  const { t } = useLanguage();

  return (
    <div className="space-y-4">
      {/* Name - same style as other fields */}
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

      {/* City - compact */}
      <div className="space-y-2">
        <Label className="flex items-center gap-2 text-sm font-medium text-foreground">
          <MapPin className="h-4 w-4 text-accent" />
          {t('cityLabel') as string}
        </Label>
        <Input
          placeholder={t('cityPlaceholder') as string}
          value={value.city || ''}
          onChange={(e) => onChange({ ...value, city: e.target.value })}
          className="bg-card h-9"
        />
      </div>

      {/* Note: Gender selection has been moved to the main form */}

      {/* Note: Attitude selection has been moved to SubcultureSelector on the main form */}

      {/* Interests - compact */}
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

      {/* Personal Details Section - no header */}
      <div className="space-y-3">
        {/* Friends */}
        <div className="space-y-2">
          <Label className="flex items-center gap-2 text-sm font-medium text-foreground">
            <Users className="h-4 w-4 text-accent" />
            Top 3 vrienden van toen
          </Label>
          <Input
            placeholder="Namen gescheiden door komma's (bijv. Jan, Piet, Klaas)"
            value={value.friends || ''}
            onChange={(e) => onChange({ ...value, friends: e.target.value })}
            className="bg-card h-9"
          />
        </div>

        {/* School */}
        <div className="space-y-2">
          <Label className="flex items-center gap-2 text-sm font-medium text-foreground">
            <GraduationCap className="h-4 w-4 text-accent" />
            Middelbare School
          </Label>
          <Input
            placeholder="Bijv. Christelijk Lyceum Veenendaal"
            value={value.school || ''}
            onChange={(e) => onChange({ ...value, school: e.target.value })}
            className="bg-card h-9"
          />
        </div>

        {/* Nightlife */}
        <div className="space-y-2">
          <Label className="flex items-center gap-2 text-sm font-medium text-foreground">
            <PartyPopper className="h-4 w-4 text-accent" />
            Favoriete uitgaansplekken
          </Label>
          <Input
            placeholder="Discotheken/kroegen gescheiden door komma's"
            value={value.nightlife || ''}
            onChange={(e) => onChange({ ...value, nightlife: e.target.value })}
            className="bg-card h-9"
          />
        </div>
      </div>

      {/* Geographic Focus - moved to bottom */}
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
