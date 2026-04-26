/**
 * Global notifier that watches the soundtrack-generation state.
 *
 * Three states surface different UI:
 *   1. IN PROGRESS (off /story, off /muziek-video):
 *        small pulsing chip "🎵 Je muziekvideo wordt gemaakt — kijk straks terug"
 *        → click navigates back to /story
 *   2. READY for the first time (off /muziek-video):
 *        sticky toast bottom-right with "Bekijk nu" / "Later"
 *   3. READY but already dismissed:
 *        small floating music-icon badge that re-opens the toast on click
 *
 * Plus: while generating AND the tab is in the background, the document
 * title pulses ("🎵 Wordt gemaakt..." ↔ original title) so the browser
 * tab-bar grabs attention without requiring notification permission.
 *
 * Mounted once inside <BrowserRouter> in App.tsx.
 */
import { useEffect, useRef, useState } from 'react';
import { useLocation, useNavigate, useSearchParams } from 'react-router-dom';
import { motion, AnimatePresence } from 'framer-motion';
import { Music, X, Play, Sparkles, Loader2, AlertCircle, RefreshCw } from 'lucide-react';
import { Button } from '@/components/ui/button';
import { useSoundtrackGeneration } from '@/hooks/useSoundtrackGeneration';

const SEEN_KEY = 'soundtrack_notify_seen';     // value = audioUrl (one notif per track)
const DISMISSED_KEY = 'soundtrack_notify_dismissed'; // value = audioUrl (collapsed to badge)
const TITLE_PULSE_TEXT = '🎵 Wordt gemaakt...';
const TITLE_PULSE_INTERVAL_MS = 1500;

