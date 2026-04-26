import type { FallbackProps } from "react-error-boundary";
import { useEffect } from "react";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { useLanguage } from "@/contexts/LanguageContext";
import { Sentry } from "@/lib/sentry";

export const ErrorFallback = ({ error, resetErrorBoundary }: FallbackProps) => {
  const err = error as Error;
  const isDev = import.meta.env.DEV;

  // Resilient t(): if rendered outside LanguageProvider (or it crashed),
  // fall back to NL strings so the boundary itself never throws.
  let t: (k: string) => string;
  try {
    const lang = useLanguage();
    t = (k: string) => String(lang.t(k as never) ?? k);
  } catch {
    const fallbacks: Record<string, string> = {
      errorBoundaryTitle: "Er ging iets mis",
      errorBoundaryBody: "We konden dit deel van de app niet laden.",
      errorBoundaryRetry: "Probeer opnieuw",
      errorBoundaryHome: "Naar home",
    };
    t = (k: string) => fallbacks[k] ?? k;
  }

  useEffect(() => {
    console.error("[ErrorBoundary]", err);
    Sentry.captureException(err);
  }, [err]);

  return (
    <div className="min-h-screen flex items-center justify-center bg-background p-6">
      <Card className="w-full max-w-md">
        <CardHeader>
          <CardTitle>{t("errorBoundaryTitle")}</CardTitle>
        </CardHeader>
        <CardContent className="space-y-4">
          <p className="text-sm text-muted-foreground">{t("errorBoundaryBody")}</p>

          {!isDev && err?.message && (
            <p className="text-xs text-muted-foreground/80 font-mono break-words">
              {err.message}
            </p>
          )}

          {isDev && (
            <details className="text-xs">
              <summary className="cursor-pointer text-muted-foreground">Debug</summary>
              <pre className="mt-2 whitespace-pre-wrap break-words bg-muted p-2 rounded text-[11px]">
                {err?.message}
                {"\n\n"}
                {err?.stack}
              </pre>
            </details>
          )}

          <div className="flex gap-2 pt-2">
            <Button onClick={resetErrorBoundary} className="flex-1">
              {t("errorBoundaryRetry")}
            </Button>
            <Button
              variant="outline"
              onClick={() => window.location.assign("/")}
              className="flex-1"
            >
              {t("errorBoundaryHome")}
            </Button>
          </div>
        </CardContent>
      </Card>
    </div>
  );
};
