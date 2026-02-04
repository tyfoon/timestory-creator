import { useState, useCallback, useEffect, useRef } from "react";
import { useNavigate } from "react-router-dom";
import { AnimatePresence, motion } from "framer-motion";
import { useLanguage } from "@/contexts/LanguageContext";
import { Header } from "@/components/Header";
import { TimeDial } from "@/components/v2/TimeDial";
import { SubjectSelector } from "@/components/v2/SubjectSelector";
import { OccasionSelector } from "@/components/v2/OccasionSelector";
import { ChapterIndicator } from "@/components/v2/ChapterIndicator";
import { NostalgicLoading } from "@/components/v2/NostalgicLoading";
import { PaperTexture } from "@/components/v2/PaperTexture";
import { getEraTheme } from "@/lib/eraThemes";
import { FormData, BirthDateData, OptionalData } from "@/types/form";
import { ArrowRight, BookOpen, Camera, Sparkles } from "lucide-react";
import { Button } from "@/components/ui/button";

type Chapter = 1 | 2 | 3;
type Subject = "me" | "loved-one" | "friend";
type Occasion = "birthday" | "anniversary" | "fun";

// Simple click sound using Web Audio API
const createClickSound = () => {
  try {
    const audioContext = new (window.AudioContext || (window as any).webkitAudioContext)();
    const oscillator = audioContext.createOscillator();
    const gainNode = audioContext.createGain();
    
    oscillator.connect(gainNode);
    gainNode.connect(audioContext.destination);
    
    oscillator.frequency.value = 800;
    oscillator.type = 'square';
    gainNode.gain.value = 0.05;
    gainNode.gain.exponentialRampToValueAtTime(0.001, audioContext.currentTime + 0.05);
    
    oscillator.start(audioContext.currentTime);
    oscillator.stop(audioContext.currentTime + 0.05);
  } catch (e) {
    // Audio not supported, fail silently
  }
};

