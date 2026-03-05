"use client";

import { createContext, useContext, useState, useEffect, useCallback } from "react";

type Mode = "portfolio" | "learning";

interface ModeContextValue {
  mode: Mode;
  toggleMode: () => void;
  setMode: (mode: Mode) => void;
  isPortfolio: boolean;
  isLearning: boolean;
}

const ModeContext = createContext<ModeContextValue | null>(null);

const STORAGE_KEY = "portfolio-mode";

export function ModeProvider({ children }: { children: React.ReactNode }) {
  const [mode, setModeState] = useState<Mode>("portfolio");
  const [mounted, setMounted] = useState(false);

  useEffect(() => {
    const stored = localStorage.getItem(STORAGE_KEY);
    if (stored === "learning" || stored === "portfolio") {
      setModeState(stored);
    }
    setMounted(true);
  }, []);

  useEffect(() => {
    if (mounted) {
      localStorage.setItem(STORAGE_KEY, mode);
      document.documentElement.setAttribute("data-mode", mode);
    }
  }, [mode, mounted]);

  const toggleMode = useCallback(() => {
    setModeState((prev) => (prev === "portfolio" ? "learning" : "portfolio"));
  }, []);

  const setMode = useCallback((newMode: Mode) => {
    setModeState(newMode);
  }, []);

  return (
    <ModeContext.Provider
      value={{
        mode,
        toggleMode,
        setMode,
        isPortfolio: mode === "portfolio",
        isLearning: mode === "learning",
      }}
    >
      <div style={mounted ? undefined : { visibility: "hidden" }}>{children}</div>
    </ModeContext.Provider>
  );
}

export function useMode() {
  const context = useContext(ModeContext);
  if (!context) {
    throw new Error("useMode must be used within a ModeProvider");
  }
  return context;
}
