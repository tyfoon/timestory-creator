import { useEffect, useRef } from 'react';

/**
 * Keeps the screen awake using Wake Lock API + silent video fallback.
 * @param active - Whether the wake lock should be active
 */
export function useWakeLock(active: boolean) {
  const wakeLockRef = useRef<WakeLockSentinel | null>(null);
  const noSleepVideoRef = useRef<HTMLVideoElement | null>(null);

  useEffect(() => {
    if (!active) return;

    let released = false;

    const acquireWakeLock = async () => {
      if (wakeLockRef.current) {
        try { await wakeLockRef.current.release(); } catch {}
        wakeLockRef.current = null;
      }

      if ('wakeLock' in navigator) {
        try {
          wakeLockRef.current = await navigator.wakeLock.request('screen');
          wakeLockRef.current.addEventListener('release', () => {
            if (!released && document.visibilityState === 'visible') {
              setTimeout(() => acquireWakeLock(), 500);
            }
          });
        } catch {
          startNoSleepVideo();
        }
      } else {
        startNoSleepVideo();
      }
    };

    const startNoSleepVideo = () => {
      if (noSleepVideoRef.current || released) return;
      const video = document.createElement('video');
      video.setAttribute('playsinline', '');
      video.setAttribute('muted', '');
      video.muted = true;
      video.loop = true;
      video.style.position = 'fixed';
      video.style.top = '-1px';
      video.style.left = '-1px';
      video.style.width = '1px';
      video.style.height = '1px';
      video.style.opacity = '0.01';
      video.src = 'data:video/mp4;base64,AAAAIGZ0eXBpc29tAAACAGlzb21pc28yYXZjMW1wNDEAAAAIZnJlZQAAA' +
        'ONtZGF0AAACrgYF//+q3EXpvebZSLeWLNgg2SPu73gyNjQgLSBjb3JlIDE0OCByMjY0MyA1YzY1NzA0IC0gSC4yNjQv' +
        'TVBFRy00IEFWQyBjb2RlYyAtIENvcHlsZWZ0IDIwMDMtMjAxNSAtIGh0dHA6Ly93d3cudmlkZW9sYW4ub3JnL3gyNjQ' +
        'uaHRtbCAtIG9wdGlvbnM6IGNhYmFjPTEgcmVmPTMgZGVibG9jaz0xOjA6MCBhbmFseXNlPTB4MzoweDExMyBtZT1oZX' +
        'ggc3VibWU9NyBwc3k9MSBwc3lfcmQ9MS4wMDowLjAwIG1peGVkX3JlZj0xIG1lX3JhbmdlPTE2IGNocm9tYV9tZT0xI' +
        'HRyZWxsaXM9MSA4eDhkY3Q9MSBjcW09MCBkZWFkem9uZT0yMSwxMSBmYXN0X3Bza2lwPTEgY2hyb21hX3FwX29mZnNl' +
        'dD0tMiB0aHJlYWRzPTEgbG9va2FoZWFkX3RocmVhZHM9MSBzbGljZWRfdGhyZWFkcz0wIG5yPTAgZGVjaW1hdGU9MDEg' +
        'aW50ZXJsYWNlZD0wIGJsdXJheV9jb21wYXQ9MCBjb25zdHJhaW5lZF9pbnRyYT0wIGJmcmFtZXM9MyBiX3B5cmFtaWQ' +
        '9MiBiX2FkYXB0PTEgYl9iaWFzPTAgZGlyZWN0PTEgd2VpZ2h0Yj0xIG9wZW5fZ29wPTAgd2VpZ2h0cD0yIGtleWludD' +
        '0yNTAga2V5aW50X21pbj0xIHNjZW5lY3V0PTQwIGludHJhX3JlZnJlc2g9MCByY19sb29rYWhlYWQ9NDAgcmM9Y3JmI' +
        'G1idHJlZT0xIGNyZj0yMy4wIHFjb21wPTAuNjAgcXBtaW49MCBxcG1heD02OSBxcHN0ZXA9NCBpcF9yYXRpbz0xLjQw' +
        'IGFxPTE6MS4wMAAAAAADaW1vb3YAAABsbXZoZAAAAAAAAAAAAAAAAAAAA+gAAAAoAAEAAAEAAAAAAAAAAAAAAAABAAAAAAAA' +
        'AAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAIAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAA' +
        'AAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAH' +
        'RyYWsAAABcdGtoZAAAAA8AAAAAAAAAAAAAAAEAAAAAAAAAKAAAAAAAAAAAAAAAAAAAAAAAAQAAAAAAAAAAAAAAAAAAAAABAA' +
        'AAAAAAAAAAAAAAAABAAAAAAAAAAAAAAAAAAAAkbWRpYQAAACBtZGhkAAAAAAAAAAAAAAAAAAAoAAAAAgBVxAAAAAAALWhkbHI' +
        'AAAAAAAAAAAB2aWRlAAAAAAAAAAAAAAAAVmlkZW9IYW5kbGVyAAAAD21pbmYAAAAUdm1oZAAAAAAAAAAAAAAAAAAAACRkaW5m' +
        'AAAAHGRyZWYAAAAAAAAAAQAAAAx1cmwgAAAAAQAAAM9zdGJsAAAAl3N0c2QAAAAAAAAAAQAAAIdhdmMxAAAAAAAAAAEAAAAA' +
        'AAAAAAAAAAAAAAAAACAAIABIAAAASAAAAAAAAAABAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAGP//AAAALWF2Y' +
        '0MBZAAf/+EAF2dkAB+s2UCgL/lwFqCgoKgAAB9IAAdTAHjBIllAAAAYc3R0cwAAAAAAAAABAAAAAgAAAgAAAAAUc3Rzcw' +
        'AAAAAAAAABAAAAAQAAABBjdHRzAAAAAAAAAAAAAAASc3RzegAAAAAAAAAAAAAAAgAAAAMAAADkAAAAFHN0Y28AAAAAAAAAAQ' +
        'AAACgAAABidWR0YQAAAFptZXRhAAAAAAAAACFoZGxyAAAAAAAAAABtZGlyYXBwbAAAAAAAAAAAAAAAAC1pbHN0AAAAJal0b2' +
        '8AAAAdZGF0YQAAAAEAAAAATGF2ZjU2LjQwLjEwMQ==';
      document.body.appendChild(video);
      video.play().catch(() => {});
      noSleepVideoRef.current = video;
    };

    const handleReacquire = () => {
      if (!released && document.visibilityState === 'visible') {
        acquireWakeLock();
      }
    };

    acquireWakeLock();
    document.addEventListener('visibilitychange', handleReacquire);
    document.addEventListener('fullscreenchange', handleReacquire);
    document.addEventListener('webkitfullscreenchange', handleReacquire);

    if (/Android/i.test(navigator.userAgent)) {
      startNoSleepVideo();
    }

    return () => {
      released = true;
      document.removeEventListener('visibilitychange', handleReacquire);
      document.removeEventListener('fullscreenchange', handleReacquire);
      document.removeEventListener('webkitfullscreenchange', handleReacquire);
      if (wakeLockRef.current) {
        wakeLockRef.current.release().catch(() => {});
        wakeLockRef.current = null;
      }
      if (noSleepVideoRef.current) {
        noSleepVideoRef.current.pause();
        noSleepVideoRef.current.remove();
        noSleepVideoRef.current = null;
      }
    };
  }, [active]);
}
