import React, { useState, useCallback } from 'react';
import { Button } from '@/components/ui/button';
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogDescription } from '@/components/ui/dialog';
import { Progress } from '@/components/ui/progress';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { RadioGroup, RadioGroupItem } from '@/components/ui/radio-group';
import { Film, Loader2, CheckCircle2, AlertCircle, FileText, Radio as RadioIcon, Video, Play, Check, Music, Share2, User, Users, MapPin, Sparkles, GraduationCap, PartyPopper, Compass } from 'lucide-react';
import { TimelineEvent } from '@/types/timeline';
import { OptionalData, SubcultureData, Gender, GeographicFocus } from '@/types/form';
import { VideoDialog } from '@/components/video/VideoDialog';
import { ShareDialog } from '@/components/video/ShareDialog';
import { SubcultureSelector } from '@/components/SubcultureSelector';
import { VideoEvent } from '@/remotion/types';

const SUPABASE_URL = import.meta.env.VITE_SUPABASE_URL || 'https://koeoboygsssyajpdstel.supabase.co';
const SUPABASE_ANON_KEY = import.meta.env.VITE_SUPABASE_PUBLISHABLE_KEY || 'eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZSIsInJlZiI6ImtvZW9ib3lnc3NzeWFqcGRzdGVsIiwicm9sZSI6ImFub24iLCJpYXQiOjE3NjkyNTY2NjEsImV4cCI6MjA4NDgzMjY2MX0.KuFaWF4r_cxZRiOumPGMChLVmwgyhT9vR5s7L52zr5s';

type GenerationStep = 'customize' | 'idle' | 'lyrics' | 'music' | 'complete' | 'error';

interface MusicVideoGeneratorProps {
  events: TimelineEvent[];
  summary: string;
  storyTitle?: string;
  storyIntroduction?: string;
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
  storyTitle,
  storyIntroduction,
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
  const [isShareDialogOpen, setIsShareDialogOpen] = useState(false);
  
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
        <DialogContent className="w-[95vw] max-w-2xl max-h-[90vh] overflow-y-auto p-4 sm:p-6">
          <DialogHeader className="pb-2">
            <DialogTitle className="flex items-center gap-2 text-sm sm:text-base">
              <Film className="h-4 w-4 sm:h-5 sm:w-5 text-primary" />
              {step === 'customize' ? 'Aanpassen' : 'Persoonlijke Video Clip'}
            </DialogTitle>
            <DialogDescription className="text-xs sm:text-sm">
              {step === 'customize' 
                ? 'Pas je gegevens aan voor een persoonlijker resultaat.'
                : 'Genereer een unieke video clip met muziek.'}
            </DialogDescription>
          </DialogHeader>

