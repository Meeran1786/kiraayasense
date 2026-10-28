import Link from "next/link";
import { LegalPage } from "@/components/legal/LegalPage";
import { CONTACT_EMAIL } from "@/lib/legal";

export const metadata = { title: "Terms of use — KiraayaSense" };

export default function TermsPage() {
  return (
    <LegalPage title="Terms of use">
      <p>
        By using kiraayasense.com you agree to these terms. If you don&apos;t agree, please don&apos;t use the site. Our{" "}
        <Link href="/privacy">privacy policy</Link> explains how we handle your data.
      </p>

      <h2>Your account</h2>
      <ul>
        <li>You must be 18 or older.</li>
        <li>One account per person. Don&apos;t impersonate anyone.</li>
        <li>You are responsible for what is posted from your account.</li>
      </ul>

      <h2>Writing reviews</h2>
      <ul>
        <li>Review only places and businesses you have actually used, lived in, worked at or studied at.</li>
        <li>Be honest and specific. Describe your own experience.</li>
        <li>
          Don&apos;t review your own business or a competitor&apos;s, and don&apos;t post reviews in exchange for money,
          discounts or other favours.
        </li>
        <li>
          Don&apos;t post anything defamatory, abusive, hateful, obscene or illegal, other people&apos;s personal
          details such as phone numbers, or anything you don&apos;t have the right to share.
        </li>
      </ul>

      <h2>Moderation</h2>
      <p>
        We check reviews, photos, new businesses and claims before they go live. We may edit out personal details, or
        reject or remove content that breaks these terms. We may suspend accounts that repeatedly do so. Reviews
        reflect their authors&apos; opinions, not ours.
      </p>

      <h2>Your content</h2>
      <p>
        You keep ownership of what you post. You give KiraayaSense a free, worldwide, non-exclusive licence to host,
        show, adapt for display and share it on and in connection with the site, for as long as it stays up.
      </p>

      <h2>Business listings</h2>
      <p>
        Some listings come from open data such as OpenStreetMap (© OpenStreetMap contributors, ODbL), and some are added
        by users. Details may be out of date. Business owners can claim a listing to correct it. A claimed listing
        can&apos;t remove or edit honest reviews.
      </p>

      <h2>Reporting content</h2>
      <p>
        If you think something on the site is wrong, unlawful or about you, write to{" "}
        <a href={`mailto:${CONTACT_EMAIL}`}>{CONTACT_EMAIL}</a> with the link and the reason. We act on valid complaints
        as required by the IT Rules, 2021.
      </p>

      <h2>No warranty</h2>
      <p>
        The site is provided as is. We don&apos;t guarantee that reviews or listings are accurate or that the site will
        always be available. To the extent the law allows, we are not liable for decisions you make based on content on
        the site.
      </p>

      <h2>Changes and law</h2>
      <p>
        We may update these terms and will change the date above when we do. These terms are governed by the laws of
        India, and courts in Bengaluru have jurisdiction.
      </p>
    </LegalPage>
  );
}
