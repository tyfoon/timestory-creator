import React from 'react';
import { AbsoluteFill, interpolate, useCurrentFrame, spring, useVideoConfig } from 'remotion';
import { EraTheme, TIMELINE_THEMES } from '../themes';

interface IntroCardProps {
  storyTitle: string;
  storyIntroduction?: string;
  theme?: EraTheme;
}

/**
 * Cinematic intro card with era-themed styling.
 * Shows "ready" prompt at frame 0, then dramatic title reveal.
 */
export const IntroCard: React.FC<IntroCardProps> = ({ storyTitle, storyIntroduction, theme }) => {
  const frame = useCurrentFrame();
  const { fps } = useVideoConfig();
  const t = theme || TIMELINE_THEMES['default'];

  const words = storyTitle.split(' ');

  // "Ready" prompt visible at frame 0, fades out
  const readyOpacity = interpolate(frame, [0, 10], [1, 0], { extrapolateRight: 'clamp' });

  // Introduction fade in
  const introSpring = spring({ frame, fps, config: { damping: 16, stiffness: 70 }, delay: 60 });
  const introOpacity = interpolate(introSpring, [0, 1], [0, 1]);
  const introY = interpolate(introSpring, [0, 1], [40, 0]);

  // Accent line animation
  const lineWidth = interpolate(frame, [30, 55], [0, 200], { extrapolateRight: 'clamp' });

  return (
    <AbsoluteFill style={{
      backgroundColor: t.colors.background,
      display: 'flex',
      flexDirection: 'column',
      alignItems: 'center',
      justifyContent: 'center',
      padding: 80,
    }}>
      {/* "Ready to play" message at frame 0 */}
      {readyOpacity > 0.01 && (
        <div style={{
          position: 'absolute',
          inset: 0,
          display: 'flex',
          flexDirection: 'column',
          alignItems: 'center',
          justifyContent: 'center',
          opacity: readyOpacity,
          zIndex: 20,
        }}>
          <div style={{
            fontFamily: t.fonts.heading,
            fontSize: 48,
            fontWeight: 700,
            color: t.colors.text,
            textAlign: 'center',
            lineHeight: 1.3,
          }}>
            🎬 Je persoonlijke muziekvideo is klaar
          </div>
          <div style={{
            fontFamily: t.fonts.body,
            fontSize: 24,
            color: `${t.colors.text}88`,
            marginTop: 20,
          }}>
            Druk op ▶ om af te spelen
          </div>
        </div>
      )}

      {/* Theme overlay */}
      {t.filters.overlay !== 'none' && (
        <div style={{
          position: 'absolute',
          inset: 0,
          background: t.filters.overlay,
          zIndex: 1,
          pointerEvents: 'none',
        }} />
      )}

      {/* Decorative background year/symbol */}
      <div style={{
        position: 'absolute',
        fontSize: 500,
        fontFamily: t.fonts.heading,
        color: `${t.colors.accent}08`,
        fontWeight: 900,
        userSelect: 'none',
        zIndex: 2,
      }}>
        ∞
      </div>

      {/* Title with staggered spring words */}
      <h1 style={{
        fontFamily: t.fonts.heading,
        fontSize: 80,
        fontWeight: 900,
        color: t.colors.text,
        lineHeight: 1.05,
        textAlign: 'center',
        maxWidth: 1400,
        marginBottom: 20,
        zIndex: 10,
      }}>
        {words.map((word, i) => {
          const wordSpring = spring({ frame, fps, config: { damping: 14, stiffness: 110 }, delay: 10 + i * 4 });
          const wordOpacity = interpolate(wordSpring, [0, 1], [0, 1]);
          const wordY = interpolate(wordSpring, [0, 1], [30, 0]);

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

      {/* Accent line under title */}
      <div style={{
        width: lineWidth,
        height: 3,
        backgroundColor: t.colors.accent,
        borderRadius: 2,
        marginBottom: 40,
        zIndex: 10,
      }} />

      {/* Introduction text */}
      {storyIntroduction && (
        <p style={{
          fontFamily: t.fonts.body,
          fontSize: 31,
          color: `${t.colors.text}cc`,
          lineHeight: 1.7,
          textAlign: 'center',
          maxWidth: 1200,
          opacity: introOpacity,
          transform: `translateY(${introY}px)`,
          zIndex: 10,
        }}>
          <span style={{
            fontFamily: t.fonts.heading,
            float: 'left',
            fontSize: 64,
            fontWeight: 800,
            lineHeight: 0.8,
            marginRight: 12,
            marginTop: 8,
            color: t.colors.accent,
          }}>
            {storyIntroduction.charAt(0)}
          </span>
          {storyIntroduction.slice(1)}
        </p>
      )}
    </AbsoluteFill>
  );
};
