import React, { useMemo } from 'react';
import { Sequence, Audio, AbsoluteFill, useVideoConfig } from 'remotion';
import { TimelineVideoProps, VideoEvent } from './types';
import { ScrapbookLayout, calculateCardPositions } from './components/ScrapbookLayout';
import { CameraPan } from './components/CameraPan';
import { IntroCard } from './components/IntroCard';
import { RetroWrapper } from './components/RetroWrapper';

// J-cut offset: audio starts before visual transition (frames)
const J_CUT_FRAMES = 15; // 0.5 seconds at 30fps
const SOUND_EFFECT_DELAY_FRAMES = 45; // 1.5 seconds delay for sound effects

/**
 * Calculate canvas dimensions based on number of events
 * Canvas should be large enough to fit all cards with good spacing
 * but not so large that the overview shot shows too much empty space
 */
const calculateCanvasDimensions = (eventCount: number): { width: number; height: number } => {
  // Cards are approximately 650x550
  const cardWidth = 650;
  const cardHeight = 550;
  const spacingX = 200;
  const spacingY = 250;
  
  // 2-3 cards per row for a nice serpentine layout
  const cardsPerRow = Math.min(3, Math.max(2, Math.ceil(Math.sqrt(eventCount))));
  const rows = Math.ceil(eventCount / cardsPerRow);
  
  // Tighter canvas - just enough room for cards with margins
  const width = Math.max(1920, cardsPerRow * (cardWidth + spacingX) + 300);
  const height = Math.max(1080, rows * (cardHeight + spacingY) + 300);
  
  return { width, height };
};

/**
 * ScrapbookVideo - Virtual camera panning over a scrapbook canvas
 * All cards are rendered simultaneously, camera moves between them
 */
export const ScrapbookVideoComponent: React.FC<TimelineVideoProps> = ({
  events,
  storyTitle,
  storyIntroduction,
  introAudioUrl,
  introDurationFrames,
  fps,
  enableRetroEffect = true,
  retroIntensity = 0.85,
}) => {
  const { durationInFrames } = useVideoConfig();

  // Calculate canvas size based on event count
  const { width: canvasWidth, height: canvasHeight } = useMemo(
    () => calculateCanvasDimensions(events.length),
    [events.length]
  );

  // Pre-calculate all card positions
  const cardPositions = useMemo(
    () => calculateCardPositions(events.length, canvasWidth, canvasHeight),
    [events.length, canvasWidth, canvasHeight]
  );

  // Get first event year for era-based background
  const startYear = events.length > 0 ? events[0].year : undefined;

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

  // Build audio sequences with J-cut timing
  const audioSequences: React.ReactNode[] = [];
  let audioFrame = introDurationFrames;

  // Intro audio
  if (introAudioUrl) {
    audioSequences.push(
      <Sequence key="intro-audio" from={0} durationInFrames={introDurationFrames}>
        <Audio src={introAudioUrl} />
      </Sequence>
    );
  }

  // Event audio with J-cut (starts early)
  events.forEach((event, index) => {
    const eventDuration = event.audioDurationFrames || Math.round(5 * fps);
    
    // J-cut: audio starts J_CUT_FRAMES before the visual transition
    // But not for the first event (no previous card to cut from)
    const audioStartFrame = index === 0 
      ? audioFrame 
      : Math.max(0, audioFrame - J_CUT_FRAMES);

    if (event.audioUrl) {
      audioSequences.push(
        <Sequence
          key={`audio-${event.id}`}
          from={audioStartFrame}
          durationInFrames={eventDuration + (index === 0 ? 0 : J_CUT_FRAMES)}
        >
          <Audio src={event.audioUrl} />
        </Sequence>
      );
    }

    // Sound effects with delay
    if (event.soundEffectAudioUrl && eventDuration > SOUND_EFFECT_DELAY_FRAMES) {
      audioSequences.push(
        <Sequence
          key={`sfx-${event.id}`}
          from={audioFrame + SOUND_EFFECT_DELAY_FRAMES}
          durationInFrames={eventDuration - SOUND_EFFECT_DELAY_FRAMES}
        >
          <Audio src={event.soundEffectAudioUrl} volume={0.2} />
        </Sequence>
      );
    }

    audioFrame += eventDuration;
  });

  // Main visual composition
  const mainContent = (
    <AbsoluteFill>
      {/* Intro sequence */}
      {storyTitle && (
        <Sequence from={0} durationInFrames={introDurationFrames}>
          <IntroCard storyTitle={storyTitle} storyIntroduction={storyIntroduction} />
        </Sequence>
      )}

      {/* Scrapbook camera pan - starts after intro */}
      <Sequence from={introDurationFrames} durationInFrames={durationInFrames - introDurationFrames}>
        <CameraPan
          events={events}
          cardPositions={cardPositions}
          canvasWidth={canvasWidth}
          canvasHeight={canvasHeight}
        >
          <ScrapbookLayout
            events={events}
            canvasWidth={canvasWidth}
            canvasHeight={canvasHeight}
            startYear={startYear}
          />
        </CameraPan>
      </Sequence>
    </AbsoluteFill>
  );

  return (
    <>
      {wrapContent(mainContent, events[0]?.date)}
      {audioSequences}
    </>
  );
};

/**
 * Calculate total duration for scrapbook video
 */
export const calculateScrapbookDuration = (
  events: VideoEvent[],
  introDurationFrames: number,
  fps: number
): number => {
  let total = introDurationFrames;

  events.forEach((event) => {
    total += event.audioDurationFrames || Math.round(5 * fps);
  });

  return total;
};

export { ScrapbookVideoComponent as ScrapbookVideo };
