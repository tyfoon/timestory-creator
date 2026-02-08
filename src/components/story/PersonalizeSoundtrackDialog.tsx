/**
 * PersonalizeSoundtrackDialog - Dialog for upgrading V1 soundtrack to V2
 * Allows user to add/edit all personal details for more personalized lyrics
 * 
 * Mirrors the "Aanpassen" step from MusicVideoGenerator
 */

import { useState } from 'react';
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogDescription } from '@/components/ui/dialog';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { RadioGroup, RadioGroupItem } from '@/components/ui/radio-group';
import { 
  User, Users, MapPin, Sparkles, GraduationCap, PartyPopper, 
  Loader2, Check
} from 'lucide-react';
import { useSoundtrackGeneration } from '@/hooks/useSoundtrackGeneration';
import { TimelineEvent } from '@/types/timeline';
import { FormData, OptionalData, Gender } from '@/types/form';
import { SubcultureSelector } from '@/components/SubcultureSelector';

interface PersonalizeSoundtrackDialogProps {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  events: TimelineEvent[];
  summary: string;
  formData: FormData;
  startYear: number;
  endYear: number;
}

export const PersonalizeSoundtrackDialog = ({
  open,
  onOpenChange,
  events,
  summary,
  formData,
  startYear,
  endYear,
}: PersonalizeSoundtrackDialogProps) => {
  const soundtrack = useSoundtrackGeneration();
  
  // Local copy of all optional data for editing
  const [localData, setLocalData] = useState<OptionalData>(() => ({
    ...formData.optionalData,
  }));

  // Handle dialog open - reset to current formData
  const handleOpenChange = (newOpen: boolean) => {
    if (newOpen) {
      setLocalData({ ...formData.optionalData });
    }
    onOpenChange(newOpen);
  };

  const handleSubmit = async () => {
    // Close dialog immediately
    onOpenChange(false);
    
    // Create updated formData with local changes
    const updatedFormData: FormData = {
      ...formData,
      optionalData: localData,
    };
    
    // Start V2 generation with events and updated personal data
    await soundtrack.startFullGeneration(events, summary, updatedFormData, {
      friends: localData.friends,
      school: localData.school,
      nightlife: localData.nightlife,
    });
  };

  const updateField = <K extends keyof OptionalData>(key: K, value: OptionalData[K]) => {
    setLocalData(prev => ({ ...prev, [key]: value }));
  };

  const isGenerating = soundtrack.isGenerating;

  return (
    <Dialog open={open} onOpenChange={handleOpenChange}>
      <DialogContent className="w-[95vw] max-w-2xl max-h-[90vh] overflow-y-auto p-4 sm:p-6">
        <DialogHeader className="pb-2">
          <DialogTitle className="flex items-center gap-2 text-sm sm:text-base">
            <Sparkles className="h-4 w-4 sm:h-5 sm:w-5 text-primary" />
            Aanpassen
          </DialogTitle>
          <DialogDescription className="text-xs sm:text-sm">
            Pas je gegevens aan voor een persoonlijker resultaat met jouw herinneringen én nieuwsfeiten.
          </DialogDescription>
        </DialogHeader>

        <div className="space-y-3 sm:space-y-4 py-2 sm:py-4">
          {/* Current song info */}
          {soundtrack.title && (
            <div className="p-3 bg-muted/30 rounded-lg">
              <p className="text-xs text-muted-foreground mb-1">Huidige versie (V1):</p>
              <p className="text-sm font-medium text-foreground">{soundtrack.title}</p>
            </div>
          )}

          {/* Name fields */}
          <div className="space-y-2">
            <Label className="flex items-center gap-2 text-xs sm:text-sm font-medium text-foreground">
              <User className="h-3.5 w-3.5 sm:h-4 sm:w-4 text-accent" />
              Naam
            </Label>
            <div className="grid gap-2 sm:grid-cols-2">
              <Input
                placeholder="Voornaam"
                value={localData.firstName || ''}
                onChange={(e) => updateField('firstName', e.target.value)}
                className="bg-card h-10 sm:h-9 text-sm"
              />
              <Input
                placeholder="Achternaam"
                value={localData.lastName || ''}
                onChange={(e) => updateField('lastName', e.target.value)}
                className="bg-card h-10 sm:h-9 text-sm"
              />
            </div>
          </div>

          {/* City */}
          <div className="space-y-1">
            <Label className="flex items-center gap-2 text-xs sm:text-sm font-medium text-foreground">
              <MapPin className="h-3.5 w-3.5 sm:h-4 sm:w-4 text-accent" />
              Woonplaats
            </Label>
            <Input
              placeholder="Bijv. Amsterdam"
              value={localData.city || ''}
              onChange={(e) => updateField('city', e.target.value)}
              className="bg-card h-10 sm:h-9 text-sm"
            />
          </div>

          {/* Gender */}
          <div className="space-y-2">
            <Label className="flex items-center gap-2 text-xs sm:text-sm font-medium text-foreground">
              <Users className="h-3.5 w-3.5 sm:h-4 sm:w-4 text-accent" />
              Geslacht (voor stem)
            </Label>
            <RadioGroup
              value={localData.gender || 'none'}
              onValueChange={(v) => updateField('gender', v as Gender)}
              className="grid grid-cols-3 gap-2"
            >
              {([
                { value: 'male', label: 'Man' },
                { value: 'female', label: 'Vrouw' },
                { value: 'none', label: 'Geen voorkeur' }
              ] as const).map((option) => (
                <Label
                  key={option.value}
                  className={`
                    flex items-center justify-center py-1.5 px-2 rounded-md cursor-pointer
                    border-2 transition-all duration-200 text-xs font-medium
                    ${localData.gender === option.value || (!localData.gender && option.value === 'none')
                      ? 'border-accent bg-accent/10 text-foreground' 
                      : 'border-border bg-card hover:border-muted-foreground/30 text-muted-foreground'
                    }
                  `}
                >
                  <RadioGroupItem value={option.value} className="sr-only" />
                  <span>{option.label}</span>
                </Label>
              ))}
            </RadioGroup>
          </div>

          {/* Interests */}
          <div className="space-y-1">
            <Label className="flex items-center gap-2 text-xs sm:text-sm font-medium text-foreground">
              <Sparkles className="h-3.5 w-3.5 sm:h-4 sm:w-4 text-accent" />
              Interesses
            </Label>
            <Input
              placeholder="Bijv. voetbal, muziek, reizen"
              value={localData.interests || ''}
              onChange={(e) => updateField('interests', e.target.value)}
              className="bg-card h-10 sm:h-9 text-sm"
            />
          </div>

          {/* Subculture Selector */}
          {startYear && endYear && (
            <SubcultureSelector
              startYear={startYear}
              endYear={endYear}
              periodType={localData.periodType || 'puberty'}
              focus={localData.focus || 'netherlands'}
              value={localData.subculture}
              onChange={(subculture) => updateField('subculture', subculture)}
            />
          )}

          {/* Personal details section */}
          <div className="space-y-3 pt-2 border-t border-border">
            <p className="text-xs sm:text-sm text-muted-foreground font-medium">
              ✨ Persoonlijke herinneringen voor een unieker lied:
            </p>
            
            {/* Friends */}
            <div className="space-y-1">
              <Label className="flex items-center gap-2 text-xs sm:text-sm font-medium text-foreground">
                <Users className="h-3.5 w-3.5 sm:h-4 sm:w-4 text-accent" />
                Top 3 vrienden van toen
              </Label>
              <Input
                placeholder="Namen gescheiden door komma's"
                value={localData.friends || ''}
                onChange={(e) => updateField('friends', e.target.value)}
                className="bg-card h-10 sm:h-9 text-sm"
              />
            </div>

            {/* School */}
            <div className="space-y-1">
              <Label className="flex items-center gap-2 text-xs sm:text-sm font-medium text-foreground">
                <GraduationCap className="h-3.5 w-3.5 sm:h-4 sm:w-4 text-accent" />
                Middelbare School
              </Label>
              <Input
                placeholder="Bijv. Christelijk Lyceum"
                value={localData.school || ''}
                onChange={(e) => updateField('school', e.target.value)}
                className="bg-card h-10 sm:h-9 text-sm"
              />
            </div>

            {/* Nightlife */}
            <div className="space-y-1">
              <Label className="flex items-center gap-2 text-xs sm:text-sm font-medium text-foreground">
                <PartyPopper className="h-3.5 w-3.5 sm:h-4 sm:w-4 text-accent" />
                Favoriete uitgaansplekken
              </Label>
              <Input
                placeholder="Bijv. De Melkweg, Paradiso"
                value={localData.nightlife || ''}
                onChange={(e) => updateField('nightlife', e.target.value)}
                className="bg-card h-10 sm:h-9 text-sm"
              />
            </div>
          </div>

          {/* Info text */}
          <div className="p-3 bg-primary/5 border border-primary/20 rounded-lg">
            <p className="text-xs text-muted-foreground">
              <strong className="text-foreground">Upgrade naar V2:</strong> Je nieuwe soundtrack 
              zal niet alleen de sfeer van je tijd vangen, maar ook specifieke nieuwsfeiten uit 
              je tijdlijn en je persoonlijke herinneringen verweven tot een echt uniek lied.
            </p>
          </div>
        </div>

        {/* Actions */}
        <div className="flex flex-col-reverse sm:flex-row justify-end gap-2 pt-3 border-t border-border">
          <Button 
            variant="ghost" 
            onClick={() => onOpenChange(false)} 
            className="h-11 sm:h-9"
          >
            Annuleren
          </Button>
          <Button 
            onClick={handleSubmit}
            disabled={isGenerating}
            className="h-11 sm:h-9 gap-2"
          >
            {isGenerating ? (
              <>
                <Loader2 className="h-4 w-4 animate-spin" />
                Bezig...
              </>
            ) : (
              <>
                <Check className="h-4 w-4" />
                Genereer V2
              </>
            )}
          </Button>
        </div>
      </DialogContent>
    </Dialog>
  );
};
