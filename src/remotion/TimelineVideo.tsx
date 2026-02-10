import React from 'react';
import { Sequence, Audio } from 'remotion';
import { TimelineVideoProps, VideoEvent } from './types';
import { EventCard } from './components/EventCard';
import { RetroCard } from './components/RetroCard';
import { IntroCard } from './components/IntroCard';
import { RetroWrapper } from './components/RetroWrapper';
import { TimeTunnel } from './components/TimeTunnel';
import { AudioVisualizer } from './components/AudioVisualizer';
import { getEventImageUrl } from './utils/placeholders';
import { getThemeForYear } from './themes';

const SOUND_EFFECT_DELAY_FRAMES = 60; // 2 seconds delay at 30fps

// Overlap: 30% of each event's duration overlaps with the next
const OVERLAP_RATIO = 0.3;

/**
 * Fly-Through Timeline Video.
 * 
 * Instead of discrete slides, events overlap so the exit of Event A
 * (zooming past the camera) coincides with the enter of Event B
 * (appearing small in the distance). A global TimeTunnel background
 * runs behind everything for a continuous warp-speed sensation.
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

  // Music video mode
  const isMusicVideoMode = !!externalAudioUrl && !!externalAudioDuration;
  const MUSIC_VIDEO_INTRO_SECONDS = 10;
  const musicVideoIntroFrames = Math.round(MUSIC_VIDEO_INTRO_SECONDS * fps);
  const totalMusicFrames = isMusicVideoMode ? Math.round(externalAudioDuration * fps) : 0;
  const remainingMusicFrames = isMusicVideoMode ? totalMusicFrames - musicVideoIntroFrames : 0;

  // Theme from first event
  const introTheme = events.length > 0 ? getThemeForYear(events[0].year) : undefined;

  // --- Calculate total duration first so we can size the tunnel ---
  const eventDurations: number[] = events.map((event) => {
    if (isMusicVideoMode && events.length > 0) {
      return Math.floor(remainingMusicFrames / events.length);
    }
    return event.audioDurationFrames || Math.round(5 * fps);
  });

  // Calculate effective intro duration
  const effectiveIntroDuration = isMusicVideoMode ? musicVideoIntroFrames : introDurationFrames;

  // Calculate total with overlaps
  let totalFrames = storyTitle ? effectiveIntroDuration : 0;
  eventDurations.forEach((dur, i) => {
    if (i === 0) {
      totalFrames += dur;
    } else {
      const overlapFrames = Math.round(eventDurations[i - 1] * OVERLAP_RATIO);
      totalFrames += dur - overlapFrames;
    }
  });

  // Fallback for music mode total
  const videoDuration = isMusicVideoMode ? totalMusicFrames : totalFrames;

  // === GLOBAL TIME TUNNEL BACKGROUND (runs entire video) ===
  sequences.push(
    <Sequence key="time-tunnel" from={0} durationInFrames={videoDuration}>
      {wrapContent(<TimeTunnel theme={introTheme} />)}
    </Sequence>
  );

  // === INTRO ===
  let currentFrame = 0;
  if (storyTitle) {
    sequences.push(
      <Sequence key="intro" from={currentFrame} durationInFrames={effectiveIntroDuration}>
        {wrapContent(<IntroCard storyTitle={storyTitle} storyIntroduction={storyIntroduction} theme={introTheme} />)}
        {!isMusicVideoMode && introAudioUrl && (
          <Audio src={introAudioUrl} />
        )}
      </Sequence>
    );
    currentFrame += effectiveIntroDuration;
  }

  // === EXTERNAL AUDIO + VISUALIZER (music video mode) ===
  if (isMusicVideoMode && externalAudioUrl) {
    sequences.push(
      <Sequence key="external-audio" from={0} durationInFrames={totalMusicFrames}>
        <Audio src={externalAudioUrl} />
      </Sequence>
    );
    sequences.push(
      <Sequence key="audio-visualizer" from={0} durationInFrames={totalMusicFrames}>
        <AudioVisualizer theme={introTheme} />
      </Sequence>
    );
  }

  // === EVENT SEQUENCES WITH OVERLAP ===
  const periodLabel = events.length >= 2
    ? `${events[0].year}–${events[events.length - 1].year}`
    : undefined;

  events.forEach((event, index) => {
    const imageUrl = getEventImageUrl(event);
    const eventDuration = eventDurations[index];
    const eventTheme = getThemeForYear(event.year);

    // Calculate overlap: the current event starts earlier by overlapping
    // with the previous event's exit phase
    if (index > 0) {
      const prevDuration = eventDurations[index - 1];
      const overlapFrames = Math.round(prevDuration * OVERLAP_RATIO);
      currentFrame -= overlapFrames;
    }

    const CardComponent = enableRetroEffect ? RetroCard : EventCard;

    sequences.push(
      <Sequence
        key={`event-${event.id}`}
        from={currentFrame}
        durationInFrames={eventDuration}
      >
        {wrapContent(
          <CardComponent
            event={event}
            imageUrl={imageUrl}
            eventIndex={index}
            periodLabel={periodLabel}
            theme={eventTheme}
          />,
          event.date
        )}
        {!isMusicVideoMode && event.audioUrl && (
          <Audio src={event.audioUrl} />
        )}
      </Sequence>
    );

    // Sound effects
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
 * Calculate total duration accounting for overlapping events.
 */
export const calculateTotalDuration = (
  events: VideoEvent[],
  introDurationFrames: number,
  fps: number,
  externalAudioDuration?: number
): number => {
  if (externalAudioDuration) {
    return Math.round(externalAudioDuration * fps);
  }

  let total = introDurationFrames;

  events.forEach((event, index) => {
    const eventDur = event.audioDurationFrames || Math.round(5 * fps);
    if (index === 0) {
      total += eventDur;
    } else {
      const prevDur = events[index - 1].audioDurationFrames || Math.round(5 * fps);
      const overlapFrames = Math.round(prevDur * OVERLAP_RATIO);
      total += eventDur - overlapFrames;
    }
  });

  return total;
};

export { TimelineVideoComponent as TimelineVideo };
