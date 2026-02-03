import React from 'react';
import { Sequence, Audio } from 'remotion';
import { TimelineVideoProps, VideoEvent } from './types';
import { EventCard } from './components/EventCard';
import { RetroCard } from './components/RetroCard';
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
  externalAudioUrl,
  externalAudioDuration,
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

  // Calculate if we're in "music video mode" (external audio drives timing)
  const isMusicVideoMode = !!externalAudioUrl && !!externalAudioDuration;
  
  // Music video intro duration: 15-20 seconds (we use 18 seconds = 540 frames at 30fps)
  const MUSIC_VIDEO_INTRO_SECONDS = 18;
  const musicVideoIntroFrames = Math.round(MUSIC_VIDEO_INTRO_SECONDS * fps);
  
  // In music video mode, calculate how long each event should be shown
  // Subtract intro time from total, then distribute remaining time across events
  const totalMusicFrames = isMusicVideoMode ? Math.round(externalAudioDuration * fps) : 0;
  const remainingMusicFrames = isMusicVideoMode ? totalMusicFrames - musicVideoIntroFrames : 0;
  const framesPerEvent = isMusicVideoMode && events.length > 0 
    ? Math.floor(remainingMusicFrames / events.length) 
    : 0;

  // Intro sequence - now also shown in music video mode
  if (storyTitle) {
    // In music video mode, use the fixed intro duration. Otherwise use voiceover duration.
    const effectiveIntroDuration = isMusicVideoMode ? musicVideoIntroFrames : introDurationFrames;
    
    sequences.push(
      <Sequence key="intro" from={currentFrame} durationInFrames={effectiveIntroDuration}>
        {wrapContent(<IntroCard storyTitle={storyTitle} storyIntroduction={storyIntroduction} />)}
        {/* Only add intro audio in non-music-video mode (music plays separately) */}
        {!isMusicVideoMode && introAudioUrl && (
          <Audio src={introAudioUrl} />
        )}
      </Sequence>
    );
    currentFrame += effectiveIntroDuration;
  }

  // Add external audio track (full duration) for music video mode
  if (isMusicVideoMode && externalAudioUrl) {
    sequences.push(
      <Sequence key="external-audio" from={0} durationInFrames={totalMusicFrames}>
        <Audio src={externalAudioUrl} />
      </Sequence>
    );
  }

  // Event sequences
  let lastYear: number | null = null;
  
  // Calculate period label from first and last event years
  const firstYear = events.length > 0 ? events[0].year : null;
  const lastEventYear = events.length > 0 ? events[events.length - 1].year : null;
  const periodLabel = firstYear && lastEventYear ? `${firstYear}–${lastEventYear}` : undefined;
  
  events.forEach((event, index) => {
    // In music video mode, skip year transitions for smoother flow
    if (!isMusicVideoMode) {
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
    }
    lastYear = event.year;

    // Event card
    const imageUrl = getEventImageUrl(event);
    
    // In music video mode, each event gets equal time. Otherwise use audio duration.
    const eventDuration = isMusicVideoMode 
      ? framesPerEvent 
      : (event.audioDurationFrames || Math.round(5 * fps));

    // Main event sequence with voiceover
    // Use RetroCard when retro effect is enabled, otherwise use EventCard
    const CardComponent = enableRetroEffect ? RetroCard : EventCard;

    sequences.push(
      <Sequence
        key={`event-${event.id}`}
        from={currentFrame}
        durationInFrames={eventDuration}
      >
        {wrapContent(
          <CardComponent event={event} imageUrl={imageUrl} eventIndex={index} periodLabel={periodLabel} />,
          event.date // Pass date for camcorder overlay
        )}
        {/* Only add individual audio in non-music-video mode */}
        {!isMusicVideoMode && event.audioUrl && (
          <Audio src={event.audioUrl} />
        )}
      </Sequence>
    );

    // Sound effect sequence - only in non-music-video mode
    // In music video mode, the song provides all audio
    if (!isMusicVideoMode && event.soundEffectAudioUrl && eventDuration > SOUND_EFFECT_DELAY_FRAMES) {
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
 * If externalAudioDuration is provided (music video mode), that becomes the total duration.
 */
export const calculateTotalDuration = (
  events: VideoEvent[],
  introDurationFrames: number,
  fps: number,
  externalAudioDuration?: number
): number => {
  // In music video mode, the external audio duration is the total
  if (externalAudioDuration) {
    return Math.round(externalAudioDuration * fps);
  }

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
