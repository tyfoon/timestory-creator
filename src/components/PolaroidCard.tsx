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
  // Range: -25 to +25 degrees
  return ((hash % 50) - 25);
};

// Generate pseudo-random position offsets based on event id
const getOffset = (id: string, index: number): { x: number; y: number } => {
  const hash = id.split('').reduce((acc, char) => acc + char.charCodeAt(0), 0);
  // Create scattered effect with larger offsets
  const xBase = ((hash * 7) % 80) - 40; // -40 to +40
  const yBase = ((hash * 13) % 60) - 30; // -30 to +30
  // Add index-based variation for grid positions
  const indexOffset = {
    x: (index % 3 - 1) * 15,
    y: Math.floor(index / 3) * 10 - 10
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

export const PolaroidCard = ({ event, index }: PolaroidCardProps) => {
  const rotation = getRotation(event.id);
  const offset = getOffset(event.id, index);
  const accentColor = getAccentColor(index);
  
  const monthLabel = event.month ? monthNames[event.month - 1] : '';
  const dateDisplay = monthLabel ? `${monthLabel} '${String(event.year).slice(-2)}` : `'${String(event.year).slice(-2)}`;

  return (
    <div 
      className="polaroid-card group"
      style={{
        transform: `rotate(${rotation}deg) translate(${offset.x}px, ${offset.y}px)`,
      }}
    >
      {/* Polaroid frame */}
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
      </div>
    </div>
  );
};
