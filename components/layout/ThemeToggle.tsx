"use client";

import { Moon, Sun } from "lucide-react";
import { useTheme } from "@/lib/themeContext";

export function ThemeToggle() {
  const { theme, toggleTheme } = useTheme();

  return (
    <button
      type="button"
      onClick={toggleTheme}
      aria-label={theme === "dark" ? "Switch to light theme" : "Switch to dark theme"}
      title={theme === "dark" ? "Switch to light theme" : "Switch to dark theme"}
      className="flex h-8 w-8 shrink-0 items-center justify-center rounded-full border transition-colors hover:bg-white/5"
      style={{ borderColor: "var(--ks-border-strong)", color: "var(--ks-text-muted)" }}
    >
      {theme === "dark" ? <Sun size={15} /> : <Moon size={15} />}
    </button>
  );
}
