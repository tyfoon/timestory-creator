import React from 'react';
import { AbsoluteFill, interpolate, useCurrentFrame, useVideoConfig } from 'remotion';
import { EraTheme, TIMELINE_THEMES } from '../themes';

interface TimeTunnelProps {
  theme?: EraTheme;
}

/**
 * Global "Time Tunnel" background — continuous warp-speed star/dust field
 * that runs behind all events for the entire video duration.
 * Creates the sensation of flying through time.
 */
export const TimeTunnel: React.FC<TimeTunnelProps> = ({ theme }) => {
  const frame = useCurrentFrame();
  const { durationInFrames } = useVideoConfig();
  const t = theme || TIMELINE_THEMES['default'];

  // Generate deterministic "stars" once
  const starCount = 120;
  const stars: Array<{
    x: number; y: number; size: number; speed: number; brightness: number;
  }> = [];

  for (let i = 0; i < starCount; i++) {
    const seed = Math.sin(i * 127.1 + 311.7) * 43758.5453;
    const rand = seed - Math.floor(seed);
    const seed2 = Math.sin(i * 269.5 + 183.3) * 43758.5453;
    const rand2 = seed2 - Math.floor(seed2);
    const seed3 = Math.sin(i * 419.2 + 71.9) * 43758.5453;
    const rand3 = seed3 - Math.floor(seed3);

    stars.push({
      x: rand * 100,           // % position
      y: rand2 * 100,          // % position
      size: 1 + rand3 * 3,     // px
      speed: 0.5 + rand * 2,   // speed multiplier
      brightness: 0.3 + rand3 * 0.7,
    });
  }

  // Overall tunnel rotation for depth
  const tunnelRotation = interpolate(frame, [0, durationInFrames], [0, 15], {
    extrapolateRight: 'clamp',
  });

  // Radial zoom pulse
  const zoomPulse = Math.sin(frame * 0.03) * 0.02 + 1;

  return (
    <AbsoluteFill
      style={{
        backgroundColor: t.colors.background,
        overflow: 'hidden',
        zIndex: 0,
      }}
    >
      {/* Radial gradient — vanishing point in center */}
      <div
        style={{
          position: 'absolute',
          inset: 0,
          background: `radial-gradient(ellipse at center, ${t.colors.background} 0%, transparent 50%, ${t.colors.background} 100%)`,
          zIndex: 2,
          pointerEvents: 'none',
        }}
      />

      {/* Moving stars/dust particles */}
      <div
        style={{
          position: 'absolute',
          inset: -100,
          transform: `rotate(${tunnelRotation}deg) scale(${zoomPulse})`,
          transformOrigin: 'center center',
        }}
      >
        {stars.map((star, i) => {
          // Each star flies from center outward in a continuous loop
          const progress = ((frame * star.speed * 1.5 + i * 37) % 200) / 200;
          
          // Scale from center (0) to edge (1) — simulates depth
          const distanceFromCenter = progress;
          const scale = 0.1 + distanceFromCenter * 3;
          
          // Radial position — starts near center, moves outward
          const angle = (i / starCount) * Math.PI * 2 + i * 0.618;
          const radius = distanceFromCenter * 60; // % from center
          const cx = 50 + Math.cos(angle) * radius;
          const cy = 50 + Math.sin(angle) * radius;

          // Fade in as they appear, stretch as they pass
          const opacity = interpolate(
            distanceFromCenter,
            [0, 0.1, 0.7, 1],
            [0, star.brightness, star.brightness * 0.8, 0],
          );

          // Elongate the star as it gets closer (motion blur effect)
          const elongation = 1 + distanceFromCenter * 4;

          return (
            <div
              key={i}
              style={{
                position: 'absolute',
                left: `${cx}%`,
                top: `${cy}%`,
                width: star.size * scale,
                height: star.size * scale * elongation,
                borderRadius: '50%',
                backgroundColor: i % 5 === 0 ? t.colors.accent : t.colors.text,
                opacity,
                transform: `rotate(${angle}rad)`,
                boxShadow: i % 5 === 0
                  ? `0 0 ${4 + distanceFromCenter * 8}px ${t.colors.accent}66`
                  : 'none',
              }}
            />
          );
        })}
      </div>

      {/* Subtle vignette overlay */}
      <div
        style={{
          position: 'absolute',
          inset: 0,
          background: `radial-gradient(circle at center, transparent 30%, ${t.colors.background}cc 80%, ${t.colors.background} 100%)`,
          zIndex: 3,
          pointerEvents: 'none',
        }}
      />
    </AbsoluteFill>
  );
};
