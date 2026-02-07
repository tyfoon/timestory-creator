import { useState, useEffect, useMemo, useRef } from "react";
import { useNavigate } from "react-router-dom";
import { useLanguage } from "@/contexts/LanguageContext";
import { Header } from "@/components/Header";
import { DateInput } from "@/components/DateInput";
import { OptionalInfoForm } from "@/components/OptionalInfoForm";
import { SubcultureSelector } from "@/components/SubcultureSelector";
import { motion, AnimatePresence } from "framer-motion";
import { MapPin, Users, ChevronDown, ChevronUp } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogDescription } from "@/components/ui/dialog";
import { FormData, BirthDateData, OptionalData, PeriodType, Gender, SubcultureData } from "@/types/form";
import { RadioGroup, RadioGroupItem } from "@/components/ui/radio-group";
import {
  ArrowRight,
  Sparkles,
  Camera,
  Baby,
  GraduationCap,
  Heart,
  Calendar,
  Pencil,
  Zap,
  Crown,
  Check,
  BookOpen,
} from "lucide-react";
import heroBg from "@/assets/hero-bg-new.png";
import heroBg70s from "@/assets/hero-bg-70s.png";
import heroBg80s from "@/assets/hero-bg-80s.png";
import heroBg90s from "@/assets/hero-bg-90s.png";
import heroBg00s from "@/assets/hero-bg-00s.png";
import heroBg10s from "@/assets/hero-bg-10s.png";

// Main period options
const getMainPeriodOptions = (
  t: (key: any) => any,
): {
  id: PeriodType;
  label: string;
  description: string;
  icon: React.ReactNode;
  ageRange?: [number, number];
}[] => [
  {
    id: "birthyear",
    label: t("periodBirthyear") as string,
    description: "Het jaar waarin jij ter wereld kwam",
    icon: <Baby className="h-6 w-6" />,
  },
  {
    id: "childhood",
    label: t("periodChildhood") as string,
    description: "Buitenspelen, eerste vriendjes, basisschool",
    icon: <GraduationCap className="h-6 w-6" />,
    ageRange: [6, 10],
  },
  {
    id: "puberty",
    label: t("periodPuberty") as string,
    description: "Eerste verliefdheid, muziek ontdekken",
    icon: <Heart className="h-6 w-6" />,
    ageRange: [11, 17],
  },
  {
    id: "young-adult",
    label: t("periodYoungAdult") as string,
    description: "Uitgaan, studeren, de wereld ontdekken",
    icon: <Calendar className="h-6 w-6" />,
    ageRange: [18, 25],
  },
];

// Step indicator component
const StepIndicator = ({ 
  currentStep, 
  totalSteps, 
  completedSteps 
}: { 
  currentStep: number; 
  totalSteps: number; 
  completedSteps: boolean[];
}) => (
  <div className="flex items-center justify-center gap-2 mb-6">
    {Array.from({ length: totalSteps }, (_, i) => {
      const stepNum = i + 1;
      const isActive = currentStep === stepNum;
      const isCompleted = completedSteps[i];
      
      return (
        <div key={stepNum} className="flex items-center">
          <motion.div
            initial={false}
            animate={{
              scale: isActive ? 1.1 : 1,
              backgroundColor: isActive 
                ? 'hsl(var(--primary))' 
                : isCompleted 
                  ? 'hsl(var(--primary) / 0.5)' 
                  : 'hsl(var(--muted))',
            }}
            className={`
              w-8 h-8 rounded-full flex items-center justify-center text-sm font-bold
              ${isActive ? 'text-primary-foreground shadow-lg' : 'text-muted-foreground'}
            `}
          >
            {isCompleted && !isActive ? (
              <Check className="w-4 h-4" />
            ) : (
              stepNum
            )}
          </motion.div>
          {i < totalSteps - 1 && (
            <div 
              className={`w-8 h-0.5 mx-1 transition-colors duration-300 ${
                isCompleted ? 'bg-primary/50' : 'bg-muted'
              }`}
            />
          )}
        </div>
      );
    })}
  </div>
);

