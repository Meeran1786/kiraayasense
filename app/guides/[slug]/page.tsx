import Link from "next/link";
import { notFound } from "next/navigation";
import type { Metadata } from "next";
import { Footer } from "@/components/layout/Footer";
import { brand } from "@/lib/brand";
import { GUIDES, guideBySlug } from "@/lib/guides";
import { SHARE_IMAGE, SITE_NAME, SITE_URL } from "@/lib/site";

export function generateMetadata({ params }: { params: { slug: string } }): Metadata {
  const g = guideBySlug(params.slug);
  if (!g) return { robots: { index: false } };
  const url = `/guides/${g.slug}`;
  return {
    title: `${g.title} | ${SITE_NAME}`,
    description: g.summary,
    alternates: { canonical: url },
    openGraph: { title: g.title, description: g.summary, url, type: "article", siteName: SITE_NAME, locale: "en_IN", images: [SHARE_IMAGE] },
  };
}

export default function GuidePage({ params }: { params: { slug: string } }) {
  const g = guideBySlug(params.slug);
  if (!g) notFound();
  const url = `${SITE_URL}/guides/${g.slug}`;
  const data = {
    "@context": "https://schema.org",
    "@graph": [
      {
        "@type": "Article",
        "@id": `${url}#article`,
        headline: g.title,
        description: g.summary,
        url,
        datePublished: g.updated,
        dateModified: g.updated,
        inLanguage: "en-IN",
        image: `${SITE_URL}${SHARE_IMAGE.url}`,
        author: { "@id": `${SITE_URL}/#organization` },
        publisher: { "@id": `${SITE_URL}/#organization` },
      },
      {
        "@type": "FAQPage",
        url,
        mainEntity: g.faq.map((f) => ({ "@type": "Question", name: f.q, acceptedAnswer: { "@type": "Answer", text: f.a } })),
      },
      {
        "@type": "Organization",
        "@id": `${SITE_URL}/#organization`,
        name: SITE_NAME,
        url: `${SITE_URL}/`,
        logo: `${SITE_URL}${SHARE_IMAGE.url}`,
      },
    ],
  };
  const others = GUIDES.filter((x) => x.slug !== g.slug);
  return (
    <main style={{ background: brand.navy, minHeight: "100vh" }}>
      <article className="mx-auto flex max-w-3xl flex-col gap-4 px-4 py-8 text-sm leading-relaxed text-[var(--ks-text-muted)] sm:px-6 [&_a]:underline [&_h2]:mt-4 [&_h2]:text-base [&_h2]:font-semibold [&_h2]:text-[var(--ks-text)] [&_li]:ml-5 [&_li]:list-disc">
        <div>
          <p className="text-xs text-[var(--ks-text-faint)]">
            <Link href="/guides">Guides</Link>
          </p>
          <h1 className="mt-1 text-2xl font-bold text-[var(--ks-text)]">{g.title}</h1>
          <p className="mt-1 text-xs text-[var(--ks-text-faint)]">Updated {new Date(g.updated).toLocaleDateString("en-IN", { day: "numeric", month: "long", year: "numeric" })}</p>
        </div>
        <p className="text-base text-[var(--ks-text)]">{g.summary}</p>
        {g.sections.map((s) => (
          <section key={s.heading}>
            <h2>{s.heading}</h2>
            {s.paragraphs?.map((p) => <p key={p} className="mt-2">{p}</p>)}
            {s.bullets && (
              <ul className="mt-2 flex flex-col gap-1">
                {s.bullets.map((b) => (
                  <li key={b}>{b}</li>
                ))}
              </ul>
            )}
          </section>
        ))}
        <section>
          <h2>Common questions</h2>
          <dl className="mt-2 flex flex-col gap-3">
            {g.faq.map((f) => (
              <div key={f.q}>
                <dt className="font-medium text-[var(--ks-text)]">{f.q}</dt>
                <dd className="mt-1">{f.a}</dd>
              </div>
            ))}
          </dl>
        </section>
        <section>
          <h2>Read and write reviews</h2>
          <ul className="mt-2 flex flex-col gap-1">
            {g.links.map((l) => (
              <li key={l.label}>
                <Link href={l.href}>{l.label}</Link>
              </li>
            ))}
          </ul>
        </section>
        <section>
          <h2>More guides</h2>
          <ul className="mt-2 flex flex-col gap-1">
            {others.map((o) => (
              <li key={o.slug}>
                <Link href={`/guides/${o.slug}`}>{o.title}</Link>
              </li>
            ))}
          </ul>
        </section>
        <p className="text-xs text-[var(--ks-text-faint)]">
          This guide is general information, not legal advice. For anything binding, check with the official authority in your state.
        </p>
        <script type="application/ld+json" dangerouslySetInnerHTML={{ __html: JSON.stringify(data).replace(/</g, "\\u003c") }} />
      </article>
      <Footer />
    </main>
  );
}
