import type { Metadata } from "next";
import "./globals.css";
import { AuthProvider } from "@/lib/authContext";
import { ThemeProvider, THEME_INIT_SCRIPT } from "@/lib/themeContext";
import { Header } from "@/components/layout/Header";
import { getCategoryTree } from "@/lib/db/categories";
import { SITE_NAME, SITE_URL } from "@/lib/site";

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
};

export default async function RootLayout({ children }: { children: React.ReactNode }) {
  const categories = await getCategoryTree();

  return (
    <html lang="en">
      <head>
        {/* Sets data-theme before hydration so the correct palette paints on
            the first frame — see lib/themeContext.tsx for what this runs. */}
        <script dangerouslySetInnerHTML={{ __html: THEME_INIT_SCRIPT }} />
      </head>
      <body>
        <ThemeProvider>
          <AuthProvider>
            <Header navCategories={categories.map(({ slug, name }) => ({ slug, name }))} />
            {children}
          </AuthProvider>
        </ThemeProvider>
      </body>
    </html>
  );
}
