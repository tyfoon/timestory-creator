import React from 'react';
import { AbsoluteFill, interpolate, useCurrentFrame } from 'remotion';

interface TransitionSlideProps {
  year: number;
  durationFrames: number;
}

/**
 * Simple transition slide showing the year.
 * Used between event segments for visual pacing.
 */
export const TransitionSlide: React.FC<TransitionSlideProps> = ({ year, durationFrames }) => {
  const frame = useCurrentFrame();
  
  // Fade in/out
  const fadeIn = interpolate(frame, [0, 15], [0, 1], { extrapolateRight: 'clamp' });
  const fadeOut = interpolate(
    frame,
    [durationFrames - 15, durationFrames],
    [1, 0],
    { extrapolateLeft: 'clamp' }
  );
  const opacity = Math.min(fadeIn, fadeOut);
  
  // Scale animation
  const scale = interpolate(frame, [0, durationFrames], [0.95, 1.05], { extrapolateRight: 'clamp' });

  return (
    <AbsoluteFill style={{
      backgroundColor: '#1a1a1a',
      display: 'flex',
      alignItems: 'center',
      justifyContent: 'center',
      opacity,
    }}>
      <span style={{
        fontFamily: 'ui-serif, Georgia, Cambria, serif',
        fontSize: 200,
        fontWeight: 900,
        color: '#f5f5f0',
        letterSpacing: '-0.05em',
        transform: `scale(${scale})`,
      }}>
        {year}
      </span>
    </AbsoluteFill>
  );
};
