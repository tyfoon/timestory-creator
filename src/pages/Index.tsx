import { useState } from 'react';
import { useNavigate } from 'react-router-dom';
import { useLanguage } from '@/contexts/LanguageContext';
import { Header } from '@/components/Header';
import { DateInput } from '@/components/DateInput';
import { YearRangeInput } from '@/components/YearRangeInput';
import { OptionalInfoForm } from '@/components/OptionalInfoForm';
import { Button } from '@/components/ui/button';
import { TimelineType, FormData, BirthDateData, YearRangeData, OptionalData } from '@/types/form';
import { Calendar, Clock, ArrowRight, ChevronDown, ChevronUp, Sparkles, Zap, Crown } from 'lucide-react';
import { Collapsible, CollapsibleContent, CollapsibleTrigger } from '@/components/ui/collapsible';
import heroBg from '@/assets/hero-bg.jpg';

export type TimelineLength = 'short' | 'long';

const Index = () => {
  const { t } = useLanguage();
  const navigate = useNavigate();
  const [type, setType] = useState<TimelineType>('birthdate');
  const [timelineLength, setTimelineLength] = useState<TimelineLength>('short');
  const [birthDate, setBirthDate] = useState<BirthDateData>({
    day: 0,
    month: 0,
    year: 0
  });
  const [yearRange, setYearRange] = useState<YearRangeData>({
    startYear: 0,
    endYear: 0
  });
  const [optionalData, setOptionalData] = useState<OptionalData>({
    children: [],
    focus: 'netherlands'
  });
  const [showOptional, setShowOptional] = useState(false);
  const [errors, setErrors] = useState<{ main?: string }>({});

  const validateForm = (): boolean => {
    const currentYear = new Date().getFullYear();
    if (type === 'birthdate') {
      if (!birthDate.day || !birthDate.month || !birthDate.year) {
        setErrors({ main: t('required') as string });
        return false;
      }
      if (birthDate.year < 1900 || birthDate.year > currentYear) {
        setErrors({ main: t('yearRange') as string });
        return false;
      }
    } else {
      if (!yearRange.startYear || !yearRange.endYear) {
        setErrors({ main: t('required') as string });
        return false;
      }
      if (yearRange.startYear < 1900 || yearRange.endYear > currentYear) {
        setErrors({ main: t('yearRange') as string });
        return false;
      }
      if (yearRange.endYear <= yearRange.startYear) {
        setErrors({ main: t('endYearAfterStart') as string });
        return false;
      }
    }
    setErrors({});
    return true;
  };

  const handleGenerate = () => {
    if (!validateForm()) return;
    const formData: FormData = {
      type,
      birthDate: type === 'birthdate' ? birthDate : undefined,
      yearRange: type === 'range' ? yearRange : undefined,
      optionalData
    };
    sessionStorage.setItem('timelineFormData', JSON.stringify(formData));
    sessionStorage.setItem('timelineLength', timelineLength);
    navigate('/resultaat');
  };

  return (
    <div className="min-h-screen bg-gradient-hero flex flex-col">
      <Header />
      
      {/* Hero Section with Form - compact */}
      <section className="relative flex-1 pt-20 pb-4 px-4 overflow-hidden flex items-center">
        {/* Background image with overlay */}
        <div className="absolute inset-0 -z-10">
          <img src={heroBg} alt="" className="w-full h-full object-cover opacity-15" />
          <div className="absolute inset-0 bg-gradient-to-b from-background/80 via-background/60 to-background" />
        </div>
        
        <div className="container mx-auto max-w-lg relative z-10">
          {/* Header text - compact */}
          <div className="text-center mb-4">
            <h1 className="font-serif text-3xl sm:text-4xl font-bold text-foreground mb-2 leading-tight">
              {t('heroTitle') as string}
            </h1>
            <p className="text-sm text-muted-foreground">
              {t('heroSubtitle') as string}
            </p>
          </div>

          {/* Form card - compact */}
          <div className="bg-card rounded-xl shadow-card border border-border/50 p-4 sm:p-5">
            {/* Type toggle */}
            <div className="flex gap-1 p-1 bg-secondary/50 rounded-lg mb-4">
              <button 
                onClick={() => setType('birthdate')} 
                className={`flex-1 flex items-center justify-center gap-1.5 py-2 px-3 rounded-md text-sm font-medium transition-all ${type === 'birthdate' ? 'bg-card shadow-sm text-foreground' : 'text-muted-foreground hover:text-foreground'}`}
              >
                <Calendar className="h-4 w-4" />
                <span>Geboortedatum</span>
              </button>
              <button 
                onClick={() => setType('range')} 
                className={`flex-1 flex items-center justify-center gap-1.5 py-2 px-3 rounded-md text-sm font-medium transition-all ${type === 'range' ? 'bg-card shadow-sm text-foreground' : 'text-muted-foreground hover:text-foreground'}`}
              >
                <Clock className="h-4 w-4" />
                <span>Tijdperiode</span>
              </button>
            </div>

            {/* Main input section */}
            <div className="mb-4">
              {type === 'birthdate' 
                ? <DateInput label={t('birthDateLabel') as string} value={birthDate} onChange={setBirthDate} error={errors.main} /> 
                : <YearRangeInput value={yearRange} onChange={setYearRange} error={errors.main} />
              }
            </div>

            {/* Timeline length selector */}
            <div className="mb-4">
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
                    <span className="text-xs opacity-70">20 items • gratis</span>
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
                    <span className="text-xs opacity-70">50+ items</span>
                  </div>
                </button>
              </div>
            </div>

            {/* Optional info collapsible - more compact */}
            <Collapsible open={showOptional} onOpenChange={setShowOptional}>
              <CollapsibleTrigger className="w-full flex items-center justify-between py-2 text-left group">
                <div>
                  <h3 className="font-serif text-base font-semibold text-foreground">
                    {t('optionalInfoTitle') as string}
                  </h3>
                  <p className="text-xs text-muted-foreground">
                    {t('optionalInfoSubtitle') as string}
                  </p>
                </div>
                <div className="w-7 h-7 rounded-full bg-secondary flex items-center justify-center group-hover:bg-accent/20 transition-colors">
                  {showOptional ? <ChevronUp className="h-4 w-4 text-muted-foreground" /> : <ChevronDown className="h-4 w-4 text-muted-foreground" />}
                </div>
              </CollapsibleTrigger>
              
              <CollapsibleContent className="pt-3">
                <OptionalInfoForm value={optionalData} onChange={setOptionalData} />
              </CollapsibleContent>
            </Collapsible>

            {/* Generate button */}
            <div className="mt-4 pt-4 border-t border-border">
              <Button onClick={handleGenerate} className="w-full btn-vintage h-12 text-base font-semibold text-primary-foreground rounded-lg">
                <Sparkles className="mr-2 h-4 w-4" />
                <span>{t('generateButton') as string}</span>
                <ArrowRight className="ml-2 h-4 w-4" />
              </Button>
            </div>
          </div>

          {/* Feature hints below form - inline */}
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