import { useCallback, useEffect, useRef, useState } from 'react';
import { useNavigate } from 'react-router-dom';

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

// Era-themed background images
import heroBg from '@/assets/hero-bg-new.png';
import heroBg70s from '@/assets/hero-bg-70s.png';
import heroBg80s from '@/assets/hero-bg-80s.png';
import heroBg90s from '@/assets/hero-bg-90s.png';
import heroBg00s from '@/assets/hero-bg-00s.png';
import heroBg10s from '@/assets/hero-bg-10s.png';

// Get era-themed background based on birth year
const getBackgroundForYear = (year: number): string => {
  if (year >= 1969 && year <= 1979) return heroBg70s;
  if (year >= 1980 && year <= 1989) return heroBg80s;
  if (year >= 1990 && year <= 1999) return heroBg90s;
  if (year >= 2000 && year <= 2009) return heroBg00s;
  if (year >= 2010 && year <= 2019) return heroBg10s;
  return heroBg;
};

const ResultPage = () => {
  const navigate = useNavigate();
  const { language, t } = useLanguage();
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
  // Holds the incremental stream list so later onEvent updates don't overwrite image updates.
  const receivedEventsRef = useRef<TimelineEvent[]>([]);
  
  // Client-side image search with concurrency control
  const handleImageFound = useCallback((eventId: string, imageUrl: string, source: string | null) => {
    // Keep the stream buffer in sync, otherwise subsequent onEvent renders can overwrite images.
    receivedEventsRef.current = receivedEventsRef.current.map(event => {
      if (event.id !== eventId) return event;
      return {
        ...event,
        imageUrl,
        source: source || undefined,
        imageStatus: 'found' as const,
      };
    });

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

  // Track whether we've already finalized image statuses to prevent flicker
  const hasFinalized = useRef(false);
  
  // Mark events without images as 'none' ONLY once when search completes
  useEffect(() => {
    // Only finalize once when loading transitions from true to false
    if (!isLoadingImages && searchedCount > 0 && !hasFinalized.current) {
      hasFinalized.current = true;
      setEvents(prev => prev.map(event => {
        if (event.imageStatus === 'loading' && !event.imageUrl) {
          return { ...event, imageStatus: 'none' as const };
        }
        return event;
      }));
    }
    // Reset the flag when loading starts again
    if (isLoadingImages) {
      hasFinalized.current = false;
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
        // Ensure ref state is clean before (re)starting searches for cached events
        resetImageSearch();
        receivedEventsRef.current = [];
        
        const normalizedCachedEvents = cached.events.map((e) => {
          if (e.imageSearchQuery && (e.imageStatus === 'none' || e.imageStatus === 'error' || !e.imageUrl)) {
            return { ...e, imageStatus: 'loading' as const, imageUrl: undefined };
          }
          if (!e.imageSearchQuery && (e.imageStatus === 'none' || e.imageStatus === 'error')) {
            return { ...e, imageStatus: 'idle' as const };
          }
          return e;
        });

        // Initialize the ref with normalized events so handleImageFound can update them
        receivedEventsRef.current = normalizedCachedEvents;
        
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
      setError(t('noDataFound') as string);
      setIsLoading(false);
    }
  // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  const loadTimelineStreaming = async (data: FormData, maxEvents?: number) => {
    setIsLoading(true);
    setError(null);
    setStreamingProgress(0);
    // Reset the incremental stream buffer for this run
    receivedEventsRef.current = [];
    
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
          
          receivedEventsRef.current.push(eventWithStatus);
          
          // Sort and update state
          const sorted = [...receivedEventsRef.current].sort((a, b) => {
            if (a.year !== b.year) return a.year - b.year;
            if ((a.month || 0) !== (b.month || 0)) return (a.month || 0) - (b.month || 0);
            return (a.day || 0) - (b.day || 0);
          });
          
          setEvents(sorted);
          setStreamingProgress(receivedEventsRef.current.length);
          
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
          
          // Merge with receivedEventsRef to preserve already-found images
          setEvents(() => {
            const refMap = new Map(receivedEventsRef.current.map(e => [e.id, e]));
            
            const sorted = completeData.events
              .map(e => {
                const existing = refMap.get(e.id);
                // Preserve imageUrl and imageStatus from ref if found
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
            title: t('timelineLoaded') as string,
            description: `${completeData.events.length} ${t('eventsFound') as string}`,
          });
        },
        onError: (errorMsg) => {
          console.error('Streaming error:', errorMsg);
          setError(errorMsg);
          setIsLoading(false);
          
          toast({
            variant: "destructive",
            title: t('loadError') as string,
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
        title: t('pdfDownloaded') as string,
        description: t('pdfMagazineReady') as string,
      });
    } catch (err) {
      console.error('Error generating PDF:', err);
      toast({
        variant: "destructive",
        title: t('pdfError') as string,
        description: t('pdfTryAgain') as string,
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
        title: t('polaroidPdfDownloaded') as string,
        description: t('polaroidReady') as string,
      });
    } catch (err) {
      console.error('Error generating Polaroid PDF:', err);
      toast({
        variant: "destructive",
        title: t('pdfError') as string,
        description: t('pdfTryAgain') as string,
      });
    } finally {
      setIsGeneratingPolaroidPdf(false);
      setPolaroidPdfProgress(0);
    }
  };

  const getTitle = () => {
    if (!formData) return t('yourTimeJourney') as string;
    
    if (formData.type === 'birthdate' && formData.birthDate) {
      const { day, month, year } = formData.birthDate;
      return `${day} - ${month} - ${year}`;
    } else if (formData.yearRange) {
      return `${formData.yearRange.startYear} - ${formData.yearRange.endYear}`;
    }
    return t('yourTimeJourney') as string;
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
      // Reset all state
      const storedLength = sessionStorage.getItem('timelineLength') || 'short';
      const maxEvents = storedLength === 'short' ? 20 : undefined;
      resetImageSearch();
      receivedEventsRef.current = [];
      setEvents([]);
      setSummary('');
      setFamousBirthdays([]);
      setIsLoading(true);
      loadTimelineStreaming(formData, maxEvents);
    }
  };

  // Get the era-themed background based on birth year
  const birthYear = formData?.birthDate?.year || formData?.yearRange?.startYear;
  const backgroundImage = birthYear ? getBackgroundForYear(birthYear) : heroBg;

  if (!formData && !isLoading) {
    return (
      <div className="min-h-screen bg-gradient-hero flex items-center justify-center">
        <div className="text-center">
          <p className="text-muted-foreground mb-4">{t('noDataFound') as string}</p>
          <Button onClick={() => navigate('/')}>{t('backToStart') as string}</Button>
        </div>
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-gradient-hero flex flex-col relative overflow-hidden">
      {/* Era-themed background image - more visible than homepage */}
      <div 
        className="fixed inset-0 z-0 transition-opacity duration-700"
        style={{
          backgroundImage: `url(${backgroundImage})`,
          backgroundSize: 'cover',
          backgroundPosition: 'center',
          backgroundRepeat: 'no-repeat',
          opacity: 0.25,
        }}
      />
      {/* Gradient overlay for better content readability */}
      <div className="fixed inset-0 z-0 bg-gradient-to-b from-background/60 via-background/40 to-background/70" />
      
      {/* Compact header section - relative z-10 to appear above background */}
      <section className="pt-3 pb-1 px-4 relative z-10">
        <div className="container mx-auto max-w-6xl">
          {/* Top row: Back button left, Date right */}
          <div className="flex items-center justify-between mb-2 fade-in">
            <button
              onClick={() => navigate('/')}
              className="flex items-center gap-1.5 text-sm text-muted-foreground hover:text-foreground transition-colors"
            >
              <ArrowLeft className="h-3.5 w-3.5" />
              <span>{t('backToInput') as string}</span>
            </button>
            
            <h1 className="font-serif text-xl sm:text-2xl font-bold text-foreground">
              {getTitle()}
            </h1>
          </div>

          {/* Action buttons row */}
          <div className="flex items-center justify-end gap-2 mb-2 fade-in">
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
                    <span className="hidden sm:inline">{t('magazinePdf') as string}</span>
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
                    <span className="hidden sm:inline">{t('polaroidPdf') as string}</span>
                  </>
                )}
              </Button>
            )}
            
            {/* Refresh button - now at far right */}
            {events.length > 0 && !isLoading && (
              <Button
                onClick={handleClearCache}
                variant="outline"
                size="sm"
                className="gap-1.5"
                title={t('refreshButton') as string}
              >
                <RefreshCw className="h-4 w-4" />
                <span className="hidden sm:inline">{t('refreshButton') as string}</span>
              </Button>
            )}
            
            {/* Image loading indicator */}
            {isLoadingImages && imagesLoading > 0 && (
              <span className="text-xs text-muted-foreground flex items-center gap-1">
                <Loader2 className="h-3 w-3 animate-spin" />
                {imagesLoaded}/{events.length} {t('photosCount') as string}
              </span>
            )}
          </div>
        </div>
      </section>

      {/* Loading state - now shows events as they stream in */}
      {isLoading && (
        <div className="flex-1 flex flex-col relative z-10">
          {events.length === 0 ? (
            <div className="flex-1 flex flex-col items-center justify-center py-12 fade-in">
              <div className="w-16 h-16 rounded-full bg-gradient-gold flex items-center justify-center mb-4 animate-pulse">
                <Clock className="h-8 w-8 text-primary-foreground" />
              </div>
              <h2 className="font-serif text-xl font-semibold text-foreground mb-2">
                {t('loadingTitle') as string}
              </h2>
              <p className="text-muted-foreground text-sm mb-3">
                {t('loadingSubtitle') as string}
              </p>
              <Loader2 className="h-5 w-5 animate-spin text-accent" />
            </div>
          ) : (
            <>
              {/* Show streaming progress */}
              <div className="container mx-auto max-w-6xl px-4 mb-2">
                <div className="flex items-center gap-2 text-xs text-muted-foreground">
                  <Loader2 className="h-3 w-3 animate-spin" />
                  <span>{streamingProgress} {t('eventsLoaded') as string}</span>
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
        <div className="flex-1 flex items-center justify-center px-4 relative z-10">
          <div className="bg-card rounded-xl shadow-card border border-destructive/20 p-6 text-center max-w-md">
            <AlertCircle className="h-10 w-10 text-destructive mx-auto mb-3" />
            <h3 className="font-serif text-lg font-semibold text-foreground mb-2">
              {t('errorTitle') as string}
            </h3>
            <p className="text-muted-foreground text-sm mb-4">{error}</p>
            <Button 
              onClick={() => formData && loadTimelineStreaming(formData)}
              size="sm"
              className="btn-vintage"
            >
              <RefreshCw className="h-4 w-4 mr-2" />
              {t('tryAgain') as string}
            </Button>
          </div>
        </div>
      )}

      {/* Timeline content - takes remaining space */}
      {!isLoading && !error && events.length > 0 && (
        <div className="flex-1 flex flex-col min-h-0 pb-16 relative z-10">
          {/* Famous birthdays - compact inline */}
          {famousBirthdays.length > 0 && (
            <div className="container mx-auto max-w-6xl px-4 mb-2">
              <div className="flex items-center justify-center gap-2 flex-wrap text-xs">
                <span className="font-medium text-muted-foreground flex items-center gap-1">
                  <Star className="h-3 w-3 text-accent" />
                  {t('alsoborn') as string}
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
                  <span className="text-muted-foreground">+{famousBirthdays.length - 5} {t('moreCount') as string}</span>
                )}
              </div>
            </div>
          )}

          {/* Image loading indicator - minimal */}
          {isLoadingImages && (
            <div className="container mx-auto max-w-6xl px-4 mb-2">
              <div className="flex items-center gap-2 text-xs text-muted-foreground">
                <Loader2 className="h-3 w-3 animate-spin" />
                <span>{t('loadingImages') as string}</span>
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
