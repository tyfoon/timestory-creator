import React from 'react';
import { AbsoluteFill, interpolate, useCurrentFrame, spring, useVideoConfig } from 'remotion';
import { getThemeForYear, EraTheme } from '../themes';

interface TransitionSlideProps {
  year: number;
  durationFrames: number;
}

/**
 * Cinematic transition slide showing the year with era-themed styling.
 * Used between event segments for visual pacing.
 */
export const TransitionSlide: React.FC<TransitionSlideProps> = ({ year, durationFrames }) => {
  const frame = useCurrentFrame();
  const { fps } = useVideoConfig();
  const theme = getThemeForYear(year);

  // Fade in/out
  const fadeIn = interpolate(frame, [0, 12], [0, 1], { extrapolateRight: 'clamp' });
  const fadeOut = interpolate(
    frame,
    [durationFrames - 10, durationFrames],
    [1, 0],
    { extrapolateLeft: 'clamp' }
  );
  const opacity = Math.min(fadeIn, fadeOut);

  // Spring scale for the year number
  const scaleSpring = spring({ frame, fps, config: { damping: 12, stiffness: 100 } });
  const scale = interpolate(scaleSpring, [0, 1], [0.6, 1]);

  return (
    <AbsoluteFill style={{
      backgroundColor: theme.colors.background,
      display: 'flex',
      alignItems: 'center',
      justifyContent: 'center',
      opacity,
    }}>
      {/* Accent line above */}
      <div style={{
        position: 'absolute',
        top: '42%',
        left: '50%',
        transform: 'translateX(-50%)',
        width: interpolate(frame, [3, 15], [0, 120], { extrapolateRight: 'clamp' }),
        height: 3,
        backgroundColor: theme.colors.accent,
        borderRadius: 2,
      }} />

      <span style={{
        fontFamily: theme.fonts.heading,
        fontSize: 220,
        fontWeight: 900,
        color: theme.colors.text,
        letterSpacing: '-0.03em',
        transform: `scale(${scale})`,
        textShadow: `0 4px 40px ${theme.colors.accent}55`,
      }}>
        {year}
      </span>

      {/* Accent line below */}
      <div style={{
        position: 'absolute',
        bottom: '42%',
        left: '50%',
        transform: 'translateX(-50%)',
        width: interpolate(frame, [3, 15], [0, 120], { extrapolateRight: 'clamp' }),
        height: 3,
        backgroundColor: theme.colors.accent,
        borderRadius: 2,
      }} />
    </AbsoluteFill>
  );
};
