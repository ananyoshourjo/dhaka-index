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

export const metadata: Metadata = {
  applicationName: "Dhaka Index",
  title: "Dhaka Index",
  description:
    "A local-first Dhaka job index with a polished resume and cover-letter builder.",
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
