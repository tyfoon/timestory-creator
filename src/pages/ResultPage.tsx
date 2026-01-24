import { useEffect, useState } from 'react';
import { useNavigate } from 'react-router-dom';
import { Header } from '@/components/Header';
import { Button } from '@/components/ui/button';
import { FormData } from '@/types/form';
import { ArrowLeft, Clock, Loader2 } from 'lucide-react';

const ResultPage = () => {
  const navigate = useNavigate();
  const [formData, setFormData] = useState<FormData | null>(null);
  const [isLoading, setIsLoading] = useState(true);

  useEffect(() => {
    const stored = sessionStorage.getItem('timelineFormData');
    if (stored) {
      setFormData(JSON.parse(stored));
    }
    
    // Simulate loading for demo
    const timer = setTimeout(() => setIsLoading(false), 1500);
    return () => clearTimeout(timer);
  }, []);

  if (!formData) {
    return (
      <div className="min-h-screen bg-gradient-hero flex items-center justify-center">
        <div className="text-center">
          <p className="text-muted-foreground mb-4">Geen gegevens gevonden</p>
          <Button onClick={() => navigate('/')}>Terug naar start</Button>
        </div>
      </div>
    );
  }

  const getTitle = () => {
    if (formData.type === 'birthdate' && formData.birthDate) {
      const { day, month, year } = formData.birthDate;
      return `${day} - ${month} - ${year}`;
    } else if (formData.yearRange) {
      return `${formData.yearRange.startYear} - ${formData.yearRange.endYear}`;
    }
    return 'Jouw Tijdreis';
  };

  return (
    <div className="min-h-screen bg-gradient-hero">
      <Header />
      
      <section className="pt-32 pb-20 px-4">
        <div className="container mx-auto max-w-4xl">
          {/* Back button */}
          <button
            onClick={() => navigate('/invoer?type=' + formData.type)}
            className="flex items-center gap-2 text-muted-foreground hover:text-foreground transition-colors mb-8 fade-in"
          >
            <ArrowLeft className="h-4 w-4" />
            <span>Terug naar invoer</span>
          </button>

          {isLoading ? (
            <div className="flex flex-col items-center justify-center py-20 fade-in">
              <div className="w-20 h-20 rounded-full bg-gradient-gold flex items-center justify-center mb-6 animate-pulse">
                <Clock className="h-10 w-10 text-primary-foreground" />
              </div>
              <h2 className="font-serif text-2xl font-semibold text-foreground mb-2">
                We reizen terug in de tijd...
              </h2>
              <p className="text-muted-foreground mb-4">
                Even geduld terwijl we jouw verhaal samenstellen
              </p>
              <Loader2 className="h-6 w-6 animate-spin text-accent" />
            </div>
          ) : (
            <div className="fade-in">
              {/* Results header */}
              <div className="text-center mb-12">
                <div className="inline-flex items-center gap-2 px-4 py-2 rounded-full bg-secondary/80 border border-border mb-6">
                  <Clock className="h-4 w-4 text-accent" />
                  <span className="text-sm text-muted-foreground font-medium">
                    {formData.type === 'birthdate' ? 'Geboortedatum Overzicht' : 'Tijdperiode Overzicht'}
                  </span>
                </div>
                
                <h1 className="font-serif text-4xl sm:text-5xl font-bold text-foreground mb-4">
                  {getTitle()}
                </h1>
                
                {formData.optionalData.city && (
                  <p className="text-lg text-muted-foreground">
                    📍 {formData.optionalData.city}
                    {formData.optionalData.focus === 'netherlands' && ' • Focus: Nederland'}
                    {formData.optionalData.focus === 'europe' && ' • Focus: Europa'}
                    {formData.optionalData.focus === 'world' && ' • Focus: Wereld'}
                  </p>
                )}
              </div>

              {/* Placeholder for actual timeline content */}
              <div className="bg-card rounded-xl shadow-card border border-border/50 p-8 text-center">
                <div className="max-w-md mx-auto">
                  <div className="w-16 h-16 rounded-full bg-secondary flex items-center justify-center mx-auto mb-6">
                    <Clock className="h-8 w-8 text-muted-foreground" />
                  </div>
                  
                  <h3 className="font-serif text-xl font-semibold text-foreground mb-3">
                    Backend Integratie Nodig
                  </h3>
                  
                  <p className="text-muted-foreground mb-6">
                    Om historische gebeurtenissen, foto's en video's op te halen hebben we een backend nodig 
                    die het web kan doorzoeken. Wil je dat ik Lovable Cloud activeer om dit mogelijk te maken?
                  </p>

                  <div className="p-4 rounded-lg bg-secondary/50 text-left text-sm text-muted-foreground">
                    <strong className="text-foreground">Ingevoerde gegevens:</strong>
                    <pre className="mt-2 overflow-auto">
                      {JSON.stringify(formData, null, 2)}
                    </pre>
                  </div>
                </div>
              </div>
            </div>
          )}
        </div>
      </section>
    </div>
  );
};

export default ResultPage;
