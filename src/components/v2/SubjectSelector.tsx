import { motion } from "framer-motion";
import { User, Heart, Users } from "lucide-react";
import { type EraTheme } from "@/lib/eraThemes";

type Subject = "me" | "loved-one" | "friend";

interface SubjectSelectorProps {
  selected: Subject | null;
  onSelect: (subject: Subject) => void;
  eraTheme: EraTheme;
}

const subjects: { id: Subject; icon: React.ReactNode; label: string; description: string }[] = [
  {
    id: "me",
    icon: <User className="w-10 h-10" />,
    label: "Voor Mijzelf",
    description: "Ontdek je eigen herinneringen",
  },
  {
    id: "loved-one",
    icon: <Heart className="w-10 h-10" />,
    label: "Voor een Dierbare",
    description: "Verras iemand speciaal",
  },
  {
    id: "friend",
    icon: <Users className="w-10 h-10" />,
    label: "Voor een Vriend",
    description: "Deel nostalgie samen",
  },
];

export const SubjectSelector = ({ selected, onSelect, eraTheme }: SubjectSelectorProps) => {
  return (
    <div className="grid gap-4 sm:grid-cols-3">
      {subjects.map((subject, index) => {
        const isSelected = selected === subject.id;
        
        return (
          <motion.button
            key={subject.id}
            initial={{ opacity: 0, y: 20 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ delay: index * 0.1 }}
            whileHover={{ scale: 1.03, y: -4 }}
            whileTap={{ scale: 0.98 }}
            onClick={() => onSelect(subject.id)}
            className={`
              relative p-6 rounded-2xl text-center transition-all duration-300
              ${isSelected 
                ? 'ring-4 shadow-2xl' 
                : 'shadow-lg hover:shadow-xl'
              }
            `}
            style={{
              background: isSelected 
                ? `linear-gradient(135deg, var(--era-primary), var(--era-secondary))`
                : eraTheme.era === '80s'
                  ? 'linear-gradient(135deg, #1a1a2e, #16213e)'
                  : 'linear-gradient(135deg, #ffffff, #f5f5f5)',
              borderColor: isSelected ? 'var(--era-accent)' : 'transparent',
              // @ts-ignore - ringColor works with Tailwind ring utilities via CSS variables
              '--tw-ring-color': 'var(--era-accent)',
            } as React.CSSProperties}
          >
            {/* Skeuomorphic "button" effect */}
            <div 
              className="absolute inset-[3px] rounded-xl pointer-events-none"
              style={{
                background: isSelected 
                  ? 'transparent'
                  : 'linear-gradient(180deg, rgba(255,255,255,0.3) 0%, transparent 50%)',
                borderTop: isSelected ? 'none' : '1px solid rgba(255,255,255,0.5)',
              }}
            />
            
            {/* Icon */}
            <div 
              className="mx-auto mb-4 w-16 h-16 rounded-full flex items-center justify-center transition-all"
              style={{
                background: isSelected 
                  ? 'rgba(255,255,255,0.2)'
                  : eraTheme.era === '80s'
                    ? 'linear-gradient(135deg, #ff1493, #00ced1)'
                    : `linear-gradient(135deg, var(--era-primary), var(--era-secondary))`,
                color: isSelected ? '#fff' : eraTheme.era === '80s' ? '#fff' : '#fff',
              }}
            >
              {subject.icon}
            </div>
            
            {/* Label */}
            <h3 
              className="text-lg font-bold mb-1 font-serif"
              style={{ 
                color: isSelected 
                  ? '#fff' 
                  : eraTheme.era === '80s' 
                    ? '#e0e0e0' 
                    : 'var(--era-primary)',
              }}
            >
              {subject.label}
            </h3>
            
            {/* Description */}
            <p 
              className="text-sm opacity-75"
              style={{ 
                color: isSelected 
                  ? 'rgba(255,255,255,0.9)' 
                  : eraTheme.era === '80s' 
                    ? '#a0a0a0' 
                    : '#666',
              }}
            >
              {subject.description}
            </p>
            
            {/* Selection indicator */}
            {isSelected && (
              <motion.div
                initial={{ scale: 0 }}
                animate={{ scale: 1 }}
                className="absolute -top-2 -right-2 w-8 h-8 rounded-full flex items-center justify-center shadow-lg"
                style={{ background: 'var(--era-accent)' }}
              >
                <svg className="w-5 h-5 text-white" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={3} d="M5 13l4 4L19 7" />
                </svg>
              </motion.div>
            )}
          </motion.button>
        );
      })}
    </div>
  );
};
