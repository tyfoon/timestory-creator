/**
 * Global notifier that watches the soundtrack-generation state.
 *
 * When the user's personalised music video finishes generating AND they are
 * currently NOT looking at the music-video card (either on a different route
 * or scrolled past it on /story), a sticky toast appears bottom-right with:
 *   - "Bekijk nu" → navigates to /story and scrolls to #music-video-card
 *   - "✕"        → dismisses, but leaves a small floating badge so the user
 *                   can come back to it later.
 *
 * Mounted once inside <BrowserRouter> in App.tsx.
 */
import { useEffect, useRef, useState } from 'react';
import { useLocation, useNavigate } from 'react-router-dom';
import { motion, AnimatePresence } from 'framer-motion';
import { Music, X, Play, Sparkles } from 'lucide-react';
import { Button } from '@/components/ui/button';
import { useSoundtrackGeneration } from '@/hooks/useSoundtrackGeneration';

const SEEN_KEY = 'soundtrack_notify_seen';     // value = audioUrl (one notif per track)
const DISMISSED_KEY = 'soundtrack_notify_dismissed'; // value = audioUrl (collapsed to badge)

export const MusicVideoReadyNotifier = () => {
  const navigate = useNavigate();
  const { pathname } = useLocation();
  const soundtrack = useSoundtrackGeneration();

  // visible = full toast; minimized = small floating badge
  const [visible, setVisible] = useState(false);
  const [minimized, setMinimized] = useState(false);
  const [cardInView, setCardInView] = useState(false);
  const observerRef = useRef<IntersectionObserver | null>(null);

  const audioUrl = soundtrack.audioUrl;
  const isComplete = soundtrack.isComplete && !!audioUrl;

  // Watch the music-video card on /story for visibility
  useEffect(() => {
    // Clear any previous observer
    observerRef.current?.disconnect();
    observerRef.current = null;
    setCardInView(false);

    if (pathname !== '/story') return;

    // Card may not be mounted yet (still loading); poll briefly until found
    let cancelled = false;
    const attach = () => {
      if (cancelled) return;
      const el = document.getElementById('music-video-card');
      if (!el) {
        setTimeout(attach, 500);
        return;
      }
      const obs = new IntersectionObserver(
        (entries) => {
          const entry = entries[0];
          setCardInView(entry.isIntersecting && entry.intersectionRatio > 0.3);
        },
        { threshold: [0, 0.3, 0.6, 1] }
      );
      obs.observe(el);
      observerRef.current = obs;
    };
    attach();

    return () => {
      cancelled = true;
      observerRef.current?.disconnect();
      observerRef.current = null;
    };
  }, [pathname]);

  // Decide when to surface the toast
  useEffect(() => {
    if (!isComplete || !audioUrl) {
      setVisible(false);
      setMinimized(false);
      return;
    }

    const seen = sessionStorage.getItem(SEEN_KEY);
    const dismissed = sessionStorage.getItem(DISMISSED_KEY);

    // If the user is currently focused on the music video card, don't bother them.
    if (pathname === '/story' && cardInView) {
      // Mark as seen so we don't pop up later if they navigate away
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

    // First time seeing this completed track in a context where the card isn't focused
    if (seen !== audioUrl) {
      sessionStorage.setItem(SEEN_KEY, audioUrl);
      setVisible(true);
      setMinimized(false);
    }
  }, [isComplete, audioUrl, pathname, cardInView]);

  const handleWatch = () => {
    setVisible(false);
    setMinimized(false);
    if (audioUrl) sessionStorage.setItem(DISMISSED_KEY, audioUrl);
    if (pathname === '/story') {
      const el = document.getElementById('music-video-card');
      el?.scrollIntoView({ behavior: 'smooth', block: 'center' });
    } else {
      navigate('/story#music-video-card');
      // Scroll after route change
      setTimeout(() => {
        document
          .getElementById('music-video-card')
          ?.scrollIntoView({ behavior: 'smooth', block: 'center' });
      }, 400);
    }
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

  // If user comes back to the card on /story, retire the badge entirely
  useEffect(() => {
    if (pathname === '/story' && cardInView) {
      setVisible(false);
      setMinimized(false);
    }
  }, [pathname, cardInView]);

  if (!isComplete) return null;

  return (
    <AnimatePresence>
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
