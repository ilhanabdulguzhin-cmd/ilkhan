import type { Metadata } from "next";
import { Geist, Geist_Mono } from "next/font/google";
import "./globals.css";
import { VisualEditsMessenger } from "orchids-visual-edits";
import { AuthProvider } from "@/components/auth-provider";
import { PWARegister } from "@/components/pwa-register";
import { Analytics } from "@vercel/analytics/next";
import { SiteFooter } from "@/components/site-footer";

const geistSans = Geist({
  variable: "--font-geist-sans",
  subsets: ["latin", "latin-ext"],
});

const geistMono = Geist_Mono({
  variable: "--font-geist-mono",
  subsets: ["latin"],
});

export const metadata: Metadata = {
  title: "Monetrix — Умные финансы",
  description: "Финансовая платформа: анализ расходов, AI-консультант Кэшик, вклады, налоговые вычеты. Работает офлайн.",
  manifest: "/manifest.json",
  appleWebApp: {
    capable: true,
    statusBarStyle: "default",
    title: "Monetrix",
  },
  other: {
    "mobile-web-app-capable": "yes",
    "apple-mobile-web-app-capable": "yes",
    "apple-touch-icon": "/icon-180.png",
    "msapplication-TileColor": "#3629B7",
    "theme-color": "#3629B7",
  },
};

export default function RootLayout({
  children,
}: Readonly<{
  children: React.ReactNode;
}>) {
  return (
    <html lang="ru">
      <head>
        <link rel="apple-touch-icon" href="/icon-180.png" />
        <meta name="theme-color" content="#3629B7" />
      </head>
      <body
        className={`${geistSans.variable} ${geistMono.variable} antialiased font-sans`}
      >
        <AuthProvider>
          {children}
          <SiteFooter />
        </AuthProvider>
        <PWARegister />
        <VisualEditsMessenger />
      <Analytics />

      </body>
    </html>
  );
}
