import { TimelineEvent } from '@/types/timeline';

export interface VideoEvent extends TimelineEvent {
  audioUrl?: string;
  audioDurationFrames: number;
  // Sound effect for background audio
  soundEffectAudioUrl?: string;
}

export interface TimelineVideoProps {
  events: VideoEvent[];
  storyTitle?: string;
  storyIntroduction?: string;
  introAudioUrl?: string;
  introDurationFrames: number;
  fps: number;
  /** Enable 80s VHS/CRT retro effects */
  enableRetroEffect?: boolean;
  /** Intensity of retro effects (0-1) */
  retroIntensity?: number;
  /** External audio URL (e.g., Suno-generated song) - overrides individual event audio */
  externalAudioUrl?: string;
  /** Duration of external audio in seconds - when set, events are distributed over this duration */
  externalAudioDuration?: number;
}

export interface EventCardProps {
  event: VideoEvent;
  imageUrl: string;
  eventIndex: number;
  periodLabel?: string; // e.g. "1980-1990" or "Kindertijd"
}

export interface AudioSegment {
  eventId: string;
  audioContent: string; // Base64
  estimatedDurationSeconds: number;
}
