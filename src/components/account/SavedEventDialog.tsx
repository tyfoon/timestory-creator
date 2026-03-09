import { useState, useEffect, useRef } from 'react';
import { Dialog, DialogContent, DialogHeader, DialogTitle } from '@/components/ui/dialog';
import { Button } from '@/components/ui/button';
import { Share2, Calendar, Tag, Download, MessageCircle, Send, Facebook, Twitter, Mail, Loader2, Copy, ArrowLeft } from 'lucide-react';
import { useLanguage } from '@/contexts/LanguageContext';
import { useToast } from '@/hooks/use-toast';

const SITE_URL = 'https://www.hetjaarvan.nl';

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
  startInShareMode?: boolean;
}

const categoryColors: Record<string, { bg: string; accent: string }> = {
  music: { bg: '#1a0a2e', accent: '#a855f7' },
  sports: { bg: '#0a1628', accent: '#3b82f6' },
  politics: { bg: '#1a0a0a', accent: '#ef4444' },
  science: { bg: '#0a1a1a', accent: '#14b8a6' },
  entertainment: { bg: '#2a1a0a', accent: '#f59e0b' },
  technology: { bg: '#0a1a2a', accent: '#06b6d4' },
  culture: { bg: '#1a0a1a', accent: '#ec4899' },
  world: { bg: '#0a1a0a', accent: '#22c55e' },
  personal: { bg: '#1a1a0a', accent: '#eab308' },
  default: { bg: '#111827', accent: '#8b5cf6' },
};

function wrapText(ctx: CanvasRenderingContext2D, text: string, maxWidth: number): string[] {
  const words = text.split(' ');
  const lines: string[] = [];
  let currentLine = '';

  for (const word of words) {
    const testLine = currentLine ? `${currentLine} ${word}` : word;
    if (ctx.measureText(testLine).width > maxWidth && currentLine) {
      lines.push(currentLine);
      currentLine = word;
    } else {
      currentLine = testLine;
    }
  }
  if (currentLine) lines.push(currentLine);
  return lines;
}

async function fetchImageAsBlob(imageUrl: string): Promise<string> {
  // Try direct CORS fetch first
  try {
    const response = await fetch(imageUrl, { mode: 'cors' });
    if (response.ok) {
      const blob = await response.blob();
      return URL.createObjectURL(blob);
    }
  } catch { /* fall through */ }

  // Fallback: proxy through edge function
  try {
    const supabaseUrl = import.meta.env.VITE_SUPABASE_URL;
    const supabaseKey = import.meta.env.VITE_SUPABASE_PUBLISHABLE_KEY;
    const response = await fetch(`${supabaseUrl}/functions/v1/proxy-image`, {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        'apikey': supabaseKey,
        'Authorization': `Bearer ${supabaseKey}`,
      },
      body: JSON.stringify({ url: imageUrl }),
    });
    if (response.ok) {
      const blob = await response.blob();
      return URL.createObjectURL(blob);
    }
  } catch { /* fall through */ }

  throw new Error('Could not load image');
}

