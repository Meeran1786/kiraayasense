"use client";

import { useCallback, useEffect, useRef, useState } from "react";
import { ChevronLeft, ChevronRight } from "lucide-react";
import { useT } from "@/lib/i18n/client";
import { localeInfo } from "@/lib/i18n/locales";
import type { PublicBanner } from "@/lib/banners";

/** Time each banner stays before sliding on, and how long the slide takes. */
const SLIDE_MS = 3500;
const MOVE_MS = 450;

function sessionId(): string {
  try {
    let id = sessionStorage.getItem("ks_bsid");
    if (!id) {
      id = crypto.randomUUID();
      sessionStorage.setItem("ks_bsid", id);
    }
    return id;
  } catch {
    return "anon";
  }
}

/**
 * Home-page ad carousel, between the header and the search box. Banners are
 * 4:1 images set in /admin/banners. It moves on by itself every few seconds,
 * stops while hovered, focused or when the visitor prefers reduced motion,
 * can be swiped on phones, and runs right-to-left in Urdu. Each banner counts
 * one impression the first time it is on screen, and clicks go through
 * /api/banners/<id>/click so they are counted.
 */
export function BannerCarousel({ banners }: { banners: PublicBanner[] }) {
  const t = useT();
  const rtl = localeInfo(t.locale).dir === "rtl";
  const [index, setIndex] = useState(0);
  const [paused, setPaused] = useState(false);
  const [reduceMotion, setReduceMotion] = useState(false);
  const [sid, setSid] = useState("anon");
  const rootRef = useRef<HTMLElement>(null);
  const seen = useRef(new Set<string>());
  const touchX = useRef<number | null>(null);
  const count = banners.length;

  const go = useCallback((i: number) => setIndex(((i % count) + count) % count), [count]);

  useEffect(() => {
    setSid(sessionId());
    const mq = window.matchMedia("(prefers-reduced-motion: reduce)");
    setReduceMotion(mq.matches);
    const onChange = () => setReduceMotion(mq.matches);
    mq.addEventListener("change", onChange);
    return () => mq.removeEventListener("change", onChange);
  }, []);

  // Auto-advance.
  useEffect(() => {
    if (count < 2 || paused || reduceMotion) return;
    const timer = window.setTimeout(() => go(index + 1), SLIDE_MS);
    return () => window.clearTimeout(timer);
  }, [count, index, paused, reduceMotion, go]);

  // Count an impression for the current banner once it is actually on screen.
  useEffect(() => {
    const el = rootRef.current;
    const banner = banners[index];
    if (!el || !banner || seen.current.has(banner.id)) return;
    const observer = new IntersectionObserver(
      (entries) => {
        if (!entries.some((e) => e.isIntersecting) || seen.current.has(banner.id)) return;
        seen.current.add(banner.id);
        fetch("/api/banners/impressions", {
          method: "POST",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify({ ids: [banner.id], sessionId: sessionId() }),
          keepalive: true,
        }).catch(() => undefined);
      },
      { threshold: 0.5 }
    );
    observer.observe(el);
    return () => observer.disconnect();
  }, [banners, index]);

  if (count === 0) return null;

  // Visual "next" is to the left in RTL, so the track slides the other way.
  const offset = (rtl ? 1 : -1) * index * 100;
  const PrevIcon = rtl ? ChevronRight : ChevronLeft;
  const NextIcon = rtl ? ChevronLeft : ChevronRight;

  return (
    <section
      ref={rootRef}
      aria-roledescription="carousel"
      aria-label={t("ads.region")}
      className="mx-auto w-full max-w-6xl text-start sm:px-6"
      onMouseEnter={() => setPaused(true)}
      onMouseLeave={() => setPaused(false)}
      onFocus={() => setPaused(true)}
      onBlur={() => setPaused(false)}
    >
      <div
        className="group relative overflow-hidden rounded-2xl border"
        style={{ borderColor: "var(--ks-border-soft)", background: "var(--ks-bg-elevated)" }}
        onTouchStart={(e) => {
          touchX.current = e.touches[0].clientX;
          setPaused(true);
        }}
        onTouchEnd={(e) => {
          const start = touchX.current;
          touchX.current = null;
          setPaused(false);
          if (start === null) return;
          const dx = e.changedTouches[0].clientX - start;
          if (Math.abs(dx) < 40) return;
          // Swiping toward the reading direction's start shows the next banner.
          go(index + ((dx < 0) !== rtl ? 1 : -1));
        }}
      >
        <div
          className="flex"
          style={{
            transform: `translateX(${offset}%)`,
            transition: reduceMotion ? "none" : `transform ${MOVE_MS}ms cubic-bezier(0.22, 0.61, 0.36, 1)`,
          }}
        >
          {banners.map((b, i) => (
            <a
              key={b.id}
              href={`/api/banners/${b.id}/click?s=${encodeURIComponent(sid)}`}
              target="_blank"
              rel="sponsored noopener"
              className="relative block w-full shrink-0"
              aria-roledescription="slide"
              aria-label={`${b.title} (${t("ads.label")}, ${i + 1}/${count})`}
              aria-hidden={i !== index}
              tabIndex={i === index ? 0 : -1}
            >
              {/* eslint-disable-next-line @next/next/no-img-element -- admin-uploaded creatives, served by nginx */}
              <img
                src={b.imageUrl}
                alt={b.title}
                width={1600}
                height={400}
                loading={i === 0 ? "eager" : "lazy"}
                className="block aspect-[4/1] w-full object-cover"
              />
            </a>
          ))}
        </div>

        <span
          className="pointer-events-none absolute end-2 top-2 rounded px-1.5 py-0.5 text-[10px] font-semibold uppercase tracking-wide"
          style={{ background: "rgb(0 0 0 / 0.55)", color: "#fff" }}
        >
          {t("ads.label")}
        </span>

        {count > 1 && (
          <>
            <button
              type="button"
              onClick={() => go(index - 1)}
              aria-label={t("ads.prev")}
              className="absolute start-2 top-1/2 hidden -translate-y-1/2 rounded-full p-1.5 opacity-0 transition-opacity focus:opacity-100 group-hover:opacity-100 sm:block"
              style={{ background: "rgb(0 0 0 / 0.5)", color: "#fff" }}
            >
              <PrevIcon size={18} />
            </button>
            <button
              type="button"
              onClick={() => go(index + 1)}
              aria-label={t("ads.next")}
              className="absolute end-2 top-1/2 hidden -translate-y-1/2 rounded-full p-1.5 opacity-0 transition-opacity focus:opacity-100 group-hover:opacity-100 sm:block"
              style={{ background: "rgb(0 0 0 / 0.5)", color: "#fff" }}
            >
              <NextIcon size={18} />
            </button>
          </>
        )}
      </div>

      {count > 1 && (
        <div className="mt-2 flex justify-center gap-1.5">
          {banners.map((b, i) => (
            <button
              key={b.id}
              type="button"
              onClick={() => go(i)}
              aria-label={t("ads.goTo", { n: i + 1 })}
              aria-current={i === index}
              className="h-1.5 rounded-full transition-all"
              style={{
                width: i === index ? 18 : 6,
                background: i === index ? "var(--ks-coral)" : "var(--ks-border-strong)",
              }}
            />
          ))}
        </div>
      )}
    </section>
  );
}
