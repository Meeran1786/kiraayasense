"use client";

import { useRef, useState } from "react";
import { PlayCircle } from "lucide-react";
import { formatDuration, posterSrc, videoSrc, type Tutorial } from "@/lib/tutorials";
import { useT } from "@/lib/i18n/client";

/** One tutorial: the video, its chapters (click to jump) and a collapsible transcript. */
export function TutorialVideo({ tutorial }: { tutorial: Tutorial }) {
  const t = useT();
  const ref = useRef<HTMLVideoElement>(null);
  const [current, setCurrent] = useState(0);

  const jump = (at: number) => {
    const v = ref.current;
    if (!v) return;
    v.currentTime = at;
    void v.play();
    v.scrollIntoView({ behavior: "smooth", block: "center" });
  };

  const active = tutorial.chapters.reduce((acc, c, i) => (current >= c.at ? i : acc), 0);

  return (
    <article
      id={tutorial.slug}
      className="grid scroll-mt-24 gap-5 rounded-2xl border p-4 sm:p-5 lg:grid-cols-[minmax(0,1.6fr)_minmax(0,1fr)]"
      style={{ borderColor: "var(--ks-border)", background: "var(--ks-bg-elevated)" }}
    >
      <div>
        <video
          ref={ref}
          controls
          playsInline
          preload="metadata"
          poster={posterSrc(tutorial.slug)}
          onTimeUpdate={(e) => setCurrent(e.currentTarget.currentTime)}
          className="aspect-video w-full rounded-xl bg-black"
        >
          <source src={videoSrc(tutorial.slug)} type="video/mp4" />
        </video>
        <h3 className="mt-4 text-lg font-bold text-[var(--ks-text)]">{tutorial.title}</h3>
        <p className="mt-1 text-sm text-[var(--ks-text-muted)]">
          <span className="font-medium">{formatDuration(tutorial.duration)}</span> · {tutorial.description}
        </p>
        <details className="mt-3 text-sm">
          <summary className="cursor-pointer font-medium text-[var(--ks-text)]">{t("tut.transcript")}</summary>
          <div className="mt-2 flex flex-col gap-2 text-[var(--ks-text-muted)]">
            {tutorial.transcript.map((line) => (
              <p key={line}>{line}</p>
            ))}
          </div>
        </details>
      </div>

      <div>
        <h4 className="text-xs font-semibold uppercase tracking-wider text-[var(--ks-text-muted)]">{t("tut.steps")}</h4>
        <ol className="mt-2 flex flex-col gap-1">
          {tutorial.chapters.map((c, i) => (
            <li key={c.at}>
              <button
                type="button"
                onClick={() => jump(c.at)}
                className="flex w-full items-center gap-3 rounded-lg px-2.5 py-2 text-left text-sm transition-colors hover:bg-white/5"
                style={i === active && current > 0 ? { background: "var(--ks-bg-input)", color: "var(--ks-text)" } : { color: "var(--ks-text-muted)" }}
              >
                <span className="w-10 shrink-0 font-mono text-xs" style={{ color: "var(--ks-coral)" }}>
                  {formatDuration(c.at)}
                </span>
                <span className="flex-1">{c.label}</span>
                {i === active && current > 0 && <PlayCircle size={14} style={{ color: "var(--ks-coral)" }} />}
              </button>
            </li>
          ))}
        </ol>
      </div>
    </article>
  );
}
