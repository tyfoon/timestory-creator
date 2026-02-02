import { TimelineEvent } from '@/types/timeline';

export interface VideoEvent extends TimelineEvent {
  audioUrl?: string;
  audioDurationFrames: number;
}

export interface TimelineVideoProps {
  events: VideoEvent[];
  storyTitle?: string;
  storyIntroduction?: string;
  introAudioUrl?: string;
  introDurationFrames: number;
  fps: number;
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
