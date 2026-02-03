import React, { useState, useCallback } from 'react';
import { Button } from '@/components/ui/button';
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogDescription } from '@/components/ui/dialog';
import { Progress } from '@/components/ui/progress';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Film, Loader2, CheckCircle2, AlertCircle, FileText, Radio, Video, Play, Check, Music } from 'lucide-react';
import { TimelineEvent } from '@/types/timeline';
import { OptionalData, SubcultureData } from '@/types/form';
import { VideoDialog } from '@/components/video/VideoDialog';
import { SubcultureSelector } from '@/components/SubcultureSelector';

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
  
  // Local state for customization (editable copy of personal details only)
  const [localOptionalData, setLocalOptionalData] = useState<OptionalData>(optionalData);

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
        subculture: localOptionalData.subculture, // Pass subculture data for music style
        gender: localOptionalData.gender, // Pass gender for voice selection
        startYear: startYear,
        endYear: endYear,
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

  const pollForSunoCompletion = async (taskId: string): Promise<{ audioUrl: string; duration: number }> => {
    const maxAttempts = 60; // 5 minutes max (60 * 5s)
    const pollInterval = 5000;

    for (let attempt = 0; attempt < maxAttempts; attempt++) {
      setStatusMessage(`Muziek componeren... (${Math.floor(attempt * 5 / 60)}:${String((attempt * 5) % 60).padStart(2, '0')} verstreken)`);
      
      const response = await fetch(`${SUPABASE_URL}/functions/v1/check-suno-status`, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          'Authorization': `Bearer ${SUPABASE_ANON_KEY}`,
          'apikey': SUPABASE_ANON_KEY,
        },
        body: JSON.stringify({ taskId }),
      });

      if (!response.ok) {
        const errorData = await response.json().catch(() => ({}));
        throw new Error(errorData.error || `Fout bij ophalen status: ${response.status}`);
      }

      const data = await response.json();
      
      if (!data.success) {
        throw new Error(data.error || 'Fout bij genereren muziek');
      }

      if (data.data.ready) {
        return {
          audioUrl: data.data.audioUrl || data.data.streamAudioUrl,
          duration: data.data.duration || 180,
        };
      }

      // Update progress based on status
      if (data.data.status === 'TEXT_SUCCESS') {
        setProgress(50);
      } else if (data.data.status === 'FIRST_SUCCESS') {
        setProgress(75);
      }

      await new Promise(resolve => setTimeout(resolve, pollInterval));
    }

    throw new Error('Muziek generatie duurde te lang. Probeer het opnieuw.');
  };

  const generateMusic = async (lyrics: string, style: string, title: string): Promise<{ audioUrl: string; originalUrl?: string; duration: number }> => {
    setStatusMessage('Muziek starten...');
    setProgress(40);

    // Step 1: Start the generation
    const startResponse = await fetch(`${SUPABASE_URL}/functions/v1/generate-suno-track`, {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        'Authorization': `Bearer ${SUPABASE_ANON_KEY}`,
        'apikey': SUPABASE_ANON_KEY,
      },
      body: JSON.stringify({ lyrics, style, title }),
    });

    if (!startResponse.ok) {
      const errorData = await startResponse.json().catch(() => ({}));
      throw new Error(errorData.error || `Fout bij starten muziek: ${startResponse.status}`);
    }

    const startData = await startResponse.json();
    if (!startData.success || !startData.data?.taskId) {
      throw new Error(startData.error || 'Geen taskId ontvangen');
    }

    const taskId = startData.data.taskId;
    console.log(`Suno task started: ${taskId}`);

    // Step 2: Poll for completion (client-side)
    const result = await pollForSunoCompletion(taskId);
    
    setProgress(90);
    setStatusMessage('Audio voorbereiden...');

    // Proxy the audio URL to avoid CORS issues
    const proxyResponse = await fetch(`${SUPABASE_URL}/functions/v1/proxy-audio`, {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        'Authorization': `Bearer ${SUPABASE_ANON_KEY}`,
        'apikey': SUPABASE_ANON_KEY,
      },
      body: JSON.stringify({ url: result.audioUrl }),
    });

    if (!proxyResponse.ok) {
      console.warn('Audio proxy failed, using direct URL (may have CORS issues)');
      return {
        audioUrl: result.audioUrl,
        originalUrl: result.audioUrl,
        duration: result.duration,
      };
    }

    // Convert proxied audio to blob URL for reliable playback
    const audioBlob = await proxyResponse.blob();
    const blobUrl = URL.createObjectURL(audioBlob);

    return {
      audioUrl: blobUrl,
      originalUrl: result.audioUrl,
      duration: result.duration,
    };
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
        originalUrl: musicResult.originalUrl, // Keep original Suno URL for reference
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
  }, [events, summary, localOptionalData, startYear, endYear]);

  const handleOpenDialog = () => {
    // Reset local optional data from props
    setLocalOptionalData(optionalData);
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
                {/* Personal details for song - compact */}
                <div className="space-y-3">
                  <p className="text-sm text-muted-foreground">
                    Vul persoonlijke details in voor een nog unieker lied:
                  </p>
                  
                  {/* Friends */}
                  <div className="space-y-1.5">
                    <Label className="flex items-center gap-2 text-sm font-medium text-foreground">
                      Top 3 vrienden van toen
                    </Label>
                    <Input
                      placeholder="Namen gescheiden door komma's (bijv. Jan, Piet, Klaas)"
                      value={localOptionalData.friends || ''}
                      onChange={(e) => setLocalOptionalData(prev => ({ ...prev, friends: e.target.value }))}
                      className="bg-card h-9"
                    />
                  </div>

                  {/* School */}
                  <div className="space-y-1.5">
                    <Label className="flex items-center gap-2 text-sm font-medium text-foreground">
                      Middelbare School
                    </Label>
                    <Input
                      placeholder="Bijv. Christelijk Lyceum Veenendaal"
                      value={localOptionalData.school || ''}
                      onChange={(e) => setLocalOptionalData(prev => ({ ...prev, school: e.target.value }))}
                      className="bg-card h-9"
                    />
                  </div>

                  {/* Nightlife */}
                  <div className="space-y-1.5">
                    <Label className="flex items-center gap-2 text-sm font-medium text-foreground">
                      Favoriete uitgaansplekken
                    </Label>
                    <Input
                      placeholder="Discotheken/kroegen gescheiden door komma's"
                      value={localOptionalData.nightlife || ''}
                      onChange={(e) => setLocalOptionalData(prev => ({ ...prev, nightlife: e.target.value }))}
                      className="bg-card h-9"
                    />
                  </div>
                </div>

                {/* Subculture Selector for Music Style */}
                <div className="space-y-2 pt-3 border-t border-border">
                  <div className="p-3 bg-accent/10 rounded-lg">
                    <p className="text-sm text-muted-foreground">
                      <Music className="h-4 w-4 inline mr-1.5 text-accent" />
                      <strong>Muziekstijl:</strong> De subcultuur bepaalt de stijl van je lied.
                    </p>
                  </div>
                  <SubcultureSelector
                    startYear={startYear}
                    endYear={endYear}
                    periodType={localOptionalData.periodType || 'puberty'}
                    focus={localOptionalData.focus || 'netherlands'}
                    value={localOptionalData.subculture}
                    onChange={(subculture: SubcultureData) => 
                      setLocalOptionalData(prev => ({ ...prev, subculture }))
                    }
                  />
                </div>

                {/* Confirm Button */}
                <div className="flex justify-end gap-3 pt-3">
                  <Button variant="ghost" size="sm" onClick={() => setIsDialogOpen(false)}>
                    Annuleren
                  </Button>
                  <Button onClick={handleConfirmCustomize} size="sm" className="gap-2">
                    <Check className="h-4 w-4" />
                    Doorgaan
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
                        {/* Show original Suno URL for reference */}
                        {result.originalUrl && (
                          <div className="mt-2 p-2 bg-muted rounded text-xs">
                            <span className="text-muted-foreground">Suno URL: </span>
                            <a 
                              href={result.originalUrl} 
                              target="_blank" 
                              rel="noopener noreferrer"
                              className="text-primary hover:underline break-all"
                            >
                              {result.originalUrl}
                            </a>
                          </div>
                        )}
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
        storyTitle={result?.title || `Jouw jaren ${startYear}-${endYear}`}
        storyIntroduction={summary}
        backgroundMusicUrl={result?.audioUrl}
        backgroundMusicDuration={result?.duration}
      />
    </>
  );
};