import { useCallback, useEffect, useRef, useState } from 'react';
import { useNavigate } from 'react-router-dom';

import { Button } from '@/components/ui/button';
import { useLanguage } from '@/contexts/LanguageContext';
import { FormData } from '@/types/form';
import { TimelineEvent, FamousBirthday } from '@/types/timeline';
import { generateTimelineStreaming } from '@/lib/api/timeline';
import { useClientImageSearch } from '@/hooks/useClientImageSearch';
import { getCachedTimeline, cacheTimeline, updateCachedEvents, getCacheKey } from '@/lib/timelineCache';
import { ArrowLeft, Clock, Loader2, RefreshCw, Share2, Check, Image, X, Download } from 'lucide-react';
import { generateTikTokSlides, shareGeneratedFiles, canShareToTikTok } from '@/lib/tiktokGenerator';
import { downloadPolaroidCollage } from '@/lib/collageGenerator';
import { useIsMobile } from '@/hooks/use-mobile';
import { useToast } from '@/hooks/use-toast';
import { PolaroidCard } from '@/components/PolaroidCard';

// Era-themed background images (same as ResultPage)
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

const PolaroidCollagePage = () => {
  const navigate = useNavigate();
  const { language, t } = useLanguage();
  const { toast } = useToast();
  const isMobile = useIsMobile();
  
  const [formData, setFormData] = useState<FormData | null>(null);
  const [events, setEvents] = useState<TimelineEvent[]>([]);
  const [famousBirthdays, setFamousBirthdays] = useState<FamousBirthday[]>([]);
  const [summary, setSummary] = useState<string>('');
  const [isLoading, setIsLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [streamingProgress, setStreamingProgress] = useState(0);
  const [canShare, setCanShare] = useState(false);
  const [isGeneratingTikTok, setIsGeneratingTikTok] = useState(false);
  const [tikTokProgress, setTikTokProgress] = useState({ current: 0, total: 0 });
  const [generatedTikTokFiles, setGeneratedTikTokFiles] = useState<File[] | null>(null);

  // Collage selection state
  const [isSelectingMode, setIsSelectingMode] = useState(false);
  const [selectedForCollage, setSelectedForCollage] = useState<string[]>([]);
  const [isGeneratingCollage, setIsGeneratingCollage] = useState(false);
  const [collageProgress, setCollageProgress] = useState(0);

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
    forceResearch,
    isSearching: isLoadingImages,
    foundCount 
  } = useClientImageSearch({
    maxConcurrent: 3,
    onImageFound: handleImageFound,
  });
  
  // Handler for blacklisting an image and triggering re-search
  const handleBlacklistImage = useCallback((eventId: string) => {
    const event = events.find(e => e.id === eventId);
    if (event) {
      // Reset the event's image status to loading
      setEvents(prev => prev.map(e => 
        e.id === eventId 
          ? { ...e, imageUrl: undefined, imageStatus: 'loading' as const }
          : e
      ));
      // Force a new search for this event
      forceResearch({ ...event, imageUrl: undefined, imageStatus: 'loading' });
    }
  }, [events, forceResearch]);

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
            cacheTimeline(data, language, sorted, completeData.summary, completeData.famousBirthdays || [], {
              storyTitle: completeData.storyTitle,
              storyIntroduction: completeData.storyIntroduction,
            });
            
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
  const eventsWithImages = imagesLoaded;

  // Collage selection handlers
  const handleToggleCollageSelection = useCallback((eventId: string) => {
    setSelectedForCollage(prev => {
      if (prev.includes(eventId)) {
        return prev.filter(id => id !== eventId);
      }
      if (prev.length >= 6) {
        toast({
          title: t('maxPhotosReached') as string,
          variant: "destructive",
        });
        return prev;
      }
      return [...prev, eventId];
    });
  }, [t, toast]);

  const handleStartCollageSelection = () => {
    setIsSelectingMode(true);
    setSelectedForCollage([]);
  };

  const handleCancelCollageSelection = () => {
    setIsSelectingMode(false);
    setSelectedForCollage([]);
  };

  const handleGenerateCollage = async () => {
    if (selectedForCollage.length !== 6) return;
    
    const selectedEvents = selectedForCollage
      .map(id => events.find(e => e.id === id))
      .filter((e): e is TimelineEvent => !!e);
    
    if (selectedEvents.length !== 6) return;
    
    setIsGeneratingCollage(true);
    setCollageProgress(0);
    
    try {
      const contextText = getTitle();
      const yearForBackground = formData?.birthDate?.year || formData?.yearRange?.startYear || 2000;
      await downloadPolaroidCollage(selectedEvents, contextText, yearForBackground, setCollageProgress);
      
      toast({
        title: t('collageDownloaded') as string,
        description: t('collageReady') as string,
      });
      
      // Reset selection mode after successful download
      setIsSelectingMode(false);
      setSelectedForCollage([]);
    } catch (err) {
      console.error('Error generating collage:', err);
      toast({
        variant: "destructive",
        title: t('collageError') as string,
        description: err instanceof Error ? err.message : 'Unknown error',
      });
    } finally {
      setIsGeneratingCollage(false);
      setCollageProgress(0);
    }
  };

  // Check TikTok sharing capability
  useEffect(() => {
    setCanShare(canShareToTikTok());
  }, []);

  // Step 1: Generate TikTok slides (async, can take time)
  const handlePrepareTikTok = async () => {
    if (events.length === 0) return;
    
    setIsGeneratingTikTok(true);
    setTikTokProgress({ current: 0, total: 0 });
    setGeneratedTikTokFiles(null);
    
    try {
      const files = await generateTikTokSlides(
        events,
        famousBirthdays,
        summary,
        (current, total) => setTikTokProgress({ current, total })
      );
      
      setGeneratedTikTokFiles(files);
      toast({
        title: t('slidesReady') as string,
        description: t('tapToShare') as string,
      });
    } catch (err) {
      console.error('Error generating TikTok slides:', err);
      toast({
        variant: "destructive",
        title: t('shareError') as string,
        description: err instanceof Error ? err.message : 'Onbekende fout',
      });
    } finally {
      setIsGeneratingTikTok(false);
      setTikTokProgress({ current: 0, total: 0 });
    }
  };

  // Step 2: Share files (MUST be called directly from user gesture for browser compliance)
  const handleShareTikTok = async () => {
    if (!generatedTikTokFiles || generatedTikTokFiles.length === 0) return;
    
    try {
      await shareGeneratedFiles(generatedTikTokFiles);
      toast({
        title: t('shareSuccess') as string,
      });
      setGeneratedTikTokFiles(null); // Reset after successful share
    } catch (err) {
      if (err instanceof Error && err.name !== 'AbortError') {
        toast({
          variant: "destructive",
          title: t('shareError') as string,
          description: err.message,
        });
      }
    }
  };

  // Get the era-themed background based on birth year
  const birthYear = formData?.birthDate?.year || formData?.yearRange?.startYear;
  const backgroundImage = birthYear ? getBackgroundForYear(birthYear) : heroBg;

  if (!formData && !isLoading) {
    return (
      <div className="min-h-screen bg-gradient-hero flex items-center justify-center relative overflow-hidden">
        {/* Era background */}
        <div 
          className="fixed inset-0 z-0 transition-opacity duration-700"
          style={{
            backgroundImage: `url(${heroBg})`,
            backgroundSize: 'cover',
            backgroundPosition: 'center',
            backgroundRepeat: 'no-repeat',
            opacity: 0.25,
          }}
        />
        <div className="fixed inset-0 z-0 bg-gradient-to-b from-background/60 via-background/40 to-background/70" />
        
        <div className="text-center bg-background/80 p-6 rounded-xl relative z-10">
          <p className="text-muted-foreground mb-4">{t('noDataFound') as string}</p>
          <Button onClick={() => navigate('/')}>{t('backToStart') as string}</Button>
        </div>
      </div>
    );
  }

  return (
    <div className="min-h-screen flex flex-col bg-gradient-hero relative overflow-hidden">
      {/* Era-themed background image - same as ResultPage */}
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
      
      {/* Header with semi-transparent background for readability */}
      <section className="pt-3 pb-1 px-4 bg-background/40 backdrop-blur-sm relative z-10">
        <div className="container mx-auto max-w-6xl">
          {/* Top row: Back button left, Refresh + Date right */}
          <div className="flex items-center justify-between mb-2">
            <button
              onClick={() => navigate('/')}
              className="flex items-center gap-1.5 text-sm text-muted-foreground hover:text-foreground transition-colors"
            >
              <ArrowLeft className="h-3.5 w-3.5" />
              <span>{t('backToInput') as string}</span>
            </button>
            
            <div className="flex items-center gap-2">
              {/* Collage selection mode UI */}
              {isSelectingMode ? (
                <>
                  {/* Cancel button */}
                  <button
                    onClick={handleCancelCollageSelection}
                    className="p-1.5 text-muted-foreground hover:text-foreground transition-colors rounded-md hover:bg-muted/50"
                    title={t('cancelSelection') as string}
                  >
                    <X className="h-3.5 w-3.5" />
                  </button>
                  
                  {/* Selection counter */}
                  <span className="text-sm font-medium text-foreground bg-secondary/80 px-2 py-0.5 rounded-full">
                    {t('selectedCount') as string}: {selectedForCollage.length}/6
                  </span>
                  
                  {/* Generate collage button - only when 6 selected */}
                  {selectedForCollage.length === 6 && (
                    <button
                      onClick={handleGenerateCollage}
                      disabled={isGeneratingCollage}
                      className="inline-flex items-center gap-1.5 px-3 py-1.5 bg-accent text-accent-foreground rounded-md text-sm font-medium hover:bg-accent/90 transition-colors disabled:opacity-50"
                    >
                      {isGeneratingCollage ? (
                        <>
                          <Loader2 className="h-3.5 w-3.5 animate-spin" />
                          <span>{collageProgress}%</span>
                        </>
                      ) : (
                        <>
                          <Download className="h-3.5 w-3.5" />
                          <span>{t('generateCollage') as string}</span>
                        </>
                      )}
                    </button>
                  )}
                </>
              ) : (
                <>
                  {/* Collage button - only show when we have enough images */}
                  {eventsWithImages >= 6 && events.length > 0 && !isLoading && (
                    <button
                      onClick={handleStartCollageSelection}
                      className="p-1.5 text-muted-foreground hover:text-foreground transition-colors rounded-md hover:bg-muted/50"
                      title={t('createCollage') as string}
                    >
                      <Image className="h-3.5 w-3.5" />
                    </button>
                  )}
                  
                  {/* TikTok share buttons - two-step flow for user gesture compliance */}
                  {canShare && isMobile && events.length > 0 && !isLoading && (
                    <>
                      {/* Step 2: Share button (only shown when files are ready) */}
                      {generatedTikTokFiles && generatedTikTokFiles.length > 0 && (
                        <button
                          onClick={handleShareTikTok}
                          className="p-1.5 text-accent-foreground bg-accent hover:bg-accent/90 transition-colors rounded-md animate-pulse"
                          title={t('shareNow') as string}
                        >
                          <Check className="h-3.5 w-3.5" />
                        </button>
                      )}
                      
                      {/* Step 1: Prepare button (generates slides) */}
                      {!generatedTikTokFiles && (
                        <button
                          onClick={handlePrepareTikTok}
                          disabled={isGeneratingTikTok}
                          className="p-1.5 text-muted-foreground hover:text-foreground transition-colors rounded-md hover:bg-muted/50 disabled:opacity-50"
                          title={t('prepareSlides') as string}
                        >
                          {isGeneratingTikTok ? (
                            <Loader2 className="h-3.5 w-3.5 animate-spin" />
                          ) : (
                            <Share2 className="h-3.5 w-3.5" />
                          )}
                        </button>
                      )}
                    </>
                  )}
                  
                  {/* Compact refresh button */}
                  {events.length > 0 && !isLoading && (
                    <button
                      onClick={handleClearCache}
                      className="p-1.5 text-muted-foreground hover:text-foreground transition-colors rounded-md hover:bg-muted/50"
                      title={t('refreshButton') as string}
                    >
                      <RefreshCw className="h-3.5 w-3.5" />
                    </button>
                  )}
                </>
              )}
              
              <h1 className="font-handwriting text-xl sm:text-2xl font-bold text-foreground">
                {isSelectingMode ? t('selectPhotos') as string : getTitle()}
              </h1>
            </div>
          </div>
        </div>
      </section>

      {/* Main content */}
      <section className="flex-1 px-4 pb-24 relative z-10">
        <div className="container mx-auto max-w-6xl">
          {isLoading ? (
            <div className="flex flex-col items-center justify-center min-h-[50vh] gap-4">
              <div className="bg-background/60 p-8 rounded-xl backdrop-blur-sm">
                <Loader2 className="h-12 w-12 animate-spin text-foreground mx-auto mb-4" />
                <div className="text-center">
                  <p className="text-xl font-handwriting text-foreground">{t('loadingTitle') as string}</p>
                  {streamingProgress > 0 && (
                    <p className="text-muted-foreground mt-2">{streamingProgress} {t('eventsLoaded') as string}</p>
                  )}
                </div>
              </div>
            </div>
          ) : error ? (
            <div className="flex flex-col items-center justify-center min-h-[50vh] gap-4">
              <div className="bg-background/60 p-6 rounded-xl backdrop-blur-sm text-center">
                <p className="text-muted-foreground mb-4">{error}</p>
                <Button onClick={() => navigate('/')} variant="secondary">
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
                  isSelectingMode={isSelectingMode}
                  isSelected={selectedForCollage.includes(event.id)}
                  onToggleSelection={() => handleToggleCollageSelection(event.id)}
                  onBlacklistImage={handleBlacklistImage}
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
