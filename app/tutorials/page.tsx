import Link from "next/link";
import type { Metadata } from "next";
import { GraduationCap, PenLine, Sparkles, Store } from "lucide-react";
import { Footer } from "@/components/layout/Footer";
import { TutorialVideo } from "@/components/tutorials/TutorialVideo";
import { brand } from "@/lib/brand";
import { getT } from "@/lib/i18n/server";
import type { MessageKey } from "@/lib/i18n/messages/en";
import { SITE_URL } from "@/lib/site";
import { TUTORIALS, posterSrc, videoSrc, type TutorialAudience } from "@/lib/tutorials";

export const metadata: Metadata = {
  title: "How to use KiraayaSense: video tutorials",
  description:
    "Short video guides: how to find honest reviews and write your own, how to earn reward points, and how business owners claim a listing and get more reviews.",
  alternates: { canonical: "/tutorials" },
};

const SECTIONS: { audience: TutorialAudience; icon: typeof Sparkles; title: MessageKey; body: MessageKey }[] = [
  { audience: "everyone", icon: Sparkles, title: "tut.everyone", body: "tut.everyoneBody" },
  { audience: "reviewers", icon: PenLine, title: "tut.reviewers", body: "tut.reviewersBody" },
  { audience: "businesses", icon: Store, title: "tut.businesses", body: "tut.businessesBody" },
];

/** "How to use" video tutorials for reviewers and business owners, linked from the header and footer. */
export default function TutorialsPage() {
  const t = getT();
  const base = SITE_URL;
  const jsonLd = TUTORIALS.map((v) => ({
    "@context": "https://schema.org",
    "@type": "VideoObject",
    name: v.title,
    description: v.description,
    thumbnailUrl: `${base}${posterSrc(v.slug)}`,
    contentUrl: `${base}${videoSrc(v.slug)}`,
    uploadDate: v.uploadDate,
    duration: `PT${Math.floor(v.duration / 60)}M${v.duration % 60}S`,
    transcript: v.transcript.join(" "),
    hasPart: v.chapters.map((c, i) => ({
      "@type": "Clip",
      name: c.label,
      startOffset: c.at,
      endOffset: v.chapters[i + 1]?.at ?? v.duration,
      url: `${base}/tutorials#${v.slug}`,
    })),
  }));

  return (
    <main style={{ background: brand.navy, minHeight: "100vh" }}>
      <script type="application/ld+json" dangerouslySetInnerHTML={{ __html: JSON.stringify(jsonLd) }} />
      <section
        className="px-4 py-12 text-center sm:px-6"
        style={{ background: `radial-gradient(120% 100% at 50% -20%, oklch(30% 0.06 25 / 0.35), transparent), ${brand.navy}` }}
      >
        <GraduationCap size={28} className="mx-auto" style={{ color: "var(--ks-coral)" }} />
        <h1 className="mx-auto mt-3 max-w-2xl text-3xl font-bold text-[var(--ks-text)] sm:text-4xl">{t("tut.title")}</h1>
        <p className="mx-auto mt-3 max-w-xl text-sm text-[var(--ks-text-muted)]">{t("tut.subtitle")}</p>
        <nav className="mt-6 flex flex-wrap justify-center gap-2">
          {SECTIONS.map(({ audience, icon: Icon, title }) => (
            <a
              key={audience}
              href={`#${audience}`}
              className="flex items-center gap-1.5 rounded-full border px-3.5 py-1.5 text-xs font-semibold text-[var(--ks-text)] transition-colors hover:bg-white/5"
              style={{ borderColor: "var(--ks-border-strong)" }}
            >
              <Icon size={14} style={{ color: "var(--ks-coral)" }} />
              {t(title)}
            </a>
          ))}
        </nav>
      </section>

      <div className="mx-auto flex max-w-6xl flex-col gap-12 px-4 pb-14 sm:px-6">
        {SECTIONS.map(({ audience, icon: Icon, title, body }) => {
          const videos = TUTORIALS.filter((v) => v.audience === audience);
          if (videos.length === 0) return null;
          return (
            <section key={audience} id={audience} className="scroll-mt-20">
              <h2 className="flex items-center gap-2 text-xl font-bold text-[var(--ks-text)]">
                <Icon size={20} style={{ color: "var(--ks-coral)" }} />
                {t(title)}
              </h2>
              <p className="mt-1 text-sm text-[var(--ks-text-muted)]">{t(body)}</p>
              <div className="mt-4 flex flex-col gap-6">
                {videos.map((v) => (
                  <TutorialVideo key={v.slug} tutorial={v} />
                ))}
              </div>
            </section>
          );
        })}

        <p className="text-center text-sm text-[var(--ks-text-muted)]">
          {t("tut.moreHelp")}{" "}
          <Link href="/for-businesses" className="font-semibold text-[var(--ks-text)] underline">
            {t("nav.forBusinesses")}
          </Link>
        </p>
      </div>
      <Footer />
    </main>
  );
}
