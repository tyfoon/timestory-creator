import { CSSProperties } from "react";

export type EraTheme = {
  id: string;
  name: string;
  fonts: {
    heading: string;
    body: string;
  };
  colors: {
    background: string;
    text: string;
    accent: string;
  };
  filters: {
    image: string; // CSS filter string
    overlay: string; // CSS background blend mode or gradient
  };
  animation: {
    direction: "left" | "right" | "zoom";
  };
};

export const TIMELINE_THEMES: Record<string, EraTheme> = {
  "70s": {
    id: "70s",
    name: "Vintage Warmth",
    fonts: {
      heading: "'Cooper Black', 'Courier New', serif",
      body: "'Courier New', monospace",
    },
    colors: {
      background: "#3e2723",
      text: "#fff3e0",
      accent: "#ff6f00",
    },
    filters: {
      image: "sepia(0.4) contrast(1.1) brightness(0.9)",
      overlay: "linear-gradient(45deg, rgba(255, 111, 0, 0.2), transparent)",
    },
    animation: { direction: "zoom" },
  },
  "80s": {
    id: "80s",
    name: "Neon VHS",
    fonts: {
      heading: "'Arial Black', sans-serif",
      body: "'Arial', sans-serif",
    },
    colors: {
      background: "#0a0a0a",
      text: "#00ffcc",
      accent: "#ff00ff",
    },
    filters: {
      image: "saturate(1.5) contrast(1.2) hue-rotate(-10deg)",
      overlay:
        "linear-gradient(to bottom, transparent 50%, rgba(0,0,0,0.5) 50%)", // Scanline effect
    },
    animation: { direction: "right" },
  },
  "90s": {
    id: "90s",
    name: "Grunge Pop",
    fonts: {
      heading: "'Impact', sans-serif",
      body: "'Comic Sans MS', 'Chalkboard SE', sans-serif",
    },
    colors: {
      background: "#212121",
      text: "#ffffff",
      accent: "#ff0000",
    },
    filters: {
      image: "contrast(1.3) grayscale(0.2)",
      overlay: "radial-gradient(circle, transparent 60%, black 100%)", // Vignette
    },
    animation: { direction: "left" },
  },
  default: {
    id: "default",
    name: "Modern Clean",
    fonts: {
      heading: "Inter, sans-serif",
      body: "Inter, sans-serif",
    },
    colors: {
      background: "#ffffff",
      text: "#000000",
      accent: "#3b82f6",
    },
    filters: {
      image: "none",
      overlay: "none",
    },
    animation: { direction: "zoom" },
  },
};

export const getThemeForYear = (year: number): EraTheme => {
  if (year >= 1970 && year < 1980) return TIMELINE_THEMES["70s"];
  if (year >= 1980 && year < 1990) return TIMELINE_THEMES["80s"];
  if (year >= 1990 && year < 2000) return TIMELINE_THEMES["90s"];
  return TIMELINE_THEMES["default"];
};
