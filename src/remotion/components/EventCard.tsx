import React from 'react';
import { AbsoluteFill, Img, interpolate, useCurrentFrame } from 'remotion';
import { EventCardProps } from '../types';
import { KenBurns } from './KenBurns';

/**
 * Playful event card for Remotion video with varied layouts.
 * Inspired by the editorial patterns from TimelineStoryPage.
 * Features dramatic typography with extreme font size contrasts.
 */
export const EventCard: React.FC<EventCardProps> = ({ event, imageUrl, eventIndex, periodLabel }) => {
  const frame = useCurrentFrame();
  
  // Animation values - snappy entrance
  const fadeIn = interpolate(frame, [0, 10], [0, 1], { extrapolateRight: 'clamp' });
  const titleY = interpolate(frame, [3, 15], [30, 0], { extrapolateRight: 'clamp' });
  const descOpacity = interpolate(frame, [8, 18], [0, 1], { extrapolateRight: 'clamp' });
  const imageScale = interpolate(frame, [0, 15], [1.08, 1], { extrapolateRight: 'clamp' });
  const letterSpacing = interpolate(frame, [0, 20], [20, 0], { extrapolateRight: 'clamp' });

  // Rotate between 3 layout patterns
  const layoutPattern = eventIndex % 3;

  // Shared styles - editorial typography inspired by TimelineStoryPage
  const fontSerif = 'Georgia, "Times New Roman", serif';
  const fontSans = 'system-ui, -apple-system, "Segoe UI", sans-serif';
  const fontMono = 'ui-monospace, SFMono-Regular, "SF Mono", monospace';

  // Period badge (top-right) - minimal, elegant
  const PeriodBadge = () => (
    <div style={{
      position: 'absolute',
      top: 40,
      right: 50,
      fontFamily: fontMono,
      fontSize: 13,
      textTransform: 'uppercase',
      letterSpacing: '0.2em',
      color: 'rgba(80, 80, 80, 0.7)',
      zIndex: 50,
    }}>
      {periodLabel || `${event.year}`}
    </div>
  );

  // Layout 0: "THE SHOUT" - Giant year background, massive title, minimal image
  if (layoutPattern === 0) {
    return (
      <AbsoluteFill style={{ backgroundColor: '#f8f8f5', opacity: fadeIn }}>
        <PeriodBadge />
        
        {/* Giant background year - extreme scale like TimelineStoryPage */}
        <div style={{
          position: 'absolute',
          inset: 0,
          display: 'flex',
          alignItems: 'center',
          justifyContent: 'center',
          opacity: 0.03,
        }}>
          <span style={{
            fontFamily: fontSerif,
            fontSize: 650,
            fontWeight: 900,
            color: '#1a1a1a',
            lineHeight: 0.75,
            letterSpacing: '-0.05em',
          }}>
            {event.year}
          </span>
        </div>
        
        {/* Center content - positioned higher to avoid photo overlap */}
        <div style={{
          position: 'relative',
          zIndex: 10,
          height: '100%',
          display: 'flex',
          flexDirection: 'column',
          alignItems: 'center',
          justifyContent: 'flex-start',
          padding: '120px 100px 60px 100px',
          textAlign: 'center',
        }}>
          {/* Date - tiny monospace with extreme letter-spacing */}
          <div style={{
            fontFamily: fontMono,
            fontSize: 11,
            textTransform: 'uppercase',
            letterSpacing: `${0.3 + letterSpacing * 0.01}em`,
            color: '#888',
            marginBottom: 30,
          }}>
            {event.date}
          </div>
          
          {/* Title - MASSIVE, bold serif */}
          <h1 style={{
            fontFamily: fontSerif,
            fontSize: 100,
            fontWeight: 900,
            color: '#1a1a1a',
            lineHeight: 0.95,
            marginBottom: 40,
            maxWidth: 1100,
            transform: `translateY(${titleY}px)`,
            letterSpacing: '-0.02em',
          }}>
            {event.title}
          </h1>
          
          {/* Description - light sans, generous line height */}
          <p style={{
            fontFamily: fontSans,
            fontSize: 36,
            fontWeight: 300,
            color: '#444',
            lineHeight: 1.65,
            maxWidth: 900,
            opacity: descOpacity,
          }}>
            {event.description}
          </p>
        </div>
        
        {/* Floating image with Ken Burns effect - larger size */}
        <div style={{
          position: 'absolute',
          bottom: 40,
          right: 50,
          width: 550,
          height: 420,
          transform: `rotate(2deg)`,
          boxShadow: '0 35px 70px -15px rgba(0, 0, 0, 0.3)',
          borderRadius: 10,
          overflow: 'hidden',
        }}>
          <KenBurns step={eventIndex} intensity={0.6}>
            <Img src={imageUrl} style={{ width: '100%', height: '100%', objectFit: 'cover', objectPosition: 'top' }} />
          </KenBurns>
        </div>
      </AbsoluteFill>
    );
  }

  // Layout 1: "THE MAGAZINE" - Side-by-side with massive drop cap
  if (layoutPattern === 1) {
    const firstLetter = event.description.charAt(0).toUpperCase();
    const restOfDescription = event.description.slice(1);
    
    return (
      <AbsoluteFill style={{ backgroundColor: '#f8f8f5', opacity: fadeIn }}>
        <PeriodBadge />
        
        {/* Two-column magazine layout */}
        <div style={{
          display: 'flex',
          flexDirection: 'row',
          height: '100%',
          padding: 50,
          gap: 50,
        }}>
          {/* Left: Image with date badge */}
          <div style={{
            flex: '0 0 52%',
            display: 'flex',
            alignItems: 'center',
            justifyContent: 'center',
          }}>
            <div style={{
              position: 'relative',
              borderRadius: 12,
              overflow: 'hidden',
              boxShadow: '0 35px 70px -15px rgba(0, 0, 0, 0.35)',
              width: '100%',
              height: 780,
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
              {/* Date badge on image */}
              <div style={{
                position: 'absolute',
                bottom: 25,
                left: 25,
                backgroundColor: 'rgba(0, 0, 0, 0.8)',
                color: 'white',
                padding: '14px 28px',
                borderRadius: 30,
                fontFamily: fontMono,
                fontSize: 14,
                letterSpacing: '0.15em',
                textTransform: 'uppercase',
                zIndex: 10,
              }}>
                {event.date}
              </div>
            </div>
          </div>

          {/* Right: Text content with editorial styling */}
          <div style={{
            flex: 1,
            display: 'flex',
            flexDirection: 'column',
            justifyContent: 'center',
            paddingRight: 30,
          }}>
            {/* Category - tiny, tracked out */}
            <div style={{
              fontFamily: fontMono,
              fontSize: 10,
              textTransform: 'uppercase',
              letterSpacing: '0.25em',
              color: '#999',
              marginBottom: 24,
            }}>
              {event.category}
            </div>

            {/* Title - large serif, tight leading */}
            <h1 style={{
              fontFamily: fontSerif,
              fontSize: 68,
              fontWeight: 700,
              color: '#1a1a1a',
              lineHeight: 1.05,
              marginBottom: 35,
              transform: `translateY(${titleY}px)`,
              letterSpacing: '-0.01em',
            }}>
              {event.title}
            </h1>

            {/* Description with giant drop cap - magazine style */}
            <div style={{
              fontFamily: fontSans,
              fontSize: 34,
              fontWeight: 300,
              color: '#444',
              lineHeight: 1.7,
              opacity: descOpacity,
            }}>
              {/* Drop cap - massive serif initial */}
              <span style={{
                fontFamily: fontSerif,
                float: 'left',
                fontSize: 120,
                fontWeight: 900,
                lineHeight: 0.7,
                marginRight: 18,
                marginTop: 10,
                color: '#1a1a1a',
              }}>
                {firstLetter}
              </span>
              {restOfDescription}
            </div>
          </div>
        </div>
      </AbsoluteFill>
    );
  }

  // Layout 2: "THE WHISPER" - Large image, floating text card with elegant type
  return (
    <AbsoluteFill style={{ backgroundColor: '#f8f8f5', opacity: fadeIn }}>
      <PeriodBadge />
      
      {/* Large background image with Ken Burns effect */}
      <div style={{
        position: 'absolute',
        top: 60,
        left: 60,
        right: 60,
        bottom: 60,
        borderRadius: 16,
        overflow: 'hidden',
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
      
      {/* Elegant floating text card - bottom left, larger */}
      <div style={{
        position: 'absolute',
        bottom: 70,
        left: 70,
        maxWidth: 580,
        backgroundColor: 'rgba(255, 255, 255, 0.97)',
        backdropFilter: 'blur(12px)',
        padding: '40px 48px',
        borderRadius: 14,
        boxShadow: '0 35px 70px -15px rgba(0, 0, 0, 0.25)',
        zIndex: 20,
      }}>
        {/* Date - whisper small */}
        <div style={{
          fontFamily: fontMono,
          fontSize: 12,
          textTransform: 'uppercase',
          letterSpacing: '0.25em',
          color: '#888',
          marginBottom: 16,
        }}>
          {event.date}
        </div>
        
        {/* Title - medium serif, weighted */}
        <h1 style={{
          fontFamily: fontSerif,
          fontSize: 42,
          fontWeight: 700,
          color: '#1a1a1a',
          lineHeight: 1.15,
          marginBottom: 22,
          transform: `translateY(${titleY}px)`,
        }}>
          {event.title}
        </h1>
        
        {/* Description - light, airy */}
        <p style={{
          fontFamily: fontSans,
          fontSize: 29,
          fontWeight: 300,
          color: '#555',
          lineHeight: 1.7,
          opacity: descOpacity,
        }}>
          {event.description}
        </p>
      </div>
    </AbsoluteFill>
  );
};
