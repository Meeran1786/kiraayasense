import type { Metadata } from "next";
import "./globals.css";
import { AuthProvider } from "@/lib/authContext";
import { ThemeProvider, THEME_INIT_SCRIPT } from "@/lib/themeContext";
import { Header } from "@/components/layout/Header";
import { getCategoryTree } from "@/lib/db/categories";

// Every page reads live data (categories in the header, ratings), so none
// may be prerendered at build time.
export const dynamic = "force-dynamic";

export const metadata: Metadata = {
  title: "KiraayaSense — honest, proof-backed reviews",
  description:
    "Ratings and reviews of homes, PGs, employers, hospitals, colleges and service businesses across India, on the questions that matter for each.",
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
