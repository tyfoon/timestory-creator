import { useState } from 'react';
import { TimelineEvent } from '@/types/timeline';
import { Loader2 } from 'lucide-react';

interface PolaroidCardProps {
  event: TimelineEvent;
  index: number;
}

const monthNames = ['JAN', 'FEB', 'MRT', 'APR', 'MEI', 'JUN', 'JUL', 'AUG', 'SEP', 'OKT', 'NOV', 'DEC'];

// Generate pseudo-random rotation based on event id for consistency
const getRotation = (id: string): number => {
  const hash = id.split('').reduce((acc, char) => acc + char.charCodeAt(0), 0);
  // Range: -15 to +15 degrees (reduced for better readability when flipped)
  return ((hash % 30) - 15);
};

// Generate pseudo-random position offsets based on event id
const getOffset = (id: string, index: number): { x: number; y: number } => {
  const hash = id.split('').reduce((acc, char) => acc + char.charCodeAt(0), 0);
  // Create scattered effect with larger offsets
  const xBase = ((hash * 7) % 60) - 30; // -30 to +30
  const yBase = ((hash * 13) % 40) - 20; // -20 to +20
  // Add index-based variation for grid positions
  const indexOffset = {
    x: (index % 3 - 1) * 10,
    y: Math.floor(index / 3) * 8 - 8
  };
  return { 
    x: xBase + indexOffset.x, 
    y: yBase + indexOffset.y 
  };
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
  const offset = getOffset(event.id, index);
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
        transform: `rotate(${rotation}deg) translate(${offset.x}px, ${offset.y}px)`,
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
                  <Loader2 className="h-8 w-8 animate-spin text-polaroid-pink" />
                </div>
              ) : (
                <div className="w-full h-full flex items-center justify-center bg-polaroid-dark/50">
                  <span className="text-white/30 text-4xl">📷</span>
                </div>
              )}
              
              {/* Date stamp on image edge */}
              <div className="absolute bottom-2 right-2 flex items-center gap-1 bg-black/40 px-2 py-0.5 rounded">
                <span className={`font-handwriting text-lg font-bold drop-shadow-lg ${accentColor}`}>
                  {dateDisplay}
                </span>
              </div>
            </div>
            
            {/* Caption area */}
            <div className="polaroid-caption">
              <p className="font-handwriting text-lg leading-snug text-polaroid-dark line-clamp-3">
                {event.title}
              </p>
            </div>
            
            {/* Polaroid imperfections */}
            <div className="polaroid-scratches" />
            
            {/* Flip hint */}
            <div className="absolute bottom-1 right-2 text-xs text-polaroid-dark/40 font-handwriting">
              klik om te draaien →
            </div>
          </div>
        </div>

        {/* Back side - Story */}
        <div className="polaroid-back">
          <div className={`polaroid-frame-back bg-gradient-to-br ${backAccent}`}>
            {/* Top accent strip */}
            <div className={`absolute top-0 left-0 right-0 h-1 ${accentColor.replace('text-', 'bg-')}`} />
            
            {/* Content */}
            <div className="p-4 h-full flex flex-col">
              {/* Date header */}
              <div className={`font-handwriting text-xl font-bold mb-2 ${accentColor}`}>
                {dateDisplay}
              </div>
              
              {/* Title */}
              <h3 className="font-handwriting text-lg font-bold text-polaroid-dark mb-3 leading-tight">
                {event.title}
              </h3>
              
              {/* Description */}
              <div className="flex-1 overflow-y-auto">
                <p className="text-sm text-polaroid-dark/80 leading-relaxed">
                  {event.description}
                </p>
              </div>
              
              {/* Category badge */}
              <div className="mt-3 pt-2 border-t border-polaroid-dark/10">
                <span className={`inline-block px-2 py-0.5 rounded-full text-xs font-medium ${accentColor} bg-polaroid-dark/5`}>
                  {event.category}
                </span>
              </div>
            </div>
            
            {/* Flip hint */}
            <div className="absolute bottom-1 right-2 text-xs text-polaroid-dark/40 font-handwriting">
              ← klik om terug te draaien
            </div>
          </div>
        </div>
      </div>
    </div>
  );
};
