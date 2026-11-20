"use client";

import { useCallback, useEffect, useState } from "react";
import { usePathname } from "next/navigation";
import { Bell, Coins, X } from "lucide-react";
import { useAuth } from "@/lib/authContext";
import { useT } from "@/lib/i18n/client";
import { pushState, turnOnPush, type PushState } from "@/lib/pushClient";
import { brandGradient } from "@/lib/brand";

const IST_MS = 5.5 * 60 * 60 * 1000;
const istDay = () => new Date(Date.now() + IST_MS).toISOString().slice(0, 10);
const PROMPT_SNOOZE_DAYS = 14;

/**
 * For signed-in people: collects the daily "opened the app" point (once per
 * IST day, also when the installed app comes back to the foreground on a new
 * day) and shows a short "+1 point" toast. Then, at most once every two
 * weeks, offers to turn on push notifications so the 7 PM reminder and other
 * alerts can reach this device. The browser's own permission prompt only
 * appears after the person taps "Turn on".
 */
export function DailyPoint() {
  const { user } = useAuth();
  const t = useT();
  const pathname = usePathname();
  const [toast, setToast] = useState<number | null>(null);
  const [prompt, setPrompt] = useState<PushState | null>(null);
  const [busy, setBusy] = useState(false);
  const [denied, setDenied] = useState(false);
  const uid = user?.id;

  const claim = useCallback(async () => {
    if (!uid) return;
    const key = `ks_daily_${uid}`;
    const today = istDay();
    if (localStorage.getItem(key) === today) return;
    const res = await fetch("/api/me/daily-open", { method: "POST" }).catch(() => null);
    if (!res?.ok) return;
    const data = (await res.json().catch(() => null)) as { awarded?: boolean; points?: number; day?: string } | null;
    localStorage.setItem(key, data?.day ?? today);
    if (data?.awarded && data.points) setToast(data.points);
  }, [uid]);

  useEffect(() => {
    if (!uid || pathname.startsWith("/admin")) return;
    claim();
    const onVisible = () => document.visibilityState === "visible" && claim();
    document.addEventListener("visibilitychange", onVisible);
    return () => document.removeEventListener("visibilitychange", onVisible);
  }, [uid, claim, pathname]);

  useEffect(() => {
    if (toast === null) return;
    const id = setTimeout(() => setToast(null), 5000);
    return () => clearTimeout(id);
  }, [toast]);

  // The push offer, a few seconds after the page settles.
  useEffect(() => {
    if (!uid || pathname.startsWith("/admin")) return;
    const snoozed = Number(localStorage.getItem("ks_push_prompt") ?? 0);
    if (Date.now() - snoozed < PROMPT_SNOOZE_DAYS * 86400000) return;
    const id = setTimeout(async () => {
      const s = await pushState().catch(() => "unsupported" as const);
      if (s === "default" || s === "ios-install") setPrompt(s);
    }, 4000);
    return () => clearTimeout(id);
  }, [uid, pathname]);

  const snooze = () => {
    localStorage.setItem("ks_push_prompt", String(Date.now()));
    setPrompt(null);
  };

  const turnOn = async () => {
    setBusy(true);
    const s = await turnOnPush().catch(() => "unsupported" as const);
    setBusy(false);
    if (s === "denied") {
      setDenied(true);
      localStorage.setItem("ks_push_prompt", String(Date.now()));
      return;
    }
    snooze();
  };

  if (!uid) return null;
  return (
    <div className="pointer-events-none fixed inset-x-0 bottom-20 z-50 sm:bottom-5 flex flex-col items-center gap-2 px-4">
      {toast !== null && (
        <div
          role="status"
          className="pointer-events-auto flex items-center gap-2 rounded-xl border px-4 py-2.5 text-sm shadow-lg"
          style={{ borderColor: "var(--ks-border)", background: "var(--ks-bg-elevated)", color: "var(--ks-text)" }}
        >
          <Coins size={16} style={{ color: "var(--ks-warn)" }} />
          <span>
            <b>{t("daily.toast", { n: toast })}</b> <span className="text-[var(--ks-text-muted)]">{t("daily.toastHint")}</span>
          </span>
        </div>
      )}
      {prompt && (
        <div
          role="dialog"
          aria-labelledby="push-prompt-title"
          className="pointer-events-auto w-full max-w-md rounded-xl border p-4 shadow-lg"
          style={{ borderColor: "var(--ks-border)", background: "var(--ks-bg-elevated)" }}
        >
          <div className="flex items-start gap-3">
            <Bell size={18} className="mt-0.5 shrink-0" style={{ color: "var(--ks-coral)" }} />
            <div className="min-w-0 flex-1">
              <p id="push-prompt-title" className="text-sm font-semibold text-[var(--ks-text)]">
                {t("push.title")}
              </p>
              <p className="mt-0.5 text-xs text-[var(--ks-text-muted)]">
                {denied ? t("push.denied") : prompt === "ios-install" ? t("push.iosBody") : t("push.body")}
              </p>
              {prompt === "default" && !denied && (
                <div className="mt-3 flex gap-2">
                  <button
                    type="button"
                    onClick={turnOn}
                    disabled={busy}
                    className="rounded-lg px-4 py-1.5 text-sm font-bold text-slate-950 disabled:opacity-60"
                    style={{ background: brandGradient }}
                  >
                    {t("push.turnOn")}
                  </button>
                  <button type="button" onClick={snooze} className="rounded-lg px-3 py-1.5 text-sm text-[var(--ks-text-muted)] hover:underline">
                    {t("push.notNow")}
                  </button>
                </div>
              )}
            </div>
            <button type="button" onClick={snooze} aria-label={t("push.notNow")} className="shrink-0 text-[var(--ks-text-faint)]">
              <X size={16} />
            </button>
          </div>
        </div>
      )}
    </div>
  );
}
