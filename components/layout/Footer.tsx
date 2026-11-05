import Link from "next/link";
import { getT } from "@/lib/i18n/server";

export function Footer() {
  const t = getT();
  return (
    <footer className="border-t px-4 py-8 sm:px-6" style={{ borderColor: "var(--ks-border-soft)" }}>
      <div className="mx-auto max-w-6xl text-center text-[11px] leading-relaxed" style={{ color: "var(--ks-text-faint)" }}>
        <p>{t("footer.disclaimer")}</p>
        <p className="mt-2">
          © 2026 KiraayaSense ·{" "}
          <Link href="/privacy" className="underline">
            {t("footer.privacy")}
          </Link>{" "}
          ·{" "}
          <Link href="/terms" className="underline">
            {t("footer.terms")}
          </Link>{" "}
          ·{" "}
          <Link href="/for-businesses" className="underline">
            {t("footer.owners")}
          </Link>
        </p>
      </div>
    </footer>
  );
}
