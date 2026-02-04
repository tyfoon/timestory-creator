import { motion } from 'framer-motion';
import { Gender } from '@/types/form';
import { EraTheme } from '@/lib/eraThemes';
import { User, UserCircle } from 'lucide-react';

interface IdentityFormProps {
  name: string;
  gender: Gender;
  onNameChange: (name: string) => void;
  onGenderChange: (gender: Gender) => void;
  eraTheme: EraTheme;
}

const genderOptions: { value: Gender; label: string; iconMale: boolean }[] = [
  { value: 'male', label: 'Hij', iconMale: true },
  { value: 'female', label: 'Zij', iconMale: false },
  { value: 'none', label: 'Geen voorkeur', iconMale: true },
];

export const IdentityForm = ({ 
  name, 
  gender, 
  onNameChange, 
  onGenderChange, 
  eraTheme 
}: IdentityFormProps) => {
  
  // Get era-specific styling for the input
  const getInputStyle = () => {
    if (eraTheme.era === '80s') {
      return {
        background: 'linear-gradient(180deg, #1a1a2e 0%, #0f0f1a 100%)',
        border: '2px solid #00ced1',
        boxShadow: '0 0 15px rgba(0, 206, 209, 0.3)',
        color: '#00ced1',
      };
    }
    if (eraTheme.era === '90s') {
      return {
        background: '#fff',
        border: '3px solid #0066ff',
        boxShadow: '4px 4px 0 #ffd700',
        color: '#000',
      };
    }
    // Pre-70s - Typewriter / label maker style
    return {
      background: '#fffef5',
      border: '2px solid #8b4513',
      boxShadow: 'inset 0 2px 4px rgba(0,0,0,0.1)',
      color: '#2d2d2d',
    };
  };
  
  const inputStyle = getInputStyle();

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
          Wie is de hoofdrolspeler?
        </h2>
        <p className="text-sm text-muted-foreground">
          De laatste details voor jouw persoonlijke tijdreis
        </p>
      </div>
      
      {/* Name input - storytelling style */}
      <motion.div
        initial={{ opacity: 0, y: 20 }}
        animate={{ opacity: 1, y: 0 }}
        className="space-y-2"
      >
        <label 
          className="block text-sm font-medium"
          style={{ color: 'var(--era-primary)' }}
        >
          <span className="flex items-center gap-2">
            <User className="w-4 h-4" />
            Hoe noemden je vrienden je in die tijd?
          </span>
        </label>
        
        <div className="relative">
          <input
            type="text"
            value={name}
            onChange={(e) => onNameChange(e.target.value)}
            placeholder="Bijv. Johnny, Marieke, DJ Piet..."
            className="w-full px-4 py-3 rounded-lg text-lg font-medium outline-none focus:ring-2 focus:ring-offset-2 transition-all"
            style={{
              ...inputStyle,
              fontFamily: eraTheme.era === 'pre70s' ? "'Courier New', monospace" : 'inherit',
            }}
          />
          
          {/* Decorative element based on era */}
          {eraTheme.era === 'pre70s' && (
            <div className="absolute -right-2 -top-2 w-4 h-4 bg-[#8b4513] rounded-sm transform rotate-12" />
          )}
        </div>
      </motion.div>
      
      {/* Gender selection - visual icons */}
      <motion.div
        initial={{ opacity: 0, y: 20 }}
        animate={{ opacity: 1, y: 0 }}
        transition={{ delay: 0.1 }}
        className="space-y-2"
      >
        <label 
          className="block text-sm font-medium"
          style={{ color: 'var(--era-primary)' }}
        >
          <span className="flex items-center gap-2">
            <UserCircle className="w-4 h-4" />
            Voor de juiste verhaalstijl:
          </span>
        </label>
        
        <div className="grid grid-cols-3 gap-2 sm:gap-3">
          {genderOptions.map((option) => {
            const isSelected = gender === option.value;
            
            return (
              <button
                key={option.value}
                onClick={() => onGenderChange(option.value)}
                className={`
                  relative py-3 px-2 rounded-xl text-center transition-all duration-200
                  border-2 group
                  ${isSelected ? 'ring-2 ring-offset-2 ring-[color:var(--era-accent)]' : 'hover:scale-[1.02]'}
                `}
                style={{
                  borderColor: isSelected ? 'var(--era-primary)' : 'var(--era-secondary)',
                  background: isSelected 
                    ? `linear-gradient(135deg, var(--era-primary), var(--era-secondary))`
                    : eraTheme.era === '80s'
                    ? 'linear-gradient(135deg, #1a1a2e 0%, #16213e 100%)'
                    : 'rgba(255,255,255,0.9)',
                }}
              >
                {/* Icon based on era */}
                <div className="flex justify-center mb-2">
                  {eraTheme.era === '80s' ? (
                    // 80s neon style
                    <div 
                      className="text-2xl"
                      style={{
                        color: isSelected ? '#fff' : '#00ced1',
                        textShadow: isSelected ? 'none' : '0 0 10px rgba(0, 206, 209, 0.8)',
                      }}
                    >
                      {option.value === 'male' ? '♂' : option.value === 'female' ? '♀' : '◈'}
                    </div>
                  ) : eraTheme.era === '90s' ? (
                    // 90s bold geometric
                    <div 
                      className="w-8 h-8 rounded-lg flex items-center justify-center text-xl font-bold"
                      style={{
                        background: isSelected ? 'rgba(255,255,255,0.2)' : '#ffd700',
                        color: isSelected ? '#fff' : '#000',
                      }}
                    >
                      {option.value === 'male' ? '♂' : option.value === 'female' ? '♀' : '◇'}
                    </div>
                  ) : (
                    // Pre-70s elegant
                    <div 
                      className="text-2xl"
                      style={{
                        color: isSelected 
                          ? '#fff' 
                          : 'var(--era-primary)',
                        fontFamily: 'serif',
                      }}
                    >
                      {option.value === 'male' ? '♂' : option.value === 'female' ? '♀' : '○'}
                    </div>
                  )}
                </div>
                
                <span 
                  className="text-sm font-medium"
                  style={{
                    color: isSelected 
                      ? (eraTheme.era === 'pre70s' || eraTheme.era === '80s' ? '#fff' : '#000')
                      : eraTheme.era === '80s' ? '#fff' : 'var(--era-primary)',
                  }}
                >
                  {option.label}
                </span>
                
                {/* Selected check */}
                {isSelected && (
                  <motion.div
                    initial={{ scale: 0 }}
                    animate={{ scale: 1 }}
                    className="absolute -top-1 -right-1 w-5 h-5 rounded-full bg-white/30 flex items-center justify-center"
                  >
                    <svg className="w-3 h-3" fill="currentColor" viewBox="0 0 20 20" style={{ color: eraTheme.era === 'pre70s' || eraTheme.era === '80s' ? '#fff' : '#000' }}>
                      <path fillRule="evenodd" d="M16.707 5.293a1 1 0 010 1.414l-8 8a1 1 0 01-1.414 0l-4-4a1 1 0 011.414-1.414L8 12.586l7.293-7.293a1 1 0 011.414 0z" clipRule="evenodd" />
                    </svg>
                  </motion.div>
                )}
              </button>
            );
          })}
        </div>
      </motion.div>
    </div>
  );
};
