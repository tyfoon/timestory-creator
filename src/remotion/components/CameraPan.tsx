import React, { useMemo } from 'react';
import { AbsoluteFill, interpolate, useCurrentFrame, spring, useVideoConfig } from 'remotion';
import { VideoEvent } from '../types';
import { CardPosition } from './ScrapbookLayout';

interface CameraPanProps {
  children: React.ReactNode;
  events: VideoEvent[];
  cardPositions: CardPosition[];
  canvasWidth: number;
  canvasHeight: number;
}

interface EventTiming {
  startFrame: number;
  endFrame: number;
  centerX: number;
  centerY: number;
}

/**
 * CameraPan - animates a virtual camera over the scrapbook canvas
 * Features Ken Burns micro-movements and smooth swoosh transitions between cards
 * 
 * Note: This component is placed inside a Sequence that starts AFTER the intro,
 * so frame 0 here = first frame of scrapbook content (not video start)
 */
export const CameraPan: React.FC<CameraPanProps> = ({
  children,
  events,
  cardPositions,
  canvasWidth,
  canvasHeight,
}) => {
  const frame = useCurrentFrame();
  const { fps, width: viewportWidth, height: viewportHeight, durationInFrames } = useVideoConfig();

  // Calculate timing for each event (frame 0 = start of scrapbook section)
  const eventTimings = useMemo((): EventTiming[] => {
    const timings: EventTiming[] = [];
    let currentFrame = 0; // Start at 0 since we're inside a Sequence

    events.forEach((event, index) => {
      const duration = event.audioDurationFrames || Math.round(5 * fps);
      const pos = cardPositions[index];
      
      timings.push({
        startFrame: currentFrame,
        endFrame: currentFrame + duration,
        centerX: pos?.x || canvasWidth / 2,
        centerY: pos?.y || canvasHeight / 2,
      });
      
      currentFrame += duration;
    });

    return timings;
  }, [events, cardPositions, fps, canvasWidth, canvasHeight]);

  // Find current event based on frame
  const getCurrentEventIndex = (): number => {
    for (let i = 0; i < eventTimings.length; i++) {
      if (frame < eventTimings[i].endFrame) {
        return i;
      }
    }
    return Math.max(0, eventTimings.length - 1);
  };

  const currentEventIndex = getCurrentEventIndex();
  const currentEvent = eventTimings[currentEventIndex];
  const prevEvent = currentEventIndex > 0 ? eventTimings[currentEventIndex - 1] : null;

  // Transition and animation settings
  const TRANSITION_FRAMES = 30; // 1 second swoosh at 30fps
  const INITIAL_ZOOM_FRAMES = 60; // 2 seconds for initial zoom-in

  // Calculate camera position and scale
  const calculateCameraTransform = () => {
    // If no events, center on canvas
    if (!currentEvent || eventTimings.length === 0) {
      const scale = 0.5;
      return {
        translateX: viewportWidth / 2 - (canvasWidth / 2) * scale,
        translateY: viewportHeight / 2 - (canvasHeight / 2) * scale,
        scale,
      };
    }

    // Initial zoom-in to first card (first 1.5 seconds)
    if (frame < INITIAL_ZOOM_FRAMES && currentEventIndex === 0) {
      const zoomProgress = spring({
        frame,
        fps,
        config: {
          damping: 20,
          stiffness: 40,
          mass: 1.2,
        },
      });

      // Start with full canvas view, zoom in dramatically to first card
      const startScale = 0.18; // Show more of the canvas initially
      const endScale = 1.1; // Zoom in closer to cards
      const scale = interpolate(zoomProgress, [0, 1], [startScale, endScale]);

      const firstCard = cardPositions[0] || { x: canvasWidth / 2, y: canvasHeight / 2 };
      
      // Pan from center to first card
      const centerX = interpolate(zoomProgress, [0, 1], [canvasWidth / 2, firstCard.x]);
      const centerY = interpolate(zoomProgress, [0, 1], [canvasHeight / 2, firstCard.y]);

      const translateX = viewportWidth / 2 - centerX * scale;
      const translateY = viewportHeight / 2 - centerY * scale;

      return { translateX, translateY, scale };
    }

    // Calculate frame relative to current event
    const frameInEvent = frame - currentEvent.startFrame;
    const eventDuration = currentEvent.endFrame - currentEvent.startFrame;

    // Check if we're in transition phase (swooshing to this card)
    const isTransitioning = prevEvent && frameInEvent < TRANSITION_FRAMES;

    let targetX: number;
    let targetY: number;
    let scale: number;

    if (isTransitioning && prevEvent) {
      // SWOOSH TRANSITION: Fly from previous card to current card
      const transitionProgress = spring({
        frame: frameInEvent,
        fps,
        config: {
          damping: 15,
          stiffness: 60,
          mass: 0.9,
        },
      });

      // Interpolate position
      targetX = interpolate(transitionProgress, [0, 1], [prevEvent.centerX, currentEvent.centerX]);
      targetY = interpolate(transitionProgress, [0, 1], [prevEvent.centerY, currentEvent.centerY]);

      // Zoom out during mid-transition for dramatic swoosh, staying closer overall
      scale = interpolate(
        transitionProgress,
        [0, 0.3, 0.5, 0.7, 1],
        [1.15, 0.75, 0.6, 0.75, 1.15]
      );
    } else {
      // KEN BURNS: Slow drift while viewing current card - more dramatic zoom
      const restStartFrame = prevEvent ? TRANSITION_FRAMES : INITIAL_ZOOM_FRAMES;
      const restFrame = Math.max(0, frameInEvent - restStartFrame);
      const restDuration = Math.max(1, eventDuration - restStartFrame);
      const driftProgress = Math.min(1, restFrame / restDuration);

      // Subtle position drift (sine wave for smooth back-and-forth)
      const driftAmplitude = 20;
      const driftX = Math.sin(driftProgress * Math.PI * 2) * driftAmplitude;
      const driftY = Math.cos(driftProgress * Math.PI) * (driftAmplitude * 0.5);

      // More dramatic zoom in during viewing (1.1 → 1.35)
      const zoomStart = 1.1;
      const zoomEnd = 1.4;
      scale = interpolate(driftProgress, [0, 1], [zoomStart, zoomEnd], {
        extrapolateRight: 'clamp',
      });

      targetX = currentEvent.centerX + driftX;
      targetY = currentEvent.centerY + driftY;
    }

    // Calculate translation to center the target point in viewport
    const translateX = viewportWidth / 2 - targetX * scale;
    const translateY = viewportHeight / 2 - targetY * scale;

    return { translateX, translateY, scale };
  };

  const { translateX, translateY, scale } = calculateCameraTransform();

  return (
    <AbsoluteFill
      style={{
        backgroundColor: '#0a0a0a',
        overflow: 'hidden',
      }}
    >
      <div
        style={{
          width: canvasWidth,
          height: canvasHeight,
          transform: `translate(${translateX}px, ${translateY}px) scale(${scale})`,
          transformOrigin: '0 0',
          willChange: 'transform',
        }}
      >
        {children}
      </div>
    </AbsoluteFill>
  );
};
