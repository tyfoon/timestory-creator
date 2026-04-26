import { Toaster } from "@/components/ui/toaster";
import { Toaster as Sonner } from "@/components/ui/sonner";
import { TooltipProvider } from "@/components/ui/tooltip";
import { QueryClient, QueryClientProvider } from "@tanstack/react-query";
import { BrowserRouter, Routes, Route, Navigate } from "react-router-dom";
import { LanguageProvider } from "@/contexts/LanguageContext";
import { AuthProvider } from "@/contexts/AuthContext";
import HomeV3 from "./pages/HomeV3";
import PolaroidCollagePage from "./pages/PolaroidCollagePage";
import TimelineStoryPage from "./pages/TimelineStoryPage";
import SharedStoryPage from "./pages/SharedStoryPage";
import AuthPage from "./pages/AuthPage";
import AccountPage from "./pages/AccountPage";
import ResetPasswordPage from "./pages/ResetPasswordPage";
import MusicOverviewPage from "./pages/MusicOverviewPage";
import MusicVideoPage from "./pages/MusicVideoPage";
import TvFilmOverviewPage from "./pages/TvFilmOverviewPage";
import NotFound from "./pages/NotFound";
import ScrollToTop from "./components/ScrollToTop";
import MusicVideoReadyNotifier from "./components/MusicVideoReadyNotifier";
const queryClient = new QueryClient();

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
          </BrowserRouter>
        </TooltipProvider>
      </AuthProvider>
    </LanguageProvider>
  </QueryClientProvider>
);

export default App;
