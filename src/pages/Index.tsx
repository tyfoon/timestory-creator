import { useState, useRef, useEffect, useMemo } from "react";
import { useNavigate } from "react-router-dom";
import { useLanguage } from "@/contexts/LanguageContext";
import { Header } from "@/components/Header";
import { DateInput } from "@/components/DateInput";
import { OptionalInfoForm } from "@/components/OptionalInfoForm";
import { SubcultureSelector } from "@/components/SubcultureSelector";
import { MapPin, Users } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogDescription } from "@/components/ui/dialog";
import { FormData, BirthDateData, OptionalData, PeriodType, Gender, SubcultureData } from "@/types/form";
import { RadioGroup, RadioGroupItem } from "@/components/ui/radio-group";
import { Switch } from "@/components/ui/switch";
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

// Main period options (2x2 grid) - without custom - defined as function to receive t()
const getMainPeriodOptions = (
  t: (key: any) => any,
): {
  id: PeriodType;
  label: string;
  icon: React.ReactNode;
  ageRange?: [number, number];
}[] => [
  {
    id: "birthyear",
    label: t("periodBirthyear") as string,
    icon: <Baby className="h-5 w-5" />,
  },
  {
    id: "childhood",
    label: t("periodChildhood") as string,
    icon: <GraduationCap className="h-5 w-5" />,
    ageRange: [6, 12],
  },
  {
    id: "puberty",
    label: t("periodPuberty") as string,
    icon: <Heart className="h-5 w-5" />,
    ageRange: [12, 17],
  },
  {
    id: "young-adult",
    label: t("periodYoungAdult") as string,
    icon: <Calendar className="h-5 w-5" />,
    ageRange: [18, 25],
  },
];

