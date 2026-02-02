import React from 'react';
import { AbsoluteFill, Img, interpolate, useCurrentFrame } from 'remotion';
import { EventCardProps } from '../types';

/**
 * Playful event card for Remotion video with varied layouts.
 * Inspired by the editorial patterns from TimelineStoryPage.
 */
export const EventCard: React.FC<EventCardProps> = ({ event, imageUrl, eventIndex, periodLabel }) => {
  const frame = useCurrentFrame();
  
  // Animation values
  const fadeIn = interpolate(frame, [0, 15], [0, 1], { extrapolateRight: 'clamp' });
  const titleY = interpolate(frame, [5, 20], [25, 0], { extrapolateRight: 'clamp' });
  const descOpacity = interpolate(frame, [12, 25], [0, 1], { extrapolateRight: 'clamp' });
  const imageScale = interpolate(frame, [0, 20], [1.05, 1], { extrapolateRight: 'clamp' });

  // Rotate between 3 layout patterns
  const layoutPattern = eventIndex % 3;

  // Shared period badge (top-right)
  const PeriodBadge = () => (
    <div style={{
      position: 'absolute',
      top: 40,
      right: 50,
      fontFamily: 'ui-monospace, SFMono-Regular, monospace',
      fontSize: 14,
      textTransform: 'uppercase',
      letterSpacing: '0.15em',
      color: 'rgba(100, 100, 100, 0.8)',
      padding: '8px 16px',
      borderRadius: 4,
      backgroundColor: 'rgba(245, 245, 240, 0.9)',
      backdropFilter: 'blur(4px)',
      zIndex: 50,
    }}>
      {periodLabel || `${event.year}`}
    </div>
  );

  // Layout 0: "THE SHOUT" - Giant year background, centered text
  if (layoutPattern === 0) {
    return (
      <AbsoluteFill style={{ backgroundColor: '#f5f5f0', opacity: fadeIn }}>
        <PeriodBadge />
        
        {/* Giant background year */}
        <div style={{
          position: 'absolute',
          inset: 0,
          display: 'flex',
          alignItems: 'center',
          justifyContent: 'center',
          opacity: 0.04,
        }}>
          <span style={{
            fontFamily: 'ui-serif, Georgia, serif',
            fontSize: 500,
            fontWeight: 900,
            color: '#1a1a1a',
            lineHeight: 0.8,
          }}>
            {event.year}
          </span>
        </div>
        
        {/* Center content */}
        <div style={{
          position: 'relative',
          zIndex: 10,
          height: '100%',
          display: 'flex',
          flexDirection: 'column',
          alignItems: 'center',
          justifyContent: 'center',
          padding: 80,
          textAlign: 'center',
        }}>
          {/* Date */}
          <div style={{
            fontFamily: 'ui-monospace, SFMono-Regular, monospace',
            fontSize: 14,
            textTransform: 'uppercase',
            letterSpacing: '0.3em',
            color: '#888',
            marginBottom: 24,
          }}>
            {event.date}
          </div>
          
          {/* Title */}
          <h1 style={{
            fontFamily: 'ui-serif, Georgia, serif',
            fontSize: 72,
            fontWeight: 900,
            color: '#1a1a1a',
            lineHeight: 1.0,
            marginBottom: 32,
            maxWidth: 900,
            transform: `translateY(${titleY}px)`,
          }}>
            {event.title}
          </h1>
          
          {/* Description */}
          <p style={{
            fontFamily: 'ui-sans-serif, system-ui, sans-serif',
            fontSize: 24,
            color: '#555',
            lineHeight: 1.6,
            maxWidth: 700,
            opacity: descOpacity,
          }}>
            {event.description}
          </p>
        </div>
        
        {/* Small floating image - bottom right */}
        <div style={{
          position: 'absolute',
          bottom: 50,
          right: 60,
          width: 280,
          transform: `rotate(3deg) scale(${imageScale})`,
          boxShadow: '0 25px 50px -12px rgba(0, 0, 0, 0.25)',
          borderRadius: 12,
          overflow: 'hidden',
        }}>
          <Img src={imageUrl} style={{ width: '100%', height: 'auto' }} />
        </div>
      </AbsoluteFill>
    );
  }

  // Layout 1: "THE MAGAZINE" - Side-by-side with drop cap
  if (layoutPattern === 1) {
    return (
      <AbsoluteFill style={{ backgroundColor: '#f5f5f0', opacity: fadeIn }}>
        <PeriodBadge />
        
        {/* Two-column layout */}
        <div style={{
          display: 'flex',
          flexDirection: 'row',
          height: '100%',
          padding: 60,
          gap: 60,
        }}>
          {/* Left: Image */}
          <div style={{
            flex: '0 0 50%',
            display: 'flex',
            alignItems: 'center',
            justifyContent: 'center',
          }}>
            <div style={{
              position: 'relative',
              borderRadius: 12,
              overflow: 'hidden',
              boxShadow: '0 25px 50px -12px rgba(0, 0, 0, 0.25)',
              transform: `scale(${imageScale})`,
              maxHeight: 650,
            }}>
              <Img
                src={imageUrl}
                style={{
                  width: '100%',
                  maxHeight: 650,
                  objectFit: 'cover',
                  objectPosition: 'top',
                }}
              />
              {/* Date badge on image */}
              <div style={{
                position: 'absolute',
                bottom: 20,
                left: 20,
                backgroundColor: 'rgba(0, 0, 0, 0.7)',
                color: 'white',
                padding: '10px 20px',
                borderRadius: 24,
                fontFamily: 'ui-monospace, SFMono-Regular, monospace',
                fontSize: 14,
                letterSpacing: '0.1em',
              }}>
                {event.date}
              </div>
            </div>
          </div>

          {/* Right: Text content */}
          <div style={{
            flex: 1,
            display: 'flex',
            flexDirection: 'column',
            justifyContent: 'center',
            paddingRight: 40,
          }}>
            {/* Category */}
            <div style={{
              fontFamily: 'ui-monospace, SFMono-Regular, monospace',
              fontSize: 12,
              textTransform: 'uppercase',
              letterSpacing: '0.2em',
              color: '#888',
              marginBottom: 20,
            }}>
              {event.category}
            </div>

            {/* Title */}
            <h1 style={{
              fontFamily: 'ui-serif, Georgia, serif',
              fontSize: 52,
              fontWeight: 700,
              color: '#1a1a1a',
              lineHeight: 1.1,
              marginBottom: 28,
              transform: `translateY(${titleY}px)`,
            }}>
              {event.title}
            </h1>

            {/* Description with drop cap */}
            <p style={{
              fontFamily: 'ui-sans-serif, system-ui, sans-serif',
              fontSize: 22,
              color: '#555',
              lineHeight: 1.65,
              opacity: descOpacity,
            }}>
              <span style={{
                fontFamily: 'ui-serif, Georgia, serif',
                float: 'left',
                fontSize: 80,
                fontWeight: 800,
                lineHeight: 0.75,
                marginRight: 14,
                marginTop: 6,
                color: '#1a1a1a',
              }}>
                {event.description.charAt(0)}
              </span>
              {event.description.slice(1)}
            </p>
          </div>
        </div>
      </AbsoluteFill>
    );
  }

  // Layout 2: "THE WHISPER" - Large image, text overlay card
  return (
    <AbsoluteFill style={{ backgroundColor: '#f5f5f0', opacity: fadeIn }}>
      <PeriodBadge />
      
      {/* Large background image */}
      <div style={{
        position: 'absolute',
        inset: 80,
        borderRadius: 20,
        overflow: 'hidden',
        transform: `scale(${imageScale})`,
      }}>
        <Img
          src={imageUrl}
          style={{
            width: '100%',
            height: '100%',
            objectFit: 'cover',
            objectPosition: 'top',
          }}
        />
      </div>
      
      {/* Text overlay card - bottom left */}
      <div style={{
        position: 'absolute',
        bottom: 100,
        left: 100,
        maxWidth: 500,
        backgroundColor: 'rgba(255, 255, 255, 0.95)',
        backdropFilter: 'blur(8px)',
        padding: 40,
        borderRadius: 16,
        boxShadow: '0 25px 50px -12px rgba(0, 0, 0, 0.15)',
        zIndex: 20,
      }}>
        {/* Date */}
        <div style={{
          fontFamily: 'ui-monospace, SFMono-Regular, monospace',
          fontSize: 11,
          textTransform: 'uppercase',
          letterSpacing: '0.2em',
          color: '#888',
          marginBottom: 12,
        }}>
          {event.date}
        </div>
        
        {/* Title */}
        <h1 style={{
          fontFamily: 'ui-serif, Georgia, serif',
          fontSize: 32,
          fontWeight: 700,
          color: '#1a1a1a',
          lineHeight: 1.15,
          marginBottom: 16,
          transform: `translateY(${titleY}px)`,
        }}>
          {event.title}
        </h1>
        
        {/* Description */}
        <p style={{
          fontFamily: 'ui-sans-serif, system-ui, sans-serif',
          fontSize: 17,
          color: '#666',
          lineHeight: 1.6,
          opacity: descOpacity,
        }}>
          {event.description}
        </p>
      </div>
    </AbsoluteFill>
  );
};
