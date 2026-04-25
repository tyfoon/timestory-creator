/**
 * Session cache for /muziek and /tv-film overview pages.
 * Avoids re-fetching local hits / TV-film lists + Spotify/YouTube lookups
 * when navigating between the two pages.
 */
const TTL_MS = 1000 * 60 * 60 * 24; // 24h

interface Entry<T> {
  cachedAt: number;
  data: T;
}

const buildKey = (
  prefix: string,
  startYear: number,
  endYear: number,
  city: string,
  language: string
) => `${prefix}::${startYear}-${endYear}::${city || '_'}::${language}`;

export function readOverviewCache<T>(
  prefix: string,
  startYear: number,
  endYear: number,
  city: string,
  language: string
): T | null {
  try {
    const raw = sessionStorage.getItem(buildKey(prefix, startYear, endYear, city, language));
    if (!raw) return null;
    const entry: Entry<T> = JSON.parse(raw);
    if (Date.now() - entry.cachedAt > TTL_MS) return null;
    return entry.data;
  } catch {
    return null;
  }
}

export function writeOverviewCache<T>(
  prefix: string,
  startYear: number,
  endYear: number,
  city: string,
  language: string,
  data: T
): void {
  try {
    const entry: Entry<T> = { cachedAt: Date.now(), data };
    sessionStorage.setItem(
      buildKey(prefix, startYear, endYear, city, language),
      JSON.stringify(entry)
    );
  } catch {
    // sessionStorage full / unavailable — ignore
  }
}