const Index = () => {
  const { t } = useLanguage();
  const navigate = useNavigate();
  const timelineLengthRef = useRef<HTMLDivElement>(null);
  const cityInputRef = useRef<HTMLDivElement>(null);
  const periodSectionRef = useRef<HTMLDivElement>(null);

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
  
  // CRITICAL: Merge saved optionalData with defaults to ensure new fields (gender, attitude) are initialized
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
  
  // Image search mode toggle (Legacy vs Tol)
  const [imageSearchMode, setImageSearchMode] = useState<'legacy' | 'tol'>(() => {
    return (sessionStorage.getItem('imageSearchMode') as 'legacy' | 'tol') || 'tol';
  });
  
  // Persist image search mode to sessionStorage
  useEffect(() => {
    sessionStorage.setItem('imageSearchMode', imageSearchMode);
  }, [imageSearchMode]);

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

  // Reset loading state when background changes
  useEffect(() => {
    setBgLoaded(false);
  }, [currentBg]);

  const mainPeriodOptions = getMainPeriodOptions(t);

  // Update custom year range when birth year changes (to keep subculture selector in sync)
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

  const calculateYearRange = (): {
    startYear: number;
    endYear: number;
  } | null => {
    if (!birthDate.year) return null;

    // If custom years are set, use those
    if (customStartYear && customEndYear) {
      return {
        startYear: customStartYear,
        endYear: customEndYear,
      };
    }

    if (selectedPeriod === "birthyear") {
      return {
        startYear: birthDate.year,
        endYear: birthDate.year,
      };
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
    if (selectedPeriod === "custom") {
      if (!customStartYear || !customEndYear) {
        newErrors.custom = t("fillBothYears") as string;
      } else if (customEndYear < customStartYear) {
        newErrors.custom = t("endYearAfterStart") as string;
      } else if (customStartYear < 1900 || customEndYear > currentYear) {
        newErrors.custom = (t("validYears") as string) + " (1900-" + currentYear + ")";
      }
    }
    setErrors(newErrors);
    return Object.keys(newErrors).length === 0;
  };
  const handlePeriodSelect = (periodId: PeriodType) => {
    setSelectedPeriod(periodId);

    // Pre-fill custom years based on selected period
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

    // Auto-scroll to city input section after a short delay
    setTimeout(() => {
      cityInputRef.current?.scrollIntoView({ behavior: "smooth", block: "center" });
    }, 100);
  };

  const handleAdjustClick = () => {
    setShowCustomDialog(true);
  };

  const handleCustomDialogConfirm = () => {
    // Validate custom years before confirming
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

    // Clear custom errors and close dialog
    setErrors({ ...errors, custom: undefined });
    setShowCustomDialog(false);

    // Scroll to timeline length section after closing dialog
    setTimeout(() => {
      timelineLengthRef.current?.scrollIntoView({ behavior: "smooth", block: "center" });
    }, 100);
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
  const isBirthDateComplete = birthDate.day > 0 && birthDate.month > 0 && birthDate.year > 0;
  return (
    <div className="min-h-screen flex flex-col relative">
      {/* Background image - lazy loaded, only renders the needed image */}
      <div className="fixed inset-0 -z-20 bg-muted">
        <img
          src={currentBg}
          alt=""
          className={`w-full h-full object-cover transition-opacity duration-700 ${bgLoaded ? "opacity-80" : "opacity-70"}`}
          onLoad={() => setBgLoaded(true)}
          loading="lazy"
        />
      </div>

      {/* Gradient overlay - separate layer with stronger opacity for better contrast */}
      <div className="fixed inset-0 -z-10 bg-gradient-to-b from-background/30 via-background/50 to-background" />

      <Header />

      {/* Hero Section with Form */}
      <section className="relative flex-1 pt-20 pb-4 px-4 overflow-hidden flex items-center">
        <div className="container mx-auto max-w-lg relative z-10">
          {/* Form card - solid background with strong contrast */}
          <div className="bg-card rounded-xl shadow-elevated border border-border p-4 sm:p-5 space-y-5">
            {/* Header text - now inside the card */}
            <div className="text-center">
              <h1 className="font-serif text-2xl sm:text-3xl font-bold text-ink mb-2 leading-tight">
                {t("heroTitle") as string}
              </h1>
              <p className="text-sm text-muted-foreground">{t("heroSubtitle") as string}</p>
            </div>

            {/* Step 1: Birthdate */}
            <div>
              <DateInput
                label={t("birthDateQuestion") as string}
                value={birthDate}
                onChange={setBirthDate}
                error={errors.birthDate}
                onComplete={() => {
                  // Auto-scroll to period selection after date is complete
                  setTimeout(() => {
                    periodSectionRef.current?.scrollIntoView({ behavior: "smooth", block: "center" });
                  }, 100);
                }}
              />
            </div>

            {/* Step 2: Period selection - 2x2 grid */}
            {isBirthDateComplete && (
              <div ref={periodSectionRef} className="space-y-3 animate-in fade-in slide-in-from-top-2 duration-300">
                <Label className="text-sm font-medium text-foreground">{t("periodQuestion") as string}</Label>
                {errors.period && <p className="text-sm text-destructive">{errors.period}</p>}

                {/* 2x2 Grid for main periods */}
                <div className="grid grid-cols-2 gap-2">
                  {mainPeriodOptions.map((option) => (
                    <button
                      key={option.id}
                      onClick={() => handlePeriodSelect(option.id)}
                      className={`flex flex-col items-center gap-1.5 p-3 rounded-lg border-2 text-center transition-all ${selectedPeriod === option.id ? "border-primary bg-primary/10 text-foreground" : "border-border bg-secondary/30 text-muted-foreground hover:border-primary/50 hover:bg-secondary/50"}`}
                    >
                      <div
                        className={`p-2 rounded-full ${selectedPeriod === option.id ? "bg-primary/20 text-primary" : "bg-muted text-muted-foreground"}`}
                      >
                        {option.icon}
                      </div>
                      <span className="font-medium text-sm">{option.label}</span>
                    </button>
                  ))}
                </div>
              </div>
            )}

            {/* City input - appears after period selection */}
            {isBirthDateComplete && selectedPeriod && (
              <div ref={cityInputRef} className="space-y-3 animate-in fade-in slide-in-from-top-2 duration-300">
                <div className="space-y-2">
                  <Label className="flex items-center gap-2 text-sm font-medium text-foreground">
                    <MapPin className="h-4 w-4 text-accent" />
                    {t("cityLabel") as string}
                  </Label>
                  <Input
                    placeholder={t("cityPlaceholder") as string}
                    value={optionalData.city || ""}
                    onChange={(e) => setOptionalData({ ...optionalData, city: e.target.value })}
                    className="bg-card h-9"
                  />
                </div>

                {/* Gender selection */}
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
                          flex items-center justify-center py-1.5 px-2 rounded-md cursor-pointer
                          border-2 transition-all duration-200
                          ${optionalData.gender === option.value || (!optionalData.gender && option.value === 'none')
                            ? 'border-accent bg-accent/10 text-foreground' 
                            : 'border-border bg-card hover:border-muted-foreground/30 text-muted-foreground'
                          }
                        `}
                      >
                        <RadioGroupItem value={option.value} className="sr-only" />
                        <span className="text-xs font-medium">{option.label}</span>
                      </Label>
                    ))}
                  </RadioGroup>
                </div>

                {/* Subculture selection - replaces attitude */}
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

                {/* Adjust button - optional */}
                <button
                  onClick={handleAdjustClick}
                  className="w-full flex items-center justify-center gap-2 p-2.5 rounded-lg border border-dashed border-border bg-secondary/20 text-muted-foreground hover:border-primary/50 hover:bg-secondary/40 transition-all text-sm"
                >
                  <Pencil className="h-4 w-4" />
                  <span>{t("adjustButton") as string}</span>
                </button>
              </div>
            )}

            {/* Timeline length selector */}
            {isBirthDateComplete && selectedPeriod && (
              <div ref={timelineLengthRef} className="space-y-2 animate-in fade-in slide-in-from-top-2 duration-300">
                <Label className="text-sm font-medium text-foreground">{t("timelineLengthQuestion") as string}</Label>
                <div className="flex gap-2">
                  <button
                    onClick={() => setTimelineLength("short")}
                    className={`flex-1 flex items-center justify-center gap-2 py-2.5 px-3 rounded-lg border-2 transition-all ${timelineLength === "short" ? "border-primary bg-primary/10 text-foreground" : "border-border bg-secondary/30 text-muted-foreground hover:border-primary/50"}`}
                  >
                    <Zap className="h-4 w-4" />
                    <div className="text-left">
                      <span className="text-sm font-medium block">{t("timelineShort") as string}</span>
                      <span className="text-xs opacity-70">{t("timelineShortDesc") as string}</span>
                    </div>
                  </button>
                  <button
                    onClick={() => setTimelineLength("long")}
                    className={`flex-1 flex items-center justify-center gap-2 py-2.5 px-3 rounded-lg border-2 transition-all ${timelineLength === "long" ? "border-primary bg-primary/10 text-foreground" : "border-border bg-secondary/30 text-muted-foreground hover:border-primary/50"}`}
                  >
                    <Crown className="h-4 w-4" />
                    <div className="text-left">
                      <span className="text-sm font-medium block">{t("timelineLong") as string}</span>
                      <span className="text-xs opacity-70">{t("timelineLongDesc") as string}</span>
                    </div>
                  </button>
                </div>
              </div>
            )}

            {/* Action buttons */}
            <div className="pt-4 border-t border-border space-y-3">
              {/* Primary: Timeline Story */}
              <Button
                onClick={() => handleGenerate("/story")}
                className="w-full btn-vintage h-12 sm:h-14 text-base sm:text-lg font-bold text-primary-foreground rounded-lg shadow-lg"
                disabled={!isBirthDateComplete || !selectedPeriod}
              >
                <BookOpen className="mr-2 h-4 w-4 sm:h-5 sm:w-5" />
                <span>Timeline Story</span>
                <ArrowRight className="ml-2 h-4 w-4 sm:h-5 sm:w-5" />
              </Button>

              {/* Secondary: Polaroid & Tijdreis - always side by side, smaller on mobile */}
              <div className="grid grid-cols-2 gap-2">
                <Button
                  onClick={() => handleGenerate("/polaroid")}
                  variant="outline"
                  className="h-10 sm:h-11 text-[11px] xs:text-xs sm:text-sm font-semibold rounded-lg border-2 border-accent/50 bg-gradient-to-r from-accent/10 to-primary/10 hover:from-accent/20 hover:to-primary/20 text-foreground px-2 sm:px-3"
                  disabled={!isBirthDateComplete || !selectedPeriod}
                >
                  <Camera className="mr-1 h-3.5 w-3.5 sm:h-4 sm:w-4 text-accent flex-shrink-0" />
                  <span className="truncate">{t("createPolaroidButton") as string}</span>
                </Button>

                <Button
                  onClick={() => handleGenerate("/resultaat")}
                  variant="outline"
                  className="h-10 sm:h-11 text-[11px] xs:text-xs sm:text-sm font-semibold rounded-lg border-2 border-primary/30 bg-gradient-to-r from-primary/5 to-accent/5 hover:from-primary/10 hover:to-accent/10 text-foreground px-2 sm:px-3"
                  disabled={!isBirthDateComplete || !selectedPeriod}
                >
                  <Sparkles className="mr-1 h-3.5 w-3.5 sm:h-4 sm:w-4 text-primary flex-shrink-0" />
                  <span className="truncate">{t("createTimelineButton") as string}</span>
                </Button>
              </div>
            </div>
            {/* Image Search Mode Toggle - for testing */}
            <div className="flex items-center justify-between text-xs text-muted-foreground border-t border-border pt-3 mt-2">
              <span>Image Search Mode</span>
              <div className="flex items-center gap-2">
                <span className={imageSearchMode === 'legacy' ? 'text-foreground font-medium' : ''}>Legacy</span>
                <Switch
                  checked={imageSearchMode === 'tol'}
                  onCheckedChange={(checked) => setImageSearchMode(checked ? 'tol' : 'legacy')}
                  className="data-[state=checked]:bg-accent"
                />
                <span className={imageSearchMode === 'tol' ? 'text-foreground font-medium' : ''}>Tol</span>
              </div>
            </div>
          </div>

          {/* Feature hints below form */}
        </div>
      </section>

      {/* Adjust Dialog with OptionalInfoForm */}
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
            {/* Year range - same style as other fields */}
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

            {/* Optional Info Form */}
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
export default Index;
