"use client";

import { useCallback, useEffect, useRef, useState } from "react";
import Link from "next/link";
import { Bell as BellIcon, Settings } from "lucide-react";
import { useT } from "@/lib/i18n/client";

interface Item {
  id: string;
  title: string;
  body: string;
  link: string | null;
  urgent: boolean;
  readAt: string | null;
  createdAt: string;
}

const POLL_MS = 60_000;

function ago(iso: string, locale: string): string {
  const mins = Math.round((Date.now() - new Date(iso).getTime()) / 60000);
  const rtf = new Intl.RelativeTimeFormat(locale, { numeric: "auto" });
  if (mins < 60) return rtf.format(-Math.max(mins, 0), "minute");
  if (mins < 60 * 24) return rtf.format(-Math.round(mins / 60), "hour");
  return rtf.format(-Math.round(mins / 1440), "day");
}

/** Notification bell: unread badge (polled each minute), a dropdown of the latest 20, all marked read on open. */
export function Bell({ settingsHref = "/profile#alerts" }: { settingsHref?: string }) {
  const t = useT();
  const [open, setOpen] = useState(false);
  const [unread, setUnread] = useState(0);
  const [items, setItems] = useState<Item[] | null>(null);
  const ref = useRef<HTMLDivElement>(null);

  const refreshCount = useCallback(() => {
    fetch("/api/me/notifications?count=1")
      .then((r) => (r.ok ? r.json() : { unread: 0 }))
      .then((d) => setUnread(d.unread ?? 0))
      .catch(() => undefined);
  }, []);

  useEffect(() => {
    refreshCount();
    const timer = window.setInterval(() => document.visibilityState === "visible" && refreshCount(), POLL_MS);
    return () => window.clearInterval(timer);
  }, [refreshCount]);

  useEffect(() => {
    if (!open) return;
    const close = (e: MouseEvent) => ref.current && !ref.current.contains(e.target as Node) && setOpen(false);
    const esc = (e: KeyboardEvent) => e.key === "Escape" && setOpen(false);
    document.addEventListener("mousedown", close);
    document.addEventListener("keydown", esc);
    return () => {
      document.removeEventListener("mousedown", close);
      document.removeEventListener("keydown", esc);
    };
  }, [open]);

  const toggle = async () => {
    const next = !open;
    setOpen(next);
    if (!next) return;
    const res = await fetch("/api/me/notifications").catch(() => null);
    const data = res?.ok ? await res.json() : { items: [] };
    setItems(data.items ?? []);
    if ((data.unread ?? 0) > 0) {
      fetch("/api/me/notifications", { method: "POST" }).catch(() => undefined);
      setUnread(0);
    }
  };

  return (
    <div ref={ref} className="relative">
      <button
        type="button"
        onClick={toggle}
        aria-label={unread ? t("bell.labelUnread", { n: unread }) : t("bell.label")}
        aria-expanded={open}
        className="relative flex h-8 w-8 shrink-0 items-center justify-center rounded-full border transition-colors hover:bg-white/5"
        style={{ borderColor: "var(--ks-border-strong)", color: "var(--ks-text-muted)" }}
      >
        <BellIcon size={15} />
        {unread > 0 && (
          <span
            className="absolute -end-1 -top-1 flex h-4 min-w-4 items-center justify-center rounded-full px-1 text-[10px] font-bold text-white"
            style={{ background: "var(--ks-coral)" }}
          >
            {unread > 99 ? "99+" : unread}
          </span>
        )}
      </button>

      {open && (
        <div
          className="absolute end-0 top-10 z-50 w-80 max-w-[calc(100vw-2rem)] overflow-hidden rounded-xl border shadow-xl"
          style={{ borderColor: "var(--ks-border)", background: "var(--ks-bg-elevated)" }}
          role="dialog"
          aria-label={t("bell.label")}
        >
          <div className="flex items-center justify-between border-b px-4 py-2.5" style={{ borderColor: "var(--ks-border)" }}>
            <p className="text-sm font-semibold text-[var(--ks-text)]">{t("bell.label")}</p>
            <Link href={settingsHref} onClick={() => setOpen(false)} className="flex items-center gap-1 text-xs text-[var(--ks-text-muted)] hover:text-[var(--ks-text)]">
              <Settings size={12} /> {t("bell.settings")}
            </Link>
          </div>
          <ul className="max-h-96 overflow-y-auto">
            {items === null && <li className="px-4 py-6 text-center text-xs text-[var(--ks-text-faint)]">…</li>}
            {items?.length === 0 && <li className="px-4 py-6 text-center text-xs text-[var(--ks-text-faint)]">{t("bell.empty")}</li>}
            {items?.map((n) => {
              const inner = (
                <>
                  <p className="flex items-center gap-1.5 text-sm font-medium text-[var(--ks-text)]">
                    {!n.readAt && <span className="h-1.5 w-1.5 shrink-0 rounded-full" style={{ background: "var(--ks-coral)" }} />}
                    {n.urgent && <span className="rounded bg-red-500/15 px-1 text-[10px] font-bold uppercase text-red-400">!</span>}
                    <span className="line-clamp-1">{n.title}</span>
                  </p>
                  <p className="mt-0.5 line-clamp-2 text-xs text-[var(--ks-text-muted)]">{n.body}</p>
                  <p className="mt-1 text-[10px] text-[var(--ks-text-faint)]">{ago(n.createdAt, t.locale)}</p>
                </>
              );
              return (
                <li key={n.id} className="border-b last:border-0" style={{ borderColor: "var(--ks-border-soft)" }}>
                  {n.link ? (
                    <Link href={n.link} onClick={() => setOpen(false)} className="block px-4 py-3 hover:bg-white/5">
                      {inner}
                    </Link>
                  ) : (
                    <div className="px-4 py-3">{inner}</div>
                  )}
                </li>
              );
            })}
          </ul>
        </div>
      )}
    </div>
  );
}
