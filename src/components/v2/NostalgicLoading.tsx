import { motion } from "framer-motion";
import { getEraTheme } from "@/lib/eraThemes";

interface NostalgicLoadingProps {
  year: number;
}

const getLoadingMessages = (year: number): string[] => {
  if (year < 1970) {
    return [
      "Bladeren door de archieven...",
      "Stof van oude kranten blazen...",
      "Herinneringen aan het ophalen...",
    ];
  }
  if (year < 1990) {
    return [
      "De cassetteband terugspoelen...",
      "VHS banden doorzoeken...",
      `De hits van ${year} opzoeken...`,
    ];
  }
  if (year < 2000) {
    return [
      "Inbellen via de modem... beep boop...",
      "Windows 95 opstarten...",
      `Terug naar ${year}...`,
    ];
  }
  return [
    `De archieven van ${year} doorzoeken...`,
    "Herinneringen verzamelen...",
    "Je tijdreis voorbereiden...",
  ];
};

export const NostalgicLoading = ({ year }: NostalgicLoadingProps) => {
  const eraTheme = getEraTheme(year);
  const messages = getLoadingMessages(year);
  
  return (
    <motion.div
      initial={{ opacity: 0 }}
      animate={{ opacity: 1 }}
      exit={{ opacity: 0 }}
      className="fixed inset-0 z-50 flex items-center justify-center"
      style={{
        background: eraTheme.era === '80s' 
          ? 'linear-gradient(135deg, #1a1a2e 0%, #16213e 100%)'
          : eraTheme.era === 'pre70s'
            ? 'linear-gradient(135deg, #f5f0e6 0%, #e8e0d0 100%)'
            : 'linear-gradient(135deg, #fafafa 0%, #f0f0f0 100%)',
      }}
    >
      {/* Animated background elements */}
      <div className="absolute inset-0 overflow-hidden pointer-events-none">
        {eraTheme.era === '80s' && (
          <>
            <motion.div
              animate={{ 
                x: [0, 100, 0],
                y: [0, -50, 0],
              }}
              transition={{ duration: 4, repeat: Infinity, ease: "linear" }}
              className="absolute top-20 left-10 w-4 h-4 bg-[#ff1493]"
            />
            <motion.div
              animate={{ 
                x: [0, -80, 0],
                y: [0, 60, 0],
              }}
              transition={{ duration: 3.5, repeat: Infinity, ease: "linear" }}
              className="absolute bottom-32 right-20 w-6 h-6 bg-[#00ced1]"
            />
            {/* Scanlines */}
            <div 
              className="absolute inset-0 opacity-10"
              style={{
                background: 'repeating-linear-gradient(0deg, transparent, transparent 2px, rgba(255,255,255,0.03) 2px, rgba(255,255,255,0.03) 4px)',
              }}
            />
          </>
        )}
      </div>
      
      <div className="text-center space-y-8 p-8">
        {/* Spinning loader */}
        <div className="relative mx-auto w-24 h-24">
          {/* Outer ring */}
          <motion.div
            animate={{ rotate: 360 }}
            transition={{ duration: 2, repeat: Infinity, ease: "linear" }}
            className="absolute inset-0 rounded-full border-4 border-transparent"
            style={{
              borderTopColor: 'var(--era-primary)',
              borderRightColor: 'var(--era-secondary)',
            }}
          />
          
          {/* Inner ring - opposite direction */}
          <motion.div
            animate={{ rotate: -360 }}
            transition={{ duration: 1.5, repeat: Infinity, ease: "linear" }}
            className="absolute inset-3 rounded-full border-4 border-transparent"
            style={{
              borderTopColor: 'var(--era-accent)',
              borderLeftColor: 'var(--era-primary)',
            }}
          />
          
          {/* Center year */}
          <div className="absolute inset-0 flex items-center justify-center">
            <motion.span
              animate={{ scale: [1, 1.1, 1] }}
              transition={{ duration: 1, repeat: Infinity }}
              className="text-2xl font-bold font-serif"
              style={{ color: 'var(--era-primary)' }}
            >
              {year}
            </motion.span>
          </div>
        </div>
        
        {/* Animated message */}
        <motion.div
          key={year}
          initial={{ opacity: 0, y: 10 }}
          animate={{ opacity: 1, y: 0 }}
          className="space-y-2"
        >
          <motion.p
            animate={{ opacity: [0.5, 1, 0.5] }}
            transition={{ duration: 2, repeat: Infinity }}
            className="text-xl font-serif"
            style={{ 
              color: eraTheme.era === '80s' ? '#e0e0e0' : 'var(--era-primary)',
            }}
          >
            {messages[0]}
          </motion.p>
          
          {/* Progress dots */}
          <div className="flex justify-center gap-2 pt-4">
            {[0, 1, 2].map((i) => (
              <motion.div
                key={i}
                animate={{ 
                  scale: [1, 1.5, 1],
                  opacity: [0.3, 1, 0.3],
                }}
                transition={{ 
                  duration: 1,
                  repeat: Infinity,
                  delay: i * 0.2,
                }}
                className="w-3 h-3 rounded-full"
                style={{ background: 'var(--era-accent)' }}
              />
            ))}
          </div>
        </motion.div>
      </div>
    </motion.div>
  );
};
