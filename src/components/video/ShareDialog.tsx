import React, { useState } from 'react';
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogDescription } from '@/components/ui/dialog';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Progress } from '@/components/ui/progress';
import { 
  Share2, 
  Copy, 
  Check, 
  Loader2, 
  Link as LinkIcon,
  MessageCircle,
  Send,
  Facebook,
  Twitter,
  Mail,
  AlertCircle
} from 'lucide-react';
import { useSaveStory, StoryContent, StorySettings } from '@/hooks/useSaveStory';

interface ShareDialogProps {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  content: StoryContent;
  settings: StorySettings;
  onShareComplete?: (shareUrl: string) => void;
}

export const ShareDialog: React.FC<ShareDialogProps> = ({
  open,
  onOpenChange,
  content,
  settings,
  onShareComplete,
}) => {
  const { saveStory, isSaving, progress, progressMessage } = useSaveStory();
  const [shareUrl, setShareUrl] = useState<string | null>(null);
  const [error, setError] = useState<string | null>(null);
  const [copied, setCopied] = useState(false);

  // Start save process when dialog opens (if not already saved)
  React.useEffect(() => {
    if (open && !shareUrl && !isSaving && !error) {
      handleSave();
    }
  }, [open]);

  const handleSave = async () => {
    setError(null);
    const result = await saveStory(content, settings);
    
    if (result.success && result.shareUrl) {
      setShareUrl(result.shareUrl);
      onShareComplete?.(result.shareUrl);
    } else {
      setError(result.error || 'Er ging iets mis');
    }
  };

  const handleCopy = async () => {
    if (!shareUrl) return;
    
    try {
      await navigator.clipboard.writeText(shareUrl);
      setCopied(true);
      setTimeout(() => setCopied(false), 2000);
    } catch (err) {
      console.error('Copy failed:', err);
    }
  };

  const handleNativeShare = async () => {
    if (!shareUrl) return;
    
    try {
      await navigator.share({
        title: content.storyTitle || 'Mijn TimeStory',
        text: 'Bekijk mijn persoonlijke tijdlijn video!',
        url: shareUrl,
      });
    } catch (err) {
      // User cancelled or share not supported
      console.log('Share cancelled or not supported');
    }
  };

  const shareLinks = shareUrl ? {
    whatsapp: `https://wa.me/?text=${encodeURIComponent(`Bekijk mijn TimeStory: ${shareUrl}`)}`,
    telegram: `https://t.me/share/url?url=${encodeURIComponent(shareUrl)}&text=${encodeURIComponent('Bekijk mijn TimeStory!')}`,
    facebook: `https://www.facebook.com/sharer/sharer.php?u=${encodeURIComponent(shareUrl)}`,
    twitter: `https://twitter.com/intent/tweet?url=${encodeURIComponent(shareUrl)}&text=${encodeURIComponent('Bekijk mijn persoonlijke tijdlijn video!')}`,
    email: `mailto:?subject=${encodeURIComponent('Bekijk mijn TimeStory')}&body=${encodeURIComponent(`Ik heb een persoonlijke tijdlijn video gemaakt! Bekijk hem hier: ${shareUrl}`)}`,
  } : null;

  const handleClose = () => {
    // Reset state when closing
    if (!isSaving) {
      onOpenChange(false);
      // Keep shareUrl so we don't re-upload if opened again
    }
  };

  return (
    <Dialog open={open} onOpenChange={handleClose}>
      <DialogContent className="w-[95vw] max-w-md p-4 sm:p-6">
        <DialogHeader className="pb-2">
          <DialogTitle className="flex items-center gap-2">
            <Share2 className="h-5 w-5 text-primary" />
            Deel je video
          </DialogTitle>
          <DialogDescription>
            {isSaving ? 'Even geduld, we maken je deelbare link...' : 
             shareUrl ? 'Je video is klaar om te delen!' :
             'Er ging iets mis'}
          </DialogDescription>
        </DialogHeader>

        <div className="space-y-4 py-2">
          {/* Loading state */}
          {isSaving && (
            <div className="space-y-3">
              <div className="flex items-center gap-3">
                <Loader2 className="h-5 w-5 animate-spin text-primary" />
                <span className="text-sm text-muted-foreground">{progressMessage}</span>
              </div>
              <Progress value={progress} className="h-2" />
            </div>
          )}

          {/* Error state */}
          {error && !isSaving && (
            <div className="p-4 bg-destructive/10 border border-destructive/30 rounded-lg">
              <div className="flex items-start gap-3">
                <AlertCircle className="h-5 w-5 text-destructive flex-shrink-0 mt-0.5" />
                <div>
                  <p className="text-sm text-destructive font-medium">Uploaden mislukt</p>
                  <p className="text-xs text-destructive/80 mt-1">{error}</p>
                </div>
              </div>
              <Button 
                onClick={handleSave} 
                variant="outline" 
                size="sm" 
                className="mt-3 w-full"
              >
                Probeer opnieuw
              </Button>
            </div>
          )}

          {/* Success state - Share options */}
          {shareUrl && !isSaving && (
            <>
              {/* Copy link input */}
              <div className="space-y-2">
                <label className="text-sm font-medium">Link kopiëren</label>
                <div className="flex gap-2">
                  <Input 
                    value={shareUrl} 
                    readOnly 
                    className="bg-muted text-xs sm:text-sm"
                  />
                  <Button 
                    onClick={handleCopy} 
                    variant="secondary" 
                    size="icon"
                    className="flex-shrink-0"
                  >
                    {copied ? <Check className="h-4 w-4 text-green-500" /> : <Copy className="h-4 w-4" />}
                  </Button>
                </div>
              </div>

              {/* Native share button (mobile) */}
              {'share' in navigator && (
                <Button 
                  onClick={handleNativeShare} 
                  className="w-full gap-2"
                  variant="default"
                >
                  <Share2 className="h-4 w-4" />
                  Delen...
                </Button>
              )}

              {/* Share buttons grid */}
              <div className="space-y-2">
                <label className="text-sm font-medium">Deel via</label>
                <div className="grid grid-cols-5 gap-2">
                  {/* WhatsApp */}
                  <a 
                    href={shareLinks?.whatsapp} 
                    target="_blank" 
                    rel="noopener noreferrer"
                    className="flex flex-col items-center gap-1 p-3 rounded-lg bg-[#25D366]/10 hover:bg-[#25D366]/20 transition-colors"
                  >
                    <MessageCircle className="h-6 w-6 text-[#25D366]" />
                    <span className="text-[10px] text-muted-foreground">WhatsApp</span>
                  </a>

                  {/* Telegram */}
                  <a 
                    href={shareLinks?.telegram} 
                    target="_blank" 
                    rel="noopener noreferrer"
                    className="flex flex-col items-center gap-1 p-3 rounded-lg bg-[#0088cc]/10 hover:bg-[#0088cc]/20 transition-colors"
                  >
                    <Send className="h-6 w-6 text-[#0088cc]" />
                    <span className="text-[10px] text-muted-foreground">Telegram</span>
                  </a>

                  {/* Facebook */}
                  <a 
                    href={shareLinks?.facebook} 
                    target="_blank" 
                    rel="noopener noreferrer"
                    className="flex flex-col items-center gap-1 p-3 rounded-lg bg-[#1877F2]/10 hover:bg-[#1877F2]/20 transition-colors"
                  >
                    <Facebook className="h-6 w-6 text-[#1877F2]" />
                    <span className="text-[10px] text-muted-foreground">Facebook</span>
                  </a>

                  {/* Twitter/X */}
                  <a 
                    href={shareLinks?.twitter} 
                    target="_blank" 
                    rel="noopener noreferrer"
                    className="flex flex-col items-center gap-1 p-3 rounded-lg bg-foreground/10 hover:bg-foreground/20 transition-colors"
                  >
                    <Twitter className="h-6 w-6" />
                    <span className="text-[10px] text-muted-foreground">X</span>
                  </a>

                  {/* Email */}
                  <a 
                    href={shareLinks?.email}
                    className="flex flex-col items-center gap-1 p-3 rounded-lg bg-primary/10 hover:bg-primary/20 transition-colors"
                  >
                    <Mail className="h-6 w-6 text-primary" />
                    <span className="text-[10px] text-muted-foreground">E-mail</span>
                  </a>
                </div>
              </div>

              {/* Direct link */}
              <div className="pt-2 border-t border-border">
                <a 
                  href={shareUrl} 
                  target="_blank" 
                  rel="noopener noreferrer"
                  className="flex items-center gap-2 text-sm text-primary hover:underline"
                >
                  <LinkIcon className="h-4 w-4" />
                  Bekijk je gedeelde video
                </a>
              </div>
            </>
          )}
        </div>
      </DialogContent>
    </Dialog>
  );
};
