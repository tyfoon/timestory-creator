import { useState } from 'react';
import { useNavigate } from 'react-router-dom';
import { useLanguage } from '@/contexts/LanguageContext';
import { Header } from '@/components/Header';
import { DateInput } from '@/components/DateInput';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { FormData, BirthDateData, OptionalData, PeriodType } from '@/types/form';
import { ArrowRight, Sparkles, Camera, Baby, GraduationCap, Heart, Calendar, Pencil, Zap, Crown } from 'lucide-react';
import heroBg from '@/assets/hero-bg-new.png';
import heroBg80s from '@/assets/hero-bg-80s.png';

const periodOptions: { id: PeriodType; label: string; description: string; icon: React.ReactNode; ageRange?: [number, number] }[] = [
  { id: 'birthyear', label: 'Geboortejaar', description: 'Het jaar waarin je geboren bent', icon: <Baby className="h-5 w-5" /> },
  { id: 'childhood', label: 'Jeugd', description: '6-10 jaar', icon: <GraduationCap className="h-5 w-5" />, ageRange: [6, 10] },
  { id: 'puberty', label: 'Pubertijd', description: '11-17 jaar', icon: <Heart className="h-5 w-5" />, ageRange: [11, 17] },
  { id: 'young-adult', label: 'Jong volwassen', description: '18-25 jaar', icon: <Calendar className="h-5 w-5" />, ageRange: [18, 25] },
  { id: 'custom', label: 'Anders', description: 'Kies zelf een periode', icon: <Pencil className="h-5 w-5" /> },
];

