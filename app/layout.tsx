import type { Metadata, Viewport } from "next";
import "./globals.css";
import { AuthProvider } from "@/lib/authContext";
import { ThemeProvider, THEME_INIT_SCRIPT } from "@/lib/themeContext";
import { Header } from "@/components/layout/Header";
import { ServiceWorker } from "@/components/layout/ServiceWorker";
import { AskAssistant } from "@/components/assistant/AskAssistant";
import { assistantEnabled } from "@/lib/assistant/config";
import { getCategoryTree } from "@/lib/db/categories";
import { SITE_NAME, SITE_URL } from "@/lib/site";
import { I18nProvider } from "@/lib/i18n/client";
import { getLocale } from "@/lib/i18n/server";
import { localeInfo } from "@/lib/i18n/locales";
import { messagesFor } from "@/lib/i18n/messages";
import { categoryName, makeTranslator } from "@/lib/i18n/translate";

// Every page reads live data (categories in the header, ratings), so none
// may be prerendered at build time.
export const dynamic = "force-dynamic";

const DESCRIPTION =
  "Ratings and reviews of homes, PGs, employers, hospitals, colleges and service businesses across India, on the questions that matter for each.";

export const metadata: Metadata = {
  metadataBase: new URL(SITE_URL),
  title: "KiraayaSense — honest, proof-backed reviews",
  description: DESCRIPTION,
  alternates: { canonical: "/" },
  openGraph: { type: "website", siteName: SITE_NAME, locale: "en_IN", description: DESCRIPTION },
  twitter: { card: "summary" },
  applicationName: SITE_NAME,
  appleWebApp: { capable: true, title: SITE_NAME, statusBarStyle: "black-translucent" },
  icons: { icon: "/icons/icon.svg", apple: "/icons/apple-touch-icon.png" },
};

export const viewport: Viewport = { themeColor: "#141a2e" };

export default async function RootLayout({ children }: { children: React.ReactNode }) {
  const categories = await getCategoryTree();
  const locale = getLocale();
  const messages = messagesFor(locale);
  const t = makeTranslator(locale, messages);

  return (
    <html lang={locale} dir={localeInfo(locale).dir}>
      <head>
        {/* Sets data-theme before hydration so the correct palette paints on
            the first frame — see lib/themeContext.tsx for what this runs. */}
        <script dangerouslySetInnerHTML={{ __html: THEME_INIT_SCRIPT }} />
        {locale === "ur" && (
          <>
            <link rel="preconnect" href="https://fonts.gstatic.com" crossOrigin="" />
            {/* eslint-disable-next-line @next/next/no-page-custom-font -- only needed when the site is in Urdu */}
            <link rel="stylesheet" href="https://fonts.googleapis.com/css2?family=Noto+Nastaliq+Urdu:wght@400;600&display=swap" />
          </>
        )}
      </head>
      <body>
        <ThemeProvider>
          <I18nProvider locale={locale} messages={messages}>
            <AuthProvider>
              <Header navCategories={categories.map(({ slug, name }) => ({ slug, name: categoryName(t, slug, name) }))} />
              {children}
              {assistantEnabled() && <AskAssistant />}
            </AuthProvider>
          </I18nProvider>
        </ThemeProvider>
        <ServiceWorker />
      </body>
    </html>
  );
}
