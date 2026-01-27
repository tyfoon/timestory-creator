import { TimelineEvent } from '@/types/timeline';
import { Loader2 } from 'lucide-react';

interface PolaroidCardProps {
  event: TimelineEvent;
  index: number;
}

const monthNames = ['JAN', 'FEB', 'MRT', 'APR', 'MEI', 'JUN', 'JUL', 'AUG', 'SEP', 'OKT', 'NOV', 'DEC'];

// Random rotations between 5 and 25 degrees
const getRotation = (index: number): number => {
  const rotations = [-18, 12, -8, 22, -15, 10, -25, 16, -6, 20, -12, 14, -20, 8, -14, 24];
  return rotations[index % rotations.length];
};

// Random position offsets for scattered effect
const getOffset = (index: number): { x: number; y: number } => {
  const offsets = [
    { x: -20, y: 10 },
    { x: 30, y: -15 },
    { x: -10, y: 25 },
    { x: 25, y: 5 },
    { x: -25, y: -10 },
    { x: 15, y: 20 },
    { x: -15, y: -20 },
    { x: 20, y: -5 },
  ];
  return offsets[index % offsets.length];
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
  const rotation = getRotation(index);
  const offset = getOffset(index);
  const accentColor = getAccentColor(index);
  
  const monthLabel = event.month ? monthNames[event.month - 1] : '';

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
          <div className="absolute bottom-2 right-2 flex items-center gap-1">
            <span className={`font-handwriting text-lg font-bold drop-shadow-lg ${accentColor}`}>
              {monthLabel} {event.year}
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
