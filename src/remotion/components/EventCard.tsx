import React from 'react';
import { AbsoluteFill, Img, interpolate, useCurrentFrame, useVideoConfig, spring } from 'remotion';
import { EventCardProps } from '../types';
import { EraTheme, TIMELINE_THEMES } from '../themes';

/**
 * Cinematic Parallax Event Card for Remotion video.
 * Creates depth through 3 layers moving at different speeds:
 *   Layer 1 (Background): Blurred/colored slow-moving backdrop
 *   Layer 2 (Photo): Ken Burns zoom/pan with era-specific filters
 *   Layer 3 (Text): Fast-floating text with kinetic entrance animations
 */
export const EventCard: React.FC<EventCardProps> = ({ event, imageUrl, eventIndex, periodLabel, theme }) => {
  const frame = useCurrentFrame();
  const { fps, durationInFrames } = useVideoConfig();

  // Fallback to default theme
  const t: EraTheme = theme || TIMELINE_THEMES['default'];

  // --- Parallax speeds (normalised 0→1 progress) ---
  const progress = frame / Math.max(durationInFrames, 1);

  // Layer 1 – Background: slowest movement
  const bgX = interpolate(progress, [0, 1], [0, -30], { extrapolateRight: 'clamp' });
  const bgScale = interpolate(progress, [0, 1], [1.15, 1.25], { extrapolateRight: 'clamp' });

  // Layer 2 – Photo: medium Ken Burns
  const kenBurnsPatterns = [
    { scaleFrom: 1.0, scaleTo: 1.15, xFrom: 0, xTo: -20, yFrom: 0, yTo: -10 },
    { scaleFrom: 1.15, scaleTo: 1.0, xFrom: -15, xTo: 15, yFrom: 5, yTo: -5 },
    { scaleFrom: 1.05, scaleTo: 1.18, xFrom: 10, xTo: -10, yFrom: -8, yTo: 8 },
  ];
  const kb = kenBurnsPatterns[eventIndex % kenBurnsPatterns.length];
  const photoScale = interpolate(progress, [0, 1], [kb.scaleFrom, kb.scaleTo], { extrapolateRight: 'clamp' });
  const photoX = interpolate(progress, [0, 1], [kb.xFrom, kb.xTo], { extrapolateRight: 'clamp' });
  const photoY = interpolate(progress, [0, 1], [kb.yFrom, kb.yTo], { extrapolateRight: 'clamp' });

  // Layer 3 – Text: fastest parallax drift
  const textDriftY = interpolate(progress, [0, 1], [10, -20], { extrapolateRight: 'clamp' });

  // --- Kinetic entrance animations ---
  const titleSpring = spring({ frame, fps, config: { damping: 14, stiffness: 120 } });
  const titleX = interpolate(titleSpring, [0, 1], [-120, 0]);
  const titleOpacity = interpolate(titleSpring, [0, 1], [0, 1]);

  const yearSpring = spring({ frame, fps, config: { damping: 12, stiffness: 100 }, delay: 4 });
  const yearScale = interpolate(yearSpring, [0, 1], [0.3, 1]);
  const yearOpacity = interpolate(yearSpring, [0, 1], [0, 1]);

  const descSpring = spring({ frame, fps, config: { damping: 16, stiffness: 80 }, delay: 10 });
  const descOpacity = interpolate(descSpring, [0, 1], [0, 1]);
  const descY = interpolate(descSpring, [0, 1], [40, 0]);

  const dateSpring = spring({ frame, fps, config: { damping: 18, stiffness: 90 }, delay: 6 });
  const dateOpacity = interpolate(dateSpring, [0, 1], [0, 0.85]);
  const dateX = interpolate(dateSpring, [0, 1], [60, 0]);

  // Fade-in for the whole card
  const fadeIn = interpolate(frame, [0, 8], [0, 1], { extrapolateRight: 'clamp' });

  // Layout alternation for visual variety
  const isReversed = eventIndex % 2 === 1;

  return (
    <AbsoluteFill style={{ opacity: fadeIn, backgroundColor: t.colors.background }}>

      {/* ===== LAYER 1: Background – blurred slow parallax ===== */}
      <div
        style={{
          position: 'absolute',
          inset: -60,
          transform: `translateX(${bgX}px) scale(${bgScale})`,
          filter: 'blur(40px) brightness(0.5)',
          willChange: 'transform',
        }}
      >
        <Img
          src={imageUrl}
          style={{
            width: '100%',
            height: '100%',
            objectFit: 'cover',
            filter: t.filters.image,
          }}
        />
      </div>

      {/* Color overlay from theme */}
      {t.filters.overlay !== 'none' && (
        <div
          style={{
            position: 'absolute',
            inset: 0,
            background: t.filters.overlay,
            zIndex: 2,
            pointerEvents: 'none',
          }}
        />
      )}

      {/* ===== LAYER 2: Photo – Ken Burns with era filter ===== */}
      <div
        style={{
          position: 'absolute',
          top: 60,
          bottom: 60,
          left: isReversed ? 60 : undefined,
          right: isReversed ? undefined : 60,
          width: '55%',
          borderRadius: 16,
          overflow: 'hidden',
          boxShadow: `0 40px 80px -20px rgba(0,0,0,0.6), 0 0 0 1px ${t.colors.accent}33`,
          zIndex: 5,
        }}
      >
        <div
          style={{
            width: '100%',
            height: '100%',
            transform: `scale(${photoScale}) translate(${photoX}px, ${photoY}px)`,
            willChange: 'transform',
          }}
        >
          <Img
            src={imageUrl}
            style={{
              width: '100%',
              height: '100%',
              objectFit: 'cover',
              objectPosition: 'top',
              filter: t.filters.image,
            }}
          />
        </div>
      </div>

      {/* ===== LAYER 3: Text & Date – fast floating parallax ===== */}
      <div
        style={{
          position: 'absolute',
          top: 0,
          bottom: 0,
          left: isReversed ? undefined : 60,
          right: isReversed ? 60 : undefined,
          width: '42%',
          display: 'flex',
          flexDirection: 'column',
          justifyContent: 'center',
          padding: '60px 40px',
          transform: `translateY(${textDriftY}px)`,
          zIndex: 10,
          willChange: 'transform',
        }}
      >
        {/* Year – big kinetic entrance */}
        <div
          style={{
            fontFamily: t.fonts.heading,
            fontSize: 180,
            fontWeight: 900,
            color: t.colors.accent,
            lineHeight: 0.85,
            marginBottom: 20,
            opacity: yearOpacity,
            transform: `scale(${yearScale})`,
            transformOrigin: isReversed ? 'right center' : 'left center',
            textShadow: `0 4px 30px ${t.colors.accent}66`,
          }}
        >
          {event.year}
        </div>

        {/* Date – slide in */}
        <div
          style={{
            fontFamily: t.fonts.body,
            fontSize: 16,
            textTransform: 'uppercase',
            letterSpacing: '0.25em',
            color: t.colors.text,
            opacity: dateOpacity,
            transform: `translateX(${dateX}px)`,
            marginBottom: 24,
          }}
        >
          {event.date}
        </div>

        {/* Title – kinetic slide-in */}
        <h1
          style={{
            fontFamily: t.fonts.heading,
            fontSize: 64,
            fontWeight: 900,
            color: t.colors.text,
            lineHeight: 1.05,
            marginBottom: 28,
            opacity: titleOpacity,
            transform: `translateX(${titleX}px)`,
            textShadow: `0 2px 20px ${t.colors.background}88`,
          }}
        >
          {event.title}
        </h1>

        {/* Description – fade up */}
        <p
          style={{
            fontFamily: t.fonts.body,
            fontSize: 30,
            fontWeight: 300,
            color: t.colors.text,
            lineHeight: 1.65,
            opacity: descOpacity,
            transform: `translateY(${descY}px)`,
            maxWidth: 600,
            textShadow: `0 1px 10px ${t.colors.background}aa`,
          }}
        >
          {event.description}
        </p>

        {/* Period label */}
        {periodLabel && (
          <div
            style={{
              marginTop: 30,
              fontFamily: t.fonts.body,
              fontSize: 13,
              textTransform: 'uppercase',
              letterSpacing: '0.3em',
              color: `${t.colors.text}88`,
              opacity: descOpacity,
            }}
          >
            {periodLabel}
          </div>
        )}
      </div>

      {/* Corner accent line */}
      <div
        style={{
          position: 'absolute',
          bottom: 40,
          left: isReversed ? undefined : 60,
          right: isReversed ? 60 : undefined,
          width: interpolate(frame, [5, 30], [0, 180], { extrapolateRight: 'clamp' }),
          height: 3,
          backgroundColor: t.colors.accent,
          zIndex: 15,
          borderRadius: 2,
        }}
      />
    </AbsoluteFill>
  );
};
