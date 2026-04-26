/**
 * Clears app-level sessionStorage entries that contain user data.
 *
 * Called from AuthContext.signOut so a logout in a shared browser does
 * not leak the previous user's form data, generated timeline cache, or
 * overview lookups to whoever signs in next.
 *
 * Keys NOT cleared:
 *  - `imageSearchMode` (a UI preference, no PII).
 *  - MusicVideoReadyNotifier `seen` / `dismissed` markers (transient,
 *    keyed on audioUrl, not on user identity).
 *
 * If you add a new sessionStorage write that contains anything tied to
 * a specific user (form fields, AI-generated content, location, etc.),
 * either add the exact key to KNOWN_KEYS or use one of the PREFIXES.
 */

const KNOWN_KEYS = [
  "homepageFormState",        // HomeV3 — full form state (name, partner, kids, friends, …)
  "timelineFormData",         // /story, /polaroid, /muziek-video — flow handoff
  "timelineLength",           // /story, /polaroid — flow handoff
  "soundtrack_generation_state", // useSoundtrackGeneration — generated audio URLs
];

const PREFIXES = [
  "timeline_cache_",   // src/lib/timelineCache.ts — cached AI-generated events
  "tvfilm-overview::", // src/lib/overviewCache.ts — TV/film lookups + city
  "music-overview::",  // src/lib/overviewCache.ts — music lookups + city
];

export function clearAppSessionData(): void {
  if (typeof window === "undefined" || !window.sessionStorage) return;

  for (const key of KNOWN_KEYS) {
    try {
      sessionStorage.removeItem(key);
    } catch {
      // ignore — quota / disabled storage
    }
  }

  // Walk indices in reverse: removeItem shifts later entries down.
  for (let i = sessionStorage.length - 1; i >= 0; i--) {
    const key = sessionStorage.key(i);
    if (!key) continue;
    if (PREFIXES.some((p) => key.startsWith(p))) {
      try {
        sessionStorage.removeItem(key);
      } catch {
        // ignore
      }
    }
  }
}
