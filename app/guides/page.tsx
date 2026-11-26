import Link from "next/link";
import { LegalPage } from "@/components/legal/LegalPage";
import { GUIDES } from "@/lib/guides";

export const metadata = {
  title: "Guides for tenants, patients and customers — KiraayaSense",
  description: "Plain-language checklists for renting a PG or flat and for questioning a hospital bill in India.",
  alternates: { canonical: "/guides" },
};

export default function GuidesPage() {
  return (
    <LegalPage title="Guides" updated="26 November 2026">
      <p>Short, practical checklists for the decisions people come to KiraayaSense for.</p>
      <ul className="flex flex-col gap-3">
        {GUIDES.map((g) => (
          <li key={g.slug}>
            <Link href={`/guides/${g.slug}`} className="font-medium text-[var(--ks-text)]">
              {g.title}
            </Link>
            <p className="mt-1">{g.summary}</p>
          </li>
        ))}
      </ul>
    </LegalPage>
  );
}
