import React, { useState, useCallback } from 'react';
import { Button } from '@/components/ui/button';
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogDescription } from '@/components/ui/dialog';
import { Progress } from '@/components/ui/progress';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Film, Loader2, CheckCircle2, AlertCircle, FileText, Radio, Video, Play, Pencil, Calendar, ArrowRight, Check, Music } from 'lucide-react';
import { TimelineEvent } from '@/types/timeline';
import { OptionalData } from '@/types/form';
import { VideoDialog } from '@/components/video/VideoDialog';
import { OptionalInfoForm } from '@/components/OptionalInfoForm';

const SUPABASE_URL = import.meta.env.VITE_SUPABASE_URL || 'https://koeoboygsssyajpdstel.supabase.co';
const SUPABASE_ANON_KEY = import.meta.env.VITE_SUPABASE_PUBLISHABLE_KEY || 'eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZSIsInJlZiI6ImtvZW9ib3lnc3NzeWFqcGRzdGVsIiwicm9sZSI6ImFub24iLCJpYXQiOjE3NjkyNTY2NjEsImV4cCI6MjA4NDgzMjY2MX0.KuFaWF4r_cxZRiOumPGMChLVmwgyhT9vR5s7L52zr5s';

type GenerationStep = 'customize' | 'idle' | 'lyrics' | 'music' | 'complete' | 'error';

interface MusicVideoGeneratorProps {
  events: TimelineEvent[];
  summary: string;
  optionalData: OptionalData;
  startYear: number;
  endYear: number;
}

interface GenerationResult {
  lyrics?: string;
  style?: string;
  title?: string;
  audioUrl?: string;
  originalUrl?: string; // Original Suno URL before proxying
  duration?: number;
}