export const MusicVideoReadyNotifier = () => {
  const navigate = useNavigate();
  const { pathname } = useLocation();
  const [searchParams] = useSearchParams();
  const soundtrack = useSoundtrackGeneration();

  // visible = full toast; minimized = small floating badge
  const [visible, setVisible] = useState(false);
  const [minimized, setMinimized] = useState(false);
  // In-progress chip can be collapsed to a tiny dot if it's in the way.
  // Resets automatically when a new generation cycle starts (different taskId).
  const [chipDismissed, setChipDismissed] = useState(false);
  // Tick to force re-render every few seconds during the polling phase so
  // the indicative progress percentage visibly moves.
  const [, setProgressTick] = useState(0);

  const audioUrl = soundtrack.audioUrl;
  const isComplete = soundtrack.isComplete && !!audioUrl;
  const isGenerating = soundtrack.isGenerating;
  const onMusicVideoPage = pathname === '/muziek-video';
  const onStoryPage = pathname === '/story';
  // In-progress chip shows on every page except /muziek-video (where the
  // player itself is the destination). On /story we still show it because
  // the music-video card lives at the BOTTOM of the page (inside
  // StoryEndCarousel), which a scrolling user wouldn't see for minutes —
  // the floating chip keeps the "something is being made for you" cue
  // visible during the scroll.
  const showInProgressChip = isGenerating && !isComplete && !onMusicVideoPage;

  // Error variant: when soundtrack generation fails (Suno down, rate-limited,
  // SUPABASE_EDGE_RUNTIME_ERROR, etc.) the pill should NOT silently disappear
  // — user has no idea what happened. Show a destructive-styled pill with a
  // retry CTA that takes them to /muziek-video where the existing retry
  // button hooks up formData + events for the actual regeneration.
  const hasError = soundtrack.hasError;
  const showErrorPill = hasError && !onMusicVideoPage;

  // Indicative progress derived from generation stage. Not exact %, but
  // gives the user a sense of "we're making progress" rather than just a
  // spinning loader. The exact polling phase is the longest, so we tick
  // it up gradually based on elapsed time within the phase.
  const progressPct = (() => {
    const status = soundtrack.status;
    const startedAt = soundtrack.startedAt ?? Date.now();
    switch (status) {
      case 'generating_lyrics': return 15;
      case 'generating_music':  return 30;
      case 'warming_up':        return 45;
      case 'polling': {
        // Suno's polling stage typically resolves in 60-120s; tick from
        // 60% up to 95% over that window so the bar visibly moves.
        const elapsedSec = Math.max(0, (Date.now() - startedAt) / 1000);
        const POLL_WINDOW = 90; // seconds — typical p50
        return Math.min(95, 60 + Math.round((elapsedSec / POLL_WINDOW) * 35));
      }
      case 'completed':         return 100;
      default:                  return 5;
    }
  })();

  // Decide when to surface the toast
  useEffect(() => {
    if (!isComplete || !audioUrl) {
      setVisible(false);
      setMinimized(false);
      return;
    }

    const seen = sessionStorage.getItem(SEEN_KEY);
    const dismissed = sessionStorage.getItem(DISMISSED_KEY);

    // Already on the music video page → no notification needed
    if (onMusicVideoPage) {
      sessionStorage.setItem(SEEN_KEY, audioUrl);
      setVisible(false);
      setMinimized(false);
      return;
    }

    // Already dismissed for this exact track → show only minimized badge
    if (dismissed === audioUrl) {
      setMinimized(true);
      setVisible(false);
      return;
    }

    // First time seeing this completed track on a different page
    if (seen !== audioUrl) {
      sessionStorage.setItem(SEEN_KEY, audioUrl);
      setVisible(true);
      setMinimized(false);
    }
  }, [isComplete, audioUrl, onMusicVideoPage]);

  const handleWatch = () => {
    setVisible(false);
    setMinimized(false);
    if (audioUrl) sessionStorage.setItem(DISMISSED_KEY, audioUrl);
    const qs = searchParams.toString();
    navigate(qs ? `/muziek-video?${qs}` : '/muziek-video');
  };

  const handleDismiss = () => {
    if (audioUrl) sessionStorage.setItem(DISMISSED_KEY, audioUrl);
    setVisible(false);
    setMinimized(true);
  };

  const handleExpand = () => {
    setMinimized(false);
    setVisible(true);
  };

  const handleResumeStory = () => {
    // If we're already on /story, scroll to the music-video card at the
    // bottom of the page rather than re-navigating (which would no-op).
    // The card's wrapper has id="music-video-card" in StoryEndCarousel.
    if (onStoryPage) {
      const target = document.getElementById('music-video-card');
      if (target) {
        target.scrollIntoView({ behavior: 'smooth', block: 'start' });
        return;
      }
    }
    const qs = searchParams.toString();
    navigate(qs ? `/story?${qs}` : '/story');
  };

  // While in the polling phase the indicative progress is time-derived;
  // re-render every 3s so the bar visibly moves.
  useEffect(() => {
    if (soundtrack.status !== 'polling') return;
    const id = window.setInterval(() => {
      setProgressTick((n) => n + 1);
    }, 3000);
    return () => clearInterval(id);
  }, [soundtrack.status]);

  // Reset the dismissed flag whenever a new generation cycle begins, so the
  // chip re-appears for the new track. Keyed on taskId — every fresh
  // generation gets a fresh taskId.
  useEffect(() => {
    if (soundtrack.taskId) setChipDismissed(false);
  }, [soundtrack.taskId]);

  // Document title pulse: while generating AND the tab is in the background,
  // alternate the page title so the browser tab-bar grabs the user's eye.
  // Also works on mobile Safari/Chrome (visibilitychange + document.title).
  // Restored on: tab visible, generation finishes, or component unmounts.
  const originalTitleRef = useRef<string | null>(null);
  useEffect(() => {
    if (typeof document === 'undefined') return;

    let intervalId: number | null = null;

    const startPulse = () => {
      if (intervalId !== null) return;
      if (originalTitleRef.current === null) {
        originalTitleRef.current = document.title;
      }
      let toggled = false;
      intervalId = window.setInterval(() => {
        document.title = toggled ? (originalTitleRef.current ?? document.title) : TITLE_PULSE_TEXT;
        toggled = !toggled;
      }, TITLE_PULSE_INTERVAL_MS);
    };

    const stopPulse = () => {
      if (intervalId !== null) {
        clearInterval(intervalId);
        intervalId = null;
      }
      if (originalTitleRef.current !== null) {
        document.title = originalTitleRef.current;
        // Keep the cached original — multiple start/stop cycles reuse it.
      }
    };

    const evaluate = () => {
      if (isGenerating && !isComplete && document.hidden) {
        startPulse();
      } else {
        stopPulse();
      }
    };

    evaluate();
    document.addEventListener('visibilitychange', evaluate);

    return () => {
      document.removeEventListener('visibilitychange', evaluate);
      stopPulse();
    };
  }, [isGenerating, isComplete]);

  // Hide everything when user lands on the music video page
  useEffect(() => {
    if (onMusicVideoPage) {
      setVisible(false);
      setMinimized(false);
    }
  }, [onMusicVideoPage]);

  // The /muziek-video page has its own player and doesn't need any overlay.
  // Otherwise: render the in-progress chip, error pill, ready toast, or badge.
  if (onMusicVideoPage) return null;
  if (!isComplete && !showInProgressChip && !showErrorPill) return null;

  return (
    <AnimatePresence>
      {showInProgressChip && !chipDismissed && (
        <motion.div
          key="in-progress-chip"
          initial={{ opacity: 0, y: 20, scale: 0.95 }}
          animate={{ opacity: 1, y: 0, scale: 1 }}
          exit={{ opacity: 0, y: 20, scale: 0.95 }}
          transition={{ duration: 0.25, ease: [0.25, 0.1, 0.25, 1] }}
          // Safe-area-aware positioning so the pill stays clear of the iOS
          // home indicator and any device notch on the right side.
          style={{
            bottom: 'max(1rem, env(safe-area-inset-bottom))',
            right: 'max(1rem, env(safe-area-inset-right))',
          }}
          className="fixed z-[100] flex items-stretch gap-1 rounded-full border border-primary/30 bg-card/95 backdrop-blur-md shadow-lg shadow-primary/10"
        >
          <button
            type="button"
            onClick={handleResumeStory}
            aria-label={`Persoonlijke muziekvideo wordt gemaakt — ${progressPct}%`}
            title={
              onStoryPage
                ? 'Tik om naar je muziekvideo te scrollen'
                : 'Tik om naar je muziekvideo te gaan'
            }
            className="group flex items-center gap-2.5 h-9 pl-2 pr-2 rounded-l-full hover:bg-muted/40 transition-colors text-left"
          >
            <span className="relative flex-shrink-0 w-6 h-6 rounded-full bg-violet-500/15 border border-violet-500/30 flex items-center justify-center text-violet-300">
              <Loader2 className="h-3 w-3 animate-spin" />
            </span>
            <span className="flex flex-col leading-tight min-w-0">
              <span className="text-[11px] font-medium text-foreground truncate">
                Persoonlijke muziekvideo
              </span>
              <span className="flex items-center gap-1.5 mt-0.5">
                <span className="relative h-1 w-20 rounded-full bg-muted overflow-hidden">
                  <motion.span
                    className="absolute inset-y-0 left-0 bg-violet-500 rounded-full"
                    animate={{ width: `${progressPct}%` }}
                    transition={{ duration: 0.4, ease: 'easeOut' }}
                  />
                </span>
                <span className="text-[10px] font-mono tabular-nums text-muted-foreground">
                  {progressPct}%
                </span>
              </span>
            </span>
          </button>
          <button
            type="button"
            onClick={() => setChipDismissed(true)}
            aria-label="Melding inklappen"
            title="Inklappen"
            className="flex items-center justify-center w-7 h-9 rounded-r-full text-muted-foreground hover:text-foreground hover:bg-muted/40 transition-colors"
          >
            <X className="h-3 w-3" />
          </button>
        </motion.div>
      )}

      {showErrorPill && (
        <motion.button
          key="error-pill"
          type="button"
          initial={{ opacity: 0, y: 20, scale: 0.95 }}
          animate={{ opacity: 1, y: 0, scale: 1 }}
          exit={{ opacity: 0, y: 20, scale: 0.95 }}
          transition={{ duration: 0.25, ease: [0.25, 0.1, 0.25, 1] }}
          onClick={() => {
            const qs = searchParams.toString();
            navigate(qs ? `/muziek-video?${qs}` : '/muziek-video');
          }}
          aria-label="Muziekvideo mislukt — tik om opnieuw te proberen"
          title="Tik voor opnieuw proberen"
          style={{
            bottom: 'max(1rem, env(safe-area-inset-bottom))',
            right: 'max(1rem, env(safe-area-inset-right))',
          }}
          className="fixed z-[100] group flex items-center gap-2.5 h-9 pl-2 pr-3 rounded-full border border-destructive/40 bg-card/95 backdrop-blur-md shadow-lg shadow-destructive/10 hover:border-destructive/70 hover:shadow-destructive/20 transition-colors text-left"
        >
          <span className="relative flex-shrink-0 w-6 h-6 rounded-full bg-destructive/15 border border-destructive/40 flex items-center justify-center text-destructive">
            <AlertCircle className="h-3.5 w-3.5" />
          </span>
          <span className="flex flex-col leading-tight min-w-0">
            <span className="text-[11px] font-medium text-foreground truncate">
              Muziekvideo mislukt
            </span>
            <span className="flex items-center gap-1 mt-0.5 text-[10px] text-muted-foreground">
              <RefreshCw className="h-2.5 w-2.5" />
              <span>Opnieuw proberen</span>
            </span>
          </span>
        </motion.button>
      )}

      {showInProgressChip && chipDismissed && (
        <motion.button
          key="in-progress-dot"
          type="button"
          initial={{ opacity: 0, scale: 0.6 }}
          animate={{ opacity: 1, scale: 1 }}
          exit={{ opacity: 0, scale: 0.6 }}
          transition={{ duration: 0.2 }}
          onClick={() => setChipDismissed(false)}
          aria-label={`Persoonlijke muziekvideo wordt gemaakt — ${progressPct}%, klik om te tonen`}
          title="Voortgang muziekvideo"
          style={{
            bottom: 'max(1rem, env(safe-area-inset-bottom))',
            right: 'max(1rem, env(safe-area-inset-right))',
          }}
          className="fixed z-[100] w-8 h-8 rounded-full bg-card/95 backdrop-blur-md border border-primary/30 shadow-lg shadow-primary/10 flex items-center justify-center text-violet-400 hover:scale-110 transition-transform"
        >
          {/* Tiny circular progress ring around a spinner. SVG ring uses
              stroke-dasharray to show the % around its circumference. */}
          <svg viewBox="0 0 32 32" className="absolute inset-0 w-full h-full -rotate-90">
            <circle
              cx="16"
              cy="16"
              r="14"
              fill="none"
              strokeWidth="2"
              className="stroke-muted"
            />
            <motion.circle
              cx="16"
              cy="16"
              r="14"
              fill="none"
              strokeWidth="2"
              strokeLinecap="round"
              className="stroke-violet-500"
              strokeDasharray={2 * Math.PI * 14}
              animate={{ strokeDashoffset: (1 - progressPct / 100) * 2 * Math.PI * 14 }}
              transition={{ duration: 0.4, ease: 'easeOut' }}
            />
          </svg>
          <Loader2 className="h-3 w-3 animate-spin relative" />
        </motion.button>
      )}

      {visible && (
        <motion.div
          key="toast"
          initial={{ opacity: 0, y: 40, scale: 0.95 }}
          animate={{ opacity: 1, y: 0, scale: 1 }}
          exit={{ opacity: 0, y: 40, scale: 0.95 }}
          transition={{ duration: 0.35, ease: [0.25, 0.1, 0.25, 1] }}
          className="fixed bottom-4 right-4 z-[100] max-w-[360px] w-[calc(100vw-2rem)] sm:w-[360px]"
        >
          <div className="relative overflow-hidden rounded-2xl border border-primary/30 bg-card/95 backdrop-blur-md shadow-2xl shadow-primary/20">
            {/* Decorative gradient */}
            <div className="absolute inset-0 bg-gradient-to-br from-violet-500/15 via-fuchsia-500/10 to-transparent pointer-events-none" />
            {/* Pulse ring */}
            <motion.div
              className="absolute -top-1 -right-1 h-3 w-3 rounded-full bg-emerald-400"
              animate={{ scale: [1, 1.6, 1], opacity: [1, 0.4, 1] }}
              transition={{ duration: 1.6, repeat: Infinity }}
            />

            <button
              onClick={handleDismiss}
              aria-label="Sluiten"
              className="absolute top-2 right-2 z-10 h-7 w-7 rounded-full flex items-center justify-center text-muted-foreground hover:text-foreground hover:bg-muted/40 transition-colors"
            >
              <X className="h-4 w-4" />
            </button>

            <div className="relative z-[1] p-4">
              <div className="flex items-start gap-3">
                <div className="flex-shrink-0 w-11 h-11 rounded-xl bg-violet-500/15 border border-violet-500/30 flex items-center justify-center text-violet-300">
                  <Music className="h-5 w-5" />
                </div>
                <div className="flex-1 min-w-0 pr-6">
                  <div className="flex items-center gap-1.5 mb-0.5">
                    <Sparkles className="h-3 w-3 text-emerald-400" />
                    <p className="text-[10px] font-mono uppercase tracking-wider text-emerald-400 font-semibold">
                      Klaar om af te spelen
                    </p>
                  </div>
                  <h4 className="font-serif text-sm font-bold text-foreground leading-tight truncate">
                    {soundtrack.title || 'Je muziekvideo'}
                  </h4>
                  <p className="text-xs text-muted-foreground mt-0.5 line-clamp-1">
                    Je persoonlijke muziekvideo is klaar.
                  </p>
                </div>
              </div>

              <div className="flex gap-2 mt-3">
                <Button
                  onClick={handleWatch}
                  size="sm"
                  className="flex-1 gap-1.5 text-xs font-semibold"
                >
                  <Play className="h-3 w-3 fill-current" />
                  Bekijk nu
                </Button>
                <Button
                  onClick={handleDismiss}
                  size="sm"
                  variant="outline"
                  className="text-xs"
                >
                  Later
                </Button>
              </div>
            </div>
          </div>
        </motion.div>
      )}

      {minimized && !visible && (
        <motion.button
          key="badge"
          initial={{ opacity: 0, scale: 0.6 }}
          animate={{ opacity: 1, scale: 1 }}
          exit={{ opacity: 0, scale: 0.6 }}
          transition={{ duration: 0.25 }}
          onClick={handleExpand}
          aria-label="Open muziekvideo melding"
          className="fixed bottom-4 right-4 z-[100] h-12 w-12 rounded-full bg-gradient-to-br from-violet-500 to-fuchsia-500 text-white shadow-2xl shadow-violet-500/40 flex items-center justify-center hover:scale-110 transition-transform"
        >
          <Music className="h-5 w-5" />
          <motion.span
            className="absolute inset-0 rounded-full border-2 border-violet-400"
            animate={{ scale: [1, 1.4, 1], opacity: [0.8, 0, 0.8] }}
            transition={{ duration: 2, repeat: Infinity }}
          />
        </motion.button>
      )}
    </AnimatePresence>
  );
};

export default MusicVideoReadyNotifier;
