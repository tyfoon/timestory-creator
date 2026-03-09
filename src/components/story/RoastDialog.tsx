import { useState, useCallback, useEffect, useRef } from 'react';
import { Dialog, DialogContent, DialogHeader, DialogTitle } from '@/components/ui/dialog';
import { Button } from '@/components/ui/button';
import { Slider } from '@/components/ui/slider';
import { Badge } from '@/components/ui/badge';
import { Loader2, Share2, Bookmark, Flame, Thermometer } from 'lucide-react';
import { TimelineEvent } from '@/types/timeline';
import { FormData } from '@/types/form';
import { useAuth } from '@/contexts/AuthContext';
import { supabase } from '@/integrations/supabase/client';
import { useToast } from '@/hooks/use-toast';
import { useLanguage } from '@/contexts/LanguageContext';

const SUPABASE_URL = import.meta.env.VITE_SUPABASE_URL || 'https://koeoboygsssyajpdstel.supabase.co';
const SUPABASE_ANON_KEY = import.meta.env.VITE_SUPABASE_PUBLISHABLE_KEY || 'eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZSIsInJlZiI6ImtvZW9ib3lnc3NzeWFqcGRzdGVsIiwicm9sZSI6ImFub24iLCJpYXQiOjE3NjkyNTY2NjEsImV4cCI6MjA4NDgzMjY2MX0.KuFaWF4r_cxZRiOumPGMChLVmwgyhT9vR5s7L52zr5s';

interface RoastDialogProps {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  events: TimelineEvent[];
  formData: FormData | null;
}

const intensityLabels = ['', 'Mild', 'Pittig', 'Gemiddeld', 'Scherp', 'Extreem'];
const intensityEmojis = ['', '😊', '😏', '😄', '🔥', '💀'];

