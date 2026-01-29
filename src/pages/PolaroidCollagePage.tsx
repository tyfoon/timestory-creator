import { useCallback, useEffect, useRef, useState } from 'react';
import { useNavigate } from 'react-router-dom';

import { Button } from '@/components/ui/button';
import { useLanguage } from '@/contexts/LanguageContext';
import { FormData } from '@/types/form';
import { TimelineEvent, FamousBirthday } from '@/types/timeline';
import { generateTimelineStreaming } from '@/lib/api/timeline';
import { useClientImageSearch } from '@/hooks/useClientImageSearch';
import { getCachedTimeline, cacheTimeline, updateCachedEvents, getCacheKey } from '@/lib/timelineCache';
import { ArrowLeft, Clock, Loader2 } from 'lucide-react';
import { useToast } from '@/hooks/use-toast';
import { PolaroidCard } from '@/components/PolaroidCard';
import woodTableBg from '@/assets/wood-table-bg.jpg';

const PolaroidCollagePage = () => {
  const navigate = useNavigate();
  const { language, t } = useLanguage();
  const { toast } = useToast();
  
  const [formData, setFormData] = useState<FormData | null>(null);
  const [events, setEvents] = useState<TimelineEvent[]>([]);
  const [famousBirthdays, setFamousBirthdays] = useState<FamousBirthday[]>([]);
  const [summary, setSummary] = useState<string>('');
  const [isLoading, setIsLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [streamingProgress, setStreamingProgress] = useState(0);

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
    foundCount 
  } = useClientImageSearch({
    maxConcurrent: 3,
    onImageFound: handleImageFound,
  });

  // Mark events without images as 'none' only AFTER a search cycle actually ran.
  // (Otherwise, on first mount `isLoadingImages` is false and we'd incorrectly mark
  // everything as 'none' before the queue starts.)
  const wasLoadingImagesRef = useRef(false);
  useEffect(() => {
    const wasLoading = wasLoadingImagesRef.current;
    if (wasLoading && !isLoadingImages && events.length > 0) {
      setEvents(prev => prev.map(event => {
        if (event.imageStatus === 'loading' && !event.imageUrl) {
          return { ...event, imageStatus: 'none' as const };
        }
        return event;
      }));
    }
    wasLoadingImagesRef.current = isLoadingImages;
  }, [isLoadingImages, events.length]);

  const loadImagesForEvents = useCallback((newEvents: TimelineEvent[]) => {
    const eventsNeedingImages = newEvents.filter(
      e => e.imageSearchQuery && 
           e.imageStatus !== 'found' && 
           e.imageStatus !== 'none'
    );
    
    if (eventsNeedingImages.length === 0) return;
    addImagesToQueue(eventsNeedingImages);
  }, [addImagesToQueue]);



  const loadTimelineStreaming = useCallback(async (data: FormData, maxEvents?: number) => {
    setIsLoading(true);
    setError(null);
    setStreamingProgress(0);
    // Reset the incremental stream buffer for this run
    receivedEventsRef.current = [];
    
    try {
      await generateTimelineStreaming(data, language, {
        onEvent: (event) => {
          const eventWithStatus: TimelineEvent = {
            ...event,
            imageStatus: event.imageSearchQuery ? 'loading' : 'idle'
          };

          receivedEventsRef.current.push(eventWithStatus);

          const sorted = [...receivedEventsRef.current].sort((a, b) => {
            if (a.year !== b.year) return a.year - b.year;
            if ((a.month || 0) !== (b.month || 0)) return (a.month || 0) - (b.month || 0);
            return (a.day || 0) - (b.day || 0);
          });
          
          setEvents(sorted);
          setStreamingProgress(receivedEventsRef.current.length);
          
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
        // Ensure queue state is clean before (re)starting searches for cached events
        resetImageSearch();

        // Cache compatibility: older cached timelines may not include imageSearchQuery fields,
        // which means we can't auto-fetch images. In that case, treat cache as stale and
        // regenerate (equivalent to the user pressing "Opnieuw").
        const hasAnyImageQuery = cached.events.some(e => !!e.imageSearchQuery);
        if (!hasAnyImageQuery) {
          const key = getCacheKey(data, language);
          sessionStorage.removeItem(key);
        } else {

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
      resetImageSearch();
      setEvents([]);
      setSummary('');
      setFamousBirthdays([]);
      setIsLoading(true);
      loadTimelineStreaming(formData, maxEvents);
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

  const imagesLoaded = events.filter(e => e.imageStatus === 'found' && e.imageUrl).length;

  if (!formData && !isLoading) {
    return (
      <div 
        className="min-h-screen flex items-center justify-center bg-cover bg-center bg-fixed"
        style={{ backgroundImage: `url(${woodTableBg})` }}
      >
        <div className="text-center bg-black/50 p-6 rounded-xl">
          <p className="text-white/70 mb-4">{t('noDataFound') as string}</p>
          <Button onClick={() => navigate('/')}>{t('backToStart') as string}</Button>
        </div>
      </div>
    );
  }

  return (
    <div 
      className="min-h-screen flex flex-col bg-cover bg-center bg-fixed"
      style={{ backgroundImage: `url(${woodTableBg})` }}
    >
      
      {/* Header with semi-transparent background for readability */}
      <section className="pt-3 pb-1 px-4 bg-black/40 backdrop-blur-sm">
        <div className="container mx-auto max-w-6xl">
          {/* Top row: Back button left, Date right */}
          <div className="flex items-center justify-between mb-2">
            <button
              onClick={() => navigate('/')}
              className="flex items-center gap-1.5 text-sm text-white/70 hover:text-white transition-colors"
            >
              <ArrowLeft className="h-3.5 w-3.5" />
              <span>{t('backToInput') as string}</span>
            </button>
            
            <h1 className="font-handwriting text-xl sm:text-2xl font-bold text-white">
              {getTitle()}
            </h1>
          </div>

        </div>
      </section>

      {/* Main content */}
      <section className="flex-1 px-4 pb-24">
        <div className="container mx-auto max-w-6xl">
          {isLoading ? (
            <div className="flex flex-col items-center justify-center min-h-[50vh] gap-4">
              <div className="bg-black/40 p-8 rounded-xl backdrop-blur-sm">
                <Loader2 className="h-12 w-12 animate-spin text-white mx-auto mb-4" />
                <div className="text-center">
                  <p className="text-xl font-handwriting text-white">{t('loadingTitle') as string}</p>
                  {streamingProgress > 0 && (
                    <p className="text-white/70 mt-2">{streamingProgress} {t('eventsLoaded') as string}</p>
                  )}
                </div>
              </div>
            </div>
          ) : error ? (
            <div className="flex flex-col items-center justify-center min-h-[50vh] gap-4">
              <div className="bg-black/40 p-6 rounded-xl backdrop-blur-sm text-center">
                <p className="text-white/80 mb-4">{error}</p>
                <Button onClick={() => navigate('/')} variant="secondary" className="bg-white/90 text-gray-800 hover:bg-white">
                  {t('backToStart') as string}
                </Button>
              </div>
            </div>
          ) : (
            <div className="polaroid-collage w-full max-w-5xl mx-auto pb-16">
              {events.map((event, index) => (
                <PolaroidCard 
                  key={event.id} 
                  event={event} 
                  index={index}
                />
              ))}
            </div>
          )}
        </div>
      </section>
    </div>
  );
};

export default PolaroidCollagePage;