          <div className="space-y-4 sm:space-y-6 py-2 sm:py-4">
            {/* Customize Step */}
            {step === 'customize' && (
              <div className="space-y-3 sm:space-y-4">
                {/* Name fields */}
                <div className="space-y-2">
                  <Label className="flex items-center gap-2 text-xs sm:text-sm font-medium text-foreground">
                    <User className="h-3.5 w-3.5 sm:h-4 sm:w-4 text-accent" />
                    Naam
                  </Label>
                  <div className="grid gap-2 sm:grid-cols-2">
                    <Input
                      placeholder="Voornaam"
                      value={localOptionalData.firstName || ''}
                      onChange={(e) => setLocalOptionalData(prev => ({ ...prev, firstName: e.target.value }))}
                      className="bg-card h-10 sm:h-9 text-sm"
                    />
                    <Input
                      placeholder="Achternaam"
                      value={localOptionalData.lastName || ''}
                      onChange={(e) => setLocalOptionalData(prev => ({ ...prev, lastName: e.target.value }))}
                      className="bg-card h-10 sm:h-9 text-sm"
                    />
                  </div>
                </div>

                {/* City */}
                <div className="space-y-1">
                  <Label className="flex items-center gap-2 text-xs sm:text-sm font-medium text-foreground">
                    <MapPin className="h-3.5 w-3.5 sm:h-4 sm:w-4 text-accent" />
                    Woonplaats
                  </Label>
                  <Input
                    placeholder="Bijv. Amsterdam"
                    value={localOptionalData.city || ''}
                    onChange={(e) => setLocalOptionalData(prev => ({ ...prev, city: e.target.value }))}
                    className="bg-card h-10 sm:h-9 text-sm"
                  />
                </div>

                {/* Gender */}
                <div className="space-y-2">
                  <Label className="flex items-center gap-2 text-xs sm:text-sm font-medium text-foreground">
                    <Users className="h-3.5 w-3.5 sm:h-4 sm:w-4 text-accent" />
                    Geslacht
                  </Label>
                  <RadioGroup
                    value={localOptionalData.gender || 'none'}
                    onValueChange={(v) => setLocalOptionalData(prev => ({ ...prev, gender: v as Gender }))}
                    className="grid grid-cols-3 gap-2"
                  >
                    {([
                      { value: 'male', label: 'Man' },
                      { value: 'female', label: 'Vrouw' },
                      { value: 'none', label: 'Geen voorkeur' }
                    ] as const).map((option) => (
                      <Label
                        key={option.value}
                        className={`
                          flex items-center justify-center py-1.5 px-2 rounded-md cursor-pointer
                          border-2 transition-all duration-200 text-xs font-medium
                          ${localOptionalData.gender === option.value || (!localOptionalData.gender && option.value === 'none')
                            ? 'border-accent bg-accent/10 text-foreground' 
                            : 'border-border bg-card hover:border-muted-foreground/30 text-muted-foreground'
                          }
                        `}
                      >
                        <RadioGroupItem value={option.value} className="sr-only" />
                        <span>{option.label}</span>
                      </Label>
                    ))}
                  </RadioGroup>
                </div>

                {/* Interests */}
                <div className="space-y-1">
                  <Label className="flex items-center gap-2 text-xs sm:text-sm font-medium text-foreground">
                    <Sparkles className="h-3.5 w-3.5 sm:h-4 sm:w-4 text-accent" />
                    Interesses
                  </Label>
                  <Input
                    placeholder="Bijv. voetbal, muziek, reizen"
                    value={localOptionalData.interests || ''}
                    onChange={(e) => setLocalOptionalData(prev => ({ ...prev, interests: e.target.value }))}
                    className="bg-card h-10 sm:h-9 text-sm"
                  />
                </div>

                {/* Personal details section */}
                <div className="space-y-3 pt-2 border-t border-border">
                  <p className="text-xs sm:text-sm text-muted-foreground">
                    Persoonlijke herinneringen voor een unieker lied:
                  </p>
                  
                  {/* Friends */}
                  <div className="space-y-1">
                    <Label className="flex items-center gap-2 text-xs sm:text-sm font-medium text-foreground">
                      <Users className="h-3.5 w-3.5 sm:h-4 sm:w-4 text-accent" />
                      Top 3 vrienden van toen
                    </Label>
                    <Input
                      placeholder="Namen gescheiden door komma's"
                      value={localOptionalData.friends || ''}
                      onChange={(e) => setLocalOptionalData(prev => ({ ...prev, friends: e.target.value }))}
                      className="bg-card h-10 sm:h-9 text-sm"
                    />
                  </div>

                  {/* School */}
                  <div className="space-y-1">
                    <Label className="flex items-center gap-2 text-xs sm:text-sm font-medium text-foreground">
                      <GraduationCap className="h-3.5 w-3.5 sm:h-4 sm:w-4 text-accent" />
                      Middelbare School
                    </Label>
                    <Input
                      placeholder="Bijv. Christelijk Lyceum"
                      value={localOptionalData.school || ''}
                      onChange={(e) => setLocalOptionalData(prev => ({ ...prev, school: e.target.value }))}
                      className="bg-card h-10 sm:h-9 text-sm"
                    />
                  </div>

                  {/* Nightlife */}
                  <div className="space-y-1">
                    <Label className="flex items-center gap-2 text-xs sm:text-sm font-medium text-foreground">
                      <PartyPopper className="h-3.5 w-3.5 sm:h-4 sm:w-4 text-accent" />
                      Favoriete uitgaansplekken
                    </Label>
                    <Input
                      placeholder="Discotheken/kroegen"
                      value={localOptionalData.nightlife || ''}
                      onChange={(e) => setLocalOptionalData(prev => ({ ...prev, nightlife: e.target.value }))}
                      className="bg-card h-10 sm:h-9 text-sm"
                    />
                  </div>
                </div>

                {/* Geographic Focus */}
                <div className="space-y-2">
                  <Label className="flex items-center gap-2 text-xs sm:text-sm font-medium text-foreground">
                    <Compass className="h-3.5 w-3.5 sm:h-4 sm:w-4 text-accent" />
                    Geografische focus
                  </Label>
                  <RadioGroup
                    value={localOptionalData.focus || 'netherlands'}
                    onValueChange={(v) => setLocalOptionalData(prev => ({ ...prev, focus: v as GeographicFocus }))}
                    className="grid grid-cols-3 gap-2"
                  >
                    {([
                      { value: 'netherlands', label: 'Nederland' },
                      { value: 'europe', label: 'Europa' },
                      { value: 'world', label: 'Wereld' }
                    ] as const).map((option) => (
                      <Label
                        key={option.value}
                        className={`
                          flex items-center justify-center py-1.5 px-2 rounded-md cursor-pointer
                          border-2 transition-all duration-200 text-xs font-medium
                          ${localOptionalData.focus === option.value
                            ? 'border-accent bg-accent/10 text-foreground' 
                            : 'border-border bg-card hover:border-muted-foreground/30 text-muted-foreground'
                          }
                        `}
                      >
                        <RadioGroupItem value={option.value} className="sr-only" />
                        <span>{option.label}</span>
                      </Label>
                    ))}
                  </RadioGroup>
                </div>

                {/* Subculture Selector for Music Style */}
                <div className="space-y-2 pt-3 border-t border-border">
                  <div className="p-2 sm:p-3 bg-accent/10 rounded-lg">
                    <p className="text-xs sm:text-sm text-muted-foreground">
                      <Music className="h-3 w-3 sm:h-4 sm:w-4 inline mr-1 text-accent" />
                      <strong>Muziekstijl:</strong> Subcultuur bepaalt de stijl.
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

                {/* Confirm Button - larger touch target on mobile */}
                <div className="flex flex-col-reverse sm:flex-row justify-end gap-2 pt-3">
                  <Button variant="ghost" onClick={() => setIsDialogOpen(false)} className="h-11 sm:h-9">
                    Annuleren
                  </Button>
                  <Button onClick={handleConfirmCustomize} className="h-11 sm:h-9 gap-2">
                    <Check className="h-4 w-4" />
                    Doorgaan
                  </Button>
                </div>
              </div>
            )}

