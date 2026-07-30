import type { Metadata } from "next";

import { AdminTopTabs } from "@/app/admin-top-tabs";
import { getSession } from "@/app/lib/session";
import { getUserAvatarUrl } from "@/app/lib/users";

import "./globals.css";

export const dynamic = "force-dynamic";

export const metadata: Metadata = {
  applicationName: "Dhaka Index Admin Portal",
  title: "Dhaka Index Admin Portal",
  description: "Admin portal for Dhaka Index registered users.",
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

export default async function RootLayout({
  children,
}: Readonly<{
  children: React.ReactNode;
}>) {
  const session = await getSession();
  const avatarUrl = session
    ? await getUserAvatarUrl(session.user.id, session.user.image ?? null)
    : null;

  return (
    <html lang="en">
      <body>
        <AdminTopTabs
          user={
            session
              ? {
                  image: avatarUrl,
                  name: session.user.name,
                }
              : null
          }
        />
        {children}
      </body>
    </html>
  );
}
