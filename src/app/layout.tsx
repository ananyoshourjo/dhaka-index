import type { Metadata } from "next";
import { Geist, Geist_Mono } from "next/font/google";

import { TopTabs } from "@/components/top-tabs";

import "./globals.css";

const geistSans = Geist({
  subsets: ["latin"],
  variable: "--font-geist-sans",
});

const geistMono = Geist_Mono({
  subsets: ["latin"],
  variable: "--font-geist-mono",
});

const siteDescription =
  "A clean, simple hub for high-quality jobs and professional resumes.";

export const metadata: Metadata = {
  metadataBase: new URL("https://dhakaindex.com"),
  applicationName: "Dhaka Index",
  title: "Dhaka Index",
  description: siteDescription,
  alternates: {
    canonical: "/",
  },
  openGraph: {
    type: "website",
    url: "/",
    siteName: "Dhaka Index",
    title: "Dhaka Index",
    description: siteDescription,
  },
  twitter: {
    card: "summary",
    title: "Dhaka Index",
    description: siteDescription,
  },
  icons: {
    icon: [
      {
        url: "/brand/di-logo-white-background.svg",
        type: "image/svg+xml",
      },
      {
        url: "/brand/di-logo-white-background.png",
        sizes: "2192x2192",
        type: "image/png",
      },
    ],
    shortcut: [
      {
        url: "/brand/di-logo-white-background.svg",
        type: "image/svg+xml",
      },
    ],
    apple: [
      {
        url: "/brand/di-logo-white-background.png",
        sizes: "2192x2192",
        type: "image/png",
      },
    ],
  },
};

export default function RootLayout({
  children,
}: Readonly<{
  children: React.ReactNode;
}>) {
  return (
    <html lang="en">
      <body className={`${geistSans.variable} ${geistMono.variable}`}>
        <TopTabs />
        {children}
      </body>
    </html>
  );
}
