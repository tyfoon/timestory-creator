import { useState } from 'react';
import { useNavigate } from 'react-router-dom';
import { useLanguage } from '@/contexts/LanguageContext';
import { Header } from '@/components/Header';
import { DateInput } from '@/components/DateInput';
import { YearRangeInput } from '@/components/YearRangeInput';
import { OptionalInfoForm } from '@/components/OptionalInfoForm';
import { Button } from '@/components/ui/button';
import { TimelineType, FormData, BirthDateData, YearRangeData, OptionalData } from '@/types/form';
import { Calendar, Clock, ArrowRight, ChevronDown, ChevronUp, Sparkles } from 'lucide-react';
import { Collapsible, CollapsibleContent, CollapsibleTrigger } from '@/components/ui/collapsible';
import heroBg from '@/assets/hero-bg.jpg';

const Index = () => {
  const { t } = useLanguage();
  const navigate = useNavigate();
  
  const [type, setType] = useState<TimelineType>('birthdate');
  const [birthDate, setBirthDate] = useState<BirthDateData>({ day: 0, month: 0, year: 0 });
  const [yearRange, setYearRange] = useState<YearRangeData>({ startYear: 0, endYear: 0 });
  const [optionalData, setOptionalData] = useState<OptionalData>({
    children: [],
    focus: 'netherlands',
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
      optionalData,
    };

    sessionStorage.setItem('timelineFormData', JSON.stringify(formData));
    navigate('/resultaat');
  };

  return (
    <div className="min-h-screen bg-gradient-hero">
      <Header />
      
      {/* Hero Section with Form */}
      <section className="relative pt-28 pb-16 px-4 overflow-hidden">
        {/* Background image with overlay */}
        <div className="absolute inset-0 -z-10">
          <img 
            src={heroBg} 
            alt="" 
            className="w-full h-full object-cover opacity-15"
          />
          <div className="absolute inset-0 bg-gradient-to-b from-background/80 via-background/60 to-background" />
        </div>
        
        {/* Decorative elements */}
        <div className="absolute bottom-20 right-10 w-96 h-96 bg-vintage-gold/5 rounded-full blur-3xl" />
        
        <div className="container mx-auto max-w-xl relative z-10">
          {/* Header text */}
          <div className="text-center mb-8 stagger-children">
            <div className="inline-flex items-center gap-2 px-4 py-2 rounded-full bg-secondary/80 border border-border mb-6">
              <Sparkles className="h-4 w-4 text-accent" />
              <span className="text-sm text-muted-foreground font-medium">
                Ontdek jouw geschiedenis
              </span>
            </div>

            <h1 className="font-serif text-4xl sm:text-5xl font-bold text-foreground mb-4 leading-tight">
              {t('heroTitle') as string}
            </h1>
            
            <p className="text-lg text-muted-foreground max-w-lg mx-auto">
              {t('heroSubtitle') as string}
            </p>
          </div>

          {/* Form card */}
          <div className="bg-card rounded-xl shadow-card border border-border/50 p-6 sm:p-8 fade-in" style={{ animationDelay: '0.2s' }}>
            {/* Type toggle */}
            <div className="flex gap-2 p-1 bg-secondary/50 rounded-lg mb-6">
              <button
                onClick={() => setType('birthdate')}
                className={`flex-1 flex items-center justify-center gap-2 py-3 px-4 rounded-md text-sm font-medium transition-all ${
                  type === 'birthdate'
                    ? 'bg-card shadow-sm text-foreground'
                    : 'text-muted-foreground hover:text-foreground'
                }`}
              >
                <Calendar className="h-4 w-4" />
                <span>Geboortedatum</span>
              </button>
              <button
                onClick={() => setType('range')}
                className={`flex-1 flex items-center justify-center gap-2 py-3 px-4 rounded-md text-sm font-medium transition-all ${
                  type === 'range'
                    ? 'bg-card shadow-sm text-foreground'
                    : 'text-muted-foreground hover:text-foreground'
                }`}
              >
                <Clock className="h-4 w-4" />
                <span>Tijdperiode</span>
              </button>
            </div>

            {/* Main input section */}
            <div className="mb-6">
              {type === 'birthdate' ? (
                <DateInput
                  label={t('birthDateLabel') as string}
                  value={birthDate}
                  onChange={setBirthDate}
                  error={errors.main}
                />
              ) : (
                <YearRangeInput
                  value={yearRange}
                  onChange={setYearRange}
                  error={errors.main}
                />
              )}
            </div>

            {/* Divider */}
            <div className="divider-ornament">
              <Sparkles className="h-4 w-4 text-accent" />
            </div>

            {/* Optional info collapsible */}
            <Collapsible open={showOptional} onOpenChange={setShowOptional}>
              <CollapsibleTrigger className="w-full flex items-center justify-between py-4 text-left group">
                <div>
                  <h3 className="font-serif text-lg font-semibold text-foreground">
                    {t('optionalInfoTitle') as string}
                  </h3>
                  <p className="text-sm text-muted-foreground mt-1">
                    {t('optionalInfoSubtitle') as string}
                  </p>
                </div>
                <div className="w-8 h-8 rounded-full bg-secondary flex items-center justify-center group-hover:bg-accent/20 transition-colors">
                  {showOptional ? (
                    <ChevronUp className="h-4 w-4 text-muted-foreground" />
                  ) : (
                    <ChevronDown className="h-4 w-4 text-muted-foreground" />
                  )}
                </div>
              </CollapsibleTrigger>
              
              <CollapsibleContent className="pt-4">
                <OptionalInfoForm value={optionalData} onChange={setOptionalData} />
              </CollapsibleContent>
            </Collapsible>

            {/* Generate button */}
            <div className="mt-6 pt-6 border-t border-border">
              <Button
                onClick={handleGenerate}
                className="w-full btn-vintage h-14 text-lg font-semibold text-primary-foreground rounded-lg"
              >
                <Sparkles className="mr-2 h-5 w-5" />
                <span>{t('generateButton') as string}</span>
                <ArrowRight className="ml-2 h-5 w-5" />
              </Button>
            </div>
          </div>

          {/* Feature hints below form */}
          <div className="grid grid-cols-3 gap-4 mt-8 text-center">
            {[
              { icon: '🎂', text: 'Jouw speciale dag' },
              { icon: '🌍', text: 'Wereldgebeurtenissen' },
              { icon: '⭐', text: 'Beroemde jarigen' },
            ].map((hint, idx) => (
              <div key={idx} className="text-sm text-muted-foreground">
                <span className="text-xl mb-1 block">{hint.icon}</span>
                {hint.text}
              </div>
            ))}
          </div>
        </div>
      </section>
    </div>
  );
};

export default Index;
