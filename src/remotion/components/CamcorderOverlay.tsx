import React from 'react';
import { AbsoluteFill, interpolate, useCurrentFrame } from 'remotion';

interface CamcorderOverlayProps {
  /** Date string to display (e.g., "1988-05-20" or "20 mei 1988") */
  date: string;
  /** Optional: Show battery indicator */
  showBattery?: boolean;
}

/**
 * 80s/90s Camcorder overlay - simulates the interface of a vintage video camera.
 * Features blinking REC indicator, date display, and optional battery icon.
 */
export const CamcorderOverlay: React.FC<CamcorderOverlayProps> = ({
  date,
  showBattery = true,
}) => {
  const frame = useCurrentFrame();

  // Blinking REC indicator - blinks every 30 frames (~1 second at 30fps)
  const blinkCycle = Math.floor(frame / 30) % 2;
  const recDotOpacity = blinkCycle === 0 ? 1 : 0.2;

  // Slight flicker effect for authenticity
  const flicker = interpolate(
    Math.sin(frame * 0.5),
    [-1, 1],
    [0.92, 1],
    { extrapolateRight: 'clamp' }
  );

  // Format date to DD MMM YYYY style if it's ISO format
  const formatDate = (dateStr: string): string => {
    try {
      // Try to parse ISO date
      const dateObj = new Date(dateStr);
      if (!isNaN(dateObj.getTime())) {
        const day = dateObj.getDate();
        const months = ['JAN', 'FEB', 'MAR', 'APR', 'MEI', 'JUN', 'JUL', 'AUG', 'SEP', 'OKT', 'NOV', 'DEC'];
        const month = months[dateObj.getMonth()];
        const year = dateObj.getFullYear();
        return `${day} ${month} ${year}`;
      }
    } catch {
      // If parsing fails, return as-is
    }
    return dateStr.toUpperCase();
  };

  // VT323-like monospace styling (fallback to system monospace)
  const monoFont = '"VT323", "Courier New", monospace';
  const textGlow = '0 0 8px rgba(255, 255, 255, 0.6), 0 0 16px rgba(255, 255, 255, 0.3)';

  return (
    <AbsoluteFill
      style={{
        pointerEvents: 'none',
        opacity: flicker,
        zIndex: 100,
      }}
    >
      {/* REC indicator - top left */}
      <div
        style={{
          position: 'absolute',
          top: 50,
          left: 50,
          display: 'flex',
          alignItems: 'center',
          gap: 12,
        }}
      >
        {/* Blinking red dot */}
        <div
          style={{
            width: 16,
            height: 16,
            borderRadius: '50%',
            backgroundColor: '#ff0000',
            opacity: recDotOpacity,
            boxShadow: recDotOpacity === 1 ? '0 0 10px #ff0000, 0 0 20px #ff0000' : 'none',
            transition: 'opacity 0.1s ease',
          }}
        />
        {/* REC text */}
        <span
          style={{
            fontFamily: monoFont,
            fontSize: 32,
            color: 'white',
            textShadow: textGlow,
            letterSpacing: '0.15em',
            fontWeight: 'bold',
          }}
        >
          REC
        </span>
      </div>

      {/* SP / Battery indicator - top right */}
      <div
        style={{
          position: 'absolute',
          top: 50,
          right: 50,
          display: 'flex',
          alignItems: 'center',
          gap: 20,
        }}
      >
        {/* SP (Standard Play) */}
        <span
          style={{
            fontFamily: monoFont,
            fontSize: 28,
            color: 'white',
            textShadow: textGlow,
            letterSpacing: '0.1em',
          }}
        >
          SP
        </span>

        {/* Battery icon - simple CSS shape */}
        {showBattery && (
          <div
            style={{
              display: 'flex',
              alignItems: 'center',
            }}
          >
            <div
              style={{
                width: 40,
                height: 20,
                border: '2px solid white',
                borderRadius: 3,
                position: 'relative',
                boxShadow: textGlow,
              }}
            >
              {/* Battery fill */}
              <div
                style={{
                  position: 'absolute',
                  top: 2,
                  left: 2,
                  width: 28,
                  height: 12,
                  backgroundColor: 'white',
                  borderRadius: 1,
                }}
              />
            </div>
            {/* Battery tip */}
            <div
              style={{
                width: 4,
                height: 10,
                backgroundColor: 'white',
                borderRadius: '0 2px 2px 0',
                marginLeft: -1,
                boxShadow: textGlow,
              }}
            />
          </div>
        )}
      </div>

      {/* Date - bottom left */}
      <div
        style={{
          position: 'absolute',
          bottom: 50,
          left: 50,
        }}
      >
        <span
          style={{
            fontFamily: monoFont,
            fontSize: 36,
            color: 'white',
            textShadow: textGlow,
            letterSpacing: '0.12em',
            fontWeight: 'bold',
          }}
        >
          {formatDate(date)}
        </span>
      </div>

      {/* Optional: Timecode style counter - bottom right */}
      <div
        style={{
          position: 'absolute',
          bottom: 50,
          right: 50,
        }}
      >
        <span
          style={{
            fontFamily: monoFont,
            fontSize: 28,
            color: 'rgba(255, 255, 255, 0.7)',
            textShadow: textGlow,
            letterSpacing: '0.08em',
          }}
        >
          {/* Simulated timecode based on frame */}
          {String(Math.floor(frame / 1800)).padStart(2, '0')}:
          {String(Math.floor((frame % 1800) / 30)).padStart(2, '0')}:
          {String(frame % 30).padStart(2, '0')}
        </span>
      </div>
    </AbsoluteFill>
  );
};
