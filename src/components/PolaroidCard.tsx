import { useState } from 'react';
import { TimelineEvent } from '@/types/timeline';
import { Loader2, RotateCcw } from 'lucide-react';

interface PolaroidCardProps {
  event: TimelineEvent;
  index: number;
}

const monthNames = ['JAN', 'FEB', 'MRT', 'APR', 'MEI', 'JUN', 'JUL', 'AUG', 'SEP', 'OKT', 'NOV', 'DEC'];

// Generate pseudo-random rotation based on event id for consistency
const getRotation = (id: string): number => {
  const hash = id.split('').reduce((acc, char) => acc + char.charCodeAt(0), 0);
  // Range: -8 to +8 degrees (reduced for mobile)
  return ((hash % 16) - 8);
};

// Get neon accent color
const getAccentColor = (index: number): string => {
  const colors = [
    'text-polaroid-pink',
    'text-polaroid-cyan',
    'text-polaroid-yellow',
    'text-polaroid-purple',
    'text-polaroid-orange',
    'text-polaroid-mint',
  ];
  return colors[index % colors.length];
};

// Get background accent for back of card
const getBackAccent = (index: number): string => {
  const colors = [
    'from-polaroid-pink/20 to-transparent',
    'from-polaroid-cyan/20 to-transparent',
    'from-polaroid-yellow/20 to-transparent',
    'from-polaroid-purple/20 to-transparent',
    'from-polaroid-orange/20 to-transparent',
    'from-polaroid-mint/20 to-transparent',
  ];
  return colors[index % colors.length];
};

export const PolaroidCard = ({ event, index }: PolaroidCardProps) => {
  const [isFlipped, setIsFlipped] = useState(false);
  const rotation = getRotation(event.id);
  const accentColor = getAccentColor(index);
  const backAccent = getBackAccent(index);
  
  const monthLabel = event.month ? monthNames[event.month - 1] : '';
  const dateDisplay = monthLabel ? `${monthLabel} '${String(event.year).slice(-2)}` : `'${String(event.year).slice(-2)}`;

  const handleClick = () => {
    setIsFlipped(!isFlipped);
  };

  return (
    <div 
      className="polaroid-card group cursor-pointer"
      style={{
        transform: `rotate(${rotation}deg)`,
        perspective: '1000px',
      }}
      onClick={handleClick}
    >
      {/* 3D flip container */}
      <div 
        className="polaroid-flip-container"
        style={{
          transform: isFlipped ? 'rotateY(180deg)' : 'rotateY(0deg)',
        }}
      >
        {/* Front side - Photo */}
        <div className="polaroid-front">
          <div className="polaroid-frame">
            {/* Top accent strip */}
            <div className={`absolute top-0 left-0 right-0 h-1 ${accentColor.replace('text-', 'bg-')}`} />
            
            {/* Image container */}
            <div className="polaroid-image-container">
              {event.imageUrl ? (
                <img 
                  src={event.imageUrl} 
                  alt={event.title}
                  className="w-full h-full object-cover"
                />
              ) : event.imageStatus === 'loading' ? (
                <div className="w-full h-full flex items-center justify-center bg-polaroid-dark/50">
                  <Loader2 className="h-6 w-6 sm:h-8 sm:w-8 animate-spin text-polaroid-pink" />
                </div>
              ) : (
                <div className="w-full h-full flex items-center justify-center bg-polaroid-dark/50">
                  <span className="text-white/30 text-3xl sm:text-4xl">📷</span>
                </div>
              )}
              
              {/* Date stamp on image edge */}
              <div className="absolute bottom-1.5 right-1.5 sm:bottom-2 sm:right-2 flex items-center gap-1 bg-black/40 px-1.5 sm:px-2 py-0.5 rounded">
                <span className={`font-handwriting text-sm sm:text-lg font-bold drop-shadow-lg ${accentColor}`}>
                  {dateDisplay}
                </span>
              </div>
            </div>
            
            {/* Caption area */}
            <div className="polaroid-caption">
              <p className="font-handwriting text-sm sm:text-lg leading-snug text-polaroid-dark line-clamp-2">
                {event.title}
              </p>
            </div>
            
            {/* Polaroid imperfections */}
            <div className="polaroid-scratches" />
            
            {/* Flip icon hint */}
            <div className="absolute bottom-1 right-2 text-polaroid-dark/30 group-hover:text-polaroid-dark/50 transition-colors">
              <RotateCcw className="h-3 w-3 sm:h-4 sm:w-4" />
            </div>
          </div>
        </div>

        {/* Back side - Story */}
        <div className="polaroid-back">
          <div className={`polaroid-frame-back bg-gradient-to-br ${backAccent}`}>
            {/* Top accent strip */}
            <div className={`absolute top-0 left-0 right-0 h-1 ${accentColor.replace('text-', 'bg-')}`} />
            
            {/* Content - maximized space */}
            <div className="pt-1.5 pb-1.5 px-1.5 sm:pt-2 sm:pb-2 sm:px-2 h-full flex flex-col">
              {/* Title at the very top */}
              <h3 className="font-handwriting text-sm sm:text-base font-bold text-polaroid-dark leading-tight line-clamp-2 mb-1.5 sm:mb-2">
                {event.title}
              </h3>
              
              {/* Description - maximized scroll area */}
              <div className="flex-1 overflow-y-auto min-h-0 pr-0.5">
                <p className="text-xs sm:text-sm text-polaroid-dark/80 leading-relaxed">
                  {event.description}
                </p>
              </div>
              
              {/* Footer with category and flip icon - at the very bottom */}
              <div className="mt-1.5 pt-1.5 sm:mt-2 sm:pt-2 border-t border-polaroid-dark/10 flex items-center justify-between">
                <span className={`inline-block px-1.5 sm:px-2 py-0.5 rounded-full text-[10px] sm:text-xs font-medium ${accentColor} bg-polaroid-dark/5`}>
                  {event.category}
                </span>
                <RotateCcw className="h-3 w-3 sm:h-4 sm:w-4 text-polaroid-dark/30" />
              </div>
            </div>
          </div>
        </div>
      </div>
    </div>
  );
};