import { useState, useRef, useEffect } from 'react';
import { useNavigate } from 'react-router-dom';
import { useLanguage } from '@/contexts/LanguageContext';
import { Header } from '@/components/Header';
import { DateInput } from '@/components/DateInput';
import { OptionalInfoForm } from '@/components/OptionalInfoForm';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogDescription } from '@/components/ui/dialog';
import { FormData, BirthDateData, OptionalData, PeriodType } from '@/types/form';
import { ArrowRight, Sparkles, Camera, Baby, GraduationCap, Heart, Calendar, Pencil, Zap, Crown, Check } from 'lucide-react';
import heroBg from '@/assets/hero-bg-new.png';
import heroBg70s from '@/assets/hero-bg-70s.png';
import heroBg80s from '@/assets/hero-bg-80s.png';
import heroBg90s from '@/assets/hero-bg-90s.png';
import heroBg00s from '@/assets/hero-bg-00s.png';
import heroBg10s from '@/assets/hero-bg-10s.png';

// Period options will be translated dynamically
const getPeriodOptions = (t: (key: any) => any): {
  id: PeriodType;
  label: string;
  description: string;
  icon: React.ReactNode;
  ageRange?: [number, number];
}[] => [{
  id: 'birthyear',
  label: t('periodBirthyear') as string,
  description: t('periodBirthyearDesc') as string,
  icon: <Baby className="h-5 w-5" />
}, {
  id: 'childhood',
  label: t('periodChildhood') as string,
  description: t('periodChildhoodDesc') as string,
  icon: <GraduationCap className="h-5 w-5" />,
  ageRange: [6, 10]
}, {
  id: 'puberty',
  label: t('periodPuberty') as string,
  description: t('periodPubertyDesc') as string,
  icon: <Heart className="h-5 w-5" />,
  ageRange: [11, 17]
}, {
  id: 'young-adult',
  label: t('periodYoungAdult') as string,
  description: t('periodYoungAdultDesc') as string,
  icon: <Calendar className="h-5 w-5" />,
  ageRange: [18, 25]
}, {
  id: 'custom',
  label: t('periodCustom') as string,
  description: t('periodCustomDesc') as string,
  icon: <Pencil className="h-5 w-5" />
}];

