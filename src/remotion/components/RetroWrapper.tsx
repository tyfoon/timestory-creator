import React, { useMemo } from 'react';
import { AbsoluteFill, interpolate, useCurrentFrame, useVideoConfig, random } from 'remotion';
import { CamcorderOverlay } from './CamcorderOverlay';

interface RetroWrapperProps {
  children: React.ReactNode;
  intensity?: number; // 0 to 1, default 1
  enableGlitches?: boolean;
  /** Date string to display in camcorder overlay */
  date?: string;
  /** Whether to show camcorder overlay */
  showCamcorderOverlay?: boolean;
}

/**
 * VHS/CRT Retro Effect Wrapper for 80s-style video look.
 * Adds chromatic aberration, scanlines, vignette, noise/grain, and occasional glitches.
 */
export const RetroWrapper: React.FC<RetroWrapperProps> = ({
  children,
  intensity = 1,
  enableGlitches = true,
  date,
  showCamcorderOverlay = true,
}) => {
  const frame = useCurrentFrame();
  const { fps } = useVideoConfig();

  // Chromatic aberration offsets - subtle trembling based on sine wave
  const redOffsetX = Math.sin(frame * 0.3) * 1.5 * intensity;
  const redOffsetY = Math.cos(frame * 0.2) * 0.8 * intensity;
  const blueOffsetX = Math.sin(frame * 0.25 + 2) * -1.5 * intensity;
  const blueOffsetY = Math.cos(frame * 0.35 + 1) * -0.8 * intensity;

  // Glitch effect - occasional strong RGB shift (every ~3-5 seconds)
  const glitchSeed = Math.floor(frame / (fps * 3)); // Changes every 3 seconds
  const isGlitching = enableGlitches && random(`glitch-${glitchSeed}`) > 0.7;
  const glitchIntensity = isGlitching ? random(`glitch-intensity-${frame}`) * 8 + 4 : 0;
  const glitchDirection = random(`glitch-dir-${glitchSeed}`) > 0.5 ? 1 : -1;

  // Total offsets including glitch
  const totalRedX = redOffsetX + (glitchIntensity * glitchDirection);
  const totalBlueX = blueOffsetX - (glitchIntensity * glitchDirection);

  // Noise animation - shift noise pattern every 2 frames for film grain effect
  const noiseFrame = Math.floor(frame / 2);
  const noiseOffsetX = random(`noise-x-${noiseFrame}`) * 100;
  const noiseOffsetY = random(`noise-y-${noiseFrame}`) * 100;

  // Scanline opacity variation for more organic feel
  const scanlineOpacity = interpolate(
    Math.sin(frame * 0.1),
    [-1, 1],
    [0.08, 0.15]
  ) * intensity;

  // Vignette pulse - subtle breathing
  const vignetteIntensity = interpolate(
    Math.sin(frame * 0.05),
    [-1, 1],
    [0.4, 0.6]
  ) * intensity;

  // Horizontal tracking glitch - rare, strong horizontal shift
  const trackingGlitchSeed = Math.floor(frame / (fps * 5));
  const hasTrackingGlitch = enableGlitches && random(`tracking-${trackingGlitchSeed}`) > 0.85;
  const trackingOffset = hasTrackingGlitch 
    ? (random(`tracking-offset-${frame}`) - 0.5) * 20 * intensity 
    : 0;

  // SVG filter for noise/grain
  const noiseFilter = useMemo(() => (
    <svg style={{ position: 'absolute', width: 0, height: 0 }}>
      <defs>
        <filter id="vhs-noise" x="0%" y="0%" width="100%" height="100%">
          <feTurbulence
            type="fractalNoise"
            baseFrequency="0.8"
            numOctaves="4"
            seed={noiseFrame}
            stitchTiles="stitch"
          />
          <feColorMatrix type="saturate" values="0" />
        </filter>
      </defs>
    </svg>
  ), [noiseFrame]);

  return (
    <AbsoluteFill>
      {noiseFilter}
      
      {/* Base content layer with tracking glitch offset */}
      <AbsoluteFill style={{ 
        transform: `translateX(${trackingOffset}px)`,
      }}>
        {children}
      </AbsoluteFill>

      {/* Chromatic Aberration - Red Channel */}
      <AbsoluteFill
        style={{
          transform: `translate(${totalRedX}px, ${redOffsetY}px)`,
          mixBlendMode: 'screen',
          opacity: 0.8 * intensity,
        }}
      >
        <AbsoluteFill style={{ 
          filter: 'url(#red-channel)',
          opacity: 0.3,
        }}>
          {children}
        </AbsoluteFill>
      </AbsoluteFill>

      {/* Chromatic Aberration - Blue Channel */}
      <AbsoluteFill
        style={{
          transform: `translate(${totalBlueX}px, ${blueOffsetY}px)`,
          mixBlendMode: 'screen',
          opacity: 0.8 * intensity,
        }}
      >
        <AbsoluteFill style={{ 
          filter: 'url(#blue-channel)',
          opacity: 0.3,
        }}>
          {children}
        </AbsoluteFill>
      </AbsoluteFill>

      {/* SVG filters for color channels */}
      <svg style={{ position: 'absolute', width: 0, height: 0 }}>
        <defs>
          <filter id="red-channel">
            <feColorMatrix
              type="matrix"
              values="1 0 0 0 0
                      0 0 0 0 0
                      0 0 0 0 0
                      0 0 0 1 0"
            />
          </filter>
          <filter id="blue-channel">
            <feColorMatrix
              type="matrix"
              values="0 0 0 0 0
                      0 0 0 0 0
                      0 0 1 0 0
                      0 0 0 1 0"
            />
          </filter>
        </defs>
      </svg>

      {/* Scanlines Overlay */}
      <AbsoluteFill
        style={{
          background: `repeating-linear-gradient(
            0deg,
            transparent,
            transparent 2px,
            rgba(0, 0, 0, ${scanlineOpacity}) 2px,
            rgba(0, 0, 0, ${scanlineOpacity}) 4px
          )`,
          pointerEvents: 'none',
        }}
      />

      {/* Horizontal scan line that moves down */}
      <AbsoluteFill
        style={{
          background: `linear-gradient(
            180deg,
            transparent ${(frame % 120) / 120 * 100 - 5}%,
            rgba(255, 255, 255, ${0.03 * intensity}) ${(frame % 120) / 120 * 100}%,
            transparent ${(frame % 120) / 120 * 100 + 5}%
          )`,
          pointerEvents: 'none',
        }}
      />

      {/* Noise / Grain Overlay */}
      <AbsoluteFill
        style={{
          opacity: 0.06 * intensity,
          mixBlendMode: 'overlay',
          background: `url("data:image/svg+xml,%3Csvg viewBox='0 0 200 200' xmlns='http://www.w3.org/2000/svg'%3E%3Cfilter id='noise'%3E%3CfeTurbulence type='fractalNoise' baseFrequency='0.9' numOctaves='4' stitchTiles='stitch'/%3E%3C/filter%3E%3Crect width='100%25' height='100%25' filter='url(%23noise)'/%3E%3C/svg%3E")`,
          transform: `translate(${noiseOffsetX}px, ${noiseOffsetY}px) scale(1.5)`,
          pointerEvents: 'none',
        }}
      />

      {/* Vignette Overlay */}
      <AbsoluteFill
        style={{
          background: `radial-gradient(
            ellipse at center,
            transparent 40%,
            rgba(0, 0, 0, ${vignetteIntensity * 0.3}) 70%,
            rgba(0, 0, 0, ${vignetteIntensity * 0.7}) 100%
          )`,
          pointerEvents: 'none',
        }}
      />

      {/* CRT curvature simulation - subtle */}
      <AbsoluteFill
        style={{
          boxShadow: `inset 0 0 100px rgba(0, 0, 0, ${0.2 * intensity})`,
          pointerEvents: 'none',
        }}
      />

      {/* Color tint for warm VHS look */}
      <AbsoluteFill
        style={{
          background: 'linear-gradient(180deg, rgba(255, 200, 150, 0.03) 0%, rgba(100, 150, 255, 0.02) 100%)',
          mixBlendMode: 'overlay',
          pointerEvents: 'none',
        }}
      />

      {/* Glitch bar overlay - appears during tracking glitches */}
      {hasTrackingGlitch && (
        <AbsoluteFill
          style={{
            background: `linear-gradient(
              180deg,
              transparent ${random(`bar-pos-${frame}`) * 80}%,
              rgba(255, 255, 255, 0.1) ${random(`bar-pos-${frame}`) * 80 + 2}%,
              rgba(0, 0, 0, 0.3) ${random(`bar-pos-${frame}`) * 80 + 4}%,
              transparent ${random(`bar-pos-${frame}`) * 80 + 8}%
            )`,
            pointerEvents: 'none',
          }}
        />
      )}

      {/* Camcorder Overlay - REC indicator, date, battery */}
      {showCamcorderOverlay && date && (
        <CamcorderOverlay date={date} />
      )}
    </AbsoluteFill>
  );
};
