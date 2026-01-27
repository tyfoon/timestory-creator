import { useCallback, useEffect, useRef, useState } from 'react';
import { useNavigate } from 'react-router-dom';
import { Header } from '@/components/Header';
import { Button } from '@/components/ui/button';
import { useLanguage } from '@/contexts/LanguageContext';
import { FormData } from '@/types/form';
import { TimelineEvent, FamousBirthday } from '@/types/timeline';
import { generateTimelineStreaming, searchImages } from '@/lib/api/timeline';
import { getCachedTimeline, cacheTimeline, updateCachedEvents, getCacheKey } from '@/lib/timelineCache';
import { ArrowLeft, Clock, Loader2, RefreshCw } from 'lucide-react';
import { useToast } from '@/hooks/use-toast';
import { PolaroidCard } from '@/components/PolaroidCard';

const PolaroidCollagePage = () => {
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
  const [streamingProgress, setStreamingProgress] = useState(0);

  const formDataRef = useRef<FormData | null>(null);
  const pendingImageRequests = useRef<Set<string>>(new Set());
  const imageQueueRef = useRef<TimelineEvent[]>([]);
  const isProcessingImagesRef = useRef(false);

  // Group events into chunks of 5 for collage sections
  const eventsPerSection = 5;
  const eventSections: TimelineEvent[][] = [];
  for (let i = 0; i < events.length; i += eventsPerSection) {
    eventSections.push(events.slice(i, i + eventsPerSection));
  }

  const processImageQueue = useCallback(async () => {
    if (isProcessingImagesRef.current) return;
    if (imageQueueRef.current.length === 0) return;
    
    isProcessingImagesRef.current = true;
    setIsLoadingImages(true);
    
    while (imageQueueRef.current.length > 0) {
      const batch = imageQueueRef.current.splice(0, 10);
      const queries = batch
        .filter(e => e.imageSearchQuery && !pendingImageRequests.current.has(e.id))
        .map(e => {
          pendingImageRequests.current.add(e.id);
          return {
            eventId: e.id,
            query: e.imageSearchQuery!,
            year: e.year
          };
        });
      
      if (queries.length === 0) continue;
      
      try {
        const result = await searchImages(queries, { mode: 'fast' });
        if (result.success && result.images) {
          applyImageResults(result.images);
          
          const missingImages = result.images.filter(img => !img.imageUrl);
          if (missingImages.length > 0) {
            const retryQueries = missingImages.map(img => {
              const originalQuery = queries.find(q => q.eventId === img.eventId);
              return originalQuery;
            }).filter(Boolean) as typeof queries;
            
            if (retryQueries.length > 0) {
              searchImages(retryQueries, { mode: 'full' })
                .then(retryResult => {
                  if (retryResult.success && retryResult.images) {
                    applyImageResults(retryResult.images);
                  }
                })
                .catch(err => console.error('Retry image fetch error:', err));
            }
          }
        }
      } catch (err) {
        console.error('Error fetching images:', err);
      }
      
      queries.forEach(q => pendingImageRequests.current.delete(q.eventId));
    }
    
    isProcessingImagesRef.current = false;
    setIsLoadingImages(false);
  }, []);

  const applyImageResults = useCallback((images: { eventId: string; imageUrl: string | null; source: string | null }[]) => {
    // Debug logging to track image matching
    console.log('Applying image results:', images.map(img => ({
      eventId: img.eventId,
      hasImage: !!img.imageUrl,
      url: img.imageUrl?.substring(0, 50)
    })));
    
    setEvents(prev => {
      const updated = prev.map(event => {
        const imageResult = images.find(img => img.eventId === event.id);
        if (!imageResult) return event;

        // Debug: log the match
        console.log(`Matching image for event "${event.title}" (id: ${event.id}):`, 
          imageResult.imageUrl ? 'found' : 'not found');

        if (imageResult.imageUrl) {
          return {
            ...event,
            imageUrl: imageResult.imageUrl,
            source: imageResult.source || undefined,
            imageStatus: 'found' as const,
          };
        }

        return { ...event, imageStatus: 'none' as const };
      });

      if (formDataRef.current) {
        updateCachedEvents(formDataRef.current, language, () => updated);
      }

      return updated;
    });
  }, [language]);

  const loadImagesForEvents = useCallback((newEvents: TimelineEvent[]) => {
    const eventsNeedingImages = newEvents.filter(
      e => e.imageSearchQuery && 
           e.imageStatus !== 'found' && 
           e.imageStatus !== 'none' &&
           !pendingImageRequests.current.has(e.id)
    );
    
    if (eventsNeedingImages.length === 0) return;
    
    imageQueueRef.current.push(...eventsNeedingImages);
    processImageQueue();
  }, [processImageQueue]);

  const loadTimelineStreaming = useCallback(async (data: FormData, maxEvents?: number) => {
    setIsLoading(true);
    setError(null);
    setStreamingProgress(0);
    
    const receivedEvents: TimelineEvent[] = [];
    
    try {
      await generateTimelineStreaming(data, language, {
        onEvent: (event) => {
          const eventWithStatus: TimelineEvent = {
            ...event,
            imageStatus: event.imageSearchQuery ? 'loading' : 'idle'
          };
          
          receivedEvents.push(eventWithStatus);
          
          const sorted = [...receivedEvents].sort((a, b) => {
            if (a.year !== b.year) return a.year - b.year;
            if ((a.month || 0) !== (b.month || 0)) return (a.month || 0) - (b.month || 0);
            return (a.day || 0) - (b.day || 0);
          });
          
          setEvents(sorted);
          setStreamingProgress(receivedEvents.length);
          
          if (event.imageSearchQuery) {
            loadImagesForEvents([eventWithStatus]);
          }
        },
        onSummary: (summaryText) => {
          setSummary(summaryText);
        },
        onFamousBirthdays: (birthdays) => {
          setFamousBirthdays(birthdays);
        },
        onComplete: (completeData) => {
          const sorted = completeData.events
            .map(e => ({
              ...e,
              imageStatus: (receivedEvents.find(re => re.id === e.id)?.imageStatus || 
                           (e.imageSearchQuery ? 'loading' : 'idle')) as TimelineEvent['imageStatus']
            }))
            .sort((a, b) => {
              if (a.year !== b.year) return a.year - b.year;
              if ((a.month || 0) !== (b.month || 0)) return (a.month || 0) - (b.month || 0);
              return (a.day || 0) - (b.day || 0);
            });
          
          setEvents(sorted);
          setSummary(completeData.summary);
          setFamousBirthdays(completeData.famousBirthdays || []);
          setIsLoading(false);
          
          toast({
            title: "Tijdlijn geladen!",
            description: `${sorted.length} gebeurtenissen gevonden`,
          });
          
          cacheTimeline(data, language, sorted, completeData.summary, completeData.famousBirthdays || []);
        },
        onError: (errorMsg) => {
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
      setError(err instanceof Error ? err.message : 'Er ging iets mis');
      setIsLoading(false);
    }
  }, [language, loadImagesForEvents, toast]);

  // Track if we've already initialized to prevent re-runs
  const hasInitialized = useRef(false);

  // Initialize - runs once on mount
  useEffect(() => {
    // Only run once
    if (hasInitialized.current) return;
    hasInitialized.current = true;

    const stored = sessionStorage.getItem('timelineFormData');
    const storedLength = sessionStorage.getItem('timelineLength') || 'short';
    
    if (stored) {
      const data = JSON.parse(stored) as FormData;
      setFormData(data);
      formDataRef.current = data;

      const cached = getCachedTimeline(data, language);
      if (cached) {
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

        const needImages = normalizedCachedEvents.filter(e => 
          e.imageSearchQuery && (!e.imageUrl || e.imageStatus === 'loading')
        );
        if (needImages.length > 0) {
          loadImagesForEvents(needImages);
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

  const handleClearCache = () => {
    if (formData) {
      const key = getCacheKey(formData, language);
      sessionStorage.removeItem(key);
      const storedLength = sessionStorage.getItem('timelineLength') || 'short';
      const maxEvents = storedLength === 'short' ? 20 : undefined;
      setEvents([]);
      setSummary('');
      setFamousBirthdays([]);
      setIsLoading(true);
      loadTimelineStreaming(formData, maxEvents);
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

  const imagesLoaded = events.filter(e => e.imageStatus === 'found' && e.imageUrl).length;

  if (!formData && !isLoading) {
    return (
      <div className="min-h-screen bg-polaroid-dark flex items-center justify-center">
        <div className="text-center">
          <p className="text-white/70 mb-4">Geen gegevens gevonden</p>
          <Button onClick={() => navigate('/')}>Terug naar start</Button>
        </div>
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-polaroid-dark flex flex-col">
      <Header />
      
      {/* Header section */}
      <section className="pt-24 pb-4 px-4">
        <div className="container mx-auto max-w-6xl">
          <button
            onClick={() => navigate('/')}
            className="flex items-center gap-1.5 text-sm text-white/60 hover:text-white transition-colors mb-3"
          >
            <ArrowLeft className="h-3.5 w-3.5" />
            <span>Terug naar invoer</span>
          </button>

          <div className="flex flex-wrap items-center justify-between gap-3 mb-3">
            <div className="flex items-center gap-3">
              <div className="inline-flex items-center gap-1.5 px-3 py-1 rounded-full bg-white/10 border border-white/20 text-xs">
                <Clock className="h-3.5 w-3.5 text-polaroid-pink" />
                <span className="text-white/70 font-medium">Polaroid Collage</span>
              </div>
              <h1 className="font-handwriting text-3xl sm:text-4xl font-bold text-white">
                {getTitle()}
              </h1>
            </div>
            
            <div className="flex items-center gap-2">
              {events.length > 0 && !isLoading && (
                <Button
                  onClick={handleClearCache}
                  variant="outline"
                  size="sm"
                  className="gap-1.5 border-white/20 text-white hover:bg-white/10"
                >
                  <RefreshCw className="h-4 w-4" />
                  <span className="hidden sm:inline">Opnieuw</span>
                </Button>
              )}
              
              {isLoadingImages && (
                <div className="flex items-center gap-2 text-sm text-white/60">
                  <Loader2 className="h-4 w-4 animate-spin text-polaroid-pink" />
                  <span>{imagesLoaded}/{events.length} foto's</span>
                </div>
              )}
            </div>
          </div>
        </div>
      </section>

      {/* Main content */}
      <section className="flex-1 px-4 pb-24">
        <div className="container mx-auto max-w-6xl">
          {isLoading ? (
            <div className="flex flex-col items-center justify-center min-h-[50vh] gap-4">
              <Loader2 className="h-12 w-12 animate-spin text-polaroid-pink" />
              <div className="text-center">
                <p className="text-xl font-handwriting text-white">Herinneringen verzamelen...</p>
                {streamingProgress > 0 && (
                  <p className="text-white/60 mt-2">{streamingProgress} gebeurtenissen gevonden</p>
                )}
              </div>
            </div>
          ) : error ? (
            <div className="flex flex-col items-center justify-center min-h-[50vh] gap-4">
              <p className="text-white/70">{error}</p>
              <Button onClick={() => navigate('/')}>Terug naar start</Button>
            </div>
          ) : (
            <>
              {/* Polaroid collage - continuous scroll */}
              <div className="space-y-8 pb-16">
                {eventSections.map((section, sectionIndex) => (
                  <div 
                    key={sectionIndex}
                    className="relative min-h-[50vh] flex items-center justify-center"
                  >
                    <div className="polaroid-grid w-full max-w-4xl mx-auto py-8">
                      {section.map((event, index) => (
                        <PolaroidCard 
                          key={event.id} 
                          event={event} 
                          index={sectionIndex * eventsPerSection + index}
                        />
                      ))}
                    </div>
                  </div>
                ))}
              </div>
            </>
          )}
        </div>
      </section>
    </div>
  );
};

export default PolaroidCollagePage;
