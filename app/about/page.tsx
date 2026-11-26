import Link from "next/link";
import { LegalPage } from "@/components/legal/LegalPage";
import { HOW_RATINGS_WORK } from "@/lib/geo";
import { CONTACT_EMAIL } from "@/lib/legal";
import { SHARE_IMAGE, SITE_NAME, SITE_URL } from "@/lib/site";

export const metadata = {
  title: "About KiraayaSense — who runs it and how reviews work",
  description:
    "KiraayaSense is an independent Indian review site for PGs, flats, hostels, hospitals, schools, employers and local businesses. Here is who runs it, how ratings work and how to reach us.",
  alternates: { canonical: "/about" },
};

const DATA = {
  "@context": "https://schema.org",
  "@type": "AboutPage",
  url: `${SITE_URL}/about`,
  name: `About ${SITE_NAME}`,
  mainEntity: {
    "@type": "Organization",
    "@id": `${SITE_URL}/#organization`,
    name: SITE_NAME,
    url: `${SITE_URL}/`,
    logo: `${SITE_URL}${SHARE_IMAGE.url}`,
    email: CONTACT_EMAIL,
    foundingDate: "2026",
    areaServed: { "@type": "Country", name: "India" },
  },
};

export default function AboutPage() {
  return (
    <LegalPage title="About KiraayaSense" updated="26 November 2026">
      <p>
        KiraayaSense is an independent Indian review site. Tenants, students, patients, parents, employees and customers rate
        the places they have actually used: PGs, flats, hostels and hotels, hospitals and clinics, schools and colleges,
        employers, restaurants, shops and other local businesses. It is free to read and free to review.
      </p>

      <h2>Why it exists</h2>
      <p>
        Most people pick a PG, a hospital or a school from photos, a short visit and word of mouth. Problems like deposits
        that are never refunded or hidden charges only show up later. KiraayaSense collects those experiences in one place,
        on the questions that matter for each type of business, so the next person can decide with real information.
      </p>

      <h2>How ratings work</h2>
      <p>{HOW_RATINGS_WORK}</p>
      <ul>
        <li>Owners can reply to reviews but can never edit, hide or delete them.</li>
        <li>Nobody can pay to remove a review or change the order reviews appear in.</li>
        <li>Every review is checked by a moderator before it is published.</li>
      </ul>

      <h2>Where the listings come from</h2>
      <p>
        Businesses are added by users and owners, and from open data: OpenStreetMap (ODbL), Overture Maps (CDLA-Permissive-2.0)
        and the MCA company register. Each business page credits its source.
      </p>

      <h2>Contact</h2>
      <p>
        Email <a href={`mailto:${CONTACT_EMAIL}`}>{CONTACT_EMAIL}</a>. Business owners can{" "}
        <Link href="/for-businesses">claim their listing</Link>. Read our <Link href="/guides">guides</Link>,{" "}
        <Link href="/privacy">privacy policy</Link> and <Link href="/terms">terms</Link>.
      </p>
      <script type="application/ld+json" dangerouslySetInnerHTML={{ __html: JSON.stringify(DATA).replace(/</g, "\\u003c") }} />
    </LegalPage>
  );
}
