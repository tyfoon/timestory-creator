import { defineConfig } from "vite";
import react from "@vitejs/plugin-react-swc";
import path from "path";
import { componentTagger } from "lovable-tagger";

// https://vitejs.dev/config/
export default defineConfig(({ mode }) => ({
  server: {
    host: "::",
    port: 8080,
    hmr: {
      overlay: false,
    },
  },
  plugins: [react(), mode === "development" && componentTagger()].filter(Boolean),
  resolve: {
    alias: {
      "@": path.resolve(__dirname, "./src"),
    },
  },
  // Strip console.* and debugger calls from production builds. The codebase
  // has 180+ console.log calls scattered through pages/components for dev
  // debugging; shipping them to production wastes bandwidth and exposes
  // internal state in users' devtools. Sentry already captures real errors,
  // and the ErrorBoundary still uses console.error which gets stripped here
  // — that's intentional, errors flow through Sentry instead.
  esbuild: {
    drop: mode === "production" ? ["console", "debugger"] : [],
  },
}));
