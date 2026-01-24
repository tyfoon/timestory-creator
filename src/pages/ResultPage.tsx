import { useEffect, useState, useRef } from 'react';
import { useNavigate } from 'react-router-dom';
import { Header } from '@/components/Header';
import { TimelineCard } from '@/components/TimelineCard';
import { TimelineScrubber } from '@/components/TimelineScrubber';
import { Button } from '@/components/ui/button';
import { useLanguage } from '@/contexts/LanguageContext';
import { FormData } from '@/types/form';
import { TimelineEvent } from '@/types/timeline';
import { generateTimeline } from '@/lib/api/timeline';
import { ArrowLeft, Clock, Loader2, AlertCircle, RefreshCw } from 'lucide-react';
import { useToast } from '@/hooks/use-toast';

const ResultPage = () => {
  const navigate = useNavigate();
  const { language } = useLanguage();
  const { toast } = useToast();
  
  const [formData, setFormData] = useState<FormData | null>(null);
  const [events, setEvents] = useState<TimelineEvent[]>([]);
  const [summary, setSummary] = useState<string>('');
  const [isLoading, setIsLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [currentEventIndex, setCurrentEventIndex] = useState(0);
  
  const eventRefs = useRef<(HTMLDivElement | null)[]>([]);

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
        
        toast({
          title: "Tijdlijn geladen!",
          description: `${sortedEvents.length} gebeurtenissen gevonden`,
        });
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

  const handleEventSelect = (index: number) => {
    setCurrentEventIndex(index);
    
    // Scroll to the selected event
    const eventElement = eventRefs.current[index];
    if (eventElement) {
      eventElement.scrollIntoView({ behavior: 'smooth', block: 'center' });
    }
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
    <div className="min-h-screen bg-gradient-hero">
      <Header />
      
      {/* Header section */}
      <section className="pt-32 pb-6 px-4">
        <div className="container mx-auto max-w-4xl">
          {/* Back button */}
          <button
            onClick={() => navigate('/invoer?type=' + (formData?.type || 'birthdate'))}
            className="flex items-center gap-2 text-muted-foreground hover:text-foreground transition-colors mb-8 fade-in"
          >
            <ArrowLeft className="h-4 w-4" />
            <span>Terug naar invoer</span>
          </button>

          {/* Title */}
          <div className="text-center mb-8 fade-in">
            <div className="inline-flex items-center gap-2 px-4 py-2 rounded-full bg-secondary/80 border border-border mb-6">
              <Clock className="h-4 w-4 text-accent" />
              <span className="text-sm text-muted-foreground font-medium">
                {formData?.type === 'birthdate' ? 'Geboortedatum Overzicht' : 'Tijdperiode Overzicht'}
              </span>
            </div>
            
            <h1 className="font-serif text-4xl sm:text-5xl font-bold text-foreground mb-4">
              {getTitle()}
            </h1>
            
            {formData?.optionalData.city && (
              <p className="text-lg text-muted-foreground">
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
          {/* Scrubber */}
          <TimelineScrubber 
            events={events}
            currentEventIndex={currentEventIndex}
            onEventSelect={handleEventSelect}
          />

          {/* Summary */}
          {summary && (
            <div className="container mx-auto max-w-4xl px-4 py-6">
              <div className="bg-card/50 rounded-lg p-4 border border-border/50">
                <p className="text-muted-foreground italic">{summary}</p>
              </div>
            </div>
          )}

          {/* Events grid */}
          <section className="container mx-auto max-w-4xl px-4 pb-20">
            <div className="grid gap-6 sm:grid-cols-2">
              {events.map((event, index) => (
                <div
                  key={event.id}
                  ref={(el) => (eventRefs.current[index] = el)}
                  className="fade-in"
                  style={{ animationDelay: `${Math.min(index * 0.05, 1)}s` }}
                >
                  <TimelineCard 
                    event={event} 
                    isActive={index === currentEventIndex}
                  />
                </div>
              ))}
            </div>
          </section>
        </>
      )}
    </div>
  );
};

export default ResultPage;
