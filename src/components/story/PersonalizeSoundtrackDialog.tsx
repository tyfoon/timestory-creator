/**
 * PersonalizeSoundtrackDialog - Dialog for upgrading V1 soundtrack to V2
 * Allows user to add personal details (friends, school, nightlife) for more personalized lyrics
 */

import { useState } from 'react';
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogDescription } from '@/components/ui/dialog';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Users, GraduationCap, PartyPopper, Sparkles, Loader2 } from 'lucide-react';
import { useSoundtrackGeneration } from '@/hooks/useSoundtrackGeneration';
import { TimelineEvent } from '@/types/timeline';
import { FormData, OptionalData } from '@/types/form';

interface PersonalizeSoundtrackDialogProps {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  events: TimelineEvent[];
  summary: string;
  formData: FormData;
}

export const PersonalizeSoundtrackDialog = ({
  open,
  onOpenChange,
  events,
  summary,
  formData,
}: PersonalizeSoundtrackDialogProps) => {
  const soundtrack = useSoundtrackGeneration();
  
  // Local form state for personal details
  const [friends, setFriends] = useState(formData.optionalData.friends || '');
  const [school, setSchool] = useState(formData.optionalData.school || '');
  const [nightlife, setNightlife] = useState(formData.optionalData.nightlife || '');

  const handleSubmit = async () => {
    // Close dialog immediately
    onOpenChange(false);
    
    // Start V2 generation with events and personal data
    await soundtrack.startFullGeneration(events, summary, formData, {
      friends,
      school,
      nightlife,
    });
  };

  const isGenerating = soundtrack.isGenerating;

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="w-[95vw] max-w-md max-h-[85vh] overflow-y-auto">
        <DialogHeader>
          <DialogTitle className="flex items-center gap-2">
            <Sparkles className="h-5 w-5 text-primary" />
            Maak je soundtrack persoonlijker
          </DialogTitle>
          <DialogDescription>
            Voeg persoonlijke herinneringen toe voor een uniekere songtekst die jouw verhaal vertelt.
          </DialogDescription>
        </DialogHeader>

        <div className="space-y-4 py-4">
          {/* Current song info */}
          {soundtrack.title && (
            <div className="p-3 bg-muted/30 rounded-lg">
              <p className="text-xs text-muted-foreground mb-1">Huidige versie:</p>
              <p className="text-sm font-medium text-foreground">{soundtrack.title}</p>
            </div>
          )}

          {/* Friends */}
          <div className="space-y-2">
            <Label className="flex items-center gap-2 text-sm font-medium">
              <Users className="h-4 w-4 text-accent" />
              Je beste vrienden van toen
            </Label>
            <Input
              placeholder="Bijv. Mark, Sandra, Pieter"
              value={friends}
              onChange={(e) => setFriends(e.target.value)}
              className="bg-card"
            />
            <p className="text-xs text-muted-foreground">
              Namen worden verwerkt in de songtekst
            </p>
          </div>

          {/* School */}
          <div className="space-y-2">
            <Label className="flex items-center gap-2 text-sm font-medium">
              <GraduationCap className="h-4 w-4 text-accent" />
              Middelbare school
            </Label>
            <Input
              placeholder="Bijv. Christelijk Lyceum Delft"
              value={school}
              onChange={(e) => setSchool(e.target.value)}
              className="bg-card"
            />
          </div>

          {/* Nightlife */}
          <div className="space-y-2">
            <Label className="flex items-center gap-2 text-sm font-medium">
              <PartyPopper className="h-4 w-4 text-accent" />
              Favoriete uitgaansplekken
            </Label>
            <Input
              placeholder="Bijv. De Melkweg, Paradiso"
              value={nightlife}
              onChange={(e) => setNightlife(e.target.value)}
              className="bg-card"
            />
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

        <div className="flex gap-3 pt-2 border-t border-border">
          <Button
            variant="outline"
            onClick={() => onOpenChange(false)}
            className="flex-1"
          >
            Annuleren
          </Button>
          <Button
            onClick={handleSubmit}
            disabled={isGenerating}
            className="flex-1 gap-2"
          >
            {isGenerating ? (
              <>
                <Loader2 className="h-4 w-4 animate-spin" />
                Bezig...
              </>
            ) : (
              <>
                <Sparkles className="h-4 w-4" />
                Genereer V2
              </>
            )}
          </Button>
        </div>
      </DialogContent>
    </Dialog>
  );
};