const Index = () => {
  const { t } = useLanguage();
  const navigate = useNavigate();
  const [birthDate, setBirthDate] = useState<BirthDateData>({
    day: 0,
    month: 0,
    year: 0
  });
  const [selectedPeriod, setSelectedPeriod] = useState<PeriodType | null>(null);
  const [customStartYear, setCustomStartYear] = useState<number>(0);
  const [customEndYear, setCustomEndYear] = useState<number>(0);
  const [timelineLength, setTimelineLength] = useState<'short' | 'long'>('short');
  const [errors, setErrors] = useState<{ birthDate?: string; period?: string; custom?: string }>({});

  const currentYear = new Date().getFullYear();
  
  // Determine which background to use based on birth year (80s theme for 1979-1989)
  const is80sEra = birthDate.year >= 1979 && birthDate.year <= 1989;
  const backgroundImage = is80sEra ? heroBg80s : heroBg;

  const calculateYearRange = (): { startYear: number; endYear: number } | null => {
    if (!birthDate.year) return null;
    
    if (selectedPeriod === 'birthyear') {
      return { startYear: birthDate.year, endYear: birthDate.year };
    }
    
    if (selectedPeriod === 'custom') {
      return { startYear: customStartYear, endYear: customEndYear };
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
      newErrors.birthDate = 'Vul je geboortedatum in';
    } else if (birthDate.year < 1900 || birthDate.year > currentYear) {
      newErrors.birthDate = 'Voer een geldig geboortejaar in (1900-' + currentYear + ')';
    }
    
    if (!selectedPeriod) {
      newErrors.period = 'Kies een periode';
    }
    
    if (selectedPeriod === 'custom') {
      if (!customStartYear || !customEndYear) {
        newErrors.custom = 'Vul beide jaren in';
      } else if (customEndYear <= customStartYear) {
        newErrors.custom = 'Eindjaar moet na startjaar liggen';
      } else if (customStartYear < 1900 || customEndYear > currentYear) {
        newErrors.custom = 'Voer geldige jaren in (1900-' + currentYear + ')';
      }
    }
    
    setErrors(newErrors);
    return Object.keys(newErrors).length === 0;
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
        children: [], 
        focus: 'world',
        periodType: selectedPeriod || undefined
      } as OptionalData
    };
    
    sessionStorage.setItem('timelineFormData', JSON.stringify(formData));
    sessionStorage.setItem('timelineLength', timelineLength);
    navigate(targetRoute);
  };

  const isBirthDateComplete = birthDate.day > 0 && birthDate.month > 0 && birthDate.year > 0;

  return (
    <div className="min-h-screen flex flex-col relative">
      {/* Background image - positioned behind everything */}
      <div className="fixed inset-0 -z-20">
        <img src={heroBg} alt="" className="w-full h-full object-cover opacity-40" />
      </div>
      
      {/* Gradient overlay - separate layer */}
      <div className="fixed inset-0 -z-10 bg-gradient-to-b from-background/40 via-background/60 to-background" />
      
      <Header />
      
      {/* Hero Section with Form */}
      <section className="relative flex-1 pt-20 pb-4 px-4 overflow-hidden flex items-center">
        <div className="container mx-auto max-w-lg relative z-10">
          {/* Header text */}
          <div className="text-center mb-4">
            <h1 className="font-serif text-3xl sm:text-4xl font-bold text-foreground mb-2 leading-tight">
              {t('heroTitle') as string}
            </h1>
            <p className="text-sm text-muted-foreground">
              {t('heroSubtitle') as string}
            </p>
          </div>

          {/* Form card - solid background */}
          <div className="bg-card/95 backdrop-blur-sm rounded-xl shadow-card border border-border/50 p-4 sm:p-5 space-y-5">
            
            {/* Step 1: Birthdate */}
            <div>
              <DateInput 
                label="Wat is je geboortedatum?" 
                value={birthDate} 
                onChange={setBirthDate} 
                error={errors.birthDate} 
              />
            </div>

            {/* Step 2: Period selection - only show if birthdate is complete */}
            {isBirthDateComplete && (
              <div className="space-y-3 animate-in fade-in slide-in-from-top-2 duration-300">
                <Label className="text-sm font-medium text-foreground">
                  Welke periode wil je herbeleven?
                </Label>
                {errors.period && <p className="text-sm text-destructive">{errors.period}</p>}
                
                <div className="grid grid-cols-1 gap-2">
                  {periodOptions.map((option) => (
                    <button
                      key={option.id}
                      onClick={() => setSelectedPeriod(option.id)}
                      className={`flex items-center gap-3 p-3 rounded-lg border-2 text-left transition-all ${
                        selectedPeriod === option.id
                          ? 'border-primary bg-primary/10 text-foreground'
                          : 'border-border bg-secondary/30 text-muted-foreground hover:border-primary/50 hover:bg-secondary/50'
                      }`}
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

                {/* Custom period inputs */}
                {selectedPeriod === 'custom' && (
                  <div className="pl-4 border-l-2 border-primary/30 space-y-3 animate-in fade-in slide-in-from-top-2 duration-200">
                    <div className="flex gap-3 items-end">
                      <div className="flex-1">
                        <Label className="text-xs text-muted-foreground">Van jaar</Label>
                        <Input
                          type="number"
                          placeholder="bijv. 1985"
                          value={customStartYear || ''}
                          onChange={(e) => setCustomStartYear(parseInt(e.target.value) || 0)}
                          min={1900}
                          max={currentYear}
                          className="bg-card text-center"
                        />
                      </div>
                      <ArrowRight className="h-5 w-5 text-muted-foreground mb-2" />
                      <div className="flex-1">
                        <Label className="text-xs text-muted-foreground">Tot jaar</Label>
                        <Input
                          type="number"
                          placeholder="bijv. 1995"
                          value={customEndYear || ''}
                          onChange={(e) => setCustomEndYear(parseInt(e.target.value) || 0)}
                          min={1900}
                          max={currentYear}
                          className="bg-card text-center"
                        />
                      </div>
                    </div>
                    {errors.custom && <p className="text-sm text-destructive">{errors.custom}</p>}
                  </div>
                )}
              </div>
            )}

            {/* Timeline length selector */}
            {isBirthDateComplete && selectedPeriod && (
              <div className="space-y-2 animate-in fade-in slide-in-from-top-2 duration-300">
                <Label className="text-sm font-medium text-foreground">
                  Hoeveel momenten wil je zien?
                </Label>
                <div className="flex gap-2">
                  <button
                    onClick={() => setTimelineLength('short')}
                    className={`flex-1 flex items-center justify-center gap-2 py-2.5 px-3 rounded-lg border-2 transition-all ${
                      timelineLength === 'short' 
                        ? 'border-primary bg-primary/10 text-foreground' 
                        : 'border-border bg-secondary/30 text-muted-foreground hover:border-primary/50'
                    }`}
                  >
                    <Zap className="h-4 w-4" />
                    <div className="text-left">
                      <span className="text-sm font-medium block">Kort</span>
                      <span className="text-xs opacity-70">20 momenten</span>
                    </div>
                  </button>
                  <button
                    onClick={() => setTimelineLength('long')}
                    className={`flex-1 flex items-center justify-center gap-2 py-2.5 px-3 rounded-lg border-2 transition-all ${
                      timelineLength === 'long' 
                        ? 'border-primary bg-primary/10 text-foreground' 
                        : 'border-border bg-secondary/30 text-muted-foreground hover:border-primary/50'
                    }`}
                  >
                    <Crown className="h-4 w-4" />
                    <div className="text-left">
                      <span className="text-sm font-medium block">Uitgebreid</span>
                      <span className="text-xs opacity-70">50 momenten</span>
                    </div>
                  </button>
                </div>
              </div>
            )}

            {/* Action buttons */}
            <div className="pt-4 border-t border-border space-y-3">
              <Button 
                onClick={() => handleGenerate('/resultaat')} 
                className="w-full btn-vintage h-12 text-base font-semibold text-primary-foreground rounded-lg"
                disabled={!isBirthDateComplete || !selectedPeriod}
              >
                <Sparkles className="mr-2 h-4 w-4" />
                <span>Maak tijdreis overzicht</span>
                <ArrowRight className="ml-2 h-4 w-4" />
              </Button>
              
              <Button 
                onClick={() => handleGenerate('/polaroid')} 
                variant="outline"
                className="w-full h-11 text-base font-semibold rounded-lg border-2 border-accent/50 bg-gradient-to-r from-accent/10 to-primary/10 hover:from-accent/20 hover:to-primary/20 text-foreground"
                disabled={!isBirthDateComplete || !selectedPeriod}
              >
                <Camera className="mr-2 h-4 w-4 text-accent" />
                <span>Maak tijdreis polaroid</span>
                <ArrowRight className="ml-2 h-4 w-4" />
              </Button>
            </div>
          </div>

          {/* Feature hints below form */}
          <div className="flex justify-center gap-6 mt-4 text-center">
            {[
              { icon: '🎂', text: 'Jouw dag' },
              { icon: '🌍', text: 'Wereldnieuws' },
              { icon: '⭐', text: 'Beroemdheden' }
            ].map((hint, idx) => (
              <div key={idx} className="text-xs text-muted-foreground flex items-center gap-1">
                <span>{hint.icon}</span>
                <span>{hint.text}</span>
              </div>
            ))}
          </div>
        </div>
      </section>
    </div>
  );
};

export default Index;