import React from 'react';
import { AbsoluteFill, Img, interpolate, useCurrentFrame, useVideoConfig, spring } from 'remotion';
import { EventCardProps } from '../types';
import { EraTheme, TIMELINE_THEMES } from '../themes';

/**
 * Fly-Through Event Card for Remotion video.
 * No background — sits on top of the global TimeTunnel.
 * 
 * Lifecycle phases (controlled by parent via durationInFrames):
 *   Enter  (0→20%):  scale 0.5, blur, opacity 0 → 1
 *   Active (20→70%): scale 1.0, sharp, full opacity
 *   Exit   (70→100%): scale 1.5→2.0, opacity 1 → 0 (fly past camera)
 */
export const EventCard: React.FC<EventCardProps> = ({ event, imageUrl, eventIndex, periodLabel, theme }) => {
  const frame = useCurrentFrame();
  const { fps, durationInFrames } = useVideoConfig();
  const t: EraTheme = theme || TIMELINE_THEMES['default'];

  // Normalised progress 0→1 over the card's lifespan
  const progress = frame / Math.max(durationInFrames, 1);

  // === FLY-THROUGH SCALE === (0.5 far away → 2.5 past camera)
  const scale = interpolate(
    progress,
    [0, 0.5, 1],
    [0.5, 1.0, 2.5],
    { extrapolateRight: 'clamp' }
  );

  // === OPACITY === (fade in first 30 frames, hold, fade out last 20 frames)
  const opacity = interpolate(
    frame,
    [0, 30, durationInFrames - 20, durationInFrames],
    [0, 1, 1, 0],
    { extrapolateRight: 'clamp' }
  );

  // === BLUR (depth of field) === (5px far → 0px focus → 10px motion blur)
  const blur = interpolate(
    progress,
    [0, 0.25, 0.7, 1],
    [5, 0, 0, 10],
    { extrapolateRight: 'clamp' }
  );

  // === RANDOM ROTATION (floating drift) ===
  // Deterministic per-event pseudo-random seed
  const seed = Math.sin(eventIndex * 127.1 + 311.7) * 43758.5453;
  const randBase = (seed - Math.floor(seed)) * 2 - 1; // -1 to 1
  const rotation = interpolate(
    progress,
    [0, 0.5, 1],
    [randBase * -3, randBase * 3, randBase * -2],
    { extrapolateRight: 'clamp' }
  );

  // === Kinetic text entrances (spring-based) ===
  const titleSpring = spring({ frame, fps, config: { damping: 14, stiffness: 120 }, delay: Math.round(durationInFrames * 0.12) });
  const titleX = interpolate(titleSpring, [0, 1], [-80, 0]);
  const titleOpacity = interpolate(titleSpring, [0, 1], [0, 1]);

  const yearSpring = spring({ frame, fps, config: { damping: 12, stiffness: 100 }, delay: Math.round(durationInFrames * 0.08) });
  const yearScale = interpolate(yearSpring, [0, 1], [0.3, 1]);
  const yearOpacity = interpolate(yearSpring, [0, 1], [0, 1]);

  const descSpring = spring({ frame, fps, config: { damping: 16, stiffness: 80 }, delay: Math.round(durationInFrames * 0.2) });
  const descOpacity = interpolate(descSpring, [0, 1], [0, 1]);
  const descY = interpolate(descSpring, [0, 1], [30, 0]);

  const dateSpring = spring({ frame, fps, config: { damping: 18, stiffness: 90 }, delay: Math.round(durationInFrames * 0.1) });
  const dateOpacity = interpolate(dateSpring, [0, 1], [0, 0.85]);

  // Alternate layout direction per event
  const isReversed = eventIndex % 2 === 1;

  return (
    <AbsoluteFill
      style={{
        opacity,
        transform: `scale(${scale}) rotate(${rotation}deg)`,
        filter: `blur(${blur}px)`,
        transformOrigin: 'center center',
        willChange: 'transform, opacity, filter',
      }}
    >
      {/* Main content — photo + text side by side, no background */}
      <div
        style={{
          position: 'absolute',
          inset: 60,
          display: 'flex',
          flexDirection: isReversed ? 'row-reverse' : 'row',
          alignItems: 'center',
          gap: 50,
        }}
      >
        {/* Photo — with era filter, floating in the tunnel */}
        <div
          style={{
            flex: '0 0 50%',
            height: '80%',
            borderRadius: 16,
            overflow: 'hidden',
            boxShadow: `0 30px 80px -20px rgba(0,0,0,0.7), 0 0 40px ${t.colors.accent}22`,
            border: `1px solid ${t.colors.accent}33`,
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

        {/* Text content — floating freely */}
        <div
          style={{
            flex: 1,
            display: 'flex',
            flexDirection: 'column',
            justifyContent: 'center',
            padding: '20px 0',
          }}
        >
          {/* Month + Year — accent colored, refined size */}
          <div
            style={{
              fontFamily: t.fonts.heading,
              fontSize: 56,
              fontWeight: 700,
              color: t.colors.accent,
              lineHeight: 1,
              marginBottom: 16,
              opacity: yearOpacity,
              transform: `scale(${yearScale})`,
              transformOrigin: isReversed ? 'right center' : 'left center',
              textShadow: `0 2px 20px ${t.colors.accent}44`,
              letterSpacing: '0.02em',
            }}
          >
            {(() => {
              // Try to parse month from the date string
              const months = ['Jan', 'Feb', 'Mrt', 'Apr', 'Mei', 'Jun', 'Jul', 'Aug', 'Sep', 'Okt', 'Nov', 'Dec'];
              if (event.month && event.month >= 1 && event.month <= 12) {
                return `${months[event.month - 1]} ${event.year}`;
              }
              // Fallback: try parsing date string
              const parsed = new Date(event.date);
              if (!isNaN(parsed.getTime())) {
                return `${months[parsed.getMonth()]} ${event.year}`;
              }
              return event.year;
            })()}
          </div>

          {/* Title — kinetic slide-in, larger for video-only focus */}
          <h1
            style={{
              fontFamily: t.fonts.heading,
              fontSize: 72,
              fontWeight: 900,
              color: t.colors.text,
              lineHeight: 1.1,
              opacity: titleOpacity,
              transform: `translateX(${titleX}px)`,
              textShadow: `0 2px 20px rgba(0,0,0,0.5)`,
              maxWidth: 600,
            }}
          >
            {event.title}
          </h1>

          {/* Period label */}
          {periodLabel && (
            <div
              style={{
                marginTop: 28,
                fontFamily: t.fonts.body,
                fontSize: 12,
                textTransform: 'uppercase',
                letterSpacing: '0.3em',
                color: `${t.colors.text}55`,
                opacity: descOpacity,
              }}
            >
              {periodLabel}
            </div>
          )}
        </div>
      </div>

      {/* Accent line — bottom */}
      <div
        style={{
          position: 'absolute',
          bottom: 40,
          left: isReversed ? undefined : 80,
          right: isReversed ? 80 : undefined,
          width: interpolate(frame, [Math.round(durationInFrames * 0.1), Math.round(durationInFrames * 0.3)], [0, 160], { extrapolateRight: 'clamp' }),
          height: 3,
          backgroundColor: t.colors.accent,
          borderRadius: 2,
          zIndex: 15,
        }}
      />
    </AbsoluteFill>
  );
};
