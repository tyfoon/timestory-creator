import { useState } from 'react';
import { useNavigate } from 'react-router-dom';
import { useLanguage } from '@/contexts/LanguageContext';
import { Header } from '@/components/Header';
import { Button } from '@/components/ui/button';
import { Calendar, Clock, History, Sparkles, ArrowRight } from 'lucide-react';
import heroBg from '@/assets/hero-bg.jpg';

const Index = () => {
  const { t } = useLanguage();
  const navigate = useNavigate();
  const [isHovering, setIsHovering] = useState(false);

  return (
    <div className="min-h-screen bg-gradient-hero">
      <Header />
      
      {/* Hero Section */}
      <section className="relative pt-32 pb-20 px-4 overflow-hidden">
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
        
        <div className="container mx-auto max-w-4xl relative z-10">
          <div className="text-center stagger-children">
            {/* Decorative badge */}
            <div className="inline-flex items-center gap-2 px-4 py-2 rounded-full bg-secondary/80 border border-border mb-8">
              <Sparkles className="h-4 w-4 text-accent" />
              <span className="text-sm text-muted-foreground font-medium">
                Ontdek jouw geschiedenis
              </span>
            </div>

            {/* Main heading */}
            <h1 className="font-serif text-5xl sm:text-6xl lg:text-7xl font-bold text-foreground mb-6 leading-tight">
              {t('heroTitle') as string}
            </h1>
            
            {/* Subtitle */}
            <p className="text-xl sm:text-2xl text-muted-foreground max-w-2xl mx-auto mb-12 leading-relaxed">
              {t('heroSubtitle') as string}
            </p>

            {/* CTA Button */}
            <Button
              onClick={() => navigate('/keuze')}
              onMouseEnter={() => setIsHovering(true)}
              onMouseLeave={() => setIsHovering(false)}
              className="btn-vintage h-14 px-8 text-lg font-semibold text-primary-foreground rounded-lg"
            >
              <span>{t('startButton') as string}</span>
              <ArrowRight className={`ml-2 h-5 w-5 transition-transform duration-300 ${isHovering ? 'translate-x-1' : ''}`} />
            </Button>
          </div>

          {/* Feature cards */}
          <div className="grid sm:grid-cols-3 gap-6 mt-20">
            {[
              { icon: Calendar, title: 'Geboortedatum', desc: 'Ontdek wat er gebeurde op jouw speciale dag' },
              { icon: History, title: 'Tijdperiode', desc: 'Reis door meerdere jaren vol herinneringen' },
              { icon: Clock, title: 'Persoonlijk', desc: 'Afgestemd op jouw interesses en locatie' },
            ].map((feature, index) => (
              <div
                key={index}
                className="group p-6 rounded-xl bg-card/80 backdrop-blur-sm border border-border/50 shadow-soft hover:shadow-card transition-all duration-300 hover:-translate-y-1"
                style={{ animationDelay: `${0.4 + index * 0.1}s` }}
              >
                <div className="w-12 h-12 rounded-lg bg-secondary flex items-center justify-center mb-4 group-hover:bg-gradient-gold transition-colors duration-300">
                  <feature.icon className="h-6 w-6 text-muted-foreground group-hover:text-primary-foreground transition-colors duration-300" />
                </div>
                <h3 className="font-serif text-lg font-semibold text-foreground mb-2">
                  {feature.title}
                </h3>
                <p className="text-sm text-muted-foreground">
                  {feature.desc}
                </p>
              </div>
            ))}
          </div>
        </div>
      </section>

      {/* Visual decoration at bottom */}
      <div className="absolute bottom-0 left-0 right-0 h-px bg-gradient-to-r from-transparent via-border to-transparent" />
    </div>
  );
};

export default Index;
