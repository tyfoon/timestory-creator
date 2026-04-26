import { lazy, Suspense } from "react";
import { Loader2 } from "lucide-react";
import { Toaster } from "@/components/ui/toaster";
import { Toaster as Sonner } from "@/components/ui/sonner";
import { TooltipProvider } from "@/components/ui/tooltip";
import { QueryClient, QueryClientProvider } from "@tanstack/react-query";
import { BrowserRouter, Routes, Route, Navigate } from "react-router-dom";
import { LanguageProvider } from "@/contexts/LanguageContext";
import { AuthProvider } from "@/contexts/AuthContext";
import HomeV3 from "./pages/HomeV3";
import ScrollToTop from "./components/ScrollToTop";
import MusicVideoReadyNotifier from "./components/MusicVideoReadyNotifier";

// Code-split everything except the homepage. HomeV3 stays eager so the root
// route paints fast (it's the dominant entry point). The other routes pull
// in heavy dependencies (Remotion, jspdf, html2canvas, framer-motion-heavy
// scenes) that should not block first paint.
const PolaroidCollagePage = lazy(() => import("./pages/PolaroidCollagePage"));
const TimelineStoryPage = lazy(() => import("./pages/TimelineStoryPage"));
const SharedStoryPage = lazy(() => import("./pages/SharedStoryPage"));
const AuthPage = lazy(() => import("./pages/AuthPage"));
const AccountPage = lazy(() => import("./pages/AccountPage"));
const ResetPasswordPage = lazy(() => import("./pages/ResetPasswordPage"));
const MusicOverviewPage = lazy(() => import("./pages/MusicOverviewPage"));
const MusicVideoPage = lazy(() => import("./pages/MusicVideoPage"));
const TvFilmOverviewPage = lazy(() => import("./pages/TvFilmOverviewPage"));
const NotFound = lazy(() => import("./pages/NotFound"));

const queryClient = new QueryClient();

const PageFallback = () => (
  <div className="min-h-screen flex items-center justify-center bg-background">
    <Loader2 className="h-8 w-8 animate-spin text-muted-foreground" />
  </div>
);

const App = () => (
  <QueryClientProvider client={queryClient}>
    <LanguageProvider>
      <AuthProvider>
        <TooltipProvider>
          <Toaster />
          <Sonner />
          <BrowserRouter>
            <ScrollToTop />
            <MusicVideoReadyNotifier />
            <Suspense fallback={<PageFallback />}>
              <Routes>
                <Route path="/" element={<HomeV3 />} />
                {/* Archived: HomeV2, Index (home-v4). See src/pages/_archive/ */}
                <Route path="/home-v2" element={<Navigate to="/" replace />} />
                <Route path="/home-v3" element={<Navigate to="/" replace />} />
                <Route path="/home-v4" element={<Navigate to="/" replace />} />
                {/* Archived: ResultPage. The active timeline view is /story (TimelineStoryPage). */}
                <Route path="/resultaat" element={<Navigate to="/story" replace />} />
                <Route path="/polaroid" element={<PolaroidCollagePage />} />
                <Route path="/story" element={<TimelineStoryPage />} />
                <Route path="/muziek" element={<MusicOverviewPage />} />
                <Route path="/muziek-video" element={<MusicVideoPage />} />
                <Route path="/tv-film" element={<TvFilmOverviewPage />} />
                <Route path="/s/:id" element={<SharedStoryPage />} />
                <Route path="/auth" element={<AuthPage />} />
                <Route path="/account" element={<AccountPage />} />
                <Route path="/reset-password" element={<ResetPasswordPage />} />
                {/* Redirect old routes to home */}
                <Route path="/keuze" element={<Navigate to="/" replace />} />
                <Route path="/invoer" element={<Navigate to="/" replace />} />
                {/* ADD ALL CUSTOM ROUTES ABOVE THE CATCH-ALL "*" ROUTE */}
                <Route path="*" element={<NotFound />} />
              </Routes>
            </Suspense>
          </BrowserRouter>
        </TooltipProvider>
      </AuthProvider>
    </LanguageProvider>
  </QueryClientProvider>
);

export default App;
