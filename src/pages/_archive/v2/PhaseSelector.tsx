import { motion } from 'framer-motion';
import { PeriodType } from '@/types/form';
import { EraTheme } from '@/lib/eraThemes';
import { Baby, Bike, Headphones, Car } from 'lucide-react';
import { useLanguage } from '@/contexts/LanguageContext';

interface PhaseSelectorProps {
  birthYear: number;
  selected: PeriodType | null;
  onSelect: (phase: PeriodType) => void;
  eraTheme: EraTheme;
}

interface PhaseOption {
  id: PeriodType;
  title: string;
  subtitle: string;
  ageRange: [number, number] | null;
  icon: React.ReactNode;
  description: string;
}

export const PhaseSelector = ({ birthYear, selected, onSelect, eraTheme }: PhaseSelectorProps) => {
  const { t } = useLanguage();
  const currentYear = new Date().getFullYear();
  
  const formatYears = (start: number, end: number) => {
    const endCapped = Math.min(end, currentYear);
    return `${start} - ${endCapped}`;
  };

  const phases: PhaseOption[] = [
    {
      id: 'birthyear',
      title: t('periodBirthyear') as string,
      subtitle: String(birthYear),
      ageRange: null,
      icon: <Baby className="w-8 h-8" />,
      description: t('phaseBirthyearDesc') as string,
    },
    {
      id: 'childhood',
      title: t('phaseChildhoodTitle') as string,
      subtitle: formatYears(birthYear + 6, birthYear + 12),
      ageRange: [6, 12],
      icon: <Bike className="w-8 h-8" />,
      description: t('phaseChildhoodDesc') as string,
    },
    {
      id: 'puberty',
      title: t('periodPuberty') as string,
      subtitle: formatYears(birthYear + 12, birthYear + 17),
      ageRange: [12, 17],
      icon: <Headphones className="w-8 h-8" />,
      description: t('phasePubertyDesc') as string,
    },
    {
      id: 'young-adult',
      title: t('phaseYoungAdultTitle') as string,
      subtitle: formatYears(birthYear + 18, birthYear + 25),
      ageRange: [18, 25],
      icon: <Car className="w-8 h-8" />,
      description: t('phaseYoungAdultDesc') as string,
    },
  ];
  
  return (
    <div className="space-y-6">
      {/* Title */}
      <div className="text-center">
        <h2 
          className="text-xl sm:text-2xl font-bold mb-1"
          style={{ 
            color: 'var(--era-primary)',
            fontFamily: eraTheme.fontFamily,
          }}
        >
          {t('chooseDestination') as string}
        </h2>
        <p className="text-sm text-muted-foreground">
          {t('whichVersionToVisit') as string}
        </p>
      </div>
      
      {/* Phase cards grid */}
      <div className="grid grid-cols-2 gap-3 sm:gap-4">
        {phases.map((phase, index) => {
          const isSelected = selected === phase.id;
          
          return (
            <motion.button
              key={phase.id}
              initial={{ opacity: 0, y: 20 }}
              animate={{ opacity: 1, y: 0 }}
              transition={{ delay: index * 0.1 }}
              onClick={() => onSelect(phase.id)}
              className={`
                relative p-4 sm:p-5 rounded-xl text-left transition-all duration-300
                border-2 overflow-hidden group
                ${isSelected 
                  ? 'ring-2 ring-offset-2 ring-[color:var(--era-accent)] scale-[1.02]' 
                  : 'hover:scale-[1.01]'
                }
              `}
              style={{
                borderColor: isSelected ? 'var(--era-primary)' : 'var(--era-secondary)',
                background: isSelected 
                  ? `linear-gradient(135deg, var(--era-primary), var(--era-secondary))`
                  : eraTheme.era === '80s'
                  ? 'linear-gradient(135deg, #1a1a2e 0%, #16213e 100%)'
                  : 'rgba(255,255,255,0.9)',
                boxShadow: isSelected 
                  ? '0 8px 30px rgba(0,0,0,0.2)'
                  : '0 4px 12px rgba(0,0,0,0.1)',
              }}
            >
              {/* Background decoration */}
              <div 
                className="absolute top-0 right-0 w-24 h-24 rounded-full -translate-y-1/2 translate-x-1/2 opacity-20"
                style={{
                  background: `radial-gradient(circle, var(--era-accent) 0%, transparent 70%)`,
                }}
              />
              
              {/* Icon */}
              <div 
                className={`
                  inline-flex p-2.5 rounded-xl mb-3 transition-colors
                  ${isSelected ? 'bg-white/20' : 'bg-muted'}
                `}
                style={{
                  color: isSelected 
                    ? (eraTheme.era === 'pre70s' || eraTheme.era === '80s' ? '#fff' : '#000')
                    : 'var(--era-primary)',
                }}
              >
                {phase.icon}
              </div>
              
              {/* Text content */}
              <div>
                <h3 
                  className="font-bold text-base sm:text-lg mb-0.5"
                  style={{
                    color: isSelected 
                      ? (eraTheme.era === 'pre70s' || eraTheme.era === '80s' ? '#fff' : '#000')
                      : eraTheme.era === '80s' ? '#fff' : 'var(--era-primary)',
                    fontFamily: eraTheme.fontFamily,
                  }}
                >
                  {phase.title}
                </h3>
                
                <p 
                  className="text-sm font-medium mb-2"
                  style={{
                    color: isSelected 
                      ? (eraTheme.era === 'pre70s' || eraTheme.era === '80s' ? 'rgba(255,255,255,0.8)' : 'rgba(0,0,0,0.7)')
                      : 'var(--era-secondary)',
                  }}
                >
                  {phase.subtitle}
                </p>
                
                <p 
                  className="text-xs leading-relaxed opacity-80 hidden sm:block"
                  style={{
                    color: isSelected 
                      ? (eraTheme.era === 'pre70s' || eraTheme.era === '80s' ? '#fff' : '#000')
                      : eraTheme.era === '80s' ? '#ccc' : '#666',
                  }}
                >
                  {phase.description}
                </p>
              </div>
              
              {/* Selected indicator */}
              {isSelected && (
                <motion.div
                  initial={{ scale: 0 }}
                  animate={{ scale: 1 }}
                  className="absolute top-2 right-2 w-6 h-6 rounded-full bg-white/30 flex items-center justify-center"
                >
                  <svg className="w-4 h-4" fill="currentColor" viewBox="0 0 20 20" style={{ color: eraTheme.era === 'pre70s' || eraTheme.era === '80s' ? '#fff' : '#000' }}>
                    <path fillRule="evenodd" d="M16.707 5.293a1 1 0 010 1.414l-8 8a1 1 0 01-1.414 0l-4-4a1 1 0 011.414-1.414L8 12.586l7.293-7.293a1 1 0 011.414 0z" clipRule="evenodd" />
                  </svg>
                </motion.div>
              )}
            </motion.button>
          );
        })}
      </div>
    </div>
  );
};
