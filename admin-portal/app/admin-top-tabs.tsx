"use client";

import { BriefcaseBusiness, UsersRound } from "lucide-react";
import Image from "next/image";
import Link from "next/link";
import { usePathname } from "next/navigation";

import { AdminAccountMenu } from "@/app/admin-account-menu";

const tabs = [
  { href: "/", icon: UsersRound, label: "Users" },
  { href: "/jobs", icon: BriefcaseBusiness, label: "Jobs" },
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
    <>
    <header className="sticky top-0 z-20 border-b bg-background/95 backdrop-blur">
      <nav
        aria-label="Admin navigation"
        className={
          isLoginPage
            ? "mx-auto flex h-14 w-full max-w-6xl items-center justify-center px-4 sm:px-6"
            : "mx-auto grid h-14 w-full max-w-6xl grid-cols-[1fr_1fr] items-center gap-3 px-4 sm:grid-cols-[1fr_auto_1fr] sm:px-6"
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
          <div className="hidden h-full items-center justify-center gap-6 sm:flex">
            {tabs.map((tab) => {
              const isActive =
                tab.href === "/"
                  ? pathname === "/"
                  : pathname === tab.href || pathname.startsWith(`${tab.href}/`);

              return (
                <Link
                  key={tab.href}
                  href={tab.href}
                  aria-current={isActive ? "page" : undefined}
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
    {!isLoginPage ? (
        <nav
          aria-label="Mobile admin navigation"
          className="fixed inset-x-0 bottom-0 z-30 grid grid-cols-2 border-t bg-background/95 pb-[env(safe-area-inset-bottom)] shadow-[0_-8px_24px_-18px_rgba(0,0,0,0.35)] backdrop-blur sm:hidden"
        >
          {tabs.map((tab) => {
            const isActive =
              tab.href === "/"
                ? pathname === "/"
                : pathname === tab.href || pathname.startsWith(`${tab.href}/`);
            const Icon = tab.icon;

            return (
              <Link
                key={tab.href}
                href={tab.href}
                aria-current={isActive ? "page" : undefined}
                className={`relative flex h-16 flex-col items-center justify-center gap-1 text-[11px] font-medium transition-colors ${
                  isActive ? "text-foreground" : "text-muted-foreground"
                }`}
              >
                <Icon className="size-5" aria-hidden="true" />
                {tab.label}
                {isActive ? (
                  <span className="absolute top-0 h-0.5 w-8 rounded-full bg-primary" />
                ) : null}
              </Link>
            );
          })}
        </nav>
      ) : null}
    </>
  );
}
