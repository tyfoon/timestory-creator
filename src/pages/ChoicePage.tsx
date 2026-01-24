import { useState } from 'react';
import { useNavigate } from 'react-router-dom';
import { useLanguage } from '@/contexts/LanguageContext';
import { Header } from '@/components/Header';
import { ChoiceCard } from '@/components/ChoiceCard';
import { Button } from '@/components/ui/button';
import { TimelineType } from '@/types/form';
import { Calendar, Clock, ArrowRight } from 'lucide-react';

const ChoicePage = () => {
  const { t } = useLanguage();
  const navigate = useNavigate();
  const [selectedType, setSelectedType] = useState<TimelineType | null>(null);

  const handleContinue = () => {
    if (selectedType) {
      navigate(`/invoer?type=${selectedType}`);
    }
  };

  return (
    <div className="min-h-screen bg-gradient-hero">
      <Header />
      
      <section className="pt-32 pb-20 px-4">
        <div className="container mx-auto max-w-3xl">
          {/* Page header */}
          <div className="text-center mb-12 fade-in">
            <h1 className="font-serif text-4xl sm:text-5xl font-bold text-foreground mb-4">
              {t('choiceTitle') as string}
            </h1>
            <p className="text-lg text-muted-foreground">
              {t('choiceSubtitle') as string}
            </p>
          </div>

          {/* Choice cards */}
          <div className="grid gap-6 sm:grid-cols-2 mb-10">
            <div className="fade-in" style={{ animationDelay: '0.1s' }}>
              <ChoiceCard
                icon={Calendar}
                title={t('option1Title') as string}
                description={t('option1Description') as string}
                selected={selectedType === 'birthdate'}
                onClick={() => setSelectedType('birthdate')}
              />
            </div>
            <div className="fade-in" style={{ animationDelay: '0.2s' }}>
              <ChoiceCard
                icon={Clock}
                title={t('option2Title') as string}
                description={t('option2Description') as string}
                selected={selectedType === 'range'}
                onClick={() => setSelectedType('range')}
              />
            </div>
          </div>

          {/* Continue button */}
          <div className="flex justify-center fade-in" style={{ animationDelay: '0.3s' }}>
            <Button
              onClick={handleContinue}
              disabled={!selectedType}
              className="btn-vintage h-12 px-8 text-lg font-semibold text-primary-foreground rounded-lg disabled:opacity-40 disabled:cursor-not-allowed"
            >
              <span>{t('nextButton') as string}</span>
              <ArrowRight className="ml-2 h-5 w-5" />
            </Button>
          </div>
        </div>
      </section>
    </div>
  );
};

export default ChoicePage;
