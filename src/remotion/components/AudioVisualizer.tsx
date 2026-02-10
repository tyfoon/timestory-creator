import React from 'react';
import { AbsoluteFill, interpolate, useCurrentFrame, useVideoConfig } from 'remotion';
import { EraTheme, TIMELINE_THEMES } from '../themes';

interface AudioVisualizerProps {
  theme?: EraTheme;
  barCount?: number;
  maxHeight?: number;
  opacity?: number;
}

/**
 * Fake audio visualizer overlay — renders animated frequency bars
 * at the bottom of the screen. Uses deterministic pseudo-random
 * noise seeded per frame so it looks organic but renders identically
 * across runs (required by Remotion).
 */
export const AudioVisualizer: React.FC<AudioVisualizerProps> = ({
  theme,
  barCount = 32,
  maxHeight = 80,
  opacity = 0.6,
}) => {
  const frame = useCurrentFrame();
  const { fps, durationInFrames } = useVideoConfig();
  const t = theme || TIMELINE_THEMES['default'];

  // Fade in/out
  const fadeIn = interpolate(frame, [0, 15], [0, 1], { extrapolateRight: 'clamp' });
  const fadeOut = interpolate(
    frame,
    [durationInFrames - 20, durationInFrames],
    [1, 0],
    { extrapolateLeft: 'clamp' }
  );

  // Simple deterministic hash for pseudo-random bar heights
  const hash = (seed: number): number => {
    const x = Math.sin(seed * 127.1 + 311.7) * 43758.5453;
    return x - Math.floor(x); // 0..1
  };

  const bars: number[] = [];
  for (let i = 0; i < barCount; i++) {
    // Combine multiple sine waves at different frequencies for organic feel
    const wave1 = Math.sin((frame * 0.15) + (i * 0.8)) * 0.5 + 0.5;
    const wave2 = Math.sin((frame * 0.08) + (i * 1.3) + 2.1) * 0.3 + 0.5;
    const wave3 = hash(frame * 0.3 + i * 7.7) * 0.4;

    // Center bars are taller (bell curve distribution)
    const centerWeight = 1 - Math.abs((i / barCount) - 0.5) * 1.2;

    const intensity = (wave1 * 0.4 + wave2 * 0.3 + wave3 * 0.3) * centerWeight;
    bars.push(Math.max(4, intensity * maxHeight));
  }

  const barWidth = 100 / barCount;
  const gap = 0.3; // percentage gap between bars

  return (
    <AbsoluteFill style={{ pointerEvents: 'none', zIndex: 50 }}>
      <div
        style={{
          position: 'absolute',
          bottom: 0,
          left: 0,
          right: 0,
          height: maxHeight + 20,
          display: 'flex',
          alignItems: 'flex-end',
          justifyContent: 'center',
          padding: '0 20px 10px',
          opacity: fadeIn * fadeOut * opacity,
          gap: `${gap}%`,
        }}
      >
        {bars.map((height, i) => (
          <div
            key={i}
            style={{
              width: `${barWidth - gap}%`,
              height,
              backgroundColor: t.colors.accent,
              borderRadius: '2px 2px 0 0',
              opacity: 0.7 + hash(i * 31) * 0.3,
              boxShadow: `0 0 8px ${t.colors.accent}44`,
              transition: 'height 0.05s ease-out',
            }}
          />
        ))}
      </div>
    </AbsoluteFill>
  );
};
