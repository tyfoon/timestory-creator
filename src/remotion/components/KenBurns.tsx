import React from 'react';
import { interpolate, useCurrentFrame, useVideoConfig } from 'remotion';

interface KenBurnsProps {
  children: React.ReactNode;
  /** Step index to vary animation direction per slide */
  step: number;
  /** Animation intensity (0-1), default 1 */
  intensity?: number;
}

/**
 * Ken Burns effect wrapper - adds slow zoom and pan to images.
 * Creates cinematic movement by gently zooming and panning over the duration.
 */
export const KenBurns: React.FC<KenBurnsProps> = ({
  children,
  step,
  intensity = 1,
}) => {
  const frame = useCurrentFrame();
  const { durationInFrames } = useVideoConfig();

  // Vary animation direction based on step (creates variety between slides)
  const pattern = step % 4;

  // Scale range: 1.0 to 1.12 (subtle zoom)
  const scaleStart = pattern % 2 === 0 ? 1.0 : 1.12;
  const scaleEnd = pattern % 2 === 0 ? 1.12 : 1.0;
  const scale = interpolate(
    frame,
    [0, durationInFrames],
    [scaleStart, scaleEnd],
    { extrapolateRight: 'clamp' }
  );

  // Blend scale with intensity
  const finalScale = 1 + (scale - 1) * intensity;

  // Pan directions based on pattern
  const panDirections = [
    { x: [-1, 1], y: [-0.5, 0.5] },    // Pan right and down
    { x: [1, -1], y: [0.5, -0.5] },    // Pan left and up
    { x: [-0.5, 0.5], y: [1, -1] },    // Pan slight right, up
    { x: [0.5, -0.5], y: [-1, 1] },    // Pan slight left, down
  ];

  const panConfig = panDirections[pattern];
  
  const translateX = interpolate(
    frame,
    [0, durationInFrames],
    [panConfig.x[0] * intensity * 12, panConfig.x[1] * intensity * 12],
    { extrapolateRight: 'clamp' }
  );

  const translateY = interpolate(
    frame,
    [0, durationInFrames],
    [panConfig.y[0] * intensity * 8, panConfig.y[1] * intensity * 8],
    { extrapolateRight: 'clamp' }
  );

  return (
    <div
      style={{
        width: '100%',
        height: '100%',
        overflow: 'hidden',
        position: 'relative',
      }}
    >
      <div
        style={{
          width: '100%',
          height: '100%',
          transform: `scale(${finalScale}) translate(${translateX}px, ${translateY}px)`,
          transformOrigin: 'center center',
        }}
      >
        {children}
      </div>
    </div>
  );
};
