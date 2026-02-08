import React from 'react';
import { AbsoluteFill, interpolate, useCurrentFrame } from 'remotion';

interface IntroCardProps {
  storyTitle: string;
  storyIntroduction?: string;
}

/**
 * Intro card showing the story title and introduction.
 * Dramatic typography with staggered reveal.
 */
export const IntroCard: React.FC<IntroCardProps> = ({ storyTitle, storyIntroduction }) => {
  const frame = useCurrentFrame();
  
  // Background fade
  const bgOpacity = interpolate(frame, [0, 30], [0, 1], { extrapolateRight: 'clamp' });
  
  // Title animation - word by word
  const words = storyTitle.split(' ');
  
  // Introduction fade in
  const introOpacity = interpolate(frame, [60, 90], [0, 1], { extrapolateRight: 'clamp' });
  const introY = interpolate(frame, [60, 90], [30, 0], { extrapolateRight: 'clamp' });

  return (
    <AbsoluteFill style={{ 
      backgroundColor: '#f5f5f0',
      display: 'flex',
      flexDirection: 'column',
      alignItems: 'center',
      justifyContent: 'center',
      padding: 80,
      opacity: bgOpacity,
    }}>
      {/* Decorative background symbol */}
      <div style={{
        position: 'absolute',
        fontSize: 400,
        fontFamily: 'ui-serif, Georgia, serif',
        color: 'rgba(0,0,0,0.03)',
        fontWeight: 900,
        userSelect: 'none',
      }}>
        ∞
      </div>

      {/* Title with staggered words */}
      <h1 style={{
        fontFamily: 'ui-serif, Georgia, Cambria, serif',
        fontSize: 72,
        fontWeight: 900,
        color: '#1a1a1a',
        lineHeight: 1.0,
        textAlign: 'center',
        maxWidth: 1400,
        marginBottom: 48,
        zIndex: 10,
      }}>
        {words.map((word, i) => {
          const wordOpacity = interpolate(
            frame,
            [10 + i * 5, 25 + i * 5],
            [0, 1],
            { extrapolateRight: 'clamp' }
          );
          const wordY = interpolate(
            frame,
            [10 + i * 5, 25 + i * 5],
            [20, 0],
            { extrapolateRight: 'clamp' }
          );
          
          return (
            <span
              key={i}
              style={{
                display: 'inline-block',
                marginRight: '0.25em',
                opacity: wordOpacity,
                transform: `translateY(${wordY}px)`,
                fontWeight: i % 2 === 0 ? 900 : 300,
              }}
            >
              {word}
            </span>
          );
        })}
      </h1>

      {/* Introduction text */}
      {storyIntroduction && (
        <p style={{
          fontFamily: 'ui-sans-serif, system-ui, sans-serif',
          fontSize: 31,
          color: '#555',
          lineHeight: 1.7,
          textAlign: 'center',
          maxWidth: 1200,
          opacity: introOpacity,
          transform: `translateY(${introY}px)`,
          zIndex: 10,
        }}>
          <span style={{
            fontFamily: 'ui-serif, Georgia, Cambria, serif',
            float: 'left',
            fontSize: 64,
            fontWeight: 800,
            lineHeight: 0.8,
            marginRight: 12,
            marginTop: 8,
            color: '#1a1a1a',
          }}>
            {storyIntroduction.charAt(0)}
          </span>
          {storyIntroduction.slice(1)}
        </p>
      )}
    </AbsoluteFill>
  );
};
