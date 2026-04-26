import * as Sentry from "@sentry/react";

let initialized = false;

export function initSentry() {
  if (initialized) return;
  const dsn = import.meta.env.VITE_SENTRY_DSN;
  if (!dsn) {
    // No-op in dev / unconfigured environments
    return;
  }

  Sentry.init({
    dsn,
    environment: import.meta.env.MODE,
    release: import.meta.env.VITE_APP_VERSION,

    integrations: [
      Sentry.browserTracingIntegration(),
      // No replay integration in beta — recording user sessions can
      // capture PII (the app handles names, school, friends, etc.)
    ],

    tracesSampleRate: import.meta.env.PROD ? 0.1 : 0,
    sendDefaultPii: false,

    beforeSend(event, hint) {
      const msg = (event.message || "").toString();
      if (msg.includes("ResizeObserver loop")) return null;

      const errName = (hint.originalException as Error | undefined)?.name;
      if (errName === "AbortError") return null;

      return event;
    },
  });

  initialized = true;
}

export { Sentry };
