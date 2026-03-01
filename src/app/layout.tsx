import type { Metadata } from "next";

import "./globals.css";

export const metadata: Metadata = {
  title: "DevOps Incident Command Center",
  description: "Production-minded SaaS for incident command, reliability, and postmortems.",
};

export default function RootLayout({ children }: Readonly<{ children: React.ReactNode }>) {
  return (
    <html lang="en">
      <body className="bg-slate-50 text-slate-900 antialiased">
        {children}
      </body>
    </html>
  );
}
