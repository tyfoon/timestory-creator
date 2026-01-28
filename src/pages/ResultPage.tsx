import { useCallback, useEffect, useRef, useState } from 'react';
import { useNavigate } from 'react-router-dom';
import { Header } from '@/components/Header';
import { TimelineCarousel } from '@/components/TimelineCarousel';
import { TimelineScrubberBottom } from '@/components/TimelineScrubberBottom';
import { Button } from '@/components/ui/button';
import { useLanguage } from '@/contexts/LanguageContext';
import { FormData } from '@/types/form';
import { TimelineEvent, FamousBirthday } from '@/types/timeline';
import { generateTimelineStreaming } from '@/lib/api/timeline';
import { useClientImageSearch } from '@/hooks/useClientImageSearch';
import { generateTimelinePdf } from '@/lib/pdfGenerator';
import { generatePolaroidPdf } from '@/lib/pdfGeneratorPolaroid';
import { getCachedTimeline, cacheTimeline, updateCachedEvents, getCacheKey } from '@/lib/timelineCache';
import { ArrowLeft, Clock, Loader2, AlertCircle, RefreshCw, Cake, Star, Download, Camera } from 'lucide-react';
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
  const [error, setError] = useState<string | null>(null);
  const [currentEventIndex, setCurrentEventIndex] = useState(0);
  const [isScrubbing, setIsScrubbing] = useState(false);
  const [isGeneratingPdf, setIsGeneratingPdf] = useState(false);
  const [isGeneratingPolaroidPdf, setIsGeneratingPolaroidPdf] = useState(false);
  const [pdfProgress, setPdfProgress] = useState(0);
  const [polaroidPdfProgress, setPolaroidPdfProgress] = useState(0);
  const [streamingProgress, setStreamingProgress] = useState(0);

  // Track current formData for cache updates
  const formDataRef = useRef<FormData | null>(null);
  
  // Client-side image search with concurrency control
  const handleImageFound = useCallback((eventId: string, imageUrl: string, source: string | null) => {
    setEvents(prev => {
      const updated = prev.map(event => {
        if (event.id !== eventId) return event;
        return {
          ...event,
          imageUrl,
          source: source || undefined,
          imageStatus: 'found' as const,
        };
      });

      // Persist to cache
      if (formDataRef.current) {
        updateCachedEvents(formDataRef.current, language, () => updated);
      }

      return updated;
    });
  }, [language]);

  const { 
    addToQueue: addImagesToQueue, 
    reset: resetImageSearch,
    isSearching: isLoadingImages,
    searchedCount,
    foundCount 
  } = useClientImageSearch({
    maxConcurrent: 3,
    onImageFound: handleImageFound,
  });

  // Mark events without images as 'none' after search completes
  useEffect(() => {
    if (!isLoadingImages && searchedCount > 0) {
      setEvents(prev => prev.map(event => {
        if (event.imageStatus === 'loading' && !event.imageUrl) {
          return { ...event, imageStatus: 'none' as const };
        }
        return event;
      }));
    }
  }, [isLoadingImages, searchedCount]);

  const loadImagesForEvents = useCallback((newEvents: TimelineEvent[]) => {
    const eventsNeedingImages = newEvents.filter(
      e => e.imageSearchQuery && 
           e.imageStatus !== 'found' && 
           e.imageStatus !== 'none'
    );
    
    if (eventsNeedingImages.length === 0) return;
    addImagesToQueue(eventsNeedingImages);
  }, [addImagesToQueue]);

  useEffect(() => {
    const stored = sessionStorage.getItem('timelineFormData');
    const storedLength = sessionStorage.getItem('timelineLength') || 'short';
    
    console.log('ResultPage: Loading form data from sessionStorage:', stored);
    
    if (stored) {
      const data = JSON.parse(stored) as FormData;
      console.log('ResultPage: Parsed form data:', data);
      setFormData(data);
      formDataRef.current = data;

      // Check cache first
      const cached = getCachedTimeline(data, language);
      if (cached) {
        console.log('Using cached timeline');
        const normalizedCachedEvents = cached.events.map((e) => {
          if (e.imageSearchQuery && (e.imageStatus === 'none' || e.imageStatus === 'error' || !e.imageUrl)) {
            return { ...e, imageStatus: 'loading' as const, imageUrl: undefined };
          }
          if (!e.imageSearchQuery && (e.imageStatus === 'none' || e.imageStatus === 'error')) {
            return { ...e, imageStatus: 'idle' as const };
          }
          return e;
        });

        setEvents(normalizedCachedEvents);
        setSummary(cached.summary);
        setFamousBirthdays(cached.famousBirthdays);
        setIsLoading(false);

        // Reload images using client-side search
        const needImages = normalizedCachedEvents.filter(e => 
          e.imageSearchQuery && (!e.imageUrl || e.imageStatus === 'loading')
        );
        if (needImages.length > 0) {
          console.log('Refetching images client-side for', needImages.length, 'events');
          addImagesToQueue(needImages);
        }
        return;
      }

      const maxEvents = storedLength === 'short' ? 20 : undefined;
      loadTimelineStreaming(data, maxEvents);
    } else {
      setError('Geen gegevens gevonden');
      setIsLoading(false);
    }
  // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  const loadTimelineStreaming = async (data: FormData, maxEvents?: number) => {
    setIsLoading(true);
    setError(null);
    setStreamingProgress(0);
    
    const receivedEvents: TimelineEvent[] = [];
    let receivedSummary = '';
    let receivedFamousBirthdays: FamousBirthday[] = [];
    
    try {
      await generateTimelineStreaming(data, language, {
        onEvent: (event) => {
          // Add imageStatus to new event
          const eventWithStatus: TimelineEvent = {
            ...event,
            imageStatus: event.imageSearchQuery ? 'loading' : 'idle'
          };
          
          receivedEvents.push(eventWithStatus);
          
          // Sort and update state
          const sorted = [...receivedEvents].sort((a, b) => {
            if (a.year !== b.year) return a.year - b.year;
            if ((a.month || 0) !== (b.month || 0)) return (a.month || 0) - (b.month || 0);
            return (a.day || 0) - (b.day || 0);
          });
          
          setEvents(sorted);
          setStreamingProgress(receivedEvents.length);
          
          // Start loading image for this event immediately
          if (event.imageSearchQuery) {
            loadImagesForEvents([eventWithStatus]);
          }
        },
        onSummary: (summary) => {
          receivedSummary = summary;
          setSummary(summary);
        },
        onFamousBirthdays: (birthdays) => {
          receivedFamousBirthdays = birthdays;
          setFamousBirthdays(birthdays);
        },
        onComplete: (completeData) => {
          console.log('Streaming complete:', completeData.events.length, 'events');
          
          // Merge with current events to preserve already-found images
          setEvents(prev => {
            const prevMap = new Map(prev.map(e => [e.id, e]));
            
            const sorted = completeData.events
              .map(e => {
                const existing = prevMap.get(e.id);
                // Preserve imageUrl and imageStatus from existing event if found
                if (existing && existing.imageUrl) {
                  return {
                    ...e,
                    imageUrl: existing.imageUrl,
                    source: existing.source,
                    imageStatus: 'found' as const
                  };
                }
                return {
                  ...e,
                  imageStatus: (e.imageSearchQuery ? 'loading' : 'idle') as TimelineEvent['imageStatus']
                };
              })
              .sort((a, b) => {
                if (a.year !== b.year) return a.year - b.year;
                if ((a.month || 0) !== (b.month || 0)) return (a.month || 0) - (b.month || 0);
                return (a.day || 0) - (b.day || 0);
              });
            
            // Cache the merged result
            cacheTimeline(data, language, sorted, completeData.summary, completeData.famousBirthdays || []);
            
            return sorted;
          });
          
          setSummary(completeData.summary);
          setFamousBirthdays(completeData.famousBirthdays || []);
          setIsLoading(false);
          
          toast({
            title: "Tijdlijn geladen!",
            description: `${completeData.events.length} gebeurtenissen gevonden`,
          });
        },
        onError: (errorMsg) => {
          console.error('Streaming error:', errorMsg);
          setError(errorMsg);
          setIsLoading(false);
          
          toast({
            variant: "destructive",
            title: "Fout bij laden",
            description: errorMsg,
          });
        }
      }, { maxEvents });
    } catch (err) {
      console.error('Error in streaming:', err);
      setError(err instanceof Error ? err.message : 'Er ging iets mis');
      setIsLoading(false);
    }
  };

  const handleEventSelect = useCallback((index: number) => {
    setCurrentEventIndex(index);
  }, []);

  const handleDownloadPdf = async () => {
    if (!formData || events.length === 0) return;
    
    setIsGeneratingPdf(true);
    setPdfProgress(0);
    
    try {
      await generateTimelinePdf({
        events,
        famousBirthdays,
        formData,
        summary
      }, (progress) => {
        setPdfProgress(progress);
      });
      
      toast({
        title: "PDF gedownload!",
        description: "Je tijdreis magazine is klaar",
      });
    } catch (err) {
      console.error('Error generating PDF:', err);
      toast({
        variant: "destructive",
        title: "Fout bij PDF genereren",
        description: "Probeer het opnieuw",
      });
    } finally {
      setIsGeneratingPdf(false);
      setPdfProgress(0);
    }
  };

  const handleDownloadPolaroidPdf = async () => {
    if (!formData || events.length === 0) return;
    
    setIsGeneratingPolaroidPdf(true);
    setPolaroidPdfProgress(0);
    
    try {
      await generatePolaroidPdf({
        events,
        famousBirthdays,
        formData,
        summary
      }, (progress) => {
        setPolaroidPdfProgress(progress);
      });
      
      toast({
        title: "Polaroid PDF gedownload!",
        description: "Je jaren 80 polaroid editie is klaar",
      });
    } catch (err) {
      console.error('Error generating Polaroid PDF:', err);
      toast({
        variant: "destructive",
        title: "Fout bij PDF genereren",
        description: "Probeer het opnieuw",
      });
    } finally {
      setIsGeneratingPolaroidPdf(false);
      setPolaroidPdfProgress(0);
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

  // Count events by scope
  const birthdateEvents = events.filter(e => e.eventScope === 'birthdate').length;
  const birthmonthEvents = events.filter(e => e.eventScope === 'birthmonth').length;
  const birthyearEvents = events.filter(e => e.eventScope === 'birthyear').length;
  
  // Count images loaded
  const imagesLoaded = events.filter(e => e.imageStatus === 'found' && e.imageUrl).length;
  const imagesLoading = events.filter(e => e.imageStatus === 'loading').length;
  
  const handleClearCache = () => {
    if (formData) {
      const key = getCacheKey(formData, language);
      sessionStorage.removeItem(key);
      // Reload the page to trigger fresh generation
      const storedLength = sessionStorage.getItem('timelineLength') || 'short';
      const maxEvents = storedLength === 'short' ? 20 : undefined;
      setEvents([]);
      setSummary('');
      setFamousBirthdays([]);
      setIsLoading(true);
      loadTimelineStreaming(formData, maxEvents);
    }
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
    <div className="min-h-screen bg-gradient-hero flex flex-col">
      <Header />
      
      {/* Compact header section */}
      <section className="pt-24 pb-2 px-4">
        <div className="container mx-auto max-w-6xl">
          {/* Back button - smaller */}
          <button
            onClick={() => navigate('/')}
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
            
            <div className="flex items-center gap-2">
              {/* Refresh button */}
              {events.length > 0 && !isLoading && (
                <Button
                  onClick={handleClearCache}
                  variant="outline"
                  size="sm"
                  className="gap-1.5"
                  title="Genereer opnieuw met nieuwe afbeeldingen"
                >
                  <RefreshCw className="h-4 w-4" />
                  <span className="hidden sm:inline">Opnieuw</span>
                </Button>
              )}
              
              {/* Download PDF button */}
              {events.length > 0 && !isLoading && (
                <Button
                  onClick={handleDownloadPdf}
                  disabled={isGeneratingPdf || isGeneratingPolaroidPdf || isLoadingImages}
                  size="sm"
                  className="btn-vintage gap-2"
                >
                  {isGeneratingPdf ? (
                    <>
                      <Loader2 className="h-4 w-4 animate-spin" />
                      <span>{pdfProgress}%</span>
                    </>
                  ) : (
                    <>
                      <Download className="h-4 w-4" />
                      <span className="hidden sm:inline">Magazine PDF</span>
                    </>
                  )}
                </Button>
              )}
              
              {/* Download Polaroid PDF button */}
              {events.length > 0 && !isLoading && (
                <Button
                  onClick={handleDownloadPolaroidPdf}
                  disabled={isGeneratingPdf || isGeneratingPolaroidPdf || isLoadingImages}
                  size="sm"
                  variant="outline"
                  className="gap-2 border-pink-500/50 text-pink-600 hover:bg-pink-500/10 hover:text-pink-700"
                >
                  {isGeneratingPolaroidPdf ? (
                    <>
                      <Loader2 className="h-4 w-4 animate-spin" />
                      <span>{polaroidPdfProgress}%</span>
                    </>
                  ) : (
                    <>
                      <Camera className="h-4 w-4" />
                      <span className="hidden sm:inline">Polaroid PDF</span>
                    </>
                  )}
                </Button>
              )}
              
              {/* Image loading indicator */}
              {isLoadingImages && imagesLoading > 0 && (
                <span className="text-xs text-muted-foreground flex items-center gap-1">
                  <Loader2 className="h-3 w-3 animate-spin" />
                  {imagesLoaded}/{events.length} foto's
                </span>
              )}

              {/* Event scope badges - inline */}
              {formData?.type === 'birthdate' && events.length > 0 && (
                <div className="hidden lg:flex flex-wrap gap-2 text-xs">
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
        </div>
      </section>

      {/* Loading state - now shows events as they stream in */}
      {isLoading && (
        <div className="flex-1 flex flex-col">
          {events.length === 0 ? (
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
          ) : (
            <>
              {/* Show streaming progress */}
              <div className="container mx-auto max-w-6xl px-4 mb-2">
                <div className="flex items-center gap-2 text-xs text-muted-foreground">
                  <Loader2 className="h-3 w-3 animate-spin" />
                  <span>{streamingProgress} gebeurtenissen geladen...</span>
                </div>
              </div>
              
              {/* Show events as they come in */}
              <section className="flex-1 min-h-0">
                <TimelineCarousel
                  events={events}
                  currentEventIndex={currentEventIndex}
                  onEventSelect={handleEventSelect}
                  birthDate={formData?.birthDate}
                  isScrubbing={isScrubbing}
                />
              </section>
              
              <TimelineScrubberBottom 
                events={events}
                currentEventIndex={currentEventIndex}
                onEventSelect={handleEventSelect}
                onScrubStart={() => setIsScrubbing(true)}
                onScrubEnd={() => setIsScrubbing(false)}
              />
            </>
          )}
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
              onClick={() => formData && loadTimelineStreaming(formData)}
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
              isScrubbing={isScrubbing}
            />
          </section>

          {/* Bottom scrubber */}
          <TimelineScrubberBottom 
            events={events}
            currentEventIndex={currentEventIndex}
            onEventSelect={handleEventSelect}
            onScrubStart={() => setIsScrubbing(true)}
            onScrubEnd={() => setIsScrubbing(false)}
          />
        </div>
      )}
    </div>
  );
};

export default ResultPage;