const HomeV3 = () => {
  const { t } = useLanguage();
  const navigate = useNavigate();

  // Restore form state from sessionStorage on mount
  const getInitialState = () => {
    const saved = sessionStorage.getItem("homepageFormState");
    if (saved) {
      try {
        return JSON.parse(saved);
      } catch {
        return null;
      }
    }
    return null;
  };

  const initialState = getInitialState();

  const [birthDate, setBirthDate] = useState<BirthDateData>(
    initialState?.birthDate || { day: 0, month: 0, year: 0 }
  );
  const [selectedPeriod, setSelectedPeriod] = useState<PeriodType | null>(
    initialState?.selectedPeriod || null
  );
  const [customStartYear, setCustomStartYear] = useState<number>(
    initialState?.customStartYear || 0
  );
  const [customEndYear, setCustomEndYear] = useState<number>(
    initialState?.customEndYear || 0
  );
  const [timelineLength, setTimelineLength] = useState<"short" | "long">(
    initialState?.timelineLength || "short"
  );
  const [showCustomDialog, setShowCustomDialog] = useState(false);
  
  const [optionalData, setOptionalData] = useState<OptionalData>(() => {
    const defaults: OptionalData = { 
      children: [], 
      focus: "netherlands",
      gender: "none",
      attitude: "neutral"
    };
    if (initialState?.optionalData) {
      return { ...defaults, ...initialState.optionalData };
    }
    return defaults;
  });

  const [errors, setErrors] = useState<{
    birthDate?: string;
    period?: string;
    custom?: string;
  }>({});

  const currentYear = new Date().getFullYear();
  const [bgLoaded, setBgLoaded] = useState(false);

  // Ref for city input to focus after year is complete
  const cityInputRef = useRef<HTMLInputElement>(null);

  // Current step in progressive disclosure
  const [currentStep, setCurrentStep] = useState(1);

  // Persist form state to sessionStorage whenever it changes
  useEffect(() => {
    const formState = {
      birthDate,
      selectedPeriod,
      customStartYear,
      customEndYear,
      timelineLength,
      optionalData,
    };
    sessionStorage.setItem("homepageFormState", JSON.stringify(formState));
  }, [birthDate, selectedPeriod, customStartYear, customEndYear, timelineLength, optionalData]);

  // Determine which background to use based on birth year
  const getBackgroundImage = () => {
    if (birthDate.year >= 1969 && birthDate.year <= 1979) return heroBg70s;
    if (birthDate.year >= 1980 && birthDate.year <= 1989) return heroBg80s;
    if (birthDate.year >= 1990 && birthDate.year <= 1999) return heroBg90s;
    if (birthDate.year >= 2000 && birthDate.year <= 2009) return heroBg00s;
    if (birthDate.year >= 2010 && birthDate.year <= 2019) return heroBg10s;
    return heroBg;
  };

  const currentBg = getBackgroundImage();

  useEffect(() => {
    setBgLoaded(false);
  }, [currentBg]);

  const mainPeriodOptions = getMainPeriodOptions(t);

  // Update custom year range when birth year changes
  useEffect(() => {
    if (!birthDate.year || !selectedPeriod) return;
    
    if (selectedPeriod === "birthyear") {
      setCustomStartYear(birthDate.year);
      setCustomEndYear(birthDate.year);
    } else {
      const option = mainPeriodOptions.find((p) => p.id === selectedPeriod);
      if (option?.ageRange) {
        setCustomStartYear(birthDate.year + option.ageRange[0]);
        setCustomEndYear(Math.min(birthDate.year + option.ageRange[1], currentYear));
      }
    }
  }, [birthDate.year, selectedPeriod, currentYear, mainPeriodOptions]);

  // Computed states
  const isBirthDateComplete = birthDate.day > 0 && birthDate.month > 0 && birthDate.year >= 1900 && birthDate.year <= currentYear;
  
  // Step 1 is only complete after user presses Enter in city field
  const [step1Completed, setStep1Completed] = useState(false);
  
  const isStep2Complete = step1Completed && selectedPeriod !== null;
  // Step 3 is gender + subculture (gender selection or subculture completes it)
  const isStep3Complete = isStep2Complete && (optionalData.gender !== 'none' || !!optionalData.subculture);
  const completedSteps: boolean[] = [
    step1Completed,
    isStep2Complete,
    isStep3Complete,
    false, // Step 4 is the action step
  ];

  // Manual advance triggers - Step 1 advances only when Enter is pressed in city field
  const [step1ManualAdvance, setStep1ManualAdvance] = useState(false);
  // Step 3 advances only on explicit Enter in text fields
  const [step3ManualAdvance, setStep3ManualAdvance] = useState(false);

  // Focus city input when birth date becomes complete
  useEffect(() => {
    if (isBirthDateComplete && currentStep === 1) {
      // Small delay to ensure the year field has finished processing
      setTimeout(() => {
        cityInputRef.current?.focus();
      }, 50);
    }
  }, [isBirthDateComplete, currentStep]);

  // Auto-advance step 1 only after Enter is pressed in city field
  useEffect(() => {
    if (step1ManualAdvance && isBirthDateComplete && currentStep === 1) {
      setTimeout(() => setCurrentStep(2), 300);
      setStep1ManualAdvance(false);
    }
  }, [step1ManualAdvance, isBirthDateComplete, currentStep]);

  // Auto-advance step 2 immediately when period is selected (it's a click, not text input)
  useEffect(() => {
    if (isStep2Complete && currentStep === 2) {
      setTimeout(() => setCurrentStep(3), 300);
    }
  }, [isStep2Complete, currentStep]);

  // Auto-advance step 3 only after explicit Enter in text fields
  useEffect(() => {
    if (step3ManualAdvance && isStep3Complete && currentStep === 3) {
      setTimeout(() => setCurrentStep(4), 300);
      setStep3ManualAdvance(false);
    }
  }, [step3ManualAdvance, isStep3Complete, currentStep]);

  // Handle Enter key on Step 1 city field - this is the only way to advance to step 2
  const handleCityKeyDown = (e: React.KeyboardEvent) => {
    if (e.key === 'Enter' && isBirthDateComplete) {
      e.preventDefault();
      setStep1Completed(true);
      setStep1ManualAdvance(true);
    }
  };

  // Handle Enter key on Step 3 city field
  const handleStep3KeyDown = (e: React.KeyboardEvent) => {
    if (e.key === 'Enter' && isStep3Complete) {
      setStep3ManualAdvance(true);
    }
  };

  const calculateYearRange = (): { startYear: number; endYear: number } | null => {
    if (!birthDate.year) return null;

    if (customStartYear && customEndYear) {
      return { startYear: customStartYear, endYear: customEndYear };
    }

    if (selectedPeriod === "birthyear") {
      return { startYear: birthDate.year, endYear: birthDate.year };
    }

    const option = mainPeriodOptions.find((p) => p.id === selectedPeriod);
    if (option?.ageRange) {
      return {
        startYear: birthDate.year + option.ageRange[0],
        endYear: Math.min(birthDate.year + option.ageRange[1], currentYear),
      };
    }
    return null;
  };

  const validateForm = (): boolean => {
    const newErrors: typeof errors = {};
    if (!birthDate.day || !birthDate.month || !birthDate.year) {
      newErrors.birthDate = t("fillBirthDate") as string;
    } else if (birthDate.year < 1900 || birthDate.year > currentYear) {
      newErrors.birthDate = (t("validYearRange") as string) + " (1900-" + currentYear + ")";
    }
    if (!selectedPeriod) {
      newErrors.period = t("choosePeriod") as string;
    }
    setErrors(newErrors);
    return Object.keys(newErrors).length === 0;
  };

  const handlePeriodSelect = (periodId: PeriodType) => {
    setSelectedPeriod(periodId);

    if (periodId === "birthyear") {
      setCustomStartYear(birthDate.year);
      setCustomEndYear(birthDate.year);
    } else {
      const option = mainPeriodOptions.find((p) => p.id === periodId);
      if (option?.ageRange) {
        setCustomStartYear(birthDate.year + option.ageRange[0]);
        setCustomEndYear(Math.min(birthDate.year + option.ageRange[1], currentYear));
      }
    }
  };

  const handleGenerate = (targetRoute: string) => {
    if (!validateForm()) return;
    const yearRange = calculateYearRange();
    if (!yearRange) return;
    
    const formData: FormData = {
      type: selectedPeriod === "birthyear" ? "birthdate" : "range",
      birthDate: birthDate,
      yearRange: yearRange,
      optionalData: {
        ...optionalData,
        periodType: selectedPeriod || undefined,
      },
    };
    sessionStorage.setItem("timelineFormData", JSON.stringify(formData));
    sessionStorage.setItem("timelineLength", timelineLength);
    navigate(targetRoute);
  };

  const handleCustomDialogConfirm = () => {
    if (!customStartYear || !customEndYear) {
      setErrors({ ...errors, custom: t("fillBothYears") as string });
      return;
    }
    if (customEndYear < customStartYear) {
      setErrors({ ...errors, custom: t("endYearAfterStart") as string });
      return;
    }
    if (customStartYear < 1900 || customEndYear > currentYear) {
      setErrors({ ...errors, custom: (t("validYears") as string) + " (1900-" + currentYear + ")" });
      return;
    }
    setErrors({ ...errors, custom: undefined });
    setShowCustomDialog(false);
  };

  // Step card animation variants
  const stepVariants = {
    hidden: { opacity: 0, y: 20 },
    visible: { opacity: 1, y: 0, transition: { duration: 0.4, ease: "easeOut" as const } },
    exit: { opacity: 0, y: -10, transition: { duration: 0.2 } },
  };

  return (
    <div className="min-h-screen flex flex-col relative">
      {/* Background */}
      <div className="fixed inset-0 -z-20 bg-muted">
        <img
          src={currentBg}
          alt=""
          className={`w-full h-full object-cover transition-opacity duration-700 ${bgLoaded ? "opacity-80" : "opacity-70"}`}
          onLoad={() => setBgLoaded(true)}
          loading="lazy"
        />
      </div>
      <div className="fixed inset-0 -z-10 bg-gradient-to-b from-background/30 via-background/50 to-background" />

      <Header />

      <section className="relative flex-1 pt-20 pb-4 px-4 overflow-hidden">
        <div className="container mx-auto max-w-xl relative z-10">
          
          {/* Step Indicator - Above the main card */}
          <div className="mb-4">
            <StepIndicator 
              currentStep={currentStep} 
              totalSteps={4} 
              completedSteps={completedSteps} 
            />
          </div>

          {/* Progressive Disclosure Cards */}
          <div className="space-y-4">
            
            {/* Step 1: Geboortedatum - With Hero inside */}
            <motion.div
              layout
              className={`bg-card rounded-xl shadow-elevated border border-border overflow-hidden ${
                currentStep === 1 ? '' : 'cursor-pointer hover:border-primary/30'
              }`}
              onClick={() => currentStep !== 1 && setCurrentStep(1)}
            >
              <div className="p-6">
                {/* Hero Header - Inside the card when Step 1 is active */}
                <AnimatePresence mode="wait">
                  {currentStep === 1 && (
                    <motion.div 
                      initial={{ opacity: 0, y: -10 }}
                      animate={{ opacity: 1, y: 0 }}
                      exit={{ opacity: 0, y: -10 }}
                      transition={{ duration: 0.3 }}
                      className="text-center mb-6"
                    >
                      <h1 className="font-serif text-2xl sm:text-3xl font-bold text-foreground mb-2">
                        {t("heroTitle") as string}
                      </h1>
                      <p className="text-muted-foreground text-sm sm:text-base max-w-md mx-auto">
                        {t("heroSubtitle") as string}
                      </p>
                    </motion.div>
                  )}
                </AnimatePresence>

                {/* Collapsed header when not on step 1 */}
                {currentStep !== 1 && (
                  <div className="flex items-center justify-between">
                    <div className="flex items-center gap-3">
                      <div className={`p-2 rounded-full ${isBirthDateComplete ? 'bg-primary/20 text-primary' : 'bg-muted text-muted-foreground'}`}>
                        <Baby className="h-5 w-5" />
                      </div>
                      <div>
                        <h3 className="font-semibold text-foreground">Geboortedatum & Woonplaats</h3>
                        {isBirthDateComplete && (
                          <p className="text-sm text-muted-foreground">
                            {String(birthDate.day).padStart(2, '0')}-{String(birthDate.month).padStart(2, '0')}-{birthDate.year}
                            {optionalData.city && ` • ${optionalData.city}`}
                          </p>
                        )}
                      </div>
                    </div>
                    <ChevronDown className="h-5 w-5 text-muted-foreground" />
                  </div>
                )}
                
                <AnimatePresence mode="wait">
                  {currentStep === 1 && (
                    <motion.div
                      key="step1-content"
                      variants={stepVariants}
                      initial="hidden"
                      animate="visible"
                      exit="exit"
                    >
                      <DateInput
                        label={t("birthDateQuestion") as string}
                        value={birthDate}
                        onChange={setBirthDate}
                        error={errors.birthDate}
                      />
                      
                      {/* City - in Step 1 */}
                      <div className="mt-4 space-y-2">
                        <Label className="flex items-center gap-2 text-sm font-medium text-foreground">
                          <MapPin className="h-4 w-4 text-accent" />
                          {t("cityLabel") as string}
                        </Label>
                        <Input
                          ref={cityInputRef}
                          placeholder={t("cityPlaceholder") as string}
                          value={optionalData.city || ""}
                          onChange={(e) => setOptionalData({ ...optionalData, city: e.target.value })}
                          onKeyDown={handleCityKeyDown}
                          className="bg-card h-10"
                        />
                      </div>
                      
                      {isBirthDateComplete && (
                        <p className="text-xs text-muted-foreground mt-4 text-center">
                          Druk op Enter bij woonplaats om verder te gaan
                        </p>
                      )}
                    </motion.div>
                  )}
                </AnimatePresence>
              </div>
            </motion.div>

            {/* Step 2: Periode selectie */}
            {step1Completed && (
              <motion.div
                layout
                initial={{ opacity: 0, y: 20 }}
                animate={{ opacity: 1, y: 0 }}
                className={`bg-card rounded-xl shadow-elevated border border-border overflow-hidden ${
                  currentStep === 2 ? '' : 'cursor-pointer hover:border-primary/30'
                }`}
                onClick={() => currentStep !== 2 && step1Completed && setCurrentStep(2)}
              >
                <div className="p-4">
                  <div className="flex items-center justify-between">
                    <div className="flex items-center gap-3">
                      <div className={`p-2 rounded-full ${selectedPeriod ? 'bg-primary/20 text-primary' : 'bg-muted text-muted-foreground'}`}>
                        <Calendar className="h-5 w-5" />
                      </div>
                      <div>
                        <h3 className="font-semibold text-foreground">Welke periode?</h3>
                        {selectedPeriod && currentStep !== 2 && (
                          <p className="text-sm text-muted-foreground">
                            {mainPeriodOptions.find(p => p.id === selectedPeriod)?.label}
                            {customStartYear && customEndYear && ` (${customStartYear}-${customEndYear})`}
                          </p>
                        )}
                      </div>
                    </div>
                    {currentStep !== 2 && (
                      <ChevronDown className="h-5 w-5 text-muted-foreground" />
                    )}
                  </div>
                  
                  <AnimatePresence mode="wait">
                    {currentStep === 2 && (
                      <motion.div
                        key="step2-content"
                        variants={stepVariants}
                        initial="hidden"
                        animate="visible"
                        exit="exit"
                        className="mt-4 space-y-3"
                      >
                        <div className="grid grid-cols-4 gap-2">
                          {mainPeriodOptions.map((option) => (
                            <button
                              key={option.id}
                              onClick={(e) => {
                                e.stopPropagation();
                                handlePeriodSelect(option.id);
                              }}
                              className={`flex flex-col items-center gap-2 p-3 rounded-lg border-2 text-center transition-all ${
                                selectedPeriod === option.id 
                                  ? "border-primary bg-primary/10" 
                                  : "border-border bg-secondary/30 hover:border-primary/50"
                              }`}
                            >
                              <div className={`p-2 rounded-full ${
                                selectedPeriod === option.id ? "bg-primary/20 text-primary" : "bg-muted text-muted-foreground"
                              }`}>
                                {option.icon}
                              </div>
                              <span className="font-semibold text-foreground text-xs leading-tight">{option.label}</span>
                              {selectedPeriod === option.id && (
                                <Check className="h-4 w-4 text-primary" />
                              )}
                            </button>
                          ))}
                        </div>
                      </motion.div>
                    )}
                  </AnimatePresence>
                </div>
              </motion.div>
            )}

            {/* Step 3: Personalisatie */}
            {isStep2Complete && (
              <motion.div
                layout
                initial={{ opacity: 0, y: 20 }}
                animate={{ opacity: 1, y: 0 }}
                className={`bg-card rounded-xl shadow-elevated border border-border overflow-hidden ${
                  currentStep === 3 ? '' : 'cursor-pointer hover:border-primary/30'
                }`}
                onClick={() => currentStep !== 3 && isStep2Complete && setCurrentStep(3)}
              >
                <div className="p-4">
                  <div className="flex items-center justify-between">
                    <div className="flex items-center gap-3">
                      <div className={`p-2 rounded-full ${isStep3Complete ? 'bg-primary/20 text-primary' : 'bg-muted text-muted-foreground'}`}>
                        <Users className="h-5 w-5" />
                      </div>
                      <div>
                        <h3 className="font-semibold text-foreground">Stijl & Subcultuur</h3>
                        {isStep3Complete && currentStep !== 3 && (
                          <p className="text-sm text-muted-foreground">
                            {optionalData.gender === 'male' && 'Man'}
                            {optionalData.gender === 'female' && 'Vrouw'}
                            {optionalData.gender !== 'none' && optionalData.subculture?.myGroup && ' • '}
                            {optionalData.subculture?.myGroup}
                          </p>
                        )}
                      </div>
                    </div>
                    {currentStep !== 3 && (
                      <ChevronDown className="h-5 w-5 text-muted-foreground" />
                    )}
                  </div>
                  
                  <AnimatePresence mode="wait">
                    {currentStep === 3 && (
                      <motion.div
                        key="step3-content"
                        variants={stepVariants}
                        initial="hidden"
                        animate="visible"
                        exit="exit"
                        className="mt-4 space-y-4"
                        onClick={(e) => e.stopPropagation()}
                      >

                        {/* Gender */}
                        <div className="space-y-2">
                          <Label className="flex items-center gap-2 text-sm font-medium text-foreground">
                            <Users className="h-4 w-4 text-accent" />
                            Geslacht
                          </Label>
                          <RadioGroup
                            value={optionalData.gender || 'none'}
                            onValueChange={(v) => setOptionalData({ ...optionalData, gender: v as Gender })}
                            className="grid grid-cols-3 gap-2"
                          >
                            {([
                              { value: 'male', label: 'Man' },
                              { value: 'female', label: 'Vrouw' },
                              { value: 'none', label: 'Geen voorkeur' }
                            ] as const).map((option) => (
                              <Label
                                key={option.value}
                                className={`
                                  flex items-center justify-center py-2 px-2 rounded-md cursor-pointer
                                  border-2 transition-all duration-200
                                  ${optionalData.gender === option.value || (!optionalData.gender && option.value === 'none')
                                    ? 'border-accent bg-accent/10 text-foreground' 
                                    : 'border-border bg-card hover:border-muted-foreground/30 text-muted-foreground'
                                  }
                                `}
                              >
                                <RadioGroupItem value={option.value} className="sr-only" />
                                <span className="text-sm font-medium">{option.label}</span>
                              </Label>
                            ))}
                          </RadioGroup>
                        </div>

                        {/* Subculture */}
                        {customStartYear > 0 && customEndYear > 0 && selectedPeriod && (
                          <SubcultureSelector
                            startYear={customStartYear}
                            endYear={customEndYear}
                            periodType={selectedPeriod}
                            focus={optionalData.focus}
                            value={optionalData.subculture}
                            onChange={(subculture: SubcultureData) => setOptionalData({ ...optionalData, subculture })}
                          />
                        )}

                        {/* Start button */}
                        <Button
                          onClick={() => handleGenerate("/story")}
                          className="w-full btn-vintage h-12 text-base font-bold text-primary-foreground rounded-lg shadow-lg mt-4"
                        >
                          <BookOpen className="mr-2 h-5 w-5" />
                          <span>Start mijn Tijdreis</span>
                          <ArrowRight className="ml-2 h-5 w-5" />
                        </Button>
                      </motion.div>
                    )}
                  </AnimatePresence>
                </div>
              </motion.div>
            )}

          </div>
        </div>
      </section>

      {/* Adjust Dialog */}
      <Dialog open={showCustomDialog} onOpenChange={setShowCustomDialog}>
        <DialogContent className="max-w-lg max-h-[85vh] overflow-y-auto">
          <DialogHeader>
            <DialogTitle className="flex items-center gap-2">
              <Pencil className="h-5 w-5 text-primary" />
              {t("customDialogTitle") as string}
            </DialogTitle>
            <DialogDescription>{t("customDialogDescription") as string}</DialogDescription>
          </DialogHeader>

          <div className="space-y-4 py-4">
            <div className="space-y-2">
              <Label className="flex items-center gap-2 text-sm font-medium text-foreground">
                <Calendar className="h-4 w-4 text-accent" />
                {t("startYearLabel") as string}
              </Label>
              <div className="flex gap-3 items-center">
                <Input
                  type="number"
                  placeholder={t("customFromPlaceholder") as string}
                  value={customStartYear || ""}
                  onChange={(e) => setCustomStartYear(parseInt(e.target.value) || 0)}
                  min={1900}
                  max={currentYear}
                  className="bg-card text-center h-9"
                />
                <ArrowRight className="h-5 w-5 text-muted-foreground flex-shrink-0" />
                <Input
                  type="number"
                  placeholder={t("customToPlaceholder") as string}
                  value={customEndYear || ""}
                  onChange={(e) => setCustomEndYear(parseInt(e.target.value) || 0)}
                  min={1900}
                  max={currentYear}
                  className="bg-card text-center h-9"
                />
              </div>
              {errors.custom && <p className="text-sm text-destructive">{errors.custom}</p>}
            </div>

            <OptionalInfoForm value={optionalData} onChange={setOptionalData} />
          </div>

          <div className="flex justify-between gap-3 pt-4 border-t border-border">
            <Button variant="outline" onClick={() => setShowCustomDialog(false)}>
              {t("skipButton") as string}
            </Button>
            <Button onClick={handleCustomDialogConfirm} className="btn-vintage">
              <Check className="mr-2 h-4 w-4" />
              {t("confirmButton") as string}
            </Button>
          </div>
        </DialogContent>
      </Dialog>
    </div>
  );
};

export default HomeV3;
