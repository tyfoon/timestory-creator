import React from 'react';
import { AbsoluteFill, Img, interpolate, useCurrentFrame } from 'remotion';
import { EventCardProps } from '../types';
import { KenBurns } from './KenBurns';

/**
 * Retro "Analog Archive" card for 80s/90s VHS-style video.
 * Features Polaroid/newspaper clipping aesthetics with period-appropriate typography.
 */
export const RetroCard: React.FC<EventCardProps> = ({ event, imageUrl, eventIndex }) => {
  const frame = useCurrentFrame();
  
  // Animation values - snappy, VHS-style entrance
  const fadeIn = interpolate(frame, [0, 8], [0, 1], { extrapolateRight: 'clamp' });
  const slideIn = interpolate(frame, [0, 12], [20, 0], { extrapolateRight: 'clamp' });
  const titleReveal = interpolate(frame, [5, 15], [0, 1], { extrapolateRight: 'clamp' });
  const descReveal = interpolate(frame, [10, 20], [0, 1], { extrapolateRight: 'clamp' });

  // Rotate between layout patterns for variety
  const layoutPattern = eventIndex % 3;

  // Period-appropriate fonts
  const fontHeadline = '"Anton", "Impact", sans-serif';
  const fontBody = '"VT323", "Courier New", monospace';
  const fontHandwritten = '"Permanent Marker", cursive';

  // Retro color palette
  const paperColor = '#fdfbf7';
  const inkColor = '#1a1a1a';
  const accentColors = ['#ffeb3b', '#ff6b9d', '#00e5ff', '#76ff03'];
  const accentColor = accentColors[eventIndex % accentColors.length];

  // Slight random rotation for scrapbook effect
  const rotation = (eventIndex % 2 === 0 ? -1 : 1) * (0.5 + (eventIndex % 3) * 0.5);

  // Format date for retro display
  const formatRetroDate = (dateStr: string): string => {
    try {
      const date = new Date(dateStr);
      if (!isNaN(date.getTime())) {
        return `${date.getDate()}.${date.getMonth() + 1}.${date.getFullYear()}`;
      }
    } catch {
      // Fallback
    }
    return dateStr;
  };

  // Layout 0: Classic Polaroid with handwritten caption
  if (layoutPattern === 0) {
    return (
      <AbsoluteFill style={{ 
        backgroundColor: '#2a2a2a',
        opacity: fadeIn,
        display: 'flex',
        alignItems: 'center',
        justifyContent: 'center',
      }}>
        {/* Polaroid frame */}
        <div style={{
          transform: `rotate(${rotation}deg) translateY(${slideIn}px)`,
          backgroundColor: paperColor,
          padding: '20px 20px 80px 20px',
          boxShadow: '8px 8px 0px rgba(0,0,0,0.8)',
          border: '3px solid #1a1a1a',
          maxWidth: 700,
        }}>
          {/* Photo area with Ken Burns */}
          <div style={{
            width: 660,
            height: 520,
            backgroundColor: '#1a1a1a',
            overflow: 'hidden',
            border: '2px solid #333',
          }}>
            <KenBurns step={eventIndex} intensity={0.8}>
              <Img
                src={imageUrl}
                style={{
                  width: '100%',
                  height: '100%',
                  objectFit: 'cover',
                  objectPosition: 'top',
                }}
              />
            </KenBurns>
          </div>

          {/* Handwritten caption area */}
          <div style={{
            marginTop: 20,
            textAlign: 'center',
          }}>
            {/* Date stamp */}
            <div style={{
              fontFamily: fontBody,
              fontSize: 24,
              color: '#666',
              marginBottom: 8,
              letterSpacing: '0.1em',
            }}>
              {formatRetroDate(event.date)}
            </div>

            {/* Handwritten title */}
            <h1 style={{
              fontFamily: fontHandwritten,
              fontSize: 42,
              color: inkColor,
              lineHeight: 1.1,
              transform: 'rotate(-1deg)',
              opacity: titleReveal,
            }}>
              {event.title}
            </h1>
          </div>
        </div>

        {/* Category sticker */}
        <div style={{
          position: 'absolute',
          top: 80,
          right: 100,
          backgroundColor: accentColor,
          color: inkColor,
          fontFamily: fontHeadline,
          fontSize: 18,
          padding: '8px 16px',
          transform: 'rotate(12deg)',
          boxShadow: '3px 3px 0px rgba(0,0,0,0.5)',
          textTransform: 'uppercase',
        }}>
          {event.category}
        </div>
      </AbsoluteFill>
    );
  }

  // Layout 1: Newspaper clipping style
  if (layoutPattern === 1) {
    return (
      <AbsoluteFill style={{ 
        backgroundColor: '#3d3d3d',
        opacity: fadeIn,
        display: 'flex',
        alignItems: 'center',
        justifyContent: 'center',
        padding: 60,
      }}>
        {/* Newspaper clipping */}
        <div style={{
          transform: `rotate(${rotation}deg) translateY(${slideIn}px)`,
          backgroundColor: '#f5f0e1',
          padding: 40,
          boxShadow: '6px 6px 0px rgba(0,0,0,0.7)',
          border: '2px solid #1a1a1a',
          maxWidth: 1000,
          display: 'flex',
          gap: 40,
        }}>
          {/* Photo column */}
          <div style={{
            flex: '0 0 400px',
            border: '3px solid #1a1a1a',
            backgroundColor: '#1a1a1a',
            overflow: 'hidden',
            height: 500,
          }}>
            <KenBurns step={eventIndex} intensity={0.7}>
              <Img
                src={imageUrl}
                style={{
                  width: '100%',
                  height: '100%',
                  objectFit: 'cover',
                  objectPosition: 'top',
                }}
              />
            </KenBurns>
          </div>

          {/* Text column - newspaper style */}
          <div style={{
            flex: 1,
            display: 'flex',
            flexDirection: 'column',
          }}>
            {/* Date header */}
            <div style={{
              fontFamily: fontBody,
              fontSize: 20,
              color: '#666',
              borderBottom: '2px solid #1a1a1a',
              paddingBottom: 8,
              marginBottom: 16,
              letterSpacing: '0.15em',
              textTransform: 'uppercase',
            }}>
              {formatRetroDate(event.date)} — {event.category}
            </div>

            {/* Headline */}
            <h1 style={{
              fontFamily: fontHeadline,
              fontSize: 56,
              color: inkColor,
              lineHeight: 1.0,
              textTransform: 'uppercase',
              marginBottom: 24,
              opacity: titleReveal,
              letterSpacing: '-0.02em',
            }}>
              {event.title}
            </h1>

            {/* Body text - monospace terminal style */}
            <p style={{
              fontFamily: fontBody,
              fontSize: 28,
              color: inkColor,
              lineHeight: 1.5,
              opacity: descReveal,
            }}>
              {event.description}
            </p>

            {/* Year stamp */}
            <div style={{
              marginTop: 'auto',
              fontFamily: fontHeadline,
              fontSize: 120,
              color: 'rgba(0,0,0,0.08)',
              textAlign: 'right',
              lineHeight: 1,
            }}>
              {event.year}
            </div>
          </div>
        </div>
      </AbsoluteFill>
    );
  }

  // Layout 2: Full-bleed photo with overlay text (magazine cover style)
  return (
    <AbsoluteFill style={{ 
      backgroundColor: '#1a1a1a',
      opacity: fadeIn,
    }}>
      {/* Full background image with Ken Burns */}
      <AbsoluteFill>
        <KenBurns step={eventIndex} intensity={0.9}>
          <Img
            src={imageUrl}
            style={{
              width: '100%',
              height: '100%',
              objectFit: 'cover',
              objectPosition: 'top',
            }}
          />
        </KenBurns>
      </AbsoluteFill>

      {/* Dark gradient overlay for text legibility */}
      <AbsoluteFill style={{
        background: 'linear-gradient(0deg, rgba(0,0,0,0.85) 0%, rgba(0,0,0,0.3) 50%, rgba(0,0,0,0.6) 100%)',
      }} />

      {/* Content overlay */}
      <div style={{
        position: 'absolute',
        bottom: 80,
        left: 80,
        right: 80,
        transform: `translateY(${slideIn}px)`,
      }}>
        {/* Category badge */}
        <div style={{
          display: 'inline-block',
          backgroundColor: accentColor,
          color: inkColor,
          fontFamily: fontHeadline,
          fontSize: 20,
          padding: '10px 20px',
          marginBottom: 20,
          boxShadow: '4px 4px 0px rgba(0,0,0,0.5)',
          textTransform: 'uppercase',
        }}>
          {event.category}
        </div>

        {/* Date */}
        <div style={{
          fontFamily: fontBody,
          fontSize: 32,
          color: '#fff',
          marginBottom: 12,
          letterSpacing: '0.1em',
          textShadow: '2px 2px 0px #000',
        }}>
          {formatRetroDate(event.date)}
        </div>

        {/* Headline */}
        <h1 style={{
          fontFamily: fontHeadline,
          fontSize: 90,
          color: '#fff',
          lineHeight: 0.95,
          textTransform: 'uppercase',
          marginBottom: 24,
          opacity: titleReveal,
          textShadow: '4px 4px 0px #000',
          maxWidth: 1200,
        }}>
          {event.title}
        </h1>

        {/* Description */}
        <p style={{
          fontFamily: fontBody,
          fontSize: 32,
          color: '#eee',
          lineHeight: 1.4,
          opacity: descReveal,
          maxWidth: 900,
          textShadow: '2px 2px 0px #000',
        }}>
          {event.description}
        </p>
      </div>

      {/* Year watermark */}
      <div style={{
        position: 'absolute',
        top: 60,
        right: 80,
        fontFamily: fontHeadline,
        fontSize: 180,
        color: 'rgba(255,255,255,0.15)',
        lineHeight: 1,
        textShadow: '4px 4px 0px rgba(0,0,0,0.3)',
      }}>
        '{String(event.year).slice(-2)}
      </div>
    </AbsoluteFill>
  );
};
