import React from 'react';
import { AbsoluteFill, interpolate, useCurrentFrame, useVideoConfig } from 'remotion';

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

  // Scale range: 1.0 to 1.15 (or reverse)
  const scaleStart = pattern % 2 === 0 ? 1.0 : 1.15;
  const scaleEnd = pattern % 2 === 0 ? 1.15 : 1.0;
  const scale = interpolate(
    frame,
    [0, durationInFrames],
    [scaleStart, scaleEnd],
    { extrapolateRight: 'clamp' }
  ) * (0.5 + intensity * 0.5) + (1 - (0.5 + intensity * 0.5));

  // Pan directions based on pattern
  const panDirections = [
    { x: [-2, 2], y: [-1, 1] },    // Pan right and down
    { x: [2, -2], y: [1, -1] },    // Pan left and up
    { x: [-1, 1], y: [2, -2] },    // Pan slight right, up
    { x: [1, -1], y: [-2, 2] },    // Pan slight left, down
  ];

  const panConfig = panDirections[pattern];
  
  const translateX = interpolate(
    frame,
    [0, durationInFrames],
    [panConfig.x[0] * intensity * 15, panConfig.x[1] * intensity * 15],
    { extrapolateRight: 'clamp' }
  );

  const translateY = interpolate(
    frame,
    [0, durationInFrames],
    [panConfig.y[0] * intensity * 10, panConfig.y[1] * intensity * 10],
    { extrapolateRight: 'clamp' }
  );

  return (
    <AbsoluteFill
      style={{
        overflow: 'hidden',
      }}
    >
      <div
        style={{
          width: '100%',
          height: '100%',
          transform: `scale(${scale}) translate(${translateX}px, ${translateY}px)`,
          transformOrigin: 'center center',
        }}
      >
        {children}
      </div>
    </AbsoluteFill>
  );
};
