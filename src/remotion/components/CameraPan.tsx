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
  introDurationFrames: number;
}

interface EventTiming {
  startFrame: number;
  endFrame: number;
  centerX: number;
  centerY: number;
}

/**
 * CameraPan - animates a virtual camera over the scrapbook canvas
 * Features Ken Burns micro-movements and smooth swoosh transitions
 */
export const CameraPan: React.FC<CameraPanProps> = ({
  children,
  events,
  cardPositions,
  canvasWidth,
  canvasHeight,
  introDurationFrames,
}) => {
  const frame = useCurrentFrame();
  const { fps, width: viewportWidth, height: viewportHeight } = useVideoConfig();

  // Calculate timing for each event
  const eventTimings = useMemo((): EventTiming[] => {
    const timings: EventTiming[] = [];
    let currentFrame = introDurationFrames;

    events.forEach((event, index) => {
      const duration = event.audioDurationFrames || Math.round(5 * fps);
      const pos = cardPositions[index];
      
      timings.push({
        startFrame: currentFrame,
        endFrame: currentFrame + duration,
        centerX: pos?.x || 0,
        centerY: pos?.y || 0,
      });
      
      currentFrame += duration;
    });

    return timings;
  }, [events, cardPositions, introDurationFrames, fps]);

  // Find current and next event based on frame
  const getCurrentEventIndex = (): number => {
    for (let i = 0; i < eventTimings.length; i++) {
      if (frame < eventTimings[i].endFrame) {
        return i;
      }
    }
    return eventTimings.length - 1;
  };

  const currentEventIndex = getCurrentEventIndex();
  const currentEvent = eventTimings[currentEventIndex];
  const prevEvent = currentEventIndex > 0 ? eventTimings[currentEventIndex - 1] : null;

  // Calculate camera position
  const calculateCameraTransform = () => {
    // During intro, show overview of canvas (zoom out)
    if (frame < introDurationFrames) {
      const introProgress = frame / introDurationFrames;
      
      // Start zoomed out showing multiple cards, then zoom to first card
      const startScale = 0.3;
      const endScale = 0.85;
      const scale = interpolate(introProgress, [0, 0.7, 1], [startScale, startScale, endScale]);
      
      // Pan from center of canvas to first card
      const firstCard = cardPositions[0] || { x: canvasWidth / 2, y: canvasHeight / 2 };
      const centerX = interpolate(
        introProgress,
        [0, 0.7, 1],
        [canvasWidth / 2, canvasWidth / 2, firstCard.x]
      );
      const centerY = interpolate(
        introProgress,
        [0, 0.7, 1],
        [canvasHeight / 2, canvasHeight / 2, firstCard.y]
      );

      // Calculate translation to center the target point
      const translateX = viewportWidth / 2 - centerX * scale;
      const translateY = viewportHeight / 2 - centerY * scale;

      return { translateX, translateY, scale };
    }

    // Calculate transition between events
    const transitionDuration = 25; // frames for swoosh transition
    const frameInEvent = frame - currentEvent.startFrame;
    const eventDuration = currentEvent.endFrame - currentEvent.startFrame;

    // Determine if we're in transition phase
    const isInTransition = prevEvent && frameInEvent < transitionDuration;

    let targetX: number;
    let targetY: number;
    let scale: number;

    if (isInTransition && prevEvent) {
      // Smooth swoosh transition from previous card to current
      const transitionProgress = spring({
        frame: frameInEvent,
        fps,
        config: {
          damping: 18,
          stiffness: 80,
          mass: 0.8,
        },
      });

      targetX = interpolate(transitionProgress, [0, 1], [prevEvent.centerX, currentEvent.centerX]);
      targetY = interpolate(transitionProgress, [0, 1], [prevEvent.centerY, currentEvent.centerY]);
      
      // Scale down during transition (zoom out slightly), then back in
      const midTransition = transitionProgress > 0.3 && transitionProgress < 0.7;
      scale = midTransition ? 0.75 : 0.85;
      scale = interpolate(transitionProgress, [0, 0.3, 0.7, 1], [0.85, 0.72, 0.72, 0.85]);
    } else {
      // Ken Burns micro-movement while on a card
      const restFrame = isInTransition ? 0 : frameInEvent - transitionDuration;
      const restDuration = eventDuration - transitionDuration;
      
      // Slow drift movement (Ken Burns)
      const driftProgress = restDuration > 0 ? restFrame / restDuration : 0;
      
      // Subtle position drift
      const driftX = Math.sin(driftProgress * Math.PI) * 30;
      const driftY = Math.cos(driftProgress * Math.PI * 0.5) * 20;
      
      // Gentle zoom in during viewing
      const zoomProgress = interpolate(driftProgress, [0, 1], [0.85, 0.92], {
        extrapolateRight: 'clamp',
      });
      
      targetX = currentEvent.centerX + driftX;
      targetY = currentEvent.centerY + driftY;
      scale = zoomProgress;
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
