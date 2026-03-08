import { useState, useCallback } from 'react';
import { Bookmark, BookmarkCheck, Loader2 } from 'lucide-react';
import { supabase } from '@/integrations/supabase/client';
import { useAuth } from '@/contexts/AuthContext';
import { useLanguage } from '@/contexts/LanguageContext';
import { useToast } from '@/hooks/use-toast';

interface SaveEventButtonProps {
  eventTitle: string;
  eventDate?: string;
  eventYear?: number;
  eventDescription?: string;
  eventCategory?: string;
  imageUrl?: string;
}

export const SaveEventButton = ({
  eventTitle,
  eventDate,
  eventYear,
  eventDescription,
  eventCategory,
  imageUrl,
}: SaveEventButtonProps) => {
  const { user } = useAuth();
  const { t } = useLanguage();
  const { toast } = useToast();
  const [saved, setSaved] = useState(false);
  const [saving, setSaving] = useState(false);

  const handleSave = useCallback(async (e: React.MouseEvent) => {
    e.stopPropagation();
    if (!user || saved) return;

    setSaving(true);
    try {
      const { error } = await (supabase.from('saved_events' as any) as any).insert({
        user_id: user.id,
        event_title: eventTitle,
        event_date: eventDate,
        event_year: eventYear,
        event_description: eventDescription,
        event_category: eventCategory,
        image_url: imageUrl,
      });

      if (error) throw error;
      setSaved(true);
      toast({ title: String(t('eventSaved')) });
    } catch (error: any) {
      toast({
        title: String(t('authError')),
        description: error.message,
        variant: 'destructive',
      });
    } finally {
      setSaving(false);
    }
  }, [user, saved, eventTitle, eventDate, eventYear, eventDescription, eventCategory, imageUrl, t, toast]);

  if (!user) return null;

  return (
    <button
      onClick={handleSave}
      disabled={saving || saved}
      className={`inline-flex items-center justify-center w-7 h-7 rounded-full transition-all duration-200 ${
        saved
          ? 'bg-accent/20 text-accent'
          : 'bg-muted/80 hover:bg-accent/20 text-muted-foreground hover:text-accent'
      }`}
      title={saved ? String(t('eventAlreadySaved')) : String(t('saveEvent'))}
      aria-label={saved ? String(t('eventAlreadySaved')) : String(t('saveEvent'))}
    >
      {saving ? (
        <Loader2 className="h-3.5 w-3.5 animate-spin" />
      ) : saved ? (
        <BookmarkCheck className="h-3.5 w-3.5" />
      ) : (
        <Bookmark className="h-3.5 w-3.5" />
      )}
    </button>
  );
};