const Index = () => {
  const { t } = useLanguage();
  const navigate = useNavigate();
  const timelineLengthRef = useRef<HTMLDivElement>(null);
  
  const [birthDate, setBirthDate] = useState<BirthDateData>({
    day: 0,
    month: 0,
    year: 0
  });
  const [selectedPeriod, setSelectedPeriod] = useState<PeriodType | null>(null);
  const [customStartYear, setCustomStartYear] = useState<number>(0);
  const [customEndYear, setCustomEndYear] = useState<number>(0);
  const [timelineLength, setTimelineLength] = useState<'short' | 'long'>('short');
  const [showCustomDialog, setShowCustomDialog] = useState(false);
  const [optionalData, setOptionalData] = useState<OptionalData>({
    children: [],
    focus: 'world'
  });
  const [errors, setErrors] = useState<{
    birthDate?: string;
    period?: string;
    custom?: string;
  }>({});
  const currentYear = new Date().getFullYear();

  // Determine which background to use based on birth year
  const is70sEra = birthDate.year >= 1969 && birthDate.year <= 1979;
  const is80sEra = birthDate.year >= 1980 && birthDate.year <= 1989;
  const is90sEra = birthDate.year >= 1990 && birthDate.year <= 1999;
  const is00sEra = birthDate.year >= 2000 && birthDate.year <= 2009;
  const is10sEra = birthDate.year >= 2010 && birthDate.year <= 2019;
  const calculateYearRange = (): {
    startYear: number;
    endYear: number;
  } | null => {
    if (!birthDate.year) return null;
    if (selectedPeriod === 'birthyear') {
      return {
        startYear: birthDate.year,
        endYear: birthDate.year
      };
    }
    if (selectedPeriod === 'custom') {
      return {
        startYear: customStartYear,
        endYear: customEndYear
      };
    }
    const option = periodOptions.find(p => p.id === selectedPeriod);
    if (option?.ageRange) {
      return {
        startYear: birthDate.year + option.ageRange[0],
        endYear: Math.min(birthDate.year + option.ageRange[1], currentYear)
      };
    }
    return null;
  };
  const validateForm = (): boolean => {
    const newErrors: typeof errors = {};
    if (!birthDate.day || !birthDate.month || !birthDate.year) {
      newErrors.birthDate = t('fillBirthDate') as string;
    } else if (birthDate.year < 1900 || birthDate.year > currentYear) {
      newErrors.birthDate = (t('validYearRange') as string) + ' (1900-' + currentYear + ')';
    }
    if (!selectedPeriod) {
      newErrors.period = t('choosePeriod') as string;
    }
    if (selectedPeriod === 'custom') {
      if (!customStartYear || !customEndYear) {
        newErrors.custom = t('fillBothYears') as string;
      } else if (customEndYear <= customStartYear) {
        newErrors.custom = t('endYearAfterStart') as string;
      } else if (customStartYear < 1900 || customEndYear > currentYear) {
        newErrors.custom = (t('validYears') as string) + ' (1900-' + currentYear + ')';
      }
    }
    setErrors(newErrors);
    return Object.keys(newErrors).length === 0;
  };
  const handlePeriodSelect = (periodId: PeriodType) => {
    if (periodId === 'custom') {
      setShowCustomDialog(true);
    }
    setSelectedPeriod(periodId);
    
    // Auto-scroll to timeline length section after a short delay
    if (periodId !== 'custom') {
      setTimeout(() => {
        timelineLengthRef.current?.scrollIntoView({ behavior: 'smooth', block: 'center' });
      }, 100);
    }
  };

  const handleCustomDialogConfirm = () => {
    // Validate custom years before confirming
    if (!customStartYear || !customEndYear) {
      setErrors({ ...errors, custom: t('fillBothYears') as string });
      return;
    }
    if (customEndYear <= customStartYear) {
      setErrors({ ...errors, custom: t('endYearAfterStart') as string });
      return;
    }
    if (customStartYear < 1900 || customEndYear > currentYear) {
      setErrors({ ...errors, custom: (t('validYears') as string) + ' (1900-' + currentYear + ')' });
      return;
    }
    
    // Clear custom errors and close dialog
    setErrors({ ...errors, custom: undefined });
    setShowCustomDialog(false);
    
    // Scroll to timeline length section after closing dialog
    setTimeout(() => {
      timelineLengthRef.current?.scrollIntoView({ behavior: 'smooth', block: 'center' });
    }, 100);
  };

  const handleGenerate = (targetRoute: string) => {
    if (!validateForm()) return;
    const yearRange = calculateYearRange();
    if (!yearRange) return;
    const formData: FormData = {
      type: selectedPeriod === 'birthyear' ? 'birthdate' : 'range',
      birthDate: birthDate,
      yearRange: yearRange,
      optionalData: {
        ...optionalData,
        periodType: selectedPeriod || undefined
      }
    };
    sessionStorage.setItem('timelineFormData', JSON.stringify(formData));
    sessionStorage.setItem('timelineLength', timelineLength);
    navigate(targetRoute);
  };
  const periodOptions = getPeriodOptions(t);
  const isBirthDateComplete = birthDate.day > 0 && birthDate.month > 0 && birthDate.year > 0;
  return <div className="min-h-screen flex flex-col relative">
      {/* Background image - positioned behind everything, changes based on birth year */}
      <div className={`fixed inset-0 -z-20 transition-opacity duration-700 ${is70sEra ? 'opacity-100' : 'opacity-0'}`}>
        <img src={heroBg70s} alt="" className="w-full h-full object-cover opacity-50" />
      </div>
      <div className={`fixed inset-0 -z-20 transition-opacity duration-700 ${is80sEra ? 'opacity-100' : 'opacity-0'}`}>
        <img src={heroBg80s} alt="" className="w-full h-full object-cover opacity-50" />
      </div>
      <div className={`fixed inset-0 -z-20 transition-opacity duration-700 ${is90sEra ? 'opacity-100' : 'opacity-0'}`}>
        <img src={heroBg90s} alt="" className="w-full h-full object-cover opacity-50" />
      </div>
      <div className={`fixed inset-0 -z-20 transition-opacity duration-700 ${is00sEra ? 'opacity-100' : 'opacity-0'}`}>
        <img src={heroBg00s} alt="" className="w-full h-full object-cover opacity-50" />
      </div>
      <div className={`fixed inset-0 -z-20 transition-opacity duration-700 ${is10sEra ? 'opacity-100' : 'opacity-0'}`}>
        <img src={heroBg10s} alt="" className="w-full h-full object-cover opacity-50" />
      </div>
      <div className={`fixed inset-0 -z-20 transition-opacity duration-700 ${!is70sEra && !is80sEra && !is90sEra && !is00sEra && !is10sEra ? 'opacity-100' : 'opacity-0'}`}>
        <img src={heroBg} alt="" className="w-full h-full object-cover opacity-40" />
      </div>
      
      {/* Gradient overlay - separate layer with stronger opacity for better contrast */}
      <div className="fixed inset-0 -z-10 bg-gradient-to-b from-background/70 via-background/85 to-background" />
      
      <Header />
      
      {/* Hero Section with Form */}
      <section className="relative flex-1 pt-20 pb-4 px-4 overflow-hidden flex items-center">
        <div className="container mx-auto max-w-lg relative z-10">
          {/* Header text */}
          <div className="text-center mb-4">
            <h1 className="font-serif text-3xl sm:text-4xl font-bold text-ink mb-2 leading-tight drop-shadow-sm">
              {t('heroTitle') as string}
            </h1>
            <p className="text-sm text-foreground/80 font-medium">
              {t('heroSubtitle') as string}
            </p>
          </div>

          {/* Form card - solid background with strong contrast */}
          <div className="bg-card rounded-xl shadow-elevated border border-border p-4 sm:p-5 space-y-5">
            
            {/* Step 1: Birthdate */}
            <div>
              <DateInput label={t('birthDateQuestion') as string} value={birthDate} onChange={setBirthDate} error={errors.birthDate} />
            </div>

            {/* Step 2: Period selection - only show if birthdate is complete */}
            {isBirthDateComplete && <div className="space-y-3 animate-in fade-in slide-in-from-top-2 duration-300">
                <Label className="text-sm font-medium text-foreground">
                  {t('periodQuestion') as string}
                </Label>
                {errors.period && <p className="text-sm text-destructive">{errors.period}</p>}
                
                <div className="grid grid-cols-1 gap-2">
                  {periodOptions.map(option => (
                    <button 
                      key={option.id} 
                      onClick={() => handlePeriodSelect(option.id)} 
                      className={`flex items-center gap-3 p-3 rounded-lg border-2 text-left transition-all ${selectedPeriod === option.id ? 'border-primary bg-primary/10 text-foreground' : 'border-border bg-secondary/30 text-muted-foreground hover:border-primary/50 hover:bg-secondary/50'}`}
                    >
                      <div className={`p-2 rounded-full ${selectedPeriod === option.id ? 'bg-primary/20 text-primary' : 'bg-muted text-muted-foreground'}`}>
                        {option.icon}
                      </div>
                      <div className="flex-1">
                        <span className="font-medium block">{option.label}</span>
                        <span className="text-xs opacity-70">{option.description}</span>
                      </div>
                    </button>
                  ))}
                </div>
              </div>}

            {/* Timeline length selector */}
            {isBirthDateComplete && selectedPeriod && (
              <div ref={timelineLengthRef} className="space-y-2 animate-in fade-in slide-in-from-top-2 duration-300">
                <Label className="text-sm font-medium text-foreground">
                  {t('timelineLengthQuestion') as string}
                </Label>
                <div className="flex gap-2">
                  <button onClick={() => setTimelineLength('short')} className={`flex-1 flex items-center justify-center gap-2 py-2.5 px-3 rounded-lg border-2 transition-all ${timelineLength === 'short' ? 'border-primary bg-primary/10 text-foreground' : 'border-border bg-secondary/30 text-muted-foreground hover:border-primary/50'}`}>
                    <Zap className="h-4 w-4" />
                    <div className="text-left">
                      <span className="text-sm font-medium block">{t('timelineShort') as string}</span>
                      <span className="text-xs opacity-70">{t('timelineShortDesc') as string}</span>
                    </div>
                  </button>
                  <button onClick={() => setTimelineLength('long')} className={`flex-1 flex items-center justify-center gap-2 py-2.5 px-3 rounded-lg border-2 transition-all ${timelineLength === 'long' ? 'border-primary bg-primary/10 text-foreground' : 'border-border bg-secondary/30 text-muted-foreground hover:border-primary/50'}`}>
                    <Crown className="h-4 w-4" />
                    <div className="text-left">
                      <span className="text-sm font-medium block">{t('timelineLong') as string}</span>
                      <span className="text-xs opacity-70">{t('timelineLongDesc') as string}</span>
                    </div>
                  </button>
                </div>
              </div>
            )}

            {/* Action buttons */}
            <div className="pt-4 border-t border-border space-y-3">
              <Button onClick={() => handleGenerate('/resultaat')} className="w-full btn-vintage h-12 text-base font-semibold text-primary-foreground rounded-lg" disabled={!isBirthDateComplete || !selectedPeriod}>
                <Sparkles className="mr-2 h-4 w-4" />
                <span>{t('createTimelineButton') as string}</span>
                <ArrowRight className="ml-2 h-4 w-4" />
              </Button>
              
              <Button onClick={() => handleGenerate('/polaroid')} variant="outline" className="w-full h-11 text-base font-semibold rounded-lg border-2 border-accent/50 bg-gradient-to-r from-accent/10 to-primary/10 hover:from-accent/20 hover:to-primary/20 text-foreground" disabled={!isBirthDateComplete || !selectedPeriod}>
                <Camera className="mr-2 h-4 w-4 text-accent" />
                <span>{t('createPolaroidButton') as string}</span>
                <ArrowRight className="ml-2 h-4 w-4" />
              </Button>
            </div>
          </div>

          {/* Feature hints below form */}
          
        </div>
      </section>

      {/* Custom Period Dialog with OptionalInfoForm */}
      <Dialog open={showCustomDialog} onOpenChange={(open) => {
        if (!open && (!customStartYear || !customEndYear || customEndYear <= customStartYear)) {
          // If closing without valid years, deselect custom period
          setSelectedPeriod(null);
        }
        setShowCustomDialog(open);
      }}>
        <DialogContent className="max-w-lg max-h-[85vh] overflow-y-auto">
          <DialogHeader>
            <DialogTitle className="flex items-center gap-2">
              <Pencil className="h-5 w-5 text-primary" />
              {t('customDialogTitle') as string}
            </DialogTitle>
            <DialogDescription>
              {t('customDialogDescription') as string}
            </DialogDescription>
          </DialogHeader>
          
          <div className="space-y-6 py-4">
            {/* Custom year range */}
            <div className="space-y-3 p-4 rounded-lg bg-secondary/30 border border-border/50">
              <Label className="text-sm font-medium text-foreground flex items-center gap-2">
                <span className="text-destructive">*</span>
                {t('customPeriodLabel') as string}
              </Label>
              <div className="flex gap-3 items-end">
                <div className="flex-1">
                  <Label className="text-xs text-muted-foreground">{t('customFromYear') as string}</Label>
                  <Input 
                    type="number" 
                    placeholder={t('customFromPlaceholder') as string}
                    value={customStartYear || ''} 
                    onChange={e => setCustomStartYear(parseInt(e.target.value) || 0)} 
                    min={1900} 
                    max={currentYear} 
                    className="bg-card text-center" 
                  />
                </div>
                <ArrowRight className="h-5 w-5 text-muted-foreground mb-2" />
                <div className="flex-1">
                  <Label className="text-xs text-muted-foreground">{t('customToYear') as string}</Label>
                  <Input 
                    type="number" 
                    placeholder={t('customToPlaceholder') as string}
                    value={customEndYear || ''} 
                    onChange={e => setCustomEndYear(parseInt(e.target.value) || 0)} 
                    min={1900} 
                    max={currentYear} 
                    className="bg-card text-center" 
                  />
                </div>
              </div>
              {errors.custom && <p className="text-sm text-destructive">{errors.custom}</p>}
            </div>

            {/* Optional Info Form */}
            <OptionalInfoForm value={optionalData} onChange={setOptionalData} />
          </div>

          <div className="flex justify-between gap-3 pt-4 border-t border-border">
            <Button 
              variant="outline" 
              onClick={() => {
                setSelectedPeriod(null);
                setShowCustomDialog(false);
              }}
            >
              {t('cancelButton') as string}
            </Button>
            <Button onClick={handleCustomDialogConfirm} className="btn-vintage">
              <Check className="mr-2 h-4 w-4" />
              {t('confirmButton') as string}
            </Button>
          </div>
        </DialogContent>
      </Dialog>
    </div>;
};
export default Index;