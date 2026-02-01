import { FormData } from '@/types/form';
import { TimelineEvent, FamousBirthday } from '@/types/timeline';

interface CachedTimeline {
  events: TimelineEvent[];
  summary: string;
  famousBirthdays: FamousBirthday[];
  storyTitle?: string;
  storyIntroduction?: string;
  cachedAt: number;
}

const CACHE_KEY_PREFIX = 'timeline_cache_';
const CACHE_TTL_MS = 1000 * 60 * 60 * 24; // 24 hours

/**
 * Generate a stable cache key from form data.
 */
export function getCacheKey(formData: FormData, language: string): string {
  const parts: string[] = [formData.type, language];

  if (formData.type === 'birthdate' && formData.birthDate) {
    parts.push(
      String(formData.birthDate.day),
      String(formData.birthDate.month),
      String(formData.birthDate.year)
    );
  } else if (formData.type === 'range' && formData.yearRange) {
    parts.push(
      String(formData.yearRange.startYear),
      String(formData.yearRange.endYear)
    );
  }

  // Include optional data that affects generation
  if (formData.optionalData) {
    parts.push(formData.optionalData.focus || 'world');
    parts.push(formData.optionalData.city || '');
    parts.push(formData.optionalData.interests || '');
  }

  return CACHE_KEY_PREFIX + btoa(parts.join('|')).replace(/=/g, '');
}

/**
 * Store timeline data in sessionStorage.
 */
export function cacheTimeline(
  formData: FormData,
  language: string,
  events: TimelineEvent[],
  summary: string,
  famousBirthdays: FamousBirthday[],
  meta?: { storyTitle?: string; storyIntroduction?: string }
): void {
  try {
    const key = getCacheKey(formData, language);
    const payload: CachedTimeline = {
      events,
      summary,
      famousBirthdays,
      storyTitle: meta?.storyTitle,
      storyIntroduction: meta?.storyIntroduction,
      cachedAt: Date.now(),
    };
    sessionStorage.setItem(key, JSON.stringify(payload));
  } catch (e) {
    console.warn('Failed to cache timeline:', e);
  }
}

/**
 * Retrieve cached timeline if it exists and is not expired.
 */
export function getCachedTimeline(
  formData: FormData,
  language: string
): CachedTimeline | null {
  try {
    const key = getCacheKey(formData, language);
    const raw = sessionStorage.getItem(key);
    if (!raw) return null;

    const cached: CachedTimeline = JSON.parse(raw);

    // Check TTL
    if (Date.now() - cached.cachedAt > CACHE_TTL_MS) {
      sessionStorage.removeItem(key);
      return null;
    }

    return cached;
  } catch (e) {
    console.warn('Failed to read timeline cache:', e);
    return null;
  }
}

/**
 * Update cached events (e.g., after images are loaded).
 */
export function updateCachedEvents(
  formData: FormData,
  language: string,
  updater: (events: TimelineEvent[]) => TimelineEvent[]
): void {
  try {
    const key = getCacheKey(formData, language);
    const raw = sessionStorage.getItem(key);
    if (!raw) return;

    const cached: CachedTimeline = JSON.parse(raw);
    cached.events = updater(cached.events);
    sessionStorage.setItem(key, JSON.stringify(cached));
  } catch (e) {
    console.warn('Failed to update timeline cache:', e);
  }
}
