import { useState, useCallback, useEffect, useRef } from 'react';
import { Dialog, DialogContent, DialogHeader, DialogTitle } from '@/components/ui/dialog';
import { Button } from '@/components/ui/button';
import { Slider } from '@/components/ui/slider';
import { Badge } from '@/components/ui/badge';
import { 
  Loader2, Share2, Bookmark, Flame, Thermometer, Download,
  MessageCircle, Send, Facebook, Twitter, Mail, Copy, Check
} from 'lucide-react';
import { TimelineEvent } from '@/types/timeline';
import { FormData } from '@/types/form';
import { useAuth } from '@/contexts/AuthContext';
import { supabase } from '@/integrations/supabase/client';
import { useToast } from '@/hooks/use-toast';
import { useLanguage } from '@/contexts/LanguageContext';

const SUPABASE_URL = import.meta.env.VITE_SUPABASE_URL || 'https://koeoboygsssyajpdstel.supabase.co';
const SUPABASE_ANON_KEY = import.meta.env.VITE_SUPABASE_PUBLISHABLE_KEY || 'eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZSIsInJlZiI6ImtvZW9ib3lnc3NzeWFqcGRzdGVsIiwicm9sZSI6ImFub24iLCJpYXQiOjE3NjkyNTY2NjEsImV4cCI6MjA4NDgzMjY2MX0.KuFaWF4r_cxZRiOumPGMChLVmwgyhT9vR5s7L52zr5s';

const SITE_URL = 'https://www.hetjaarvan.nl';

interface RoastDialogProps {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  events: TimelineEvent[];
  formData: FormData | null;
}

const intensityLabels = ['', 'Mild', 'Pittig', 'Gemiddeld', 'Scherp', 'Extreem'];
const intensityEmojis = ['', '😊', '😏', '😄', '🔥', '💀'];

