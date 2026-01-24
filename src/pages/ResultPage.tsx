import { useCallback, useEffect, useState } from 'react';
import { useNavigate } from 'react-router-dom';
import { Header } from '@/components/Header';
import { TimelineCarousel } from '@/components/TimelineCarousel';
import { TimelineScrubberBottom } from '@/components/TimelineScrubberBottom';
import { Button } from '@/components/ui/button';
import { useLanguage } from '@/contexts/LanguageContext';
import { FormData } from '@/types/form';
import { TimelineEvent, FamousBirthday } from '@/types/timeline';
import { generateTimeline, searchImages } from '@/lib/api/timeline';
import { ArrowLeft, Clock, Loader2, AlertCircle, RefreshCw, Cake, Star } from 'lucide-react';
import { useToast } from '@/hooks/use-toast';

const ResultPage = () => {
  const navigate = useNavigate();
  const { language } = useLanguage();
  const { toast } = useToast();
  
  const [formData, setFormData] = useState<FormData | null>(null);
  const [events, setEvents] = useState<TimelineEvent[]>([]);
  const [famousBirthdays, setFamousBirthdays] = useState<FamousBirthday[]>([]);
  const [summary, setSummary] = useState<string>('');
  const [isLoading, setIsLoading] = useState(true);
  const [isLoadingImages, setIsLoadingImages] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [currentEventIndex, setCurrentEventIndex] = useState(0);

  useEffect(() => {
    const stored = sessionStorage.getItem('timelineFormData');
    if (stored) {
      const data = JSON.parse(stored) as FormData;
      setFormData(data);
      loadTimeline(data);
    } else {
      setError('Geen gegevens gevonden');
      setIsLoading(false);
    }
  }, []);

  const loadTimeline = async (data: FormData) => {
    setIsLoading(true);
    setError(null);
    
    try {
      const response = await generateTimeline(data, language);
      
      if (response.success && response.data) {
        // Sort events by date
        const sortedEvents = response.data.events.sort((a, b) => {
          if (a.year !== b.year) return a.year - b.year;
          if ((a.month || 0) !== (b.month || 0)) return (a.month || 0) - (b.month || 0);
          return (a.day || 0) - (b.day || 0);
        });

        // Frontend-only: mark image loading state so cards don't show an infinite spinner.
        const eventsWithImageStatus = sortedEvents.map((e) => {
          if (!e.imageSearchQuery) return { ...e, imageStatus: 'none' as const };
          return { ...e, imageStatus: 'loading' as const };
        });
        
        setEvents(eventsWithImageStatus);
        setSummary(response.data.summary);
        setFamousBirthdays(response.data.famousBirthdays || []);
        
        toast({
          title: "Tijdlijn geladen!",
          description: `${sortedEvents.length} gebeurtenissen gevonden`,
        });

        // Load images in background
        loadImages(eventsWithImageStatus);
      } else {
        throw new Error(response.error || 'Onbekende fout');
      }
    } catch (err) {
      console.error('Error loading timeline:', err);
      setError(err instanceof Error ? err.message : 'Er ging iets mis');
      
      toast({
        variant: "destructive",
        title: "Fout bij laden",
        description: err instanceof Error ? err.message : 'Probeer het opnieuw',
      });
    } finally {
      setIsLoading(false);
    }
  };

  const loadImages = async (timelineEvents: TimelineEvent[]) => {
    setIsLoadingImages(true);
    
    try {
      // Create image search queries for events that have a search query
      const allQueries = timelineEvents
        .filter(e => e.imageSearchQuery && e.imageStatus !== 'found')
        .map(e => ({
          eventId: e.id,
          query: e.imageSearchQuery!,
          year: e.year
        }));

      if (allQueries.length === 0) return;

      // Priority: first fetch the first 3 events (visible cards) for fast initial display
      const priorityQueries = allQueries.slice(0, 3);
      const remainingQueries = allQueries.slice(3);

      // Helper to update state with images
      const applyImages = (images: { eventId: string; imageUrl: string | null; source: string | null }[]) => {
        setEvents(prev => prev.map(event => {
          const imageResult = images.find(img => img.eventId === event.id);
          if (!imageResult) return event;

          if (imageResult.imageUrl) {
            return {
              ...event,
              imageUrl: imageResult.imageUrl,
              source: imageResult.source || undefined,
              imageStatus: 'found',
            };
          }

          return { ...event, imageStatus: 'none' };
        }));
      };

      // Fetch priority images first (first 3 visible cards)
      const priorityResult = await searchImages(priorityQueries, { mode: 'fast' });
      if (priorityResult.success && priorityResult.images) {
        applyImages(priorityResult.images);
      }

      // Then fetch the rest in background in smaller chunks.
      if (remainingQueries.length > 0) {
        const CHUNK_SIZE = 8;
        for (let i = 0; i < remainingQueries.length; i += CHUNK_SIZE) {
          const chunk = remainingQueries.slice(i, i + CHUNK_SIZE);
          const restResult = await searchImages(chunk, { mode: 'full' });
          if (restResult.success && restResult.images) {
            applyImages(restResult.images);
          }
        }
      }
    } catch (err) {
      console.error('Error loading images:', err);
      // Don't show error toast for images - they're optional
    } finally {
      setIsLoadingImages(false);
    }
  };

  const handleEventSelect = useCallback((index: number) => {
    setCurrentEventIndex(index);
  }, []);

  const getTitle = () => {
    if (!formData) return 'Jouw Tijdreis';
    
    if (formData.type === 'birthdate' && formData.birthDate) {
      const { day, month, year } = formData.birthDate;
      return `${day} - ${month} - ${year}`;
    } else if (formData.yearRange) {
      return `${formData.yearRange.startYear} - ${formData.yearRange.endYear}`;
    }
    return 'Jouw Tijdreis';
  };

  // Count events by scope
  const birthdateEvents = events.filter(e => e.eventScope === 'birthdate').length;
  const birthmonthEvents = events.filter(e => e.eventScope === 'birthmonth').length;
  const birthyearEvents = events.filter(e => e.eventScope === 'birthyear').length;
  const celebrityEvents = events.filter(e => e.isCelebrityBirthday).length;

  if (!formData && !isLoading) {
    return (
      <div className="min-h-screen bg-gradient-hero flex items-center justify-center">
        <div className="text-center">
          <p className="text-muted-foreground mb-4">Geen gegevens gevonden</p>
          <Button onClick={() => navigate('/')}>Terug naar start</Button>
        </div>
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-gradient-hero flex flex-col">
      <Header />
      
      {/* Compact header section */}
      <section className="pt-24 pb-2 px-4">
        <div className="container mx-auto max-w-6xl">
          {/* Back button - smaller */}
          <button
            onClick={() => navigate('/invoer?type=' + (formData?.type || 'birthdate'))}
            className="flex items-center gap-1.5 text-sm text-muted-foreground hover:text-foreground transition-colors mb-3 fade-in"
          >
            <ArrowLeft className="h-3.5 w-3.5" />
            <span>Terug naar invoer</span>
          </button>

          {/* Compact title row */}
          <div className="flex flex-wrap items-center justify-between gap-3 mb-3 fade-in">
            <div className="flex items-center gap-3">
              <div className="inline-flex items-center gap-1.5 px-3 py-1 rounded-full bg-secondary/80 border border-border text-xs">
                <Clock className="h-3.5 w-3.5 text-accent" />
                <span className="text-muted-foreground font-medium">
                  {formData?.type === 'birthdate' ? 'Geboortedatum' : 'Tijdperiode'}
                </span>
              </div>
              <h1 className="font-serif text-2xl sm:text-3xl font-bold text-foreground">
                {getTitle()}
              </h1>
            </div>
            
            {/* Event scope badges - inline */}
            {formData?.type === 'birthdate' && events.length > 0 && (
              <div className="flex flex-wrap gap-2 text-xs">
                {birthdateEvents > 0 && (
                  <span className="inline-flex items-center gap-1 px-2 py-0.5 rounded-full bg-accent text-accent-foreground">
                    <Cake className="h-3 w-3" />
                    {birthdateEvents} op je dag
                  </span>
                )}
                {birthmonthEvents > 0 && (
                  <span className="inline-flex items-center gap-1 px-2 py-0.5 rounded-full bg-accent/70 text-accent-foreground">
                    {birthmonthEvents} in je maand
                  </span>
                )}
                {birthyearEvents > 0 && (
                  <span className="inline-flex items-center gap-1 px-2 py-0.5 rounded-full bg-secondary text-secondary-foreground">
                    {birthyearEvents} in je jaar
                  </span>
                )}
              </div>
            )}
          </div>
        </div>
      </section>

      {/* Loading state */}
      {isLoading && (
        <div className="flex-1 flex flex-col items-center justify-center py-12 fade-in">
          <div className="w-16 h-16 rounded-full bg-gradient-gold flex items-center justify-center mb-4 animate-pulse">
            <Clock className="h-8 w-8 text-primary-foreground" />
          </div>
          <h2 className="font-serif text-xl font-semibold text-foreground mb-2">
            We reizen terug in de tijd...
          </h2>
          <p className="text-muted-foreground text-sm mb-3">
            Dit kan even duren
          </p>
          <Loader2 className="h-5 w-5 animate-spin text-accent" />
        </div>
      )}

      {/* Error state */}
      {error && !isLoading && (
        <div className="flex-1 flex items-center justify-center px-4">
          <div className="bg-card rounded-xl shadow-card border border-destructive/20 p-6 text-center max-w-md">
            <AlertCircle className="h-10 w-10 text-destructive mx-auto mb-3" />
            <h3 className="font-serif text-lg font-semibold text-foreground mb-2">
              Er ging iets mis
            </h3>
            <p className="text-muted-foreground text-sm mb-4">{error}</p>
            <Button 
              onClick={() => formData && loadTimeline(formData)}
              size="sm"
              className="btn-vintage"
            >
              <RefreshCw className="h-4 w-4 mr-2" />
              Probeer opnieuw
            </Button>
          </div>
        </div>
      )}

      {/* Timeline content - takes remaining space */}
      {!isLoading && !error && events.length > 0 && (
        <div className="flex-1 flex flex-col min-h-0 pb-16">
          {/* Famous birthdays - compact inline */}
          {famousBirthdays.length > 0 && (
            <div className="container mx-auto max-w-6xl px-4 mb-2">
              <div className="flex items-center gap-2 flex-wrap text-xs">
                <span className="font-medium text-muted-foreground flex items-center gap-1">
                  <Star className="h-3 w-3 text-accent" />
                  Ook jarig:
                </span>
                {famousBirthdays.slice(0, 5).map((celeb, idx) => (
                  <span 
                    key={idx} 
                    className="inline-flex items-center gap-1 px-2 py-0.5 bg-secondary/50 rounded-full"
                  >
                    <strong>{celeb.name}</strong>
                    <span className="text-muted-foreground">({celeb.birthYear})</span>
                  </span>
                ))}
                {famousBirthdays.length > 5 && (
                  <span className="text-muted-foreground">+{famousBirthdays.length - 5} meer</span>
                )}
              </div>
            </div>
          )}

          {/* Image loading indicator - minimal */}
          {isLoadingImages && (
            <div className="container mx-auto max-w-6xl px-4 mb-2">
              <div className="flex items-center gap-2 text-xs text-muted-foreground">
                <Loader2 className="h-3 w-3 animate-spin" />
                <span>Afbeeldingen laden...</span>
              </div>
            </div>
          )}

          {/* Horizontal carousel - fills remaining space */}
          <section className="flex-1 min-h-0">
            <TimelineCarousel
              events={events}
              currentEventIndex={currentEventIndex}
              onEventSelect={handleEventSelect}
              birthDate={formData?.birthDate}
            />
          </section>

          {/* Bottom scrubber */}
          <TimelineScrubberBottom 
            events={events}
            currentEventIndex={currentEventIndex}
            onEventSelect={handleEventSelect}
            birthDate={formData?.birthDate}
            mode={formData?.type || 'birthdate'}
          />
        </div>
      )}
    </div>
  );
};

export default ResultPage;
