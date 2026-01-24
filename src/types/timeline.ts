export interface TimelineEvent {
  id: string;
  date: string;
  year: number;
  month?: number;
  day?: number;
  title: string;
  description: string;
  category: 'politics' | 'sports' | 'entertainment' | 'science' | 'culture' | 'world' | 'local' | 'personal' | 'music' | 'technology';
  imageSearchQuery?: string;
  imageUrl?: string;
  source?: string;
  importance: 'high' | 'medium' | 'low';
}

export interface TimelineData {
  events: TimelineEvent[];
  summary: string;
}

export interface TimelineResponse {
  success: boolean;
  data?: TimelineData;
  error?: string;
}
