import { motion } from "framer-motion";

interface ChapterIndicatorProps {
  currentChapter: 1 | 2 | 3;
  onChapterClick: (chapter: 1 | 2 | 3) => void;
  completedChapters: [boolean, boolean, boolean];
}

const chapters = [
  { number: 1, label: "Het Jaar" },
  { number: 2, label: "Voor Wie" },
  { number: 3, label: "Waarom" },
] as const;

export const ChapterIndicator = ({ 
  currentChapter, 
  onChapterClick, 
  completedChapters 
}: ChapterIndicatorProps) => {
  return (
    <div className="flex items-center justify-center gap-2 sm:gap-4 mb-8">
      {chapters.map((chapter, index) => {
        const isActive = currentChapter === chapter.number;
        const isCompleted = completedChapters[index];
        const canClick = chapter.number <= currentChapter || completedChapters[chapter.number - 2];
        
        return (
          <div key={chapter.number} className="flex items-center">
            {/* Chapter dot/number */}
            <button
              onClick={() => canClick && onChapterClick(chapter.number)}
              disabled={!canClick}
              className={`
                relative flex items-center gap-2 px-3 py-1.5 rounded-full transition-all duration-300
                ${canClick ? 'cursor-pointer' : 'cursor-not-allowed'}
                ${isActive 
                  ? 'bg-[var(--era-primary)] text-white shadow-lg scale-105' 
                  : isCompleted
                    ? 'bg-[var(--era-secondary)]/30 text-[var(--era-primary)]'
                    : 'bg-muted text-muted-foreground'
                }
              `}
            >
              {/* Number circle */}
              <span 
                className={`
                  w-6 h-6 rounded-full flex items-center justify-center text-xs font-bold
                  ${isActive 
                    ? 'bg-white/20' 
                    : isCompleted 
                      ? 'bg-[var(--era-primary)]/20' 
                      : 'bg-muted-foreground/10'
                  }
                `}
              >
                {isCompleted && !isActive ? (
                  <svg className="w-3.5 h-3.5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={3} d="M5 13l4 4L19 7" />
                  </svg>
                ) : (
                  chapter.number
                )}
              </span>
              
              {/* Label - hide on very small screens */}
              <span className="text-sm font-medium hidden xs:inline">
                {chapter.label}
              </span>
              
              {/* Active indicator pulse */}
              {isActive && (
                <motion.span
                  initial={{ scale: 0.8, opacity: 0 }}
                  animate={{ scale: 1.2, opacity: 0 }}
                  transition={{ duration: 1.5, repeat: Infinity }}
                  className="absolute inset-0 rounded-full border-2 border-white/50"
                />
              )}
            </button>
            
            {/* Connector line */}
            {index < chapters.length - 1 && (
              <div 
                className={`
                  w-4 sm:w-8 h-0.5 mx-1 transition-colors duration-300
                  ${completedChapters[index] 
                    ? 'bg-[var(--era-primary)]' 
                    : 'bg-muted'
                  }
                `}
              />
            )}
          </div>
        );
      })}
    </div>
  );
};
