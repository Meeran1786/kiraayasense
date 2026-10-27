import type { Metadata } from "next";
import "./globals.css";
import { AuthProvider } from "@/lib/authContext";
import { ThemeProvider, THEME_INIT_SCRIPT } from "@/lib/themeContext";
import { Header } from "@/components/layout/Header";

export const metadata: Metadata = {
  title: "KiraayaSense — local test",
  description: "Local dev harness for the KiraayaSense discovery + review flow",
};

export default function RootLayout({ children }: { children: React.ReactNode }) {
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
            <Header />
            {children}
          </AuthProvider>
        </ThemeProvider>
      </body>
    </html>
  );
}
