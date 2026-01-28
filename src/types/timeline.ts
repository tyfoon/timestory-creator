export interface TimelineEvent {
  id: string;
  date: string;
  year: number;
  month?: number;
  day?: number;
  title: string;
  description: string;
  category: 'politics' | 'sports' | 'entertainment' | 'science' | 'culture' | 'world' | 'local' | 'personal' | 'music' | 'technology' | 'celebrity';
  imageSearchQuery?: string;
  /** English search query for Wikimedia Commons */
  imageSearchQueryEn?: string;
  imageUrl?: string;
  /** Frontend-only helper to avoid showing an infinite "loading" state when no image is found. */
  imageStatus?: 'idle' | 'loading' | 'found' | 'none' | 'error';
  source?: string;
  importance: 'high' | 'medium' | 'low';
  // Whether this event happened on the exact birth date vs just the year
  eventScope: 'birthdate' | 'birthmonth' | 'birthyear' | 'period';
  // For celebrity birthdays
  isCelebrityBirthday?: boolean;
  // For movie/film events (use TMDB for images)
  isMovie?: boolean;
}

export interface FamousBirthday {
  name: string;
  profession: string;
  birthYear: number;
  imageSearchQuery: string;
}

export interface TimelineData {
  events: TimelineEvent[];
  summary: string;
  famousBirthdays?: FamousBirthday[];
}

export interface TimelineResponse {
  success: boolean;
  data?: TimelineData;
  error?: string;
}