/** Generate a branded portrait image (1080x1350) from roast text */
const generateRoastImage = async (
  roastText: string,
  intensity: number,
  periodLabel: string,
): Promise<Blob> => {
  const W = 1080;
  const H = 1350;
  const canvas = document.createElement('canvas');
  canvas.width = W;
  canvas.height = H;
  const ctx = canvas.getContext('2d')!;

  // Background gradient based on intensity
  const gradients: Record<number, [string, string, string]> = {
    1: ['#1a1a2e', '#16213e', '#0f3460'],
    2: ['#1a1a2e', '#2d1b3d', '#4a1942'],
    3: ['#1a1a2e', '#3d1b1b', '#6b2020'],
    4: ['#2d0a0a', '#5c1010', '#8b1a1a'],
    5: ['#1a0000', '#4a0000', '#8b0000'],
  };
  const [c1, c2, c3] = gradients[intensity] || gradients[3];
  const grad = ctx.createLinearGradient(0, 0, 0, H);
  grad.addColorStop(0, c1);
  grad.addColorStop(0.5, c2);
  grad.addColorStop(1, c3);
  ctx.fillStyle = grad;
  ctx.fillRect(0, 0, W, H);

  // Subtle texture overlay
  ctx.globalAlpha = 0.03;
  for (let i = 0; i < 8000; i++) {
    const x = Math.random() * W;
    const y = Math.random() * H;
    ctx.fillStyle = Math.random() > 0.5 ? '#ffffff' : '#000000';
    ctx.fillRect(x, y, 1, 1);
  }
  ctx.globalAlpha = 1;

  // Decorative fire emoji top
  ctx.font = '80px serif';
  ctx.textAlign = 'center';
  ctx.fillText('🔥', W / 2, 120);

  // Title
  ctx.fillStyle = '#ffffff';
  ctx.font = 'bold 56px Georgia, serif';
  ctx.textAlign = 'center';
  ctx.fillText('ROAST MIJN LEVEN', W / 2, 210);

  // Intensity badge
  const badgeText = `${intensityEmojis[intensity]} ${intensityLabels[intensity]}`.trim();
  ctx.font = 'bold 28px sans-serif';
  const badgeWidth = ctx.measureText(badgeText).width + 40;
  const badgeX = (W - badgeWidth) / 2;
  const badgeY = 235;
  ctx.fillStyle = 'rgba(255,255,255,0.12)';
  ctx.beginPath();
  ctx.roundRect(badgeX, badgeY, badgeWidth, 42, 21);
  ctx.fill();
  ctx.fillStyle = '#ffaa44';
  ctx.textAlign = 'center';
  ctx.fillText(badgeText, W / 2, badgeY + 30);

  // Period label
  if (periodLabel) {
    ctx.font = '22px sans-serif';
    ctx.fillStyle = 'rgba(255,255,255,0.5)';
    ctx.fillText(periodLabel, W / 2, badgeY + 72);
  }

  // Roast text with word wrap
  const textMarginX = 80;
  const textStartY = 370;
  const maxTextWidth = W - textMarginX * 2;
  const lineHeight = 42;
  ctx.font = '30px Georgia, serif';
  ctx.fillStyle = '#e8e8e8';
  ctx.textAlign = 'left';

  const words = roastText.split(' ');
  const lines: string[] = [];
  let currentLine = '';
  for (const word of words) {
    const testLine = currentLine ? `${currentLine} ${word}` : word;
    if (ctx.measureText(testLine).width > maxTextWidth) {
      lines.push(currentLine);
      currentLine = word;
    } else {
      currentLine = testLine;
    }
  }
  if (currentLine) lines.push(currentLine);

  const totalTextHeight = lines.length * lineHeight;
  const availableSpace = H - textStartY - 180;
  const textY = textStartY + Math.max(0, (availableSpace - totalTextHeight) / 2);

  // Opening quote
  ctx.font = 'bold 120px Georgia, serif';
  ctx.fillStyle = 'rgba(255,170,68,0.25)';
  ctx.textAlign = 'left';
  ctx.fillText('"', textMarginX - 20, textY + 20);

  // Draw lines
  ctx.font = '30px Georgia, serif';
  ctx.fillStyle = '#e8e8e8';
  lines.forEach((line, i) => {
    ctx.fillText(line, textMarginX, textY + 40 + i * lineHeight);
  });

  // Closing quote
  ctx.font = 'bold 120px Georgia, serif';
  ctx.fillStyle = 'rgba(255,170,68,0.25)';
  ctx.textAlign = 'right';
  ctx.fillText('"', W - textMarginX + 20, textY + 40 + lines.length * lineHeight + 30);

  // Divider line
  const footerY = H - 120;
  ctx.strokeStyle = 'rgba(255,255,255,0.15)';
  ctx.lineWidth = 1;
  ctx.beginPath();
  ctx.moveTo(textMarginX, footerY);
  ctx.lineTo(W - textMarginX, footerY);
  ctx.stroke();

  // Branding footer
  ctx.fillStyle = 'rgba(255,255,255,0.5)';
  ctx.font = 'bold 24px sans-serif';
  ctx.textAlign = 'center';
  ctx.fillText('www.hetjaarvan.nl', W / 2, footerY + 35);

  ctx.fillStyle = 'rgba(255,255,255,0.3)';
  ctx.font = '20px sans-serif';
  ctx.fillText('Ontdek jouw tijdreis • Gratis', W / 2, footerY + 65);

  return new Promise<Blob>((resolve, reject) => {
    canvas.toBlob(
      (blob) => (blob ? resolve(blob) : reject(new Error('Canvas to blob failed'))),
      'image/png',
    );
  });
};

