import Link from "next/link";
import { LegalPage } from "@/components/legal/LegalPage";
import { CONTACT_EMAIL } from "@/lib/legal";

export const metadata = { title: "Privacy policy — KiraayaSense" };

export default function PrivacyPage() {
  return (
    <LegalPage title="Privacy policy">
      <p>
        KiraayaSense (&quot;we&quot;) runs kiraayasense.com, where people rate and review homes, employers, colleges,
        hospitals and service businesses in India. This policy explains what personal data we collect, why, and the
        choices you have. It is written to meet the Digital Personal Data Protection Act, 2023 and the IT Rules, 2021.
      </p>

      <h2>What we collect</h2>
      <ul>
        <li>
          <strong>From Google sign-in:</strong> your name, email address and profile photo. We do not get your Google
          password or access to anything else in your Google account.
        </li>
        <li>
          <strong>What you give us:</strong> your profile (handle, city, bio), reviews, ratings, answers, photos you
          upload, businesses you add, and documents you send to claim a business or prove a stay.
        </li>
        <li>
          <strong>Technical data:</strong> a sign-in cookie to keep you logged in, and server logs (IP address, browser,
          pages requested) kept for security and debugging.
        </li>
      </ul>

      <h2>How we use it</h2>
      <ul>
        <li>To run your account and show your reviews.</li>
        <li>To moderate content and check proofs, so reviews stay honest.</li>
        <li>To prevent spam, fraud and abuse.</li>
        <li>To contact you about your account, a review or a claim.</li>
      </ul>
      <p>We do not sell your personal data and we do not show third-party advertising.</p>

      <h2>What is public</h2>
      <p>
        Approved reviews are public. If you post under your name, they show your display name and link to your profile.
        If you post anonymously, your name is hidden from everyone except our moderators. Your profile page is public
        unless you set it to private on your <Link href="/profile">profile</Link>. Proof documents and claim documents
        are never public; only moderators see them.
      </p>

      <h2>Who we share it with</h2>
      <ul>
        <li>Our hosting provider (DigitalOcean, servers in Bengaluru), which stores the data for us.</li>
        <li>Google, only to sign you in.</li>
        <li>Authorities, when Indian law requires it.</li>
      </ul>

      <h2>How long we keep it</h2>
      <p>
        We keep your account data while your account is open. We keep proof and claim documents only as long as we need
        them to show how a review or claim was checked. Backups are kept for 14 days. If you ask us to delete your
        account, we remove your personal data within 30 days, and reviews you posted are deleted or shown as anonymous.
      </p>

      <h2>Your rights</h2>
      <p>
        You can see and correct most of your data on your profile. You can also ask us to send you a copy of your
        data, correct it, delete it or your account, or nominate someone to act for you. Write to{" "}
        <a href={`mailto:${CONTACT_EMAIL}`}>{CONTACT_EMAIL}</a>. We reply within 30 days.
      </p>

      <h2>Children</h2>
      <p>KiraayaSense is for people aged 18 and over. We do not knowingly collect data from children.</p>

      <h2>Grievance Officer</h2>
      <p>
        For a complaint about your data or about content on the site, write to our Grievance Officer at{" "}
        <a href={`mailto:${CONTACT_EMAIL}`}>{CONTACT_EMAIL}</a>. We acknowledge within 24 hours and resolve within 15
        days. If you are not satisfied, you can complain to the Data Protection Board of India.
      </p>

      <h2>Changes</h2>
      <p>If we change this policy, we will update the date above.</p>

      <p>
        See also our <Link href="/terms">terms of use</Link>.
      </p>
    </LegalPage>
  );
}