async function generateEventImage(event: SavedEvent): Promise<Blob> {
  const W = 1080;
  const H = 1350;
  const canvas = document.createElement('canvas');
  canvas.width = W;
  canvas.height = H;
  const ctx = canvas.getContext('2d')!;

  const colors = categoryColors[event.event_category || 'default'] || categoryColors.default;

  // Background gradient
  const bgGrad = ctx.createLinearGradient(0, 0, W, H);
  bgGrad.addColorStop(0, colors.bg);
  bgGrad.addColorStop(1, '#000000');
  ctx.fillStyle = bgGrad;
  ctx.fillRect(0, 0, W, H);

  // Subtle pattern overlay
  ctx.fillStyle = 'rgba(255,255,255,0.02)';
  for (let i = 0; i < 50; i++) {
    const x = Math.random() * W;
    const y = Math.random() * H;
    ctx.beginPath();
    ctx.arc(x, y, Math.random() * 3 + 1, 0, Math.PI * 2);
    ctx.fill();
  }

  // Load and draw event image if available
  let imageLoaded = false;
  let actualImgH = 0;
  if (event.image_url) {
    try {
      const blobUrl = await fetchImageAsBlob(event.image_url);
      const img = new Image();
      img.src = blobUrl;

      await new Promise<void>((resolve, reject) => {
        img.onload = () => resolve();
        img.onerror = () => reject();
        if (img.complete && img.naturalWidth > 0) resolve();
      });

      // Draw image with rounded corners — adapt height to aspect ratio
      const imgY = 100;
      const imgX = 60;
      const imgW = W - 120;
      const imgAspect = img.naturalWidth / img.naturalHeight;
      // Contain-fit: scale to fill width, cap height between 350-600
      const rawH = imgW / imgAspect;
      const imgH = Math.max(350, Math.min(600, rawH));
      const radius = 24;

      ctx.save();
      ctx.beginPath();
      ctx.moveTo(imgX + radius, imgY);
      ctx.lineTo(imgX + imgW - radius, imgY);
      ctx.quadraticCurveTo(imgX + imgW, imgY, imgX + imgW, imgY + radius);
      ctx.lineTo(imgX + imgW, imgY + imgH - radius);
      ctx.quadraticCurveTo(imgX + imgW, imgY + imgH, imgX + imgW - radius, imgY + imgH);
      ctx.lineTo(imgX + radius, imgY + imgH);
      ctx.quadraticCurveTo(imgX, imgY + imgH, imgX, imgY + imgH - radius);
      ctx.lineTo(imgX, imgY + radius);
      ctx.quadraticCurveTo(imgX, imgY, imgX + radius, imgY);
      ctx.closePath();
      ctx.clip();

      // Soft cover: only crop minimally by using contain-leaning scale
      const scaleX = imgW / img.naturalWidth;
      const scaleY = imgH / img.naturalHeight;
      const scale = Math.max(scaleX, scaleY);
      const drawW = img.naturalWidth * scale;
      const drawH = img.naturalHeight * scale;
      const drawX = imgX + (imgW - drawW) / 2;
      const drawY = imgY + (imgH - drawH) / 2;
      ctx.drawImage(img, 0, 0, img.naturalWidth, img.naturalHeight, drawX, drawY, drawW, drawH);

      // Gradient overlay on image bottom
      const imgOverlay = ctx.createLinearGradient(0, imgY + imgH - 150, 0, imgY + imgH);
      imgOverlay.addColorStop(0, 'rgba(0,0,0,0)');
      imgOverlay.addColorStop(1, 'rgba(0,0,0,0.7)');
      ctx.fillStyle = imgOverlay;
      ctx.fillRect(imgX, imgY, imgW, imgH);

      ctx.restore();

      // Accent border line under image
      ctx.fillStyle = colors.accent;
      ctx.fillRect(imgX, imgY + imgH + 8, imgW, 4);

      imageLoaded = true;
      actualImgH = imgH;
      URL.revokeObjectURL(blobUrl);
    } catch {
      // Image load failed, continue without it
    }
  }

  const textStartY = imageLoaded ? 100 + actualImgH + 30 : 200;

  // Category badge
  if (event.event_category) {
    ctx.fillStyle = colors.accent + '33';
    const badgeText = event.event_category.toUpperCase();
    ctx.font = 'bold 28px "Source Sans 3", system-ui, sans-serif';
    const badgeWidth = ctx.measureText(badgeText).width + 40;
    const badgeX = 60;
    const badgeY = textStartY;

    // Rounded badge background
    const bRadius = 20;
    ctx.beginPath();
    ctx.moveTo(badgeX + bRadius, badgeY);
    ctx.lineTo(badgeX + badgeWidth - bRadius, badgeY);
    ctx.quadraticCurveTo(badgeX + badgeWidth, badgeY, badgeX + badgeWidth, badgeY + bRadius);
    ctx.lineTo(badgeX + badgeWidth, badgeY + 40 - bRadius);
    ctx.quadraticCurveTo(badgeX + badgeWidth, badgeY + 40, badgeX + badgeWidth - bRadius, badgeY + 40);
    ctx.lineTo(badgeX + bRadius, badgeY + 40);
    ctx.quadraticCurveTo(badgeX, badgeY + 40, badgeX, badgeY + 40 - bRadius);
    ctx.lineTo(badgeX, badgeY + bRadius);
    ctx.quadraticCurveTo(badgeX, badgeY, badgeX + bRadius, badgeY);
    ctx.closePath();
    ctx.fill();

    ctx.fillStyle = colors.accent;
    ctx.fillText(badgeText, badgeX + 20, badgeY + 29);
  }

  // Date
  const dateY = textStartY + (event.event_category ? 70 : 0);
  if (event.event_date || event.event_year) {
    ctx.font = '600 32px "Source Sans 3", system-ui, sans-serif';
    ctx.fillStyle = colors.accent;
    ctx.fillText(event.event_date || String(event.event_year), 60, dateY + 30);
  }

  // Title
  const titleY = dateY + ((event.event_date || event.event_year) ? 60 : 0);
  ctx.font = 'bold 52px "Playfair Display", Georgia, serif';
  ctx.fillStyle = '#ffffff';
  const titleLines = wrapText(ctx, event.event_title, W - 120);
  titleLines.slice(0, 3).forEach((line, i) => {
    ctx.fillText(line, 60, titleY + 50 + i * 62);
  });

  // Description
  const descY = titleY + 50 + titleLines.slice(0, 3).length * 62 + 20;
  if (event.event_description) {
    ctx.font = '400 30px "Source Sans 3", system-ui, sans-serif';
    ctx.fillStyle = 'rgba(255,255,255,0.7)';
    const descLines = wrapText(ctx, event.event_description, W - 120);
    descLines.slice(0, 5).forEach((line, i) => {
      ctx.fillText(line, 60, descY + i * 40);
    });
  }

  // Bottom branding section
  const footerY = H - 100;

  // Divider line
  ctx.fillStyle = 'rgba(255,255,255,0.1)';
  ctx.fillRect(60, footerY - 20, W - 120, 1);

  // App name and URL
  ctx.font = 'bold 28px "Playfair Display", Georgia, serif';
  ctx.fillStyle = 'rgba(255,255,255,0.9)';
  ctx.fillText('Het Jaar Van', 60, footerY + 20);

  ctx.font = '400 24px "Source Sans 3", system-ui, sans-serif';
  ctx.fillStyle = colors.accent;
  ctx.fillText(SITE_URL.replace('https://', ''), 60, footerY + 55);

  // Small decorative accent dot
  ctx.beginPath();
  ctx.arc(W - 80, footerY + 35, 20, 0, Math.PI * 2);
  ctx.fillStyle = colors.accent + '44';
  ctx.fill();
  ctx.beginPath();
  ctx.arc(W - 80, footerY + 35, 8, 0, Math.PI * 2);
  ctx.fillStyle = colors.accent;
  ctx.fill();

  return new Promise<Blob>((resolve) => {
    canvas.toBlob((blob) => resolve(blob!), 'image/png');
  });
}

