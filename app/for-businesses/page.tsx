import Link from "next/link";
import type { Metadata } from "next";
import { getServerSession } from "next-auth";
import { BadgeCheck, Flag, LayoutDashboard, MessageSquareReply, QrCode, Search, ShieldCheck, Smartphone, Star } from "lucide-react";
import { authOptions } from "@/lib/auth";
import { prisma } from "@/lib/prisma";
import { Footer } from "@/components/layout/Footer";
import { brand, brandGradient } from "@/lib/brand";
import { getT } from "@/lib/i18n/server";
import type { MessageKey } from "@/lib/i18n/messages/en";

export const metadata: Metadata = {
  title: "KiraayaSense for businesses: claim your free listing",
  description:
    "Claim your business on KiraayaSense for free. Reply to reviews, invite customers with a WhatsApp link or QR poster, report fake reviews and show your rating on your website.",
  alternates: { canonical: "/for-businesses" },
};

const FEATURES: { icon: typeof Star; title: MessageKey; body: MessageKey }[] = [
  { icon: BadgeCheck, title: "biz.f.claim", body: "biz.f.claimBody" },
  { icon: MessageSquareReply, title: "biz.f.reply", body: "biz.f.replyBody" },
  { icon: QrCode, title: "biz.f.invite", body: "biz.f.inviteBody" },
  { icon: Star, title: "biz.f.badge", body: "biz.f.badgeBody" },
  { icon: Flag, title: "biz.f.report", body: "biz.f.reportBody" },
  { icon: Smartphone, title: "biz.f.app", body: "biz.f.appBody" },
];

/** Trustpilot-style "For businesses" page: why and how to claim a listing, linked from the header on every page. */
export default async function ForBusinessesPage() {
  const t = getT();
  const session = await getServerSession(authOptions);
  const userId = session?.user?.id;
  const managed = userId
    ? await prisma.property.count({ where: { claimedByUserId: userId, claimStatus: "VERIFIED" } })
    : 0;

  const card = { borderColor: "var(--ks-border)", background: "var(--ks-bg-elevated)" };

  return (
    <main style={{ background: brand.navy, minHeight: "100vh" }}>
      <section
        className="px-4 py-14 text-center sm:px-6"
        style={{ background: `radial-gradient(120% 100% at 50% -20%, oklch(30% 0.06 25 / 0.35), transparent), ${brand.navy}` }}
      >
        <p className="text-xs font-semibold uppercase tracking-widest text-[var(--ks-text-muted)]">{t("biz.kicker")}</p>
        <h1 className="mx-auto mt-3 max-w-2xl text-3xl font-bold text-[var(--ks-text)] sm:text-4xl">{t("biz.title")}</h1>
        <p className="mx-auto mt-3 max-w-xl text-sm text-[var(--ks-text-muted)]">{t("biz.subtitle")}</p>

        {managed > 0 && (
          <Link
            href="/owner"
            className="mx-auto mt-6 inline-flex items-center gap-2 rounded-xl px-5 py-2.5 text-sm font-bold text-slate-950"
            style={{ background: brandGradient }}
          >
            <LayoutDashboard size={16} />
            {t("biz.dashboardCta")}
          </Link>
        )}

        <form
          action="/search"
          method="get"
          className="mx-auto mt-7 flex max-w-2xl flex-col gap-2 rounded-2xl border p-2 sm:flex-row"
          style={{ borderColor: "var(--ks-border-strong)", background: "var(--ks-bg-elevated)" }}
        >
          <label className="flex flex-1 items-center gap-2 rounded-xl px-3 py-2.5" style={{ background: "var(--ks-bg-input)" }}>
            <Search size={16} className="shrink-0 text-[var(--ks-text-muted)]" />
            <span className="sr-only">{t("biz.searchPlaceholder")}</span>
            <input
              name="q"
              required
              placeholder={t("biz.searchPlaceholder")}
              className="w-full bg-transparent text-sm text-[var(--ks-text)] placeholder:text-[var(--ks-text-faint)] focus:outline-none"
            />
          </label>
          <button type="submit" className="rounded-xl px-6 py-2.5 text-sm font-bold text-slate-950" style={{ background: brandGradient }}>
            {t("biz.claimCta")}
          </button>
        </form>
        <p className="mt-3 text-sm text-[var(--ks-text-muted)]">
          {t("biz.notListed")}{" "}
          <Link href="/business/new" className="font-semibold text-[var(--ks-text)] underline">
            {t("biz.addCta")}
          </Link>
        </p>
      </section>

      <div className="mx-auto flex max-w-6xl flex-col gap-12 px-4 pb-14 sm:px-6">
        <section>
          <h2 className="text-lg font-bold text-[var(--ks-text)]">{t("biz.featuresTitle")}</h2>
          <ul className="mt-4 grid gap-3 sm:grid-cols-2 lg:grid-cols-3">
            {FEATURES.map(({ icon: Icon, title, body }) => (
              <li key={title} className="rounded-xl border p-5" style={card}>
                <Icon size={20} style={{ color: "var(--ks-coral)" }} />
                <h3 className="mt-3 font-semibold text-[var(--ks-text)]">{t(title)}</h3>
                <p className="mt-1 text-sm text-[var(--ks-text-muted)]">{t(body)}</p>
              </li>
            ))}
          </ul>
        </section>

        <section>
          <h2 className="text-lg font-bold text-[var(--ks-text)]">{t("biz.stepsTitle")}</h2>
          <ol className="mt-4 grid gap-3 sm:grid-cols-3">
            {(["biz.step1", "biz.step2", "biz.step3"] as const).map((key, i) => (
              <li key={key} className="flex gap-3 rounded-xl border p-5" style={card}>
                <span
                  className="flex h-7 w-7 shrink-0 items-center justify-center rounded-full text-sm font-bold text-slate-950"
                  style={{ background: brandGradient }}
                >
                  {i + 1}
                </span>
                <p className="text-sm text-[var(--ks-text-muted)]">{t(key)}</p>
              </li>
            ))}
          </ol>
        </section>

        <section className="flex gap-4 rounded-xl border p-6" style={card}>
          <ShieldCheck size={24} className="shrink-0" style={{ color: "var(--ks-success)" }} />
          <div>
            <h2 className="font-bold text-[var(--ks-text)]">{t("biz.trustTitle")}</h2>
            <p className="mt-1 text-sm text-[var(--ks-text-muted)]">{t("biz.trustBody")}</p>
          </div>
        </section>
      </div>
      <Footer />
    </main>
  );
}
