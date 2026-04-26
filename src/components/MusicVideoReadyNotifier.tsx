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
import { Music, X, Play, Sparkles, Loader2 } from 'lucide-react';
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

  const audioUrl = soundtrack.audioUrl;
  const isComplete = soundtrack.isComplete && !!audioUrl;
  const isGenerating = soundtrack.isGenerating;
  const onMusicVideoPage = pathname === '/muziek-video';
  const onStoryPage = pathname === '/story';
  // In-progress chip should only show when the user is on a page that does
  // NOT already display the inline soundtrack status (story has its own
  // SoundtrackSection + StoryEndCarousel; muziek-video has the player itself).
  const showInProgressChip = isGenerating && !isComplete && !onStoryPage && !onMusicVideoPage;

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
    const qs = searchParams.toString();
    navigate(qs ? `/story?${qs}` : '/story');
  };

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
  // Otherwise: render the in-progress chip OR the ready toast/badge.
  if (onMusicVideoPage) return null;
  if (!isComplete && !showInProgressChip) return null;

  return (
    <AnimatePresence>
      {showInProgressChip && (
        <motion.button
          key="in-progress-chip"
          initial={{ opacity: 0, y: 40, scale: 0.92 }}
          animate={{ opacity: 1, y: 0, scale: 1 }}
          exit={{ opacity: 0, y: 40, scale: 0.92 }}
          transition={{ duration: 0.3, ease: [0.25, 0.1, 0.25, 1] }}
          onClick={handleResumeStory}
          aria-label="Open story page to follow music video generation"
          className="fixed bottom-4 right-4 z-[100] max-w-[340px] w-[calc(100vw-2rem)] sm:w-[340px] text-left"
        >
          <div className="relative overflow-hidden rounded-2xl border border-primary/30 bg-card/95 backdrop-blur-md shadow-2xl shadow-primary/20">
            {/* Subtle aurora gradient */}
            <div className="absolute inset-0 bg-gradient-to-br from-violet-500/10 via-fuchsia-500/8 to-transparent pointer-events-none" />
            {/* Pulse ring on the icon */}
            <div className="relative z-[1] p-3.5 flex items-center gap-3">
              <div className="relative flex-shrink-0">
                <div className="w-10 h-10 rounded-xl bg-violet-500/15 border border-violet-500/30 flex items-center justify-center text-violet-300">
                  <Loader2 className="h-4 w-4 animate-spin" />
                </div>
                <motion.div
                  className="absolute inset-0 rounded-xl border-2 border-violet-400/50"
                  animate={{ scale: [1, 1.25, 1], opacity: [0.6, 0, 0.6] }}
                  transition={{ duration: 2, repeat: Infinity }}
                />
              </div>
              <div className="flex-1 min-w-0">
                <div className="flex items-center gap-1.5 mb-0.5">
                  <Sparkles className="h-3 w-3 text-violet-300" />
                  <p className="text-[10px] font-mono uppercase tracking-wider text-violet-300 font-semibold">
                    Wordt gemaakt
                  </p>
                </div>
                <p className="text-sm font-medium text-foreground leading-tight">
                  Je muziekvideo wordt gemaakt
                </p>
                <p className="text-xs text-muted-foreground mt-0.5">
                  Tik om terug te gaan en mee te kijken.
                </p>
              </div>
            </div>
          </div>
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
