import type { Metadata } from "next";
import { cookies } from "next/headers";

import { ThemeProvider } from "@/components/theme/theme-provider";
import { normalizeTheme, THEME_COOKIE_NAME } from "@/lib/theme";
import "./globals.css";

export const metadata: Metadata = {
  title: "GreenLine Systems",
  description: "Production-minded SaaS for incident command, reliability, and postmortems.",
};

export const runtime = "nodejs";
export const preferredRegion = "iad1";

export default async function RootLayout({ children }: Readonly<{ children: React.ReactNode }>) {
  const cookieStore = await cookies();
  const initialTheme = normalizeTheme(cookieStore.get(THEME_COOKIE_NAME)?.value);

  return (
    <html lang="en" data-theme={initialTheme} className={initialTheme === "dark" ? "dark" : undefined} suppressHydrationWarning>
      <body className="antialiased">
        <ThemeProvider initialTheme={initialTheme}>{children}</ThemeProvider>
      </body>
    </html>
  );
}