export const MusicVideoGenerator: React.FC<MusicVideoGeneratorProps> = ({
  events,
  summary,
  optionalData,
  startYear,
  endYear,
}) => {
  const [isDialogOpen, setIsDialogOpen] = useState(false);
  const [step, setStep] = useState<GenerationStep>('customize');
  const [progress, setProgress] = useState(0);
  const [error, setError] = useState<string | null>(null);
  const [result, setResult] = useState<GenerationResult | null>(null);
  const [statusMessage, setStatusMessage] = useState('');
  const [isVideoDialogOpen, setIsVideoDialogOpen] = useState(false);
  
  // Local state for customization (editable copies)
  const [localOptionalData, setLocalOptionalData] = useState<OptionalData>(optionalData);
  const [localStartYear, setLocalStartYear] = useState(startYear);
  const [localEndYear, setLocalEndYear] = useState(endYear);
  const currentYear = new Date().getFullYear();

  // Check if we have enough personal data
  const hasPersonalData = localOptionalData.friends || localOptionalData.school || localOptionalData.nightlife;

  const generateLyrics = async (): Promise<{ lyrics: string; style: string; title: string }> => {
    setStatusMessage('Songtekst schrijven...');
    setProgress(10);

    const response = await fetch(`${SUPABASE_URL}/functions/v1/generate-song-lyrics`, {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        'Authorization': `Bearer ${SUPABASE_ANON_KEY}`,
        'apikey': SUPABASE_ANON_KEY,
      },
      body: JSON.stringify({
        events,
        summary,
        personalData: {
          friends: localOptionalData.friends,
          school: localOptionalData.school,
          nightlife: localOptionalData.nightlife,
          firstName: localOptionalData.firstName,
          city: localOptionalData.city,
        },
        startYear: localStartYear,
        endYear: localEndYear,
      }),
    });

    if (!response.ok) {
      const errorData = await response.json().catch(() => ({}));
      throw new Error(errorData.error || `Fout bij genereren songtekst: ${response.status}`);
    }

    const data = await response.json();
    if (!data.success) {
      throw new Error(data.error || 'Onbekende fout bij genereren songtekst');
    }

    setProgress(30);
    return {
      lyrics: data.data.lyrics,
      style: data.data.style,
      title: data.data.title,
    };
  };

  const generateMusic = async (lyrics: string, style: string, title: string): Promise<{ audioUrl: string; originalUrl?: string; duration: number }> => {
    setStatusMessage('Muziek componeren... (dit kan enkele minuten duren)');
    setProgress(40);

    // Start a progress simulation for the long wait
    const progressInterval = setInterval(() => {
      setProgress(prev => Math.min(prev + 2, 85));
    }, 5000);

    try {
      const response = await fetch(`${SUPABASE_URL}/functions/v1/generate-suno-track`, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          'Authorization': `Bearer ${SUPABASE_ANON_KEY}`,
          'apikey': SUPABASE_ANON_KEY,
        },
        body: JSON.stringify({
          lyrics,
          style,
          title,
          maxDurationSeconds: 180, // 3 minutes max
        }),
      });

      clearInterval(progressInterval);

      if (!response.ok) {
        const errorData = await response.json().catch(() => ({}));
        throw new Error(errorData.error || `Fout bij genereren muziek: ${response.status}`);
      }

      const data = await response.json();
      if (!data.success) {
        throw new Error(data.error || 'Onbekende fout bij genereren muziek');
      }

      setProgress(90);
      const playableUrl = data?.data?.audioUrl || data?.data?.streamAudioUrl;
      if (!playableUrl) {
        throw new Error('Suno gaf geen afspeelbare audio URL terug');
      }

      // Proxy the audio URL to avoid CORS issues
      setStatusMessage('Audio voorbereiden...');
      const proxyResponse = await fetch(`${SUPABASE_URL}/functions/v1/proxy-audio`, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          'Authorization': `Bearer ${SUPABASE_ANON_KEY}`,
          'apikey': SUPABASE_ANON_KEY,
        },
        body: JSON.stringify({ url: playableUrl }),
      });

      if (!proxyResponse.ok) {
        console.warn('Audio proxy failed, using direct URL (may have CORS issues)');
        return {
          audioUrl: playableUrl,
          duration: data.data.duration || 180,
        };
      }

      // Convert proxied audio to blob URL for reliable playback
      const audioBlob = await proxyResponse.blob();
      const blobUrl = URL.createObjectURL(audioBlob);

      return {
        audioUrl: blobUrl,
        originalUrl: playableUrl, // Keep original for Remotion if needed
        duration: data.data.duration || 180,
      };
    } catch (err) {
      clearInterval(progressInterval);
      throw err;
    }
  };

  const handleGenerate = useCallback(async () => {
    setStep('lyrics');
    setError(null);
    setResult(null);
    setProgress(0);

    try {
      // Step 1: Generate lyrics
      const lyricsResult = await generateLyrics();
      setResult(prev => ({ ...prev, ...lyricsResult }));
      
      setStep('music');
      
      // Step 2: Generate music with Suno
      const musicResult = await generateMusic(lyricsResult.lyrics, lyricsResult.style, lyricsResult.title);
      
      setResult(prev => ({
        ...prev,
        audioUrl: musicResult.audioUrl,
        duration: musicResult.duration,
      }));

      setProgress(100);
      setStep('complete');
      setStatusMessage('Je persoonlijke hit is klaar!');
      
    } catch (err) {
      console.error('Music generation error:', err);
      setError(err instanceof Error ? err.message : 'Er ging iets mis');
      setStep('error');
    }
  }, [events, summary, localOptionalData, localStartYear, localEndYear]);

  const handleOpenDialog = () => {
    // Reset to local copies from props
    setLocalOptionalData(optionalData);
    setLocalStartYear(startYear);
    setLocalEndYear(endYear);
    setIsDialogOpen(true);
    setStep('customize'); // Start with customize step
    setError(null);
    setResult(null);
    setProgress(0);
  };

  const handleConfirmCustomize = () => {
    setStep('idle'); // Move to ready-to-generate state
  };

  const getStepIcon = (targetStep: GenerationStep, currentStep: GenerationStep) => {
    const stepOrder: GenerationStep[] = ['idle', 'lyrics', 'music', 'complete'];
    const currentIndex = stepOrder.indexOf(currentStep);
    const targetIndex = stepOrder.indexOf(targetStep);

    if (currentStep === 'error') {
      return <AlertCircle className="h-5 w-5 text-destructive" />;
    }
    if (targetIndex < currentIndex || currentStep === 'complete') {
      return <CheckCircle2 className="h-5 w-5 text-primary" />;
    }
    if (targetIndex === currentIndex) {
      return <Loader2 className="h-5 w-5 animate-spin text-primary" />;
    }
    return <div className="h-5 w-5 rounded-full border-2 border-muted-foreground/30" />;
  };

  return (
    <>
      <Button
        onClick={handleOpenDialog}
        variant="outline"
        className="gap-2 bg-gradient-to-r from-primary/10 to-accent/10 hover:from-primary/20 hover:to-accent/20 border-primary/30"
        disabled={events.length === 0}
      >
        <Film className="h-4 w-4" />
        🎬 Persoonlijke video clip
      </Button>

      <Dialog open={isDialogOpen} onOpenChange={setIsDialogOpen}>
        <DialogContent className="max-w-2xl max-h-[85vh] overflow-y-auto">
          <DialogHeader>
            <DialogTitle className="flex items-center gap-2">
              <Film className="h-5 w-5 text-primary" />
              {step === 'customize' ? 'Aanpassen' : 'Persoonlijke Video Clip Generator'}
            </DialogTitle>
            <DialogDescription>
              {step === 'customize' 
                ? 'Pas je gegevens aan voor een nog persoonlijker resultaat.'
                : 'Genereer een unieke video clip met muziek gebaseerd op jouw herinneringen.'}
            </DialogDescription>
          </DialogHeader>

          <div className="space-y-6 py-4">
            {/* Customize Step */}
            {step === 'customize' && (
              <div className="space-y-4">
                {/* Year range */}
                <div className="space-y-2">
                  <Label className="flex items-center gap-2 text-sm font-medium text-foreground">
                    <Calendar className="h-4 w-4 text-accent" />
                    Periode
                  </Label>
                  <div className="flex gap-3 items-center">
                    <Input
                      type="number"
                      placeholder="Van"
                      value={localStartYear || ""}
                      onChange={(e) => setLocalStartYear(parseInt(e.target.value) || 0)}
                      min={1900}
                      max={currentYear}
                      className="bg-card text-center h-9"
                    />
                    <ArrowRight className="h-5 w-5 text-muted-foreground flex-shrink-0" />
                    <Input
                      type="number"
                      placeholder="Tot"
                      value={localEndYear || ""}
                      onChange={(e) => setLocalEndYear(parseInt(e.target.value) || 0)}
                      min={1900}
                      max={currentYear}
                      className="bg-card text-center h-9"
                    />
                  </div>
                </div>

                {/* Optional Info Form */}
                <OptionalInfoForm value={localOptionalData} onChange={setLocalOptionalData} />

                {/* Confirm Button */}
                <div className="flex justify-between gap-3 pt-4 border-t border-border">
                  <Button variant="outline" onClick={() => setIsDialogOpen(false)}>
                    Annuleren
                  </Button>
                  <Button onClick={handleConfirmCustomize} className="gap-2">
                    <Check className="h-4 w-4" />
                    Bevestigen
                  </Button>
                </div>
              </div>
            )}

            {/* Generation Steps (shown after customize) */}
            {step !== 'customize' && (
              <>
                {/* Tip if no personal data */}
                {!hasPersonalData && step === 'idle' && (
                  <div className="p-4 bg-muted border border-border rounded-lg">
                    <p className="text-sm text-muted-foreground">
                      <strong>Tip:</strong> Vul je persoonlijke details in (vrienden, school, uitgaan) voor een nog persoonlijker lied!
                    </p>
                  </div>
                )}

                {/* Progress Steps */}
                <div className="space-y-4">
                  {/* Step 1: Lyrics */}
                  <div className="flex items-center gap-3">
                    {getStepIcon('lyrics', step)}
                    <div className="flex-1">
                      <div className="flex items-center gap-2">
                        <FileText className="h-4 w-4 text-muted-foreground" />
                        <span className="font-medium">Songtekst schrijven</span>
                      </div>
                      <p className="text-sm text-muted-foreground">
                        AI schrijft een nostalgisch lied met jouw herinneringen
                      </p>
                    </div>
                  </div>

                  {/* Step 2: Music */}
                  <div className="flex items-center gap-3">
                    {getStepIcon('music', step)}
                    <div className="flex-1">
                      <div className="flex items-center gap-2">
                        <Radio className="h-4 w-4 text-muted-foreground" />
                        <span className="font-medium">Muziek componeren</span>
                      </div>
                      <p className="text-sm text-muted-foreground">
                        Suno AI maakt een unieke track in de stijl van jouw tijdperk
                      </p>
                    </div>
                  </div>

                  {/* Step 3: Complete */}
                  <div className="flex items-center gap-3">
                    {getStepIcon('complete', step)}
                    <div className="flex-1">
                      <div className="flex items-center gap-2">
                        <Video className="h-4 w-4 text-muted-foreground" />
                        <span className="font-medium">Klaar!</span>
                      </div>
                      <p className="text-sm text-muted-foreground">
                        Beluister je persoonlijke hit
                      </p>
                    </div>
                  </div>
                </div>

                {/* Progress Bar */}
                {step !== 'idle' && step !== 'error' && step !== 'complete' && (
                  <div className="space-y-2">
                    <Progress value={progress} className="h-2" />
                    <p className="text-sm text-center text-muted-foreground">{statusMessage}</p>
                  </div>
                )}

                {/* Error Display */}
                {step === 'error' && error && (
                  <div className="p-4 bg-destructive/10 border border-destructive/30 rounded-lg">
                    <p className="text-sm text-destructive flex items-center gap-2">
                      <AlertCircle className="h-4 w-4" />
                      {error}
                    </p>
                  </div>
                )}

                {/* Result Display */}
                {step === 'complete' && result && (
                  <div className="space-y-4">
                    {/* Song Title & Style */}
                    <div className="p-4 bg-primary/10 rounded-lg">
                      <h3 className="font-bold text-lg">{result.title}</h3>
                      <p className="text-sm text-muted-foreground">{result.style}</p>
                    </div>

                    {/* Audio Player */}
                    {result.audioUrl && (
                      <div className="space-y-2">
                        <audio controls className="w-full" src={result.audioUrl}>
                          Je browser ondersteunt geen audio.
                        </audio>
                        <p className="text-xs text-muted-foreground text-center">
                          Duur: {result.duration ? Math.round(result.duration / 60) : '~3'} minuten
                        </p>
                      </div>
                    )}

                    {/* Lyrics Preview */}
                    {result.lyrics && (
                      <details className="group">
                        <summary className="cursor-pointer text-sm font-medium text-primary hover:underline">
                          Bekijk songtekst
                        </summary>
                        <pre className="mt-2 p-4 bg-muted rounded-lg text-sm whitespace-pre-wrap font-sans max-h-60 overflow-y-auto">
                          {result.lyrics}
                        </pre>
                      </details>
                    )}

                    {/* Video Generation Button */}
                    <Button 
                      onClick={() => {
                        setIsDialogOpen(false);
                        setIsVideoDialogOpen(true);
                      }}
                      className="w-full gap-2"
                      variant="secondary"
                    >
                      <Film className="h-4 w-4" />
                      🎬 Maak Muziekvideo met deze track
                    </Button>
                  </div>
                )}

                {/* Action Button */}
                {step === 'idle' && (
                  <Button 
                    onClick={handleGenerate} 
                    className="w-full gap-2"
                    size="lg"
                  >
                    <Play className="h-4 w-4" />
                    Start Generatie
                  </Button>
                )}

                {step === 'error' && (
                  <Button 
                    onClick={handleGenerate} 
                    variant="outline"
                    className="w-full gap-2"
                  >
                    <Loader2 className="h-4 w-4" />
                    Probeer opnieuw
                  </Button>
                )}
              </>
            )}
          </div>
        </DialogContent>
      </Dialog>

      {/* Video Dialog - Uses Remotion with the generated Suno audio as background music */}
      <VideoDialog
        open={isVideoDialogOpen}
        onOpenChange={setIsVideoDialogOpen}
        events={events}
        storyTitle={result?.title || `Jouw jaren ${localStartYear}-${localEndYear}`}
        storyIntroduction={summary}
        backgroundMusicUrl={result?.audioUrl}
        backgroundMusicDuration={result?.duration}
      />
    </>
  );
};