export const RoastDialog = ({ open, onOpenChange, events, formData }: RoastDialogProps) => {
  const [intensity, setIntensity] = useState(3);
  const [roastText, setRoastText] = useState('');
  const [isLoading, setIsLoading] = useState(false);
  const [isGeneratingImage, setIsGeneratingImage] = useState(false);
  const [shareImageUrl, setShareImageUrl] = useState<string | null>(null);
  const [showSharePanel, setShowSharePanel] = useState(false);
  const [copied, setCopied] = useState(false);
  const [hasGenerated, setHasGenerated] = useState(false);
  const { user } = useAuth();
  const { toast } = useToast();
  const { language } = useLanguage();

  const periodLabel = formData?.yearRange
    ? `${formData.yearRange.startYear} – ${formData.yearRange.endYear}`
    : formData?.birthDate
      ? `Geboren in ${formData.birthDate.year}`
      : '';

  const shareText = `🔥 Roast mijn leven (${intensityLabels[intensity]}) - Ontdek jouw tijdreis op ${SITE_URL}`;

  const generateRoast = useCallback(async (level: number) => {
    setIsLoading(true);
    setShowSharePanel(false);
    setShareImageUrl(null);
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

  // Generate on first open
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

  const handleIntensityChange = (value: number[]) => {
    const newIntensity = value[0];
    setIntensity(newIntensity);
    setShowSharePanel(false);
    setShareImageUrl(null);
    if (hasGenerated) {
      generateRoast(newIntensity);
    }
  };

  const handleShareClick = async () => {
    if (!roastText) return;
    setIsGeneratingImage(true);

    try {
      const blob = await generateRoastImage(roastText, intensity, periodLabel);
      const url = URL.createObjectURL(blob);
      setShareImageUrl(url);
      setShowSharePanel(true);
    } catch (err) {
      console.error('Image generation error:', err);
      toast({ title: 'Oeps', description: 'Kon de afbeelding niet genereren.', variant: 'destructive' });
    } finally {
      setIsGeneratingImage(false);
    }
  };

  const handleNativeShare = async () => {
    if (!shareImageUrl) return;
    try {
      const resp = await fetch(shareImageUrl);
      const blob = await resp.blob();
      const file = new File([blob], 'roast-mijn-leven.png', { type: 'image/png' });

      if (navigator.share && navigator.canShare?.({ files: [file] })) {
        await navigator.share({
          title: 'Roast mijn leven',
          text: shareText,
          files: [file],
        });
        return;
      }
    } catch {
      // fallthrough
    }
    handleDownloadImage();
  };

  const handleDownloadImage = () => {
    if (!shareImageUrl) return;
    const a = document.createElement('a');
    a.href = shareImageUrl;
    a.download = 'roast-mijn-leven.png';
    document.body.appendChild(a);
    a.click();
    document.body.removeChild(a);
    toast({ title: 'Gedownload!', description: 'Deel de afbeelding op social media!' });
  };

  const handleCopyText = async () => {
    const text = `🔥 Roast van mijn leven (${intensityLabels[intensity]}):\n\n${roastText}\n\n${SITE_URL}`;
    try {
      await navigator.clipboard.writeText(text);
    } catch {
      const textarea = document.createElement('textarea');
      textarea.value = text;
      textarea.style.position = 'fixed';
      textarea.style.opacity = '0';
      document.body.appendChild(textarea);
      textarea.select();
      document.execCommand('copy');
      document.body.removeChild(textarea);
    }
    setCopied(true);
    setTimeout(() => setCopied(false), 2000);
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

  const handleOpenChange = (nextOpen: boolean) => {
    if (!nextOpen) {
      setHasGenerated(false);
      setRoastText('');
      setShowSharePanel(false);
      if (shareImageUrl) {
        URL.revokeObjectURL(shareImageUrl);
        setShareImageUrl(null);
      }
    }
    onOpenChange(nextOpen);
  };

  // Share links (text-only, image is shared separately)
  const encodedShareText = encodeURIComponent(shareText);
  const encodedUrl = encodeURIComponent(SITE_URL);

  return (
    <Dialog open={open} onOpenChange={handleOpenChange}>
      <DialogContent className="max-w-lg w-[95vw] sm:w-full max-h-[90vh] overflow-y-auto bg-card border-border">
        <DialogHeader>
          <div className="flex items-center gap-2">
            <Flame className="h-6 w-6 text-orange-500" />
            <DialogTitle className="font-serif text-xl">Roast mijn leven</DialogTitle>
          </div>
        </DialogHeader>

        <div className="space-y-5 pt-2">
          {/* Roast text */}
          <div className="min-h-[120px] relative">
            {isLoading ? (
              <div className="flex flex-col items-center justify-center h-32 gap-3">
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
            <Button 
              onClick={handleShareClick} 
              variant="outline" 
              size="sm" 
              className="flex-1 gap-1.5 text-xs" 
              disabled={!roastText || isLoading || isGeneratingImage}
            >
              {isGeneratingImage ? <Loader2 className="h-3.5 w-3.5 animate-spin" /> : <Share2 className="h-3.5 w-3.5" />}
              {isGeneratingImage ? 'Afbeelding maken...' : 'Delen'}
            </Button>
            {user && (
              <Button onClick={handleSave} variant="outline" size="sm" className="flex-1 gap-1.5 text-xs" disabled={!roastText || isLoading}>
                <Bookmark className="h-3.5 w-3.5" />
                Opslaan
              </Button>
            )}
          </div>

          {/* Share panel - shown after image is generated */}
          {showSharePanel && shareImageUrl && (
            <div className="space-y-4 pt-2 border-t border-border">
              {/* Preview of generated image */}
              <div className="rounded-lg overflow-hidden border border-border/50 shadow-md">
                <img 
                  src={shareImageUrl} 
                  alt="Roast afbeelding" 
                  className="w-full h-auto"
                />
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
                <label className="text-sm font-medium text-foreground">Deel via</label>
                <div className="grid grid-cols-5 gap-2">
                  {/* WhatsApp */}
                  <a 
                    href={`https://wa.me/?text=${encodedShareText}`}
                    target="_blank" 
                    rel="noopener noreferrer"
                    className="flex flex-col items-center gap-1 p-3 rounded-lg bg-[#25D366]/10 hover:bg-[#25D366]/20 transition-colors"
                  >
                    <MessageCircle className="h-6 w-6 text-[#25D366]" />
                    <span className="text-[10px] text-muted-foreground">WhatsApp</span>
                  </a>

                  {/* Telegram */}
                  <a 
                    href={`https://t.me/share/url?url=${encodedUrl}&text=${encodedShareText}`}
                    target="_blank" 
                    rel="noopener noreferrer"
                    className="flex flex-col items-center gap-1 p-3 rounded-lg bg-[#0088cc]/10 hover:bg-[#0088cc]/20 transition-colors"
                  >
                    <Send className="h-6 w-6 text-[#0088cc]" />
                    <span className="text-[10px] text-muted-foreground">Telegram</span>
                  </a>

                  {/* Facebook */}
                  <a 
                    href={`https://www.facebook.com/sharer/sharer.php?u=${encodedUrl}`}
                    target="_blank" 
                    rel="noopener noreferrer"
                    className="flex flex-col items-center gap-1 p-3 rounded-lg bg-[#1877F2]/10 hover:bg-[#1877F2]/20 transition-colors"
                  >
                    <Facebook className="h-6 w-6 text-[#1877F2]" />
                    <span className="text-[10px] text-muted-foreground">Facebook</span>
                  </a>

                  {/* Twitter/X */}
                  <a 
                    href={`https://twitter.com/intent/tweet?url=${encodedUrl}&text=${encodedShareText}`}
                    target="_blank" 
                    rel="noopener noreferrer"
                    className="flex flex-col items-center gap-1 p-3 rounded-lg bg-foreground/10 hover:bg-foreground/20 transition-colors"
                  >
                    <Twitter className="h-6 w-6" />
                    <span className="text-[10px] text-muted-foreground">X</span>
                  </a>

                  {/* Email */}
                  <a 
                    href={`mailto:?subject=${encodeURIComponent('🔥 Roast mijn leven')}&body=${encodeURIComponent(`Bekijk mijn roast:\n\n${roastText}\n\nMaak je eigen tijdreis op ${SITE_URL}`)}`}
                    className="flex flex-col items-center gap-1 p-3 rounded-lg bg-primary/10 hover:bg-primary/20 transition-colors"
                  >
                    <Mail className="h-6 w-6 text-primary" />
                    <span className="text-[10px] text-muted-foreground">E-mail</span>
                  </a>
                </div>
              </div>

              {/* Copy text + Download image */}
              <div className="flex gap-2">
                <Button onClick={handleCopyText} variant="outline" size="sm" className="flex-1 gap-1.5 text-xs">
                  {copied ? <Check className="h-3.5 w-3.5 text-green-500" /> : <Copy className="h-3.5 w-3.5" />}
                  {copied ? 'Gekopieerd!' : 'Kopieer tekst'}
                </Button>
                <Button onClick={handleDownloadImage} variant="outline" size="sm" className="flex-1 gap-1.5 text-xs">
                  <Download className="h-3.5 w-3.5" />
                  Download afbeelding
                </Button>
              </div>
            </div>
          )}
        </div>
      </DialogContent>
    </Dialog>
  );
};
