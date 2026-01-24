import { useState, useEffect } from 'react';
import { useNavigate, useSearchParams } from 'react-router-dom';
import { useLanguage } from '@/contexts/LanguageContext';
import { Header } from '@/components/Header';
import { DateInput } from '@/components/DateInput';
import { YearRangeInput } from '@/components/YearRangeInput';
import { OptionalInfoForm } from '@/components/OptionalInfoForm';
import { Button } from '@/components/ui/button';
import { TimelineType, FormData, BirthDateData, YearRangeData, OptionalData } from '@/types/form';
import { ArrowLeft, ArrowRight, ChevronDown, ChevronUp, Sparkles } from 'lucide-react';
import { Collapsible, CollapsibleContent, CollapsibleTrigger } from '@/components/ui/collapsible';

const InputPage = () => {
  const { t } = useLanguage();
  const navigate = useNavigate();
  const [searchParams] = useSearchParams();
  const type = (searchParams.get('type') as TimelineType) || 'birthdate';

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

    // Store in sessionStorage for the results page
    sessionStorage.setItem('timelineFormData', JSON.stringify(formData));
    navigate('/resultaat');
  };

  return (
    <div className="min-h-screen bg-gradient-hero">
      <Header />
      
      <section className="pt-32 pb-20 px-4">
        <div className="container mx-auto max-w-xl">
          {/* Back button */}
          <button
            onClick={() => navigate('/keuze')}
            className="flex items-center gap-2 text-muted-foreground hover:text-foreground transition-colors mb-8 fade-in"
          >
            <ArrowLeft className="h-4 w-4" />
            <span>{t('backButton') as string}</span>
          </button>

          {/* Form card */}
          <div className="bg-card rounded-xl shadow-card border border-border/50 p-8 fade-in" style={{ animationDelay: '0.1s' }}>
            {/* Main input section */}
            <div className="mb-8">
              <h2 className="font-serif text-2xl font-semibold text-foreground mb-6">
                {type === 'birthdate' ? t('birthDateLabel') as string : 'Tijdsperiode'}
              </h2>

              {type === 'birthdate' ? (
                <DateInput
                  label=""
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
            <div className="mt-8 pt-6 border-t border-border">
              <Button
                onClick={handleGenerate}
                className="w-full btn-vintage h-14 text-lg font-semibold text-primary-foreground rounded-lg"
              >
                <Sparkles className="mr-2 h-5 w-5" />
                <span>{t('generateButton') as string}</span>
              </Button>
            </div>
          </div>
        </div>
      </section>
    </div>
  );
};

export default InputPage;
