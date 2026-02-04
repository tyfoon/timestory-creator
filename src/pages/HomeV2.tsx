import { useState, useCallback, useEffect } from "react";
import { useNavigate } from "react-router-dom";
import { AnimatePresence, motion } from "framer-motion";
import { useLanguage } from "@/contexts/LanguageContext";
import { Header } from "@/components/Header";
import { RetroDateInput } from "@/components/v2/RetroDateInput";
import { PhaseSelector } from "@/components/v2/PhaseSelector";
import { IdentityForm } from "@/components/v2/IdentityForm";
import { ChapterIndicator } from "@/components/v2/ChapterIndicator";
import { NostalgicLoading } from "@/components/v2/NostalgicLoading";
import { PaperTexture } from "@/components/v2/PaperTexture";
import { getEraTheme } from "@/lib/eraThemes";
import { FormData, BirthDateData, OptionalData, PeriodType, Gender } from "@/types/form";
import { ArrowRight, ArrowLeft, Rocket, Sparkles } from "lucide-react";
import { Button } from "@/components/ui/button";

type Chapter = 1 | 2 | 3;

// Simple click sound
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
    // Audio not supported
  }
};

const HomeV2 = () => {
  const { t } = useLanguage();
  const navigate = useNavigate();
  const currentYear = new Date().getFullYear();
  
  // Chapter state
  const [currentChapter, setCurrentChapter] = useState<Chapter>(1);
  const [isTransitioning, setIsTransitioning] = useState(false);
  
  // Form state
  const [birthDate, setBirthDate] = useState<BirthDateData>({ day: 0, month: 0, year: 0 });
  const [selectedPhase, setSelectedPhase] = useState<PeriodType | null>(null);
  const [name, setName] = useState<string>('');
  const [gender, setGender] = useState<Gender>('none');
  const [isLoading, setIsLoading] = useState(false);
  
  // Era theme based on birth year
  const eraTheme = getEraTheme(birthDate.year || 1985);
  
  // Sound toggle
  const [soundEnabled, setSoundEnabled] = useState(() => {
    return localStorage.getItem('homeV2SoundEnabled') !== 'false';
  });
  
  useEffect(() => {
    localStorage.setItem('homeV2SoundEnabled', String(soundEnabled));
  }, [soundEnabled]);
  
  // Calculate year range based on phase
  const calculateYearRange = (): { startYear: number; endYear: number } => {
    if (!birthDate.year || !selectedPhase) {
      return { startYear: birthDate.year || 1985, endYear: birthDate.year || 1985 };
    }
    
    const ageRanges: Record<PeriodType, [number, number] | null> = {
      'birthyear': null,
      'childhood': [6, 10],
      'puberty': [11, 17],
      'young-adult': [18, 25],
      'custom': null,
    };
    
    const range = ageRanges[selectedPhase];
    if (!range) {
      return { startYear: birthDate.year, endYear: birthDate.year };
    }
    
    return {
      startYear: birthDate.year + range[0],
      endYear: Math.min(birthDate.year + range[1], currentYear),
    };
  };
  
  const goToChapter = (chapter: Chapter) => {
    if (chapter === currentChapter) return;
    if (soundEnabled) createClickSound();
    
    setIsTransitioning(true);
    setTimeout(() => {
      setCurrentChapter(chapter);
      setIsTransitioning(false);
    }, 300);
  };
  
  const handleDateComplete = useCallback(() => {
    setTimeout(() => goToChapter(2), 800);
  }, []);
  
  const handlePhaseSelect = (phase: PeriodType) => {
    setSelectedPhase(phase);
    if (soundEnabled) createClickSound();
    setTimeout(() => goToChapter(3), 400);
  };
  
  const handleGenerate = (targetRoute: string) => {
    setIsLoading(true);
    
    const yearRange = calculateYearRange();
    
    const optionalData: OptionalData = {
      firstName: name || undefined,
      children: [],
      focus: "netherlands",
      gender: gender,
      attitude: "neutral",
      periodType: selectedPhase || undefined,
    };
    
    const formData: FormData = {
      type: selectedPhase === "birthyear" ? "birthdate" : "range",
      birthDate: birthDate,
      yearRange: yearRange,
      optionalData,
    };
    
    sessionStorage.setItem("timelineFormData", JSON.stringify(formData));
    sessionStorage.setItem("timelineLength", "short");
    
    setTimeout(() => {
      navigate(targetRoute);
    }, 2500);
  };
  
  // Validation checks
  const isBirthDateValid = birthDate.day > 0 && birthDate.month > 0 && birthDate.year >= 1900 && birthDate.year <= currentYear;
  const canProceedToChapter2 = isBirthDateValid;
  const canProceedToChapter3 = selectedPhase !== null;
  const canGenerate = isBirthDateValid && selectedPhase !== null;
  
  // Completed chapters for indicator
  const completedChapters: [boolean, boolean, boolean] = [
    isBirthDateValid,
    selectedPhase !== null,
    name.length > 0 || gender !== 'none',
  ];
  
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
          </div>
        )}
        {eraTheme.era === '90s' && (
          <div className="absolute inset-0 opacity-10">
            <div className="absolute top-32 right-16 w-20 h-20 rounded-full bg-[var(--era-primary)]" />
            <div className="absolute bottom-32 left-16 w-16 h-16 bg-[var(--era-secondary)] rotate-45" />
          </div>
        )}
      </div>
      
      <Header />
      
      {/* Loading overlay */}
      <AnimatePresence>
        {isLoading && (
          <NostalgicLoading year={birthDate.year || 1985} />
        )}
      </AnimatePresence>
      
      {/* Main content */}
      <main className="flex-1 relative z-10 pt-16 sm:pt-20 pb-8 px-4">
        <div className="container mx-auto max-w-lg">
          
          {/* Chapter indicator */}
          <ChapterIndicator 
            currentChapter={currentChapter} 
            onChapterClick={(c) => {
              // Only allow going back to completed chapters
              if (c < currentChapter || (c === 2 && canProceedToChapter2) || (c === 3 && canProceedToChapter3)) {
                goToChapter(c as Chapter);
              }
            }}
            completedChapters={completedChapters}
          />
          
          {/* Chapter content with transitions */}
          <AnimatePresence mode="wait">
            {/* Chapter 1: Birth Date */}
            {currentChapter === 1 && !isTransitioning && (
              <motion.div
                key="chapter1"
                initial={{ opacity: 0, x: 50 }}
                animate={{ opacity: 1, x: 0 }}
                exit={{ opacity: 0, x: -50 }}
                transition={{ duration: 0.3, ease: "easeOut" }}
                className="space-y-6"
              >
                <RetroDateInput
                  value={birthDate}
                  onChange={setBirthDate}
                  eraTheme={eraTheme}
                  onComplete={handleDateComplete}
                />
                
                {/* Manual next button (in case auto-advance didn't trigger) */}
                {canProceedToChapter2 && (
                  <motion.div
                    initial={{ opacity: 0, y: 20 }}
                    animate={{ opacity: 1, y: 0 }}
                    className="flex justify-center pt-2"
                  >
                    <Button
                      onClick={() => goToChapter(2)}
                      className="group px-6 py-5 text-base font-semibold rounded-xl shadow-lg transition-all duration-300 hover:scale-105"
                      style={{
                        background: `linear-gradient(135deg, var(--era-primary), var(--era-secondary))`,
                        color: eraTheme.era === 'pre70s' || eraTheme.era === '80s' ? '#fff' : '#000',
                      }}
                    >
                      <span>Kies je bestemming</span>
                      <ArrowRight className="ml-2 h-5 w-5 group-hover:translate-x-1 transition-transform" />
                    </Button>
                  </motion.div>
                )}
              </motion.div>
            )}
            
            {/* Chapter 2: Phase Selection */}
            {currentChapter === 2 && !isTransitioning && (
              <motion.div
                key="chapter2"
                initial={{ opacity: 0, x: 50 }}
                animate={{ opacity: 1, x: 0 }}
                exit={{ opacity: 0, x: -50 }}
                transition={{ duration: 0.3, ease: "easeOut" }}
                className="space-y-6"
              >
                <PhaseSelector
                  birthYear={birthDate.year}
                  selected={selectedPhase}
                  onSelect={handlePhaseSelect}
                  eraTheme={eraTheme}
                />
                
                {/* Back button */}
                <div className="flex justify-center">
                  <Button
                    variant="ghost"
                    onClick={() => goToChapter(1)}
                    className="text-muted-foreground"
                  >
                    <ArrowLeft className="mr-2 h-4 w-4" />
                    Terug naar geboortedatum
                  </Button>
                </div>
              </motion.div>
            )}
            
            {/* Chapter 3: Identity */}
            {currentChapter === 3 && !isTransitioning && (
              <motion.div
                key="chapter3"
                initial={{ opacity: 0, x: 50 }}
                animate={{ opacity: 1, x: 0 }}
                exit={{ opacity: 0, x: -50 }}
                transition={{ duration: 0.3, ease: "easeOut" }}
                className="space-y-6"
              >
                <IdentityForm
                  name={name}
                  gender={gender}
                  onNameChange={setName}
                  onGenderChange={setGender}
                  eraTheme={eraTheme}
                />
                
                {/* Generate button */}
                <motion.div 
                  initial={{ opacity: 0, y: 20 }}
                  animate={{ opacity: 1, y: 0 }}
                  transition={{ delay: 0.2 }}
                  className="pt-4"
                >
                  <Button
                    onClick={() => handleGenerate("/story")}
                    disabled={!canGenerate}
                    className="w-full h-14 text-lg font-bold rounded-xl shadow-lg transition-all duration-300 hover:scale-[1.02] disabled:opacity-50"
                    style={{
                      background: `linear-gradient(135deg, var(--era-primary), var(--era-secondary))`,
                      color: eraTheme.era === 'pre70s' || eraTheme.era === '80s' ? '#fff' : '#000',
                    }}
                  >
                    <Rocket className="mr-2 h-5 w-5" />
                    <span>Start mijn Tijdreis</span>
                    <Sparkles className="ml-2 h-5 w-5" />
                  </Button>
                  
                  <p className="text-center text-xs text-muted-foreground mt-3">
                    Je gaat terug naar {calculateYearRange().startYear}
                    {calculateYearRange().startYear !== calculateYearRange().endYear && 
                      ` - ${calculateYearRange().endYear}`
                    }
                  </p>
                </motion.div>
                
                {/* Back button */}
                <div className="flex justify-center">
                  <Button
                    variant="ghost"
                    onClick={() => goToChapter(2)}
                    className="text-muted-foreground"
                  >
                    <ArrowLeft className="mr-2 h-4 w-4" />
                    Kies andere bestemming
                  </Button>
                </div>
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
