import { motion } from "framer-motion";
import { Cake, Heart, Sparkles } from "lucide-react";
import { type EraTheme } from "@/lib/eraThemes";

type Occasion = "birthday" | "anniversary" | "fun";

interface OccasionSelectorProps {
  selected: Occasion | null;
  onSelect: (occasion: Occasion) => void;
  eraTheme: EraTheme;
}

const occasions: { id: Occasion; icon: React.ReactNode; label: string; emoji: string }[] = [
  {
    id: "birthday",
    icon: <Cake className="w-8 h-8" />,
    label: "Verjaardag",
    emoji: "🎂",
  },
  {
    id: "anniversary",
    icon: <Heart className="w-8 h-8" />,
    label: "Jubileum",
    emoji: "💕",
  },
  {
    id: "fun",
    icon: <Sparkles className="w-8 h-8" />,
    label: "Gewoon voor de lol",
    emoji: "✨",
  },
];

export const OccasionSelector = ({ selected, onSelect, eraTheme }: OccasionSelectorProps) => {
  return (
    <div className="flex flex-wrap justify-center gap-4">
      {occasions.map((occasion, index) => {
        const isSelected = selected === occasion.id;
        
        return (
          <motion.button
            key={occasion.id}
            initial={{ opacity: 0, scale: 0.8 }}
            animate={{ opacity: 1, scale: 1 }}
            transition={{ delay: index * 0.08 }}
            whileHover={{ scale: 1.08, rotate: index % 2 === 0 ? 2 : -2 }}
            whileTap={{ scale: 0.95 }}
            onClick={() => onSelect(occasion.id)}
            className={`
              relative flex flex-col items-center justify-center
              w-28 h-28 sm:w-32 sm:h-32 rounded-2xl transition-all duration-300
              ${isSelected ? 'ring-4 shadow-2xl' : 'shadow-lg hover:shadow-xl'}
            `}
            style={{
              background: isSelected 
                ? `linear-gradient(135deg, var(--era-primary), var(--era-secondary))`
                : eraTheme.era === '80s'
                  ? 'linear-gradient(135deg, #1a1a2e, #16213e)'
                  : 'linear-gradient(135deg, #ffffff, #f8f8f8)',
              // @ts-ignore - ringColor works with Tailwind ring utilities via CSS variables
              '--tw-ring-color': 'var(--era-accent)',
              // Skeuomorphic depth
              boxShadow: isSelected 
                ? '0 10px 40px -10px rgba(0,0,0,0.3), inset 0 -2px 0 rgba(0,0,0,0.1)'
                : '0 8px 30px -8px rgba(0,0,0,0.15), inset 0 2px 0 rgba(255,255,255,0.5), inset 0 -2px 0 rgba(0,0,0,0.05)',
            } as React.CSSProperties}
          >
            {/* Gloss effect */}
            <div 
              className="absolute inset-[2px] rounded-xl pointer-events-none overflow-hidden"
              style={{
                background: isSelected 
                  ? 'none'
                  : 'linear-gradient(180deg, rgba(255,255,255,0.4) 0%, transparent 40%)',
              }}
            />
            
            {/* Icon with glow */}
            <div 
              className="relative z-10 mb-2 p-3 rounded-full"
              style={{
                background: isSelected 
                  ? 'rgba(255,255,255,0.15)'
                  : eraTheme.era === '80s'
                    ? 'linear-gradient(135deg, rgba(255,20,147,0.3), rgba(0,206,209,0.3))'
                    : 'linear-gradient(135deg, rgba(0,0,0,0.05), rgba(0,0,0,0.1))',
                color: isSelected 
                  ? '#fff' 
                  : eraTheme.era === '80s'
                    ? '#ff1493'
                    : 'var(--era-primary)',
              }}
            >
              {occasion.icon}
            </div>
            
            {/* Label */}
            <span 
              className="relative z-10 text-sm font-semibold text-center px-2"
              style={{ 
                color: isSelected 
                  ? '#fff' 
                  : eraTheme.era === '80s' 
                    ? '#e0e0e0' 
                    : 'var(--era-primary)',
              }}
            >
              {occasion.label}
            </span>
            
            {/* Emoji flourish when selected */}
            {isSelected && (
              <motion.span
                initial={{ scale: 0, y: 10 }}
                animate={{ scale: 1, y: 0 }}
                className="absolute -top-3 -right-3 text-2xl"
              >
                {occasion.emoji}
              </motion.span>
            )}
          </motion.button>
        );
      })}
    </div>
  );
};