export const RoastDialog = ({ open, onOpenChange, events, formData }: RoastDialogProps) => {
  const [intensity, setIntensity] = useState(3);
  const [roastText, setRoastText] = useState('');
  const [isLoading, setIsLoading] = useState(false);
  const [hasGenerated, setHasGenerated] = useState(false);
  const { user } = useAuth();
  const { toast } = useToast();
  const { language } = useLanguage();

  const generateRoast = useCallback(async (level: number) => {
    setIsLoading(true);
    try {
      const response = await fetch(`${SUPABASE_URL}/functions/v1/generate-roast`, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          'Authorization': `Bearer ${SUPABASE_ANON_KEY}`,
          'apikey': SUPABASE_ANON_KEY,
        },
        body: JSON.stringify({
          events: events.map(e => ({ year: e.year, title: e.title, category: e.category })),
          formData,
          intensity: level,
          language,
        }),
      });

      if (!response.ok) {
        const errorData = await response.json().catch(() => ({}));
        throw new Error(errorData.error || `Error ${response.status}`);
      }

      const data = await response.json();
      if (data.success && data.roast) {
        setRoastText(data.roast);
        setHasGenerated(true);
      } else {
        throw new Error(data.error || 'Geen roast ontvangen');
      }
    } catch (err) {
      console.error('Roast generation error:', err);
      toast({
        title: 'Oeps',
        description: err instanceof Error ? err.message : 'Kon de roast niet genereren',
        variant: 'destructive',
      });
    } finally {
      setIsLoading(false);
    }
  }, [events, formData, language, toast]);

  // Generate on first open - use ref to prevent double-fire
  const hasTriggered = useRef(false);
  useEffect(() => {
    if (open && !hasTriggered.current && events.length > 0) {
      hasTriggered.current = true;
      generateRoast(intensity);
    }
    if (!open) {
      hasTriggered.current = false;
    }
  }, [open]); // eslint-disable-line react-hooks/exhaustive-deps

  // Regenerate when slider changes (after initial generation)
  const handleIntensityChange = (value: number[]) => {
    const newIntensity = value[0];
    setIntensity(newIntensity);
    if (hasGenerated) {
      generateRoast(newIntensity);
    }
  };

  const handleShare = async () => {
    const shareText = `🔥 Roast van mijn leven (${intensityLabels[intensity]}):\n\n${roastText}`;
    if (navigator.share) {
      try {
        await navigator.share({ title: 'Roast mijn leven', text: shareText });
      } catch { /* user cancelled */ }
    } else {
      await navigator.clipboard.writeText(shareText);
      toast({ title: 'Gekopieerd!', description: 'De roast is gekopieerd naar je klembord.' });
    }
  };

  const handleSave = async () => {
    if (!user) {
      toast({ title: 'Log in', description: 'Maak een account aan om je roast op te slaan.', variant: 'destructive' });
      return;
    }
    try {
      const { error } = await supabase.from('saved_events').insert({
        user_id: user.id,
        event_title: `🔥 Roast (${intensityLabels[intensity]})`,
        event_description: roastText,
        event_category: 'personal',
        event_year: formData?.birthDate?.year || null,
      });
      if (error) throw error;
      toast({ title: 'Opgeslagen!', description: 'De roast is opgeslagen in je account.' });
    } catch (err) {
      console.error('Save roast error:', err);
      toast({ title: 'Fout', description: 'Kon de roast niet opslaan.', variant: 'destructive' });
    }
  };

  // Reset when dialog closes
  const handleOpenChange = (open: boolean) => {
    if (!open) {
      setHasGenerated(false);
      setRoastText('');
    }
    onOpenChange(open);
  };

  return (
    <Dialog open={open} onOpenChange={handleOpenChange}>
      <DialogContent className="max-w-lg w-[95vw] sm:w-full max-h-[90vh] overflow-y-auto bg-card border-border">
        <DialogHeader>
          <div className="flex items-center gap-2">
            <Flame className="h-6 w-6 text-orange-500" />
            <DialogTitle className="font-serif text-xl">Roast mijn leven</DialogTitle>
          </div>
        </DialogHeader>

        <div className="space-y-6 pt-2">
          {/* Roast text */}
          <div className="min-h-[160px] relative">
            {isLoading ? (
              <div className="flex flex-col items-center justify-center h-40 gap-3">
                <Loader2 className="h-8 w-8 text-orange-500 animate-spin" />
                <p className="text-sm text-muted-foreground">
                  {intensityLabels[intensity]} roast wordt geschreven...
                </p>
              </div>
            ) : roastText ? (
              <div className="p-4 bg-muted/30 rounded-xl border border-border/50">
                <p className="text-foreground text-sm sm:text-base leading-relaxed whitespace-pre-wrap">
                  {roastText}
                </p>
              </div>
            ) : null}
          </div>

          {/* Intensity slider */}
          <div className="space-y-3">
            <div className="flex items-center justify-between">
              <div className="flex items-center gap-2">
                <Thermometer className="h-4 w-4 text-muted-foreground" />
                <span className="text-sm font-medium text-foreground">Intensiteit</span>
              </div>
              <Badge variant="outline" className="text-xs gap-1 font-semibold">
                {intensityEmojis[intensity]} {intensityLabels[intensity]}
              </Badge>
            </div>

            <Slider
              value={[intensity]}
              onValueChange={handleIntensityChange}
              min={1}
              max={5}
              step={1}
              className="w-full"
              disabled={isLoading}
            />

            <div className="flex justify-between text-[10px] text-muted-foreground px-1">
              <span>Mild</span>
              <span>Extreem</span>
            </div>
          </div>

          {/* Action buttons */}
          <div className="flex gap-2">
            <Button onClick={handleShare} variant="outline" size="sm" className="flex-1 gap-1.5 text-xs" disabled={!roastText || isLoading}>
              <Share2 className="h-3.5 w-3.5" />
              Delen
            </Button>
            {user && (
              <Button onClick={handleSave} variant="outline" size="sm" className="flex-1 gap-1.5 text-xs" disabled={!roastText || isLoading}>
                <Bookmark className="h-3.5 w-3.5" />
                Opslaan
              </Button>
            )}
          </div>
        </div>
      </DialogContent>
    </Dialog>
  );
};