export const SavedEventDialog = ({ event, open, onOpenChange, startInShareMode }: SavedEventDialogProps) => {
  const { t } = useLanguage();
  const { toast } = useToast();
  const [showSharePanel, setShowSharePanel] = useState(false);
  const [shareImageUrl, setShareImageUrl] = useState<string | null>(null);
  const [shareBlob, setShareBlob] = useState<Blob | null>(null);
  const [isGenerating, setIsGenerating] = useState(false);
  const hasAutoStarted = useRef(false);

  useEffect(() => {
    if (open && startInShareMode && !showSharePanel && !isGenerating && !hasAutoStarted.current) {
      hasAutoStarted.current = true;
      handleStartShare();
    }
    if (!open) {
      hasAutoStarted.current = false;
    }
  }, [open, startInShareMode]);

  const handleStartShare = async () => {
    setIsGenerating(true);
    try {
      const blob = await generateEventImage(event);
      setShareBlob(blob);
      setShareImageUrl(URL.createObjectURL(blob));
      setShowSharePanel(true);
    } catch {
      toast({ title: 'Er ging iets mis bij het maken van de afbeelding', variant: 'destructive' });
    } finally {
      setIsGenerating(false);
    }
  };

  const handleDownload = () => {
    if (!shareImageUrl) return;
    const a = document.createElement('a');
    a.href = shareImageUrl;
    a.download = `${event.event_title.replace(/[^a-zA-Z0-9]/g, '-')}.png`;
    a.click();
  };

  const handleCopyText = () => {
    const text = `${event.event_title}${event.event_date ? ` (${event.event_date})` : ''}${event.event_description ? `\n${event.event_description}` : ''}\n\n${SITE_URL}`;
    try {
      navigator.clipboard.writeText(text);
    } catch {
      const ta = document.createElement('textarea');
      ta.value = text;
      ta.style.position = 'fixed';
      ta.style.opacity = '0';
      document.body.appendChild(ta);
      ta.select();
      document.execCommand('copy');
      document.body.removeChild(ta);
    }
    toast({ title: 'Gekopieerd!', description: 'Tekst gekopieerd naar klembord.' });
  };

  const handleNativeShare = async () => {
    if (!shareBlob) return;
    const file = new File([shareBlob], 'gebeurtenis.png', { type: 'image/png' });
    try {
      if (navigator.canShare?.({ files: [file] })) {
        await navigator.share({ title: event.event_title, files: [file] });
        return;
      }
    } catch { /* fallback */ }
    handleDownload();
  };

  const shareText = encodeURIComponent(`${event.event_title} — Bekijk mijn tijdlijn op ${SITE_URL}`);

  const handleClose = (isOpen: boolean) => {
    if (!isOpen) {
      setShowSharePanel(false);
      if (shareImageUrl) {
        URL.revokeObjectURL(shareImageUrl);
        setShareImageUrl(null);
        setShareBlob(null);
      }
    }
    onOpenChange(isOpen);
  };

  return (
    <Dialog open={open} onOpenChange={handleClose}>
      <DialogContent className="sm:max-w-md max-h-[85vh] overflow-y-auto">
        {!showSharePanel ? (
          <>
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
              <Button onClick={handleStartShare} disabled={isGenerating} className="gap-2">
                {isGenerating ? <Loader2 className="h-4 w-4 animate-spin" /> : <Share2 className="h-4 w-4" />}
                {isGenerating ? 'Afbeelding maken...' : 'Delen'}
              </Button>
            </div>
          </>
        ) : (
          <>
            <DialogHeader>
              <div className="flex items-center gap-2">
                <Button variant="ghost" size="icon" className="h-8 w-8" onClick={() => setShowSharePanel(false)}>
                  <ArrowLeft className="h-4 w-4" />
                </Button>
                <DialogTitle className="font-serif text-lg">Deel deze gebeurtenis</DialogTitle>
              </div>
            </DialogHeader>

            {/* Image preview */}
            {shareImageUrl && (
              <div className="rounded-lg overflow-hidden border border-border">
                <img src={shareImageUrl} alt="Preview" className="w-full" />
              </div>
            )}

            {/* Native share (mobile) */}
            {'share' in navigator && (
              <Button onClick={handleNativeShare} className="w-full gap-2">
                <Share2 className="h-4 w-4" />
                Delen...
              </Button>
            )}

            {/* Share buttons grid */}
            <div className="space-y-2">
              <label className="text-sm font-medium">Deel via</label>
              <div className="grid grid-cols-5 gap-2">
                <a
                  href={`https://wa.me/?text=${shareText}`}
                  target="_blank"
                  rel="noopener noreferrer"
                  className="flex flex-col items-center gap-1 p-3 rounded-lg bg-[#25D366]/10 hover:bg-[#25D366]/20 transition-colors"
                >
                  <MessageCircle className="h-6 w-6 text-[#25D366]" />
                  <span className="text-[10px] text-muted-foreground">WhatsApp</span>
                </a>
                <a
                  href={`https://t.me/share/url?url=${encodeURIComponent(SITE_URL)}&text=${shareText}`}
                  target="_blank"
                  rel="noopener noreferrer"
                  className="flex flex-col items-center gap-1 p-3 rounded-lg bg-[#0088cc]/10 hover:bg-[#0088cc]/20 transition-colors"
                >
                  <Send className="h-6 w-6 text-[#0088cc]" />
                  <span className="text-[10px] text-muted-foreground">Telegram</span>
                </a>
                <a
                  href={`https://www.facebook.com/sharer/sharer.php?u=${encodeURIComponent(SITE_URL)}`}
                  target="_blank"
                  rel="noopener noreferrer"
                  className="flex flex-col items-center gap-1 p-3 rounded-lg bg-[#1877F2]/10 hover:bg-[#1877F2]/20 transition-colors"
                >
                  <Facebook className="h-6 w-6 text-[#1877F2]" />
                  <span className="text-[10px] text-muted-foreground">Facebook</span>
                </a>
                <a
                  href={`https://twitter.com/intent/tweet?text=${shareText}`}
                  target="_blank"
                  rel="noopener noreferrer"
                  className="flex flex-col items-center gap-1 p-3 rounded-lg bg-foreground/10 hover:bg-foreground/20 transition-colors"
                >
                  <Twitter className="h-6 w-6" />
                  <span className="text-[10px] text-muted-foreground">X</span>
                </a>
                <a
                  href={`mailto:?subject=${encodeURIComponent(event.event_title)}&body=${shareText}`}
                  className="flex flex-col items-center gap-1 p-3 rounded-lg bg-primary/10 hover:bg-primary/20 transition-colors"
                >
                  <Mail className="h-6 w-6 text-primary" />
                  <span className="text-[10px] text-muted-foreground">E-mail</span>
                </a>
              </div>
            </div>

            {/* Download & copy actions */}
            <div className="flex gap-2">
              <Button variant="outline" onClick={handleDownload} className="flex-1 gap-2 text-sm">
                <Download className="h-4 w-4" />
                Download afbeelding
              </Button>
              <Button variant="outline" onClick={handleCopyText} className="flex-1 gap-2 text-sm">
                <Copy className="h-4 w-4" />
                Kopieer tekst
              </Button>
            </div>
          </>
        )}
      </DialogContent>
    </Dialog>
  );
};
