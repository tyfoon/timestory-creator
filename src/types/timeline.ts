// Search trace entry for debugging image search
export interface SearchTraceEntry {
  source: string;           // e.g., "Spotify", "TMDB Movie", "Commons NL", "Wiki EN"
  query: string;            // The actual query used
  withYear: boolean;        // Whether year was included
  result: 'found' | 'not_found' | 'error';
  timestamp: number;        // ms since start
}

export interface TimelineEvent {
  id: string;
  date: string;
  year: number;
  month?: number;
  day?: number;
  title: string;
  description: string;
  category: 'politics' | 'sports' | 'entertainment' | 'science' | 'culture' | 'world' | 'local' | 'personal' | 'music' | 'technology' | 'celebrity';
  
  // NIEUW: De AI vertelt ons nu expliciet WAT voor plaatje we zoeken
  visualSubjectType: 'person' | 'movie' | 'product' | 'logo' | 'event' | 'location' | 'artwork' | 'lifestyle' | 'culture';
  
  imageSearchQuery?: string;
  imageSearchQueryEn?: string;
  imageUrl?: string;
  imageStatus?: 'idle' | 'loading' | 'found' | 'none' | 'error';
  source?: string;
  importance: 'high' | 'medium' | 'low';
  eventScope: 'birthdate' | 'birthmonth' | 'birthyear' | 'period';
  isCelebrityBirthday?: boolean;
  isMovie?: boolean;
  isTV?: boolean; // NEW: Explicit TV show flag (for series like Swiebertje, Dallas, etc.)
  spotifySearchQuery?: string;
  movieSearchQuery?: string;
  youtubeVideoId?: string;
  
  // NEW: Detailed search trace for debugging
  searchTrace?: SearchTraceEntry[];
}

// ... (rest van het bestand blijft hetzelfde)
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
