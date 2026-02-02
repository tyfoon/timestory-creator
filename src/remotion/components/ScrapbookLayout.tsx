import React, { useMemo } from 'react';
import { Img } from 'remotion';
import { VideoEvent } from '../types';
import { ScrapbookCard } from './ScrapbookCard';
import { getEventImageUrl } from '../utils/placeholders';

// Import era backgrounds
import heroBg70s from '@/assets/hero-bg-70s.png';
import heroBg80s from '@/assets/hero-bg-80s.png';
import heroBg90s from '@/assets/hero-bg-90s.png';
import heroBg00s from '@/assets/hero-bg-00s.png';
import heroBg10s from '@/assets/hero-bg-10s.png';
import woodTableBg from '@/assets/wood-table-bg.jpg';

interface ScrapbookLayoutProps {
  events: VideoEvent[];
  canvasWidth: number;
  canvasHeight: number;
  startYear?: number;
}

interface CardPosition {
  x: number;
  y: number;
  rotation: number;
  scale: number;
}

// Pseudo-random but deterministic based on index
const seededRandom = (seed: number): number => {
  const x = Math.sin(seed * 12.9898 + 78.233) * 43758.5453;
  return x - Math.floor(x);
};

/**
 * Calculate positions for cards in a flowing serpentine pattern
 */
const calculateCardPositions = (
  eventCount: number,
  canvasWidth: number,
  canvasHeight: number
): CardPosition[] => {
  const positions: CardPosition[] = [];
  
  // Card dimensions (approximate)
  const cardWidth = 700;
  const cardHeight = 600;
  
  // Margins and spacing
  const marginX = 200;
  const marginY = 200;
  const spacingX = cardWidth + 150; // Gap between cards horizontally
  const spacingY = cardHeight + 200; // Gap between rows
  
  // Calculate how many cards per row
  const cardsPerRow = Math.max(2, Math.floor((canvasWidth - marginX * 2) / spacingX));
  
  for (let i = 0; i < eventCount; i++) {
    const row = Math.floor(i / cardsPerRow);
    const colInRow = i % cardsPerRow;
    
    // Serpentine: even rows go left-to-right, odd rows go right-to-left
    const actualCol = row % 2 === 0 ? colInRow : (cardsPerRow - 1 - colInRow);
    
    // Base position
    const baseX = marginX + actualCol * spacingX + cardWidth / 2;
    const baseY = marginY + row * spacingY + cardHeight / 2;
    
    // Add randomness to position (deterministic based on index)
    const randomOffsetX = (seededRandom(i * 7) - 0.5) * 80;
    const randomOffsetY = (seededRandom(i * 11) - 0.5) * 60;
    
    // Random rotation between -5 and 5 degrees
    const rotation = (seededRandom(i * 13) - 0.5) * 10;
    
    // Slight scale variation for depth
    const scale = 0.95 + seededRandom(i * 17) * 0.1;
    
    positions.push({
      x: baseX + randomOffsetX,
      y: baseY + randomOffsetY,
      rotation,
      scale,
    });
  }
  
  return positions;
};

/**
 * Get era background based on year
 */
const getEraBackground = (year?: number): string => {
  if (!year) return woodTableBg;
  if (year >= 1969 && year <= 1979) return heroBg70s;
  if (year >= 1980 && year <= 1989) return heroBg80s;
  if (year >= 1990 && year <= 1999) return heroBg90s;
  if (year >= 2000 && year <= 2009) return heroBg00s;
  if (year >= 2010 && year <= 2019) return heroBg10s;
  return woodTableBg;
};

/**
 * ScrapbookLayout - renders all cards on a large canvas
 * with random positions forming a serpentine path
 */
export const ScrapbookLayout: React.FC<ScrapbookLayoutProps> = ({
  events,
  canvasWidth,
  canvasHeight,
  startYear,
}) => {
  const positions = useMemo(
    () => calculateCardPositions(events.length, canvasWidth, canvasHeight),
    [events.length, canvasWidth, canvasHeight]
  );

  const backgroundImage = useMemo(() => getEraBackground(startYear), [startYear]);

  return (
    <div
      style={{
        width: canvasWidth,
        height: canvasHeight,
        position: 'relative',
        backgroundColor: '#1a1a1a',
      }}
    >
      {/* Static/slow parallax background */}
      <Img
        src={backgroundImage}
        style={{
          position: 'absolute',
          top: 0,
          left: 0,
          width: '100%',
          height: '100%',
          objectFit: 'cover',
          opacity: 0.3,
        }}
      />

      {/* Texture overlay for paper/table feel */}
      <div
        style={{
          position: 'absolute',
          top: 0,
          left: 0,
          width: '100%',
          height: '100%',
          backgroundImage: `
            radial-gradient(circle at 20% 30%, rgba(255,255,255,0.05) 0%, transparent 50%),
            radial-gradient(circle at 80% 70%, rgba(0,0,0,0.1) 0%, transparent 50%)
          `,
          pointerEvents: 'none',
        }}
      />

      {/* All cards rendered at their positions */}
      {events.map((event, index) => {
        const pos = positions[index];
        const imageUrl = getEventImageUrl(event);
        
        return (
          <div
            key={event.id}
            style={{
              position: 'absolute',
              left: pos.x,
              top: pos.y,
              transform: `translate(-50%, -50%) rotate(${pos.rotation}deg) scale(${pos.scale})`,
              transformOrigin: 'center center',
            }}
          >
            <ScrapbookCard
              event={event}
              imageUrl={imageUrl}
              eventIndex={index}
            />
          </div>
        );
      })}
    </div>
  );
};

export { calculateCardPositions };
export type { CardPosition };
