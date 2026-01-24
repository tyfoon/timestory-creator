import { useEffect, useState } from 'react';
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
        
        setEvents(sortedEvents);
        setSummary(response.data.summary);
        setFamousBirthdays(response.data.famousBirthdays || []);
        
        toast({
          title: "Tijdlijn geladen!",
          description: `${sortedEvents.length} gebeurtenissen gevonden`,
        });

        // Load images in background
        loadImages(sortedEvents);
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
      const queries = timelineEvents
        .filter(e => e.imageSearchQuery)
        .slice(0, 20) // Limit to first 20 to save API calls
        .map(e => ({
          eventId: e.id,
          query: e.imageSearchQuery!,
          year: e.year
        }));

      if (queries.length > 0) {
        const result = await searchImages(queries);
        
        if (result.success && result.images) {
          // Update events with found images
          setEvents(prev => prev.map(event => {
            const imageResult = result.images?.find(img => img.eventId === event.id);
            if (imageResult?.imageUrl) {
              return { ...event, imageUrl: imageResult.imageUrl, source: imageResult.source || undefined };
            }
            return event;
          }));
        }
      }
    } catch (err) {
      console.error('Error loading images:', err);
      // Don't show error toast for images - they're optional
    } finally {
      setIsLoadingImages(false);
    }
  };

  const handleEventSelect = (index: number) => {
    setCurrentEventIndex(index);
  };

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
    <div className="min-h-screen bg-gradient-hero pb-20">
      <Header />
      
      {/* Header section */}
      <section className="pt-32 pb-4 px-4">
        <div className="container mx-auto max-w-5xl">
          {/* Back button */}
          <button
            onClick={() => navigate('/invoer?type=' + (formData?.type || 'birthdate'))}
            className="flex items-center gap-2 text-muted-foreground hover:text-foreground transition-colors mb-6 fade-in"
          >
            <ArrowLeft className="h-4 w-4" />
            <span>Terug naar invoer</span>
          </button>

          {/* Title */}
          <div className="text-center mb-6 fade-in">
            <div className="inline-flex items-center gap-2 px-4 py-2 rounded-full bg-secondary/80 border border-border mb-4">
              <Clock className="h-4 w-4 text-accent" />
              <span className="text-sm text-muted-foreground font-medium">
                {formData?.type === 'birthdate' ? 'Geboortedatum Overzicht' : 'Tijdperiode Overzicht'}
              </span>
            </div>
            
            <h1 className="font-serif text-3xl sm:text-4xl font-bold text-foreground mb-3">
              {getTitle()}
            </h1>
            
            {formData?.optionalData.city && (
              <p className="text-muted-foreground">
                📍 {formData.optionalData.city}
                {formData.optionalData.focus === 'netherlands' && ' • Focus: Nederland'}
                {formData.optionalData.focus === 'europe' && ' • Focus: Europa'}
                {formData.optionalData.focus === 'world' && ' • Focus: Wereld'}
              </p>
            )}
          </div>
        </div>
      </section>

      {/* Loading state */}
      {isLoading && (
        <div className="flex flex-col items-center justify-center py-20 fade-in">
          <div className="w-20 h-20 rounded-full bg-gradient-gold flex items-center justify-center mb-6 animate-pulse">
            <Clock className="h-10 w-10 text-primary-foreground" />
          </div>
          <h2 className="font-serif text-2xl font-semibold text-foreground mb-2">
            We reizen terug in de tijd...
          </h2>
          <p className="text-muted-foreground mb-4">
            Dit kan even duren, we doorzoeken de geschiedenis
          </p>
          <Loader2 className="h-6 w-6 animate-spin text-accent" />
        </div>
      )}

      {/* Error state */}
      {error && !isLoading && (
        <div className="container mx-auto max-w-md py-20 px-4">
          <div className="bg-card rounded-xl shadow-card border border-destructive/20 p-8 text-center">
            <AlertCircle className="h-12 w-12 text-destructive mx-auto mb-4" />
            <h3 className="font-serif text-xl font-semibold text-foreground mb-2">
              Er ging iets mis
            </h3>
            <p className="text-muted-foreground mb-6">{error}</p>
            <Button 
              onClick={() => formData && loadTimeline(formData)}
              className="btn-vintage"
            >
              <RefreshCw className="h-4 w-4 mr-2" />
              Probeer opnieuw
            </Button>
          </div>
        </div>
      )}

      {/* Timeline content */}
      {!isLoading && !error && events.length > 0 && (
        <>
          {/* Event scope legend */}
          {formData?.type === 'birthdate' && (
            <div className="container mx-auto max-w-5xl px-4 mb-4">
              <div className="flex flex-wrap gap-3 justify-center text-xs">
                {birthdateEvents > 0 && (
                  <span className="inline-flex items-center gap-1.5 px-3 py-1 rounded-full bg-accent text-accent-foreground">
                    <Cake className="h-3 w-3" />
                    {birthdateEvents} op je geboortedag
                  </span>
                )}
                {birthmonthEvents > 0 && (
                  <span className="inline-flex items-center gap-1.5 px-3 py-1 rounded-full bg-accent/70 text-accent-foreground">
                    {birthmonthEvents} in je geboortemaand
                  </span>
                )}
                {birthyearEvents > 0 && (
                  <span className="inline-flex items-center gap-1.5 px-3 py-1 rounded-full bg-secondary text-secondary-foreground">
                    {birthyearEvents} in je geboortejaar
                  </span>
                )}
                {celebrityEvents > 0 && (
                  <span className="inline-flex items-center gap-1.5 px-3 py-1 rounded-full bg-accent/50 text-accent-foreground">
                    <Star className="h-3 w-3" />
                    {celebrityEvents} beroemde jarigen
                  </span>
                )}
              </div>
            </div>
          )}

          {/* Summary */}
          {summary && (
            <div className="container mx-auto max-w-4xl px-4 mb-6">
              <div className="bg-card/50 rounded-lg p-4 border border-border/50">
                <p className="text-muted-foreground italic text-sm">{summary}</p>
              </div>
            </div>
          )}

          {/* Famous birthdays highlight */}
          {famousBirthdays.length > 0 && (
            <div className="container mx-auto max-w-5xl px-4 mb-6">
              <div className="bg-secondary/50 rounded-lg p-4 border border-border/50">
                <h3 className="font-serif text-lg font-semibold text-foreground mb-2 flex items-center gap-2">
                  <Cake className="h-5 w-5 text-accent" />
                  Beroemde jarigen op jouw verjaardag
                </h3>
                <div className="flex flex-wrap gap-2">
                  {famousBirthdays.slice(0, 8).map((celeb, idx) => (
                    <span 
                      key={idx} 
                      className="inline-flex items-center gap-1 px-3 py-1 bg-card/50 rounded-full text-sm"
                    >
                      <Star className="h-3 w-3 text-accent" />
                      <strong>{celeb.name}</strong>
                      <span className="text-muted-foreground">({celeb.profession}, {celeb.birthYear})</span>
                    </span>
                  ))}
                </div>
              </div>
            </div>
          )}

          {/* Image loading indicator */}
          {isLoadingImages && (
            <div className="container mx-auto max-w-5xl px-4 mb-4">
              <div className="flex items-center gap-2 text-sm text-muted-foreground">
                <Loader2 className="h-4 w-4 animate-spin" />
                <span>Afbeeldingen laden...</span>
              </div>
            </div>
          )}

          {/* Horizontal carousel */}
          <section className="pb-20">
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
          />
        </>
      )}
    </div>
  );
};

export default ResultPage;
