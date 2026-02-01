import { useCallback, useEffect, useRef, useState } from 'react';
import { useNavigate } from 'react-router-dom';

import { TimelineCarousel } from '@/components/TimelineCarousel';
import { TimelineScrubberBottom } from '@/components/TimelineScrubberBottom';
import { Button } from '@/components/ui/button';
import { useLanguage } from '@/contexts/LanguageContext';
import { FormData } from '@/types/form';
import { TimelineEvent, FamousBirthday, SearchTraceEntry } from '@/types/timeline';
import { generateTimelineStreaming } from '@/lib/api/timeline';
import { useClientImageSearch } from '@/hooks/useClientImageSearch';
import { generateTimelinePdf } from '@/lib/pdfGenerator';
import { generatePolaroidPdf } from '@/lib/pdfGeneratorPolaroid';
import { getCachedTimeline, cacheTimeline, updateCachedEvents, getCacheKey } from '@/lib/timelineCache';
import { generateTikTokSlides, shareGeneratedFiles, canShareToTikTok } from '@/lib/tiktokGenerator';
import { downloadPolaroidCollage } from '@/lib/collageGenerator';
import { ArrowLeft, Clock, Loader2, AlertCircle, RefreshCw, Cake, Star, Download, Camera, Share2, Check, Image, X, Bug } from 'lucide-react';
import { DebugInfoDialog } from '@/components/DebugInfoDialog';
import { PromptViewerDialog } from '@/components/PromptViewerDialog';
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
  const [canShare, setCanShare] = useState(false);
  const [isGeneratingTikTok, setIsGeneratingTikTok] = useState(false);
  const [tikTokProgress, setTikTokProgress] = useState({ current: 0, total: 0 });
  const [generatedTikTokFiles, setGeneratedTikTokFiles] = useState<File[] | null>(null);

  // Collage selection state
  const [isSelectingMode, setIsSelectingMode] = useState(false);
  const [selectedForCollage, setSelectedForCollage] = useState<string[]>([]);
  const [isGeneratingCollage, setIsGeneratingCollage] = useState(false);
  const [collageProgress, setCollageProgress] = useState(0);
  
  // Track maxEvents for prompt viewer
  const [currentMaxEvents, setCurrentMaxEvents] = useState<number | undefined>(undefined);

  // Track current formData for cache updates
  const formDataRef = useRef<FormData | null>(null);
  // Holds the incremental stream list so later onEvent updates don't overwrite image updates.
  const receivedEventsRef = useRef<TimelineEvent[]>([]);
  
  // Client-side image search with concurrency control
  const handleImageFound = useCallback((eventId: string, imageUrl: string, source: string | null, searchTrace?: SearchTraceEntry[]) => {
    // Keep the stream buffer in sync, otherwise subsequent onEvent renders can overwrite images.
    receivedEventsRef.current = receivedEventsRef.current.map(event => {
      if (event.id !== eventId) return event;
      return {
        ...event,
        imageUrl: imageUrl || undefined,
        source: source || undefined,
        imageStatus: imageUrl ? 'found' as const : 'none' as const,
        searchTrace, // Store the search trace for debugging
      };
    });

    setEvents(prev => {
      const updated = prev.map(event => {
        if (event.id !== eventId) return event;
        return {
          ...event,
          imageUrl: imageUrl || undefined,
          source: source || undefined,
          imageStatus: imageUrl ? 'found' as const : 'none' as const,
          searchTrace, // Store the search trace for debugging
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
    forceResearch,
    isSearching: isLoadingImages,
    searchedCount,
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

  // Force refresh all images (for debug purposes - to get search traces)
  const handleRefreshAllImages = useCallback(() => {
    // Reset all events to 'loading' state and clear their images
    const resetEvents = events.map(e => {
      if (!e.imageSearchQuery) return e;
      return {
        ...e,
        imageUrl: undefined,
        source: undefined,
        imageStatus: 'loading' as const,
        searchTrace: undefined,
      };
    });
    
    // Update state
    setEvents(resetEvents);
    receivedEventsRef.current = resetEvents;
    
    // Reset the search hook
    resetImageSearch();
    hasFinalized.current = false;
    
    // Queue all events with search queries
    const eventsToSearch = resetEvents.filter(e => e.imageSearchQuery);
    if (eventsToSearch.length > 0) {
      addImagesToQueue(eventsToSearch);
    }
  }, [events, resetImageSearch, addImagesToQueue]);

  // Check Web Share API support on mount
  useEffect(() => {
    setCanShare(canShareToTikTok());
  }, []);

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
      setCurrentMaxEvents(maxEvents);
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

  // Step 1: Generate TikTok slides (async, can take time)
  const handlePrepareTikTok = async () => {
    if (!formData || events.length === 0) return;
    
    setIsGeneratingTikTok(true);
    setTikTokProgress({ current: 0, total: 0 });
    setGeneratedTikTokFiles(null);
    
    try {
      const files = await generateTikTokSlides(
        events,
        famousBirthdays,
        summary,
        (current, total) => {
          setTikTokProgress({ current, total });
        }
      );
      
      setGeneratedTikTokFiles(files);
      toast({
        title: t('slidesReady') as string || 'Slides klaar!',
        description: t('tapToShare') as string || 'Tik op de knop om te delen',
      });
    } catch (err) {
      console.error('Error generating TikTok slides:', err);
      toast({
        variant: "destructive",
        title: t('shareError') as string || 'Genereren mislukt',
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
        title: t('shareSuccess') as string || 'Gedeeld!',
      });
      setGeneratedTikTokFiles(null); // Reset after successful share
    } catch (err) {
      // Don't show error if user cancelled the share
      if (err instanceof Error && err.name !== 'AbortError') {
        toast({
          variant: "destructive",
          title: t('shareError') as string || 'Delen mislukt',
          description: err.message,
        });
      }
    }
  };

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
  
  // Count events with images for collage availability
  const eventsWithImages = events.filter(e => e.imageStatus === 'found' && e.imageUrl).length;
  
  const handleClearCache = () => {
    if (formData) {
      const key = getCacheKey(formData, language);
      sessionStorage.removeItem(key);
      // Reset all state
      const storedLength = sessionStorage.getItem('timelineLength') || 'short';
      const maxEvents = storedLength === 'short' ? 20 : undefined;
      setCurrentMaxEvents(maxEvents);
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
          {/* Top row: Back button left, Refresh + Date right */}
          <div className="flex items-center justify-between mb-2 fade-in">
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
                  {canShare && events.length > 0 && !isLoading && (
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
                  
                  {/* Debug info button */}
                  {events.length > 0 && !isLoading && (
                    <>
                      <PromptViewerDialog formData={formData} language={language} maxEvents={currentMaxEvents} />
                      <DebugInfoDialog 
                        events={events} 
                        onRefreshImages={handleRefreshAllImages}
                        isRefreshing={isLoadingImages}
                      />
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
              
              <h1 className="font-serif text-xl sm:text-2xl font-bold text-foreground">
                {isSelectingMode ? t('selectPhotos') as string : getTitle()}
              </h1>
            </div>
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
                  onBlacklistImage={handleBlacklistImage}
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
              isSelectingMode={isSelectingMode}
              selectedForCollage={selectedForCollage}
              onToggleSelection={handleToggleCollageSelection}
              onBlacklistImage={handleBlacklistImage}
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
