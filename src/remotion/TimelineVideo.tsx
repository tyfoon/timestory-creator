import React from 'react';
import { Sequence, Audio } from 'remotion';
import { TimelineVideoProps, VideoEvent } from './types';
import { EventCard } from './components/EventCard';
import { IntroCard } from './components/IntroCard';
import { TransitionSlide } from './components/TransitionSlide';
import { RetroWrapper } from './components/RetroWrapper';
import { getEventImageUrl } from './utils/placeholders';

const TRANSITION_DURATION_FRAMES = 15; // ~0.5 seconds at 30fps - snappy transitions
const SOUND_EFFECT_DELAY_FRAMES = 60; // 2 seconds delay at 30fps - starts after voiceover begins

/**
 * Main Remotion composition for the timeline video.
 * Renders intro, then each event with transitions.
 * Optionally wraps content in RetroWrapper for 80s VHS effect.
 */
export const TimelineVideoComponent: React.FC<TimelineVideoProps> = ({
  events,
  storyTitle,
  storyIntroduction,
  introAudioUrl,
  introDurationFrames,
  fps,
  enableRetroEffect = false,
  retroIntensity = 1,
}) => {
  let currentFrame = 0;
  const sequences: React.ReactNode[] = [];

  // Helper to wrap content in RetroWrapper if enabled
  const wrapContent = (content: React.ReactNode, date?: string) => {
    if (enableRetroEffect) {
      return (
        <RetroWrapper 
          intensity={retroIntensity} 
          enableGlitches={true}
          date={date}
          showCamcorderOverlay={!!date}
        >
          {content}
        </RetroWrapper>
      );
    }
    return content;
  };

  // Intro sequence
  if (storyTitle) {
    sequences.push(
      <Sequence key="intro" from={currentFrame} durationInFrames={introDurationFrames}>
        {wrapContent(<IntroCard storyTitle={storyTitle} storyIntroduction={storyIntroduction} />)}
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
          {wrapContent(<TransitionSlide year={event.year} durationFrames={TRANSITION_DURATION_FRAMES} />)}
        </Sequence>
      );
      currentFrame += TRANSITION_DURATION_FRAMES;
    }
    lastYear = event.year;

    // Event card
    const imageUrl = getEventImageUrl(event);
    const eventDuration = event.audioDurationFrames || Math.round(5 * fps); // Default 5 seconds

    // Main event sequence with voiceover
    sequences.push(
      <Sequence
        key={`event-${event.id}`}
        from={currentFrame}
        durationInFrames={eventDuration}
      >
        {wrapContent(
          <EventCard event={event} imageUrl={imageUrl} eventIndex={index} periodLabel={periodLabel} />,
          event.date // Pass date for camcorder overlay
        )}
        {event.audioUrl && (
          <Audio src={event.audioUrl} />
        )}
      </Sequence>
    );

    // Sound effect sequence - delayed start (2 seconds after voiceover begins)
    // Only add if sound effect exists and event is long enough for the delay
    if (event.soundEffectAudioUrl && eventDuration > SOUND_EFFECT_DELAY_FRAMES) {
      sequences.push(
        <Sequence
          key={`sfx-${event.id}`}
          from={currentFrame + SOUND_EFFECT_DELAY_FRAMES}
          durationInFrames={eventDuration - SOUND_EFFECT_DELAY_FRAMES}
        >
          <Audio src={event.soundEffectAudioUrl} volume={0.25} />
        </Sequence>
      );
    }

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
