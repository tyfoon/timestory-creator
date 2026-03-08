import { Dialog, DialogContent, DialogHeader, DialogTitle } from '@/components/ui/dialog';
import { Button } from '@/components/ui/button';
import { Share2, Calendar, Tag } from 'lucide-react';
import { useLanguage } from '@/contexts/LanguageContext';

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

interface SavedEventDialogProps {
  event: SavedEvent;
  open: boolean;
  onOpenChange: (open: boolean) => void;
  onShare: (e: React.MouseEvent) => void;
}

export const SavedEventDialog = ({ event, open, onOpenChange, onShare }: SavedEventDialogProps) => {
  const { t } = useLanguage();

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="sm:max-w-md max-h-[85vh] overflow-y-auto">
        <DialogHeader>
          <DialogTitle className="font-serif text-xl pr-6">{event.event_title}</DialogTitle>
        </DialogHeader>

        {event.image_url && (
          <div className="w-full rounded-lg overflow-hidden aspect-video">
            <img
              src={event.image_url}
              alt={event.event_title}
              className="w-full h-full object-cover"
            />
          </div>
        )}

        <div className="space-y-3">
          {(event.event_date || event.event_year) && (
            <div className="flex items-center gap-2 text-sm text-muted-foreground">
              <Calendar className="h-4 w-4" />
              <span>{event.event_date || event.event_year}</span>
            </div>
          )}

          {event.event_category && (
            <div className="flex items-center gap-2 text-sm text-muted-foreground">
              <Tag className="h-4 w-4" />
              <span className="capitalize">{event.event_category}</span>
            </div>
          )}

          {event.event_description && (
            <p className="text-sm text-foreground leading-relaxed whitespace-pre-line">
              {event.event_description}
            </p>
          )}
        </div>

        <div className="flex justify-end pt-2">
          <Button variant="outline" size="sm" onClick={onShare}>
            <Share2 className="h-4 w-4 mr-2" />
            {String(t('shareNow'))}
          </Button>
        </div>
      </DialogContent>
    </Dialog>
  );
};
