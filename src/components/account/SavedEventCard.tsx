import { useState } from 'react';
import { Share2, Trash2, ExternalLink } from 'lucide-react';
import { Button } from '@/components/ui/button';
import { useLanguage } from '@/contexts/LanguageContext';
import { useToast } from '@/hooks/use-toast';
import { SavedEventDialog } from './SavedEventDialog';

interface SavedEvent {
  id: string;
  event_title: string;
  event_date?: string;
  event_year?: number;
  event_description?: string;
  event_category?: string;
  image_url?: string;
  created_at: string;
}

interface SavedEventCardProps {
  event: SavedEvent;
  onDelete: (id: string) => void;
}

export const SavedEventCard = ({ event, onDelete }: SavedEventCardProps) => {
  const { t } = useLanguage();
  const { toast } = useToast();
  const [dialogOpen, setDialogOpen] = useState(false);

  const handleShare = (e: React.MouseEvent) => {
    e.stopPropagation();
    const text = `${event.event_title}${event.event_date ? ` (${event.event_date})` : ''}${event.event_description ? `\n${event.event_description}` : ''}`;

    if (navigator.share) {
      navigator.share({ title: event.event_title, text }).catch(() => {
        navigator.clipboard.writeText(text);
        toast({ title: String(t('eventShared')) });
      });
    } else {
      navigator.clipboard.writeText(text);
      toast({ title: String(t('eventShared')) });
    }
  };

  return (
    <>
      <div
        className="rounded-lg border border-border p-3 hover:bg-muted/50 transition-colors flex gap-3 cursor-pointer"
        onClick={() => setDialogOpen(true)}
      >
        {event.image_url && (
          <div className="w-16 h-16 flex-shrink-0 rounded-md overflow-hidden">
            <img
              src={event.image_url}
              alt={event.event_title}
              className="w-full h-full object-cover"
              loading="lazy"
            />
          </div>
        )}
        <div className="flex-1 min-w-0">
          <div className="flex items-start justify-between gap-2">
            <div className="min-w-0">
              <h4 className="font-serif font-medium text-foreground text-sm truncate">
                {event.event_title}
              </h4>
              {event.event_date && (
                <p className="text-xs text-muted-foreground">{event.event_date}</p>
              )}
              {event.event_description && (
                <p className="text-xs text-muted-foreground mt-1 line-clamp-2">
                  {event.event_description}
                </p>
              )}
            </div>
            <div className="flex items-center gap-0.5 flex-shrink-0">
              <Button
                variant="ghost"
                size="sm"
                onClick={handleShare}
                title={String(t('accountShareStory'))}
              >
                <Share2 className="h-4 w-4" />
              </Button>
              <Button
                variant="ghost"
                size="sm"
                onClick={(e) => { e.stopPropagation(); onDelete(event.id); }}
                title={String(t('accountDeleteStory'))}
                className="text-destructive hover:text-destructive"
              >
                <Trash2 className="h-4 w-4" />
              </Button>
            </div>
          </div>
        </div>
      </div>
      <SavedEventDialog event={event} open={dialogOpen} onOpenChange={setDialogOpen} onShare={handleShare} />
    </>
  );
};