            {/* Generation Steps (shown after customize) */}
            {step !== 'customize' && (
              <>
                {/* Tip if no personal data - compact on mobile */}
                {!hasPersonalData && step === 'idle' && (
                  <div className="p-3 sm:p-4 bg-muted border border-border rounded-lg">
                    <p className="text-xs sm:text-sm text-muted-foreground">
                      <strong>Tip:</strong> Vul je details in voor een persoonlijker lied!
                    </p>
                  </div>
                )}

                {/* Progress Steps - more compact on mobile */}
                <div className="space-y-3 sm:space-y-4">
                  {/* Step 1: Lyrics */}
                  <div className="flex items-start gap-2 sm:gap-3">
                    <div className="flex-shrink-0 mt-0.5">{getStepIcon('lyrics', step)}</div>
                    <div className="flex-1 min-w-0">
                      <div className="flex items-center gap-1.5 sm:gap-2">
                        <FileText className="h-3.5 w-3.5 sm:h-4 sm:w-4 text-muted-foreground flex-shrink-0" />
                        <span className="font-medium text-sm sm:text-base">Songtekst schrijven</span>
                      </div>
                      <p className="text-xs sm:text-sm text-muted-foreground mt-0.5">
                        AI schrijft een nostalgisch lied
                      </p>
                    </div>
                  </div>

                  {/* Step 2: Music */}
                  <div className="flex items-start gap-2 sm:gap-3">
                    <div className="flex-shrink-0 mt-0.5">{getStepIcon('music', step)}</div>
                    <div className="flex-1 min-w-0">
                      <div className="flex items-center gap-1.5 sm:gap-2">
                        <RadioIcon className="h-3.5 w-3.5 sm:h-4 sm:w-4 text-muted-foreground flex-shrink-0" />
                        <span className="font-medium text-sm sm:text-base">Muziek componeren</span>
                      </div>
                      <p className="text-xs sm:text-sm text-muted-foreground mt-0.5">
                        Suno AI maakt een unieke track
                      </p>
                    </div>
                  </div>

                  {/* Step 3: Complete */}
                  <div className="flex items-start gap-2 sm:gap-3">
                    <div className="flex-shrink-0 mt-0.5">{getStepIcon('complete', step)}</div>
                    <div className="flex-1 min-w-0">
                      <div className="flex items-center gap-1.5 sm:gap-2">
                        <Video className="h-3.5 w-3.5 sm:h-4 sm:w-4 text-muted-foreground flex-shrink-0" />
                        <span className="font-medium text-sm sm:text-base">Klaar!</span>
                      </div>
                      <p className="text-xs sm:text-sm text-muted-foreground mt-0.5">
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
                  <div className="p-3 sm:p-4 bg-destructive/10 border border-destructive/30 rounded-lg">
                    <p className="text-xs sm:text-sm text-destructive flex items-center gap-2">
                      <AlertCircle className="h-4 w-4 flex-shrink-0" />
                      <span className="break-words">{error}</span>
                    </p>
                  </div>
                )}

