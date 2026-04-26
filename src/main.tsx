import { createRoot } from "react-dom/client";
import { ErrorBoundary } from "react-error-boundary";
import App from "./App.tsx";
import { ErrorFallback } from "./components/ErrorFallback";
import "./index.css";

createRoot(document.getElementById("root")!).render(
  <ErrorBoundary FallbackComponent={ErrorFallback} onReset={() => { /* user-initiated reload */ }}>
    <App />
  </ErrorBoundary>
);
