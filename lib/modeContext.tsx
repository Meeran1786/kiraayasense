"use client";

import { createContext, useCallback, useContext, useEffect, useMemo, useRef, useState, type ReactNode } from "react";
import { usePathname } from "next/navigation";
import { MODE_COOKIE, isBusinessPath, type AppMode } from "@/lib/mode";

interface ModeContextValue {
  mode: AppMode;
  setMode: (m: AppMode) => void;
}

const ModeContext = createContext<ModeContextValue | null>(null);

function persist(m: AppMode) {
  // One year; read by app/layout.tsx so the server renders the right header.
  document.cookie = `${MODE_COOKIE}=${m}; path=/; max-age=31536000; samesite=lax`;
  document.documentElement.setAttribute("data-mode", m);
}

/** Holds the customer/business switch (see lib/mode.ts). */
export function ModeProvider({ initialMode, children }: { initialMode: AppMode; children: ReactNode }) {
  const [mode, setModeState] = useState<AppMode>(initialMode);
  const pathname = usePathname() ?? "";

  const setMode = useCallback((m: AppMode) => {
    setModeState(m);
    persist(m);
  }, []);

  // Opening an owner page (from an alert, a bookmark or a link) means the
  // person is acting as a business right now, so the switch follows.
  // Only on arriving at a page: a person who picks Customer while still on an
  // owner page must not be flipped straight back.
  const lastPath = useRef<string | null>(null);
  useEffect(() => {
    if (lastPath.current === pathname) return;
    lastPath.current = pathname;
    if (isBusinessPath(pathname)) setMode("business");
  }, [pathname, setMode]);

  const value = useMemo(() => ({ mode, setMode }), [mode, setMode]);
  return <ModeContext.Provider value={value}>{children}</ModeContext.Provider>;
}

export function useMode() {
  const ctx = useContext(ModeContext);
  if (!ctx) throw new Error("useMode must be used within a ModeProvider");
  return ctx;
}