const HomeV2 = () => {
  const { t } = useLanguage();
  const navigate = useNavigate();
  
  // Chapter state
  const [currentChapter, setCurrentChapter] = useState<Chapter>(1);
  const [isTransitioning, setIsTransitioning] = useState(false);
  
  // Form state
  const [selectedYear, setSelectedYear] = useState<number>(1985);
  const [subject, setSubject] = useState<Subject | null>(null);
  const [occasion, setOccasion] = useState<Occasion | null>(null);
  const [isLoading, setIsLoading] = useState(false);
  
  // Era theme based on selected year
  const eraTheme = getEraTheme(selectedYear);
  
  // Sound toggle
  const [soundEnabled, setSoundEnabled] = useState(() => {
    return localStorage.getItem('homeV2SoundEnabled') !== 'false';
  });
  
  useEffect(() => {
    localStorage.setItem('homeV2SoundEnabled', String(soundEnabled));
  }, [soundEnabled]);
  
  const handleYearChange = useCallback((year: number) => {
    setSelectedYear(year);
    if (soundEnabled) {
      createClickSound();
    }
  }, [soundEnabled]);
  
  const goToChapter = (chapter: Chapter) => {
    if (chapter === currentChapter) return;
    setIsTransitioning(true);
    setTimeout(() => {
      setCurrentChapter(chapter);
      setIsTransitioning(false);
    }, 300);
  };
  
  const handleSubjectSelect = (s: Subject) => {
    setSubject(s);
    setTimeout(() => goToChapter(3), 400);
  };
  
  const handleOccasionSelect = (o: Occasion) => {
    setOccasion(o);
  };
  
  const handleGenerate = (targetRoute: string) => {
    setIsLoading(true);
    
    // Build form data compatible with existing backend
    const birthDate: BirthDateData = {
      day: 1,
      month: 1,
      year: selectedYear,
    };
    
    const optionalData: OptionalData = {
      children: [],
      focus: "netherlands",
      gender: "none",
      attitude: "neutral",
    };
    
    const formData: FormData = {
      type: "birthdate",
      birthDate,
      yearRange: {
        startYear: selectedYear,
        endYear: selectedYear,
      },
      optionalData,
    };
    
    sessionStorage.setItem("timelineFormData", JSON.stringify(formData));
    sessionStorage.setItem("timelineLength", "short");
    
    // Simulate nostalgic loading
    setTimeout(() => {
      navigate(targetRoute);
    }, 2500);
  };
  
  const canProceedToChapter2 = selectedYear >= 1920 && selectedYear <= new Date().getFullYear();
  const canGenerate = subject !== null && occasion !== null;
  
  return (
    <div 
      className="min-h-screen flex flex-col relative overflow-hidden transition-colors duration-700"
      style={{
        '--era-primary': eraTheme.primary,
        '--era-secondary': eraTheme.secondary,
        '--era-accent': eraTheme.accent,
        '--era-bg': eraTheme.background,
      } as React.CSSProperties}
    >
      {/* Paper texture background */}
      <PaperTexture era={eraTheme.era} />
      
      {/* Era-specific decorative elements */}
      <div className="fixed inset-0 pointer-events-none z-0 overflow-hidden">
        {eraTheme.era === '80s' && (
          <div className="absolute inset-0 opacity-10">
            <div className="absolute top-20 left-10 w-32 h-32 border-4 border-[var(--era-accent)] rotate-45" />
            <div className="absolute bottom-40 right-20 w-24 h-24 border-4 border-[var(--era-secondary)] -rotate-12" />
            <div className="absolute top-1/2 left-1/4 w-16 h-16 bg-[var(--era-accent)] opacity-30" />
          </div>
        )}
        {eraTheme.era === '90s' && (
          <div className="absolute inset-0 opacity-10">
            <div className="absolute top-32 right-16 w-20 h-20 rounded-full bg-[var(--era-primary)]" />
            <div className="absolute bottom-32 left-16 w-16 h-16 bg-[var(--era-secondary)] rotate-45" />
            <div className="absolute top-1/3 right-1/3 w-12 h-12 rounded-full border-4 border-[var(--era-accent)]" />
          </div>
        )}
      </div>
      
      <Header />
      
      {/* Loading overlay */}
      <AnimatePresence>
        {isLoading && (
          <NostalgicLoading year={selectedYear} />
        )}
      </AnimatePresence>
      
      {/* Main content */}
      <main className="flex-1 relative z-10 pt-16 sm:pt-20 pb-8 px-4">
        <div className="container mx-auto max-w-2xl">
          
          {/* Chapter indicator */}
          <ChapterIndicator 
            currentChapter={currentChapter} 
            onChapterClick={goToChapter}
            completedChapters={[
              true,
              currentChapter >= 2 || subject !== null,
              currentChapter >= 3 || occasion !== null,
            ]}
          />
          
          {/* Chapter content with transitions */}
          <AnimatePresence mode="wait">
            {currentChapter === 1 && !isTransitioning && (
              <motion.div
                key="chapter1"
                initial={{ opacity: 0, x: 50 }}
                animate={{ opacity: 1, x: 0 }}
                exit={{ opacity: 0, x: -50 }}
                transition={{ duration: 0.3, ease: "easeOut" }}
                className="space-y-8"
              >
                {/* Hero headline */}
                <div className="text-center space-y-3">
                  <h1 
                    className="font-serif text-3xl sm:text-4xl md:text-5xl font-bold leading-tight"
                    style={{ color: 'var(--era-primary)' }}
                  >
                    Waar nemen we je mee naartoe?
                  </h1>
                  <p className="text-muted-foreground text-lg">
                    Draai aan de tijd en ontdek je herinneringen
                  </p>
                </div>
                
                {/* Time Dial */}
                <TimeDial 
                  selectedYear={selectedYear}
                  onYearChange={handleYearChange}
                  eraTheme={eraTheme}
                />
                
                {/* Next button */}
                <div className="flex justify-center pt-4">
                  <Button
                    onClick={() => goToChapter(2)}
                    disabled={!canProceedToChapter2}
                    className="group px-8 py-6 text-lg font-semibold rounded-xl shadow-lg transition-all duration-300 hover:scale-105"
                    style={{
                      background: `linear-gradient(135deg, var(--era-primary), var(--era-secondary))`,
                      color: eraTheme.era === 'pre70s' ? '#fff' : '#000',
                    }}
                  >
                    <span>Neem me mee naar {selectedYear}</span>
                    <ArrowRight className="ml-2 h-5 w-5 group-hover:translate-x-1 transition-transform" />
                  </Button>
                </div>
              </motion.div>
            )}
            
            {currentChapter === 2 && !isTransitioning && (
              <motion.div
                key="chapter2"
                initial={{ opacity: 0, x: 50 }}
                animate={{ opacity: 1, x: 0 }}
                exit={{ opacity: 0, x: -50 }}
                transition={{ duration: 0.3, ease: "easeOut" }}
                className="space-y-8"
              >
                <div className="text-center space-y-3">
                  <h2 
                    className="font-serif text-2xl sm:text-3xl font-bold"
                    style={{ color: 'var(--era-primary)' }}
                  >
                    Voor wie is deze tijdreis?
                  </h2>
                  <p className="text-muted-foreground">
                    Kies wie we terug in de tijd brengen
                  </p>
                </div>
                
                <SubjectSelector 
                  selected={subject}
                  onSelect={handleSubjectSelect}
                  eraTheme={eraTheme}
                />
              </motion.div>
            )}
            
            {currentChapter === 3 && !isTransitioning && (
              <motion.div
                key="chapter3"
                initial={{ opacity: 0, x: 50 }}
                animate={{ opacity: 1, x: 0 }}
                exit={{ opacity: 0, x: -50 }}
                transition={{ duration: 0.3, ease: "easeOut" }}
                className="space-y-8"
              >
                <div className="text-center space-y-3">
                  <h2 
                    className="font-serif text-2xl sm:text-3xl font-bold"
                    style={{ color: 'var(--era-primary)' }}
                  >
                    Wat is de gelegenheid?
                  </h2>
                  <p className="text-muted-foreground">
                    Vertel ons waarom we teruggaan
                  </p>
                </div>
                
                <OccasionSelector 
                  selected={occasion}
                  onSelect={handleOccasionSelect}
                  eraTheme={eraTheme}
                />
                
                {/* Generate buttons */}
                {canGenerate && (
                  <motion.div 
                    initial={{ opacity: 0, y: 20 }}
                    animate={{ opacity: 1, y: 0 }}
                    className="pt-6 space-y-3"
                  >
                    {/* Primary: Timeline Story */}
                    <Button
                      onClick={() => handleGenerate("/story")}
                      className="w-full h-14 text-lg font-bold rounded-xl shadow-lg transition-all duration-300 hover:scale-[1.02]"
                      style={{
                        background: `linear-gradient(135deg, var(--era-primary), var(--era-secondary))`,
                        color: eraTheme.era === 'pre70s' ? '#fff' : '#000',
                      }}
                    >
                      <BookOpen className="mr-2 h-5 w-5" />
                      <span>Maak mijn tijdreis</span>
                      <ArrowRight className="ml-2 h-5 w-5" />
                    </Button>
                    
                    {/* Secondary options */}
                    <div className="grid grid-cols-2 gap-3">
                      <Button
                        onClick={() => handleGenerate("/polaroid")}
                        variant="outline"
                        className="h-12 font-semibold rounded-xl border-2 transition-all hover:scale-[1.02]"
                        style={{
                          borderColor: 'var(--era-accent)',
                          color: 'var(--era-primary)',
                        }}
                      >
                        <Camera className="mr-2 h-4 w-4" />
                        Polaroid
                      </Button>
                      
                      <Button
                        onClick={() => handleGenerate("/resultaat")}
                        variant="outline"
                        className="h-12 font-semibold rounded-xl border-2 transition-all hover:scale-[1.02]"
                        style={{
                          borderColor: 'var(--era-secondary)',
                          color: 'var(--era-primary)',
                        }}
                      >
                        <Sparkles className="mr-2 h-4 w-4" />
                        Tijdreis
                      </Button>
                    </div>
                  </motion.div>
                )}
              </motion.div>
            )}
          </AnimatePresence>
          
        </div>
      </main>
      
      {/* Sound toggle */}
      <button
        onClick={() => setSoundEnabled(!soundEnabled)}
        className="fixed bottom-4 right-4 z-50 p-3 rounded-full bg-card/80 backdrop-blur border border-border shadow-lg transition-all hover:scale-110"
        aria-label={soundEnabled ? "Mute sounds" : "Enable sounds"}
      >
        {soundEnabled ? (
          <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M15.536 8.464a5 5 0 010 7.072M18.364 5.636a9 9 0 010 12.728M6 18l3-3H4a1 1 0 01-1-1V10a1 1 0 011-1h5l3-3v12z" />
          </svg>
        ) : (
          <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M5.586 15H4a1 1 0 01-1-1v-4a1 1 0 011-1h1.586l4.707-4.707C10.923 3.663 12 4.109 12 5v14c0 .891-1.077 1.337-1.707.707L5.586 15z" />
            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M17 14l2-2m0 0l2-2m-2 2l-2-2m2 2l2 2" />
          </svg>
        )}
      </button>
    </div>
  );
};

export default HomeV2;
