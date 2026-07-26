"use client";

import Image from "next/image";
import Link from "next/link";
import { usePathname } from "next/navigation";

import { AdminAccountMenu } from "@/app/admin-account-menu";

const tabs = [
  { href: "/", label: "Users" },
  { href: "/jobs", label: "Jobs" },
];

type AdminTopTabsProps = {
  user: {
    image: string | null;
    name: string;
  } | null;
};

export function AdminTopTabs({ user }: AdminTopTabsProps) {
  const pathname = usePathname();
  const isLoginPage = pathname === "/login";

  return (
    <header className="sticky top-0 z-20 border-b bg-background/95 backdrop-blur">
      <nav
        aria-label="Admin navigation"
        className={
          isLoginPage
            ? "mx-auto flex h-14 w-full max-w-6xl items-center justify-center px-4 sm:px-6"
            : "mx-auto grid h-14 w-full max-w-6xl grid-cols-[1fr_auto_1fr] items-center gap-3 px-4 sm:px-6"
        }
      >
        <Link
          href="/"
          className="flex size-9 items-center justify-center"
          aria-label="Dhaka Index admin home"
        >
          <Image
            alt=""
            aria-hidden="true"
            className="size-7"
            height={28}
            priority
            src="/brand/di-logo-transparent.svg"
            width={28}
          />
        </Link>

        {!isLoginPage ? (
          <div className="flex h-full items-center justify-center gap-6">
            {tabs.map((tab) => {
              const isActive =
                tab.href === "/"
                  ? pathname === "/"
                  : pathname === tab.href || pathname.startsWith(`${tab.href}/`);

              return (
                <Link
                  key={tab.href}
                  href={tab.href}
                  className={`flex h-full items-center border-b-2 px-1 text-sm font-medium transition-colors ${
                    isActive
                      ? "border-primary text-foreground"
                      : "border-transparent text-muted-foreground hover:text-foreground"
                  }`}
                >
                  {tab.label}
                </Link>
              );
            })}
          </div>
        ) : null}

        {!isLoginPage && user ? (
          <div className="justify-self-end">
            <AdminAccountMenu image={user.image} name={user.name} />
          </div>
        ) : null}
      </nav>
    </header>
  );
}
