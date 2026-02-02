import React from 'react';
import { Sequence, Audio } from 'remotion';
import { TimelineVideoProps, VideoEvent } from './types';
import { EventCard } from './components/EventCard';
import { IntroCard } from './components/IntroCard';
import { TransitionSlide } from './components/TransitionSlide';
import { getEventImageUrl } from './utils/placeholders';

const TRANSITION_DURATION_FRAMES = 15; // ~0.5 seconds at 30fps - snappy transitions

/**
 * Main Remotion composition for the timeline video.
 * Renders intro, then each event with transitions.
 */
export const TimelineVideoComponent: React.FC<TimelineVideoProps> = ({
  events,
  storyTitle,
  storyIntroduction,
  introAudioUrl,
  introDurationFrames,
  fps,
}) => {
  let currentFrame = 0;
  const sequences: React.ReactNode[] = [];

  // Intro sequence
  if (storyTitle) {
    sequences.push(
      <Sequence key="intro" from={currentFrame} durationInFrames={introDurationFrames}>
        <IntroCard storyTitle={storyTitle} storyIntroduction={storyIntroduction} />
        {introAudioUrl && (
          <Audio src={introAudioUrl} />
        )}
      </Sequence>
    );
    currentFrame += introDurationFrames;
  }

  // Event sequences
  let lastYear: number | null = null;
  
  // Calculate period label from first and last event years
  const firstYear = events.length > 0 ? events[0].year : null;
  const lastEventYear = events.length > 0 ? events[events.length - 1].year : null;
  const periodLabel = firstYear && lastEventYear ? `${firstYear}–${lastEventYear}` : undefined;
  
  events.forEach((event, index) => {
    // Add year transition if year changed
    if (lastYear !== null && event.year !== lastYear) {
      sequences.push(
        <Sequence
          key={`transition-${event.id}`}
          from={currentFrame}
          durationInFrames={TRANSITION_DURATION_FRAMES}
        >
          <TransitionSlide year={event.year} durationFrames={TRANSITION_DURATION_FRAMES} />
        </Sequence>
      );
      currentFrame += TRANSITION_DURATION_FRAMES;
    }
    lastYear = event.year;

    // Event card
    const imageUrl = getEventImageUrl(event);
    const eventDuration = event.audioDurationFrames || Math.round(5 * fps); // Default 5 seconds

    sequences.push(
      <Sequence
        key={`event-${event.id}`}
        from={currentFrame}
        durationInFrames={eventDuration}
      >
        <EventCard event={event} imageUrl={imageUrl} eventIndex={index} periodLabel={periodLabel} />
        {event.audioUrl && (
          <Audio src={event.audioUrl} />
        )}
      </Sequence>
    );
    currentFrame += eventDuration;
  });

  return <>{sequences}</>;
};

/**
 * Calculate total duration of the video based on events.
 */
export const calculateTotalDuration = (
  events: VideoEvent[],
  introDurationFrames: number,
  fps: number
): number => {
  let total = introDurationFrames;
  let lastYear: number | null = null;

  events.forEach((event) => {
    // Add transition if year changed
    if (lastYear !== null && event.year !== lastYear) {
      total += TRANSITION_DURATION_FRAMES;
    }
    lastYear = event.year;

    // Add event duration
    total += event.audioDurationFrames || Math.round(5 * fps);
  });

  return total;
};

export { TimelineVideoComponent as TimelineVideo };
