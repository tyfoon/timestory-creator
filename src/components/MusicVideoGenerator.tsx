import React, { useState, useCallback } from 'react';
import { Button } from '@/components/ui/button';
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogDescription } from '@/components/ui/dialog';
import { Progress } from '@/components/ui/progress';
import { Music, Loader2, CheckCircle2, AlertCircle, FileText, Radio, Video, Play } from 'lucide-react';
import { TimelineEvent } from '@/types/timeline';
import { OptionalData } from '@/types/form';

const SUPABASE_URL = import.meta.env.VITE_SUPABASE_URL || 'https://koeoboygsssyajpdstel.supabase.co';
const SUPABASE_ANON_KEY = import.meta.env.VITE_SUPABASE_PUBLISHABLE_KEY || 'eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZSIsInJlZiI6ImtvZW9ib3lnc3NzeWFqcGRzdGVsIiwicm9sZSI6ImFub24iLCJpYXQiOjE3NjkyNTY2NjEsImV4cCI6MjA4NDgzMjY2MX0.KuFaWF4r_cxZRiOumPGMChLVmwgyhT9vR5s7L52zr5s';

type GenerationStep = 'idle' | 'lyrics' | 'music' | 'complete' | 'error';

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
  const [step, setStep] = useState<GenerationStep>('idle');
  const [progress, setProgress] = useState(0);
  const [error, setError] = useState<string | null>(null);
  const [result, setResult] = useState<GenerationResult | null>(null);
  const [statusMessage, setStatusMessage] = useState('');

  // Check if we have enough personal data
  const hasPersonalData = optionalData.friends || optionalData.school || optionalData.nightlife;

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
          friends: optionalData.friends,
          school: optionalData.school,
          nightlife: optionalData.nightlife,
          firstName: optionalData.firstName,
          city: optionalData.city,
        },
        startYear,
        endYear,
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

  const generateMusic = async (lyrics: string, style: string, title: string): Promise<{ audioUrl: string; duration: number }> => {
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

       return {
         audioUrl: playableUrl,
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
  }, [events, summary, optionalData, startYear, endYear]);

  const handleOpenDialog = () => {
    setIsDialogOpen(true);
    setStep('idle');
    setError(null);
    setResult(null);
    setProgress(0);
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
        <Music className="h-4 w-4" />
        🎵 Maak mijn Persoonlijke Hit
      </Button>

      <Dialog open={isDialogOpen} onOpenChange={setIsDialogOpen}>
        <DialogContent className="max-w-2xl">
          <DialogHeader>
            <DialogTitle className="flex items-center gap-2">
              <Music className="h-5 w-5 text-primary" />
              Persoonlijke Muziekvideo Generator
            </DialogTitle>
            <DialogDescription>
              Genereer een uniek lied gebaseerd op jouw herinneringen en de gebeurtenissen uit je tijdlijn.
            </DialogDescription>
          </DialogHeader>

          <div className="space-y-6 py-4">
            {/* Warning if no personal data */}
            {!hasPersonalData && step === 'idle' && (
              <div className="p-4 bg-amber-500/10 border border-amber-500/30 rounded-lg">
                <p className="text-sm text-amber-700 dark:text-amber-400">
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
            {step !== 'idle' && step !== 'error' && (
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
          </div>
        </DialogContent>
      </Dialog>
    </>
  );
};