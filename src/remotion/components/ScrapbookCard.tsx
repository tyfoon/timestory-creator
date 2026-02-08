import React from 'react';
import { Img } from 'remotion';
import { VideoEvent } from '../types';

interface ScrapbookCardProps {
  event: VideoEvent;
  imageUrl: string;
  eventIndex: number;
  isActive?: boolean;
}

/**
 * Static scrapbook card - no animations, designed for the canvas layout.
 * Animations are handled by the camera pan, not the card itself.
 */
export const ScrapbookCard: React.FC<ScrapbookCardProps> = ({
  event,
  imageUrl,
  eventIndex,
  isActive = false,
}) => {
  // Period-appropriate fonts
  const fontHeadline = '"Anton", "Impact", sans-serif';
  const fontBody = '"VT323", "Courier New", monospace';
  const fontHandwritten = '"Permanent Marker", cursive';

  // Retro color palette
  const paperColor = '#fdfbf7';
  const inkColor = '#1a1a1a';
  const accentColors = ['#ffeb3b', '#ff6b9d', '#00e5ff', '#76ff03'];
  const accentColor = accentColors[eventIndex % accentColors.length];

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

  // Alternate between card styles
  const layoutStyle = eventIndex % 2;

  if (layoutStyle === 0) {
    // Polaroid style
    return (
      <div
        style={{
          width: 600,
          backgroundColor: paperColor,
          padding: '16px 16px 70px 16px',
          boxShadow: isActive 
            ? '0 0 40px rgba(255,235,59,0.6), 8px 8px 0px rgba(0,0,0,0.8)'
            : '8px 8px 0px rgba(0,0,0,0.8)',
          border: '3px solid #1a1a1a',
          transition: 'box-shadow 0.3s ease',
        }}
      >
        {/* Photo area */}
        <div
          style={{
            width: '100%',
            height: 450,
            backgroundColor: '#1a1a1a',
            overflow: 'hidden',
            border: '2px solid #333',
          }}
        >
          <Img
            src={imageUrl}
            style={{
              width: '100%',
              height: '100%',
              objectFit: 'cover',
              objectPosition: 'center top',
            }}
          />
        </div>

        {/* Handwritten caption */}
        <div style={{ marginTop: 16, textAlign: 'center' }}>
          <div
            style={{
              fontFamily: fontBody,
              fontSize: 18,
              color: '#666',
              marginBottom: 6,
              letterSpacing: '0.1em',
            }}
          >
            {formatRetroDate(event.date)}
          </div>
          <h2
            style={{
              fontFamily: fontHandwritten,
              fontSize: 32,
              color: inkColor,
              lineHeight: 1.1,
              margin: 0,
            }}
          >
            {event.title}
          </h2>
        </div>

        {/* Category tape */}
        <div
          style={{
            position: 'absolute',
            top: -10,
            right: 30,
            backgroundColor: accentColor,
            color: inkColor,
            fontFamily: fontHeadline,
            fontSize: 14,
            padding: '6px 12px',
            transform: 'rotate(8deg)',
            boxShadow: '2px 2px 0px rgba(0,0,0,0.4)',
            textTransform: 'uppercase',
          }}
        >
          {event.category}
        </div>
      </div>
    );
  }

  // Newspaper clipping style
  return (
    <div
      style={{
        width: 650,
        backgroundColor: '#f5f0e1',
        padding: 24,
        boxShadow: isActive
          ? '0 0 40px rgba(255,235,59,0.6), 6px 6px 0px rgba(0,0,0,0.7)'
          : '6px 6px 0px rgba(0,0,0,0.7)',
        border: '2px solid #1a1a1a',
        transition: 'box-shadow 0.3s ease',
      }}
    >
      {/* Photo */}
      <div
        style={{
          width: '100%',
          height: 350,
          backgroundColor: '#1a1a1a',
          overflow: 'hidden',
          border: '2px solid #1a1a1a',
          marginBottom: 16,
        }}
      >
        <Img
          src={imageUrl}
          style={{
            width: '100%',
            height: '100%',
            objectFit: 'cover',
            objectPosition: 'center top',
          }}
        />
      </div>

      {/* Date header */}
      <div
        style={{
          fontFamily: fontBody,
          fontSize: 16,
          color: '#666',
          borderBottom: '2px solid #1a1a1a',
          paddingBottom: 6,
          marginBottom: 12,
          letterSpacing: '0.15em',
          textTransform: 'uppercase',
        }}
      >
        {formatRetroDate(event.date)} — {event.category}
      </div>

      {/* Headline */}
      <h2
        style={{
          fontFamily: fontHeadline,
          fontSize: 36,
          color: inkColor,
          lineHeight: 1.0,
          textTransform: 'uppercase',
          margin: 0,
          marginBottom: 12,
          letterSpacing: '-0.02em',
        }}
      >
        {event.title}
      </h2>

      {/* Body text - truncated */}
      <p
        style={{
          fontFamily: fontBody,
          fontSize: 26,
          color: inkColor,
          lineHeight: 1.4,
          margin: 0,
          overflow: 'hidden',
          display: '-webkit-box',
          WebkitLineClamp: 3,
          WebkitBoxOrient: 'vertical',
        }}
      >
        {event.description}
      </p>

      {/* Year stamp */}
      <div
        style={{
          position: 'absolute',
          bottom: 10,
          right: 15,
          fontFamily: fontHeadline,
          fontSize: 60,
          color: 'rgba(0,0,0,0.06)',
          lineHeight: 1,
        }}
      >
        '{String(event.year).slice(-2)}
      </div>
    </div>
  );
};