                {/* Result Display */}
                {step === 'complete' && result && (
                  <div className="space-y-3 sm:space-y-4">
                    {/* Song Title & Style */}
                    <div className="p-3 sm:p-4 bg-primary/10 rounded-lg">
                      <h3 className="font-bold text-base sm:text-lg break-words">{result.title}</h3>
                      <p className="text-xs sm:text-sm text-muted-foreground">{result.style}</p>
                    </div>

                    {/* Audio Player - native controls are already touch-friendly */}
                    {result.audioUrl && (
                      <div className="space-y-2">
                        <audio controls className="w-full h-12" src={result.audioUrl}>
                          Je browser ondersteunt geen audio.
                        </audio>
                        <p className="text-xs text-muted-foreground text-center">
                          Duur: {result.duration ? Math.round(result.duration / 60) : '~3'} minuten
                        </p>
                        {/* Show original Suno URL for reference - collapsible on mobile */}
                        {result.originalUrl && (
                          <details className="mt-2">
                            <summary className="text-xs text-muted-foreground cursor-pointer">
                              Toon Suno URL
                            </summary>
                            <div className="mt-1 p-2 bg-muted rounded text-xs">
                              <a 
                                href={result.originalUrl} 
                                target="_blank" 
                                rel="noopener noreferrer"
                                className="text-primary hover:underline break-all"
                              >
                                {result.originalUrl}
                              </a>
                            </div>
                          </details>
                        )}
                      </div>
                    )}

                    {/* Lyrics Preview */}
                    {result.lyrics && (
                      <details className="group">
                        <summary className="cursor-pointer text-xs sm:text-sm font-medium text-primary hover:underline">
                          Bekijk songtekst
                        </summary>
                        <pre className="mt-2 p-3 sm:p-4 bg-muted rounded-lg text-xs sm:text-sm whitespace-pre-wrap font-sans max-h-48 sm:max-h-60 overflow-y-auto">
                          {result.lyrics}
                        </pre>
                      </details>
                    )}

                    {/* Action buttons - larger touch targets */}
                    <div className="flex flex-col sm:flex-row gap-2">
                      <Button 
                        onClick={() => {
                          setIsDialogOpen(false);
                          setIsVideoDialogOpen(true);
                        }}
                        className="flex-1 h-11 sm:h-10 gap-2"
                        variant="secondary"
                      >
                        <Film className="h-4 w-4" />
                        🎬 Bekijk Video
                      </Button>
                      <Button 
                        onClick={() => {
                          setIsDialogOpen(false);
                          setIsShareDialogOpen(true);
                        }}
                        className="flex-1 h-11 sm:h-10 gap-2"
                        variant="default"
                      >
                        <Share2 className="h-4 w-4" />
                        Delen
                      </Button>
                    </div>
                  </div>
                )}

                {/* Action Button - larger touch targets */}
                {step === 'idle' && (
                  <Button 
                    onClick={handleGenerate} 
                    className="w-full h-12 sm:h-11 gap-2 text-sm sm:text-base"
                  >
                    <Play className="h-4 w-4 sm:h-5 sm:w-5" />
                    Start Generatie
                  </Button>
                )}

                {step === 'error' && (
                  <Button 
                    onClick={handleGenerate} 
                    variant="outline"
                    className="w-full h-11 sm:h-10 gap-2"
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
      {/* Use the SAME storyTitle and storyIntroduction as the regular video */}
      <VideoDialog
        open={isVideoDialogOpen}
        onOpenChange={setIsVideoDialogOpen}
        events={events}
        storyTitle={storyTitle || `Jouw jaren ${startYear}-${endYear}`}
        storyIntroduction={storyIntroduction || summary}
        backgroundMusicUrl={result?.audioUrl}
        backgroundMusicDuration={result?.duration}
      />

      {/* Direct Share Dialog for music video */}
      <ShareDialog
        open={isShareDialogOpen}
        onOpenChange={setIsShareDialogOpen}
        content={{
          events: events.map(e => ({ ...e, audioDurationFrames: 150 })) as VideoEvent[],
          storyTitle: storyTitle || `Jouw jaren ${startYear}-${endYear}`,
          storyIntroduction: storyIntroduction || summary,
        }}
        settings={{
          variant: 'slideshow',
          fps: 30,
          enableVhsEffect: false,
          retroIntensity: 0.85,
          voiceProvider: 'google',
          isMusicVideo: true,
          backgroundMusicUrl: result?.audioUrl,
          backgroundMusicDuration: result?.duration,
          introAudioUrl: undefined,
          introDurationFrames: 0,
        }}
      />
    </>
  );
};