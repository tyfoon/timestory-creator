import React from 'react';
import { AbsoluteFill, Img, interpolate, useCurrentFrame } from 'remotion';
import { EventCardProps } from '../types';

/**
 * Static event card for Remotion video - no interactive elements.
 * Styled similar to the Magazine layout pattern from TimelineStoryPage.
 */
export const EventCard: React.FC<EventCardProps> = ({ event, imageUrl }) => {
  const frame = useCurrentFrame();
  
  // Fade in animation
  const opacity = interpolate(frame, [0, 20], [0, 1], { extrapolateRight: 'clamp' });
  const titleY = interpolate(frame, [5, 25], [30, 0], { extrapolateRight: 'clamp' });
  const descY = interpolate(frame, [15, 35], [20, 0], { extrapolateRight: 'clamp' });
  const descOpacity = interpolate(frame, [15, 35], [0, 1], { extrapolateRight: 'clamp' });

  return (
    <AbsoluteFill style={{ backgroundColor: '#f5f5f0' }}>
      {/* Two-column layout */}
      <div style={{
        display: 'flex',
        flexDirection: 'row',
        height: '100%',
        padding: 60,
        gap: 60,
        opacity,
      }}>
        {/* Left: Image */}
        <div style={{
          flex: '0 0 45%',
          display: 'flex',
          flexDirection: 'column',
          justifyContent: 'center',
        }}>
          <div style={{
            position: 'relative',
            borderRadius: 8,
            overflow: 'hidden',
            boxShadow: '0 25px 50px -12px rgba(0, 0, 0, 0.25)',
          }}>
            <Img
              src={imageUrl}
              style={{
                width: '100%',
                height: 'auto',
                maxHeight: 600,
                objectFit: 'cover',
                objectPosition: 'top',
              }}
            />
            {/* Year badge */}
            <div style={{
              position: 'absolute',
              bottom: 16,
              right: 16,
              backgroundColor: 'rgba(0, 0, 0, 0.7)',
              color: 'white',
              padding: '8px 16px',
              borderRadius: 20,
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
          {/* Category badge */}
          <div style={{
            fontFamily: 'ui-monospace, SFMono-Regular, monospace',
            fontSize: 12,
            textTransform: 'uppercase',
            letterSpacing: '0.2em',
            color: '#888',
            marginBottom: 16,
          }}>
            {event.category}
          </div>

          {/* Title */}
          <h1 style={{
            fontFamily: 'ui-serif, Georgia, Cambria, serif',
            fontSize: 48,
            fontWeight: 700,
            color: '#1a1a1a',
            lineHeight: 1.1,
            marginBottom: 24,
            transform: `translateY(${titleY}px)`,
          }}>
            {event.title}
          </h1>

          {/* Description with drop cap */}
          <p style={{
            fontFamily: 'ui-sans-serif, system-ui, sans-serif',
            fontSize: 22,
            color: '#555',
            lineHeight: 1.6,
            opacity: descOpacity,
            transform: `translateY(${descY}px)`,
          }}>
            <span style={{
              fontFamily: 'ui-serif, Georgia, Cambria, serif',
              float: 'left',
              fontSize: 72,
              fontWeight: 800,
              lineHeight: 0.8,
              marginRight: 12,
              marginTop: 4,
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
};
