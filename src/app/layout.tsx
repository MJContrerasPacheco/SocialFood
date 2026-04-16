import type { Metadata } from "next";
import { cookies } from "next/headers";
import { Bricolage_Grotesque, Fraunces } from "next/font/google";
import "./globals.css";
import "leaflet/dist/leaflet.css";
import { getLocaleFromCookies } from "@/lib/i18n";

const bodyFont = Bricolage_Grotesque({
  subsets: ["latin"],
  variable: "--font-body",
  display: "swap",
});

const displayFont = Fraunces({
  subsets: ["latin"],
  variable: "--font-display",
  display: "swap",
});

export const metadata: Metadata = {
  title: "SocialFood",
  description:
    "Plataforma para redistribuir excedentes con trazabilidad y control.",
};

export default async function RootLayout({
  children,
}: Readonly<{
  children: React.ReactNode;
}>) {
  const cookieStore = await cookies();
  const locale = getLocaleFromCookies(cookieStore);

  return (
    <html
      lang={locale}
      className={`${bodyFont.variable} ${displayFont.variable} h-full antialiased`}
    >
      <head>
        <link
          rel="stylesheet"
          href="https://unpkg.com/leaflet@1.9.4/dist/leaflet.css"
        />
      </head>
      <body className="min-h-full flex flex-col">{children}</body>
    </html>
  );
}
