"use client";

import {
  Archive,
  Bookmark,
  BriefcaseBusiness,
  LogOut,
  Settings,
  UserRound,
} from "lucide-react";
import Image from "next/image";
import Link from "next/link";
import { usePathname } from "next/navigation";
import { useRouter } from "next/navigation";
import { useEffect, useRef, useState } from "react";

import { Button } from "@/components/ui/button";
import { authClient } from "@/lib/auth-client";
import { cn } from "@/lib/utils";

const tabs = [
  { href: "/", icon: BriefcaseBusiness, label: "Jobs" },
  { href: "/bookmarks", icon: Bookmark, label: "Bookmarks" },
  { href: "/profile", icon: UserRound, label: "Profile" },
];

export function TopTabs() {
  const pathname = usePathname();
  const router = useRouter();
  const session = authClient.useSession();
  const [menuOpen, setMenuOpen] = useState(false);
  const [profilePhoto, setProfilePhoto] = useState<{
    url: string;
    userId: string;
  } | null>(null);
  const menuRef = useRef<HTMLDivElement>(null);
  const user = session.data?.user;
  const avatarImage = session.data
    ? profilePhoto && profilePhoto.userId === user?.id
      ? profilePhoto.url
      : "/api/profile/photo"
    : "";
  const avatarInitial =
    user?.name?.trim().charAt(0).toUpperCase() ||
    user?.email?.trim().charAt(0).toUpperCase() ||
    "U";

  useEffect(() => {
    if (!menuOpen) {
      return;
    }

    function handlePointerDown(event: PointerEvent) {
      if (
        menuRef.current &&
        !menuRef.current.contains(event.target as Node)
      ) {
        setMenuOpen(false);
      }
    }

    document.addEventListener("pointerdown", handlePointerDown);
    return () => document.removeEventListener("pointerdown", handlePointerDown);
  }, [menuOpen]);

  useEffect(() => {
    function handleProfilePhotoChange(event: Event) {
      const customEvent = event as CustomEvent<{ photoUrl?: string }>;
      setProfilePhoto({
        url: customEvent.detail?.photoUrl || "",
        userId: user?.id || "",
      });
    }

    window.addEventListener("profile-photo-change", handleProfilePhotoChange);
    return () =>
      window.removeEventListener("profile-photo-change", handleProfilePhotoChange);
  }, [user?.id]);

  if (pathname === "/login" || pathname === "/signup") {
    return (
      <header className="sticky top-0 z-10 border-b bg-background/95 backdrop-blur">
        <nav className="mx-auto flex h-14 w-full max-w-3xl items-center justify-center px-4 sm:px-6">
          <Link
            href="/"
            className="flex size-9 items-center justify-center"
            aria-label="Dhaka Index home"
          >
            <Image
              alt=""
              aria-hidden="true"
              className="h-7 w-auto"
              height={1415}
              priority
              src="/brand/di-logo-transparent.svg"
              width={1226}
            />
          </Link>
        </nav>
      </header>
    );
  }

  return (
    <>
    <header className="sticky top-0 z-10 border-b bg-background/95 backdrop-blur">
      <nav
        aria-label="Primary navigation"
        className="mx-auto grid h-14 w-full max-w-3xl grid-cols-[1fr_1fr] items-center gap-3 px-4 sm:grid-cols-[1fr_auto_1fr] sm:px-6"
      >
        <Link
          href="/"
          className="flex size-9 items-center justify-center"
          aria-label="Dhaka Index home"
        >
          <Image
            alt=""
            aria-hidden="true"
            className="h-7 w-auto"
            height={1415}
            priority
            src="/brand/di-logo-transparent.svg"
            width={1226}
          />
        </Link>

        <div className="hidden h-full items-center justify-center gap-5 overflow-x-auto sm:flex">
          {tabs.map((tab) => {
            const isActive = pathname === tab.href;

            return (
              <Link
                key={tab.href}
                href={tab.href}
                aria-current={isActive ? "page" : undefined}
                className={cn(
                  "flex h-full items-center border-b-2 border-transparent px-1 text-sm font-medium text-muted-foreground transition-colors hover:text-foreground",
                  isActive && "border-primary text-foreground",
                )}
              >
                {tab.label}
              </Link>
            );
          })}
        </div>

        {session.data ? (
          <div ref={menuRef} className="relative justify-self-end">
            <button
              type="button"
              aria-label="Open account menu"
              aria-expanded={menuOpen}
              className="flex size-9 items-center justify-center overflow-hidden rounded-full border bg-muted text-sm font-semibold text-muted-foreground transition-colors hover:border-primary hover:text-foreground focus-visible:ring-2 focus-visible:ring-ring focus-visible:ring-offset-2 focus-visible:outline-none"
              onClick={() => setMenuOpen((open) => !open)}
            >
              {avatarImage ? (
                // eslint-disable-next-line @next/next/no-img-element
                <img
                  aria-hidden="true"
                  alt=""
                  className="size-full object-cover"
                  src={avatarImage}
                  onError={() =>
                    setProfilePhoto({ url: "", userId: user?.id || "" })
                  }
                />
              ) : (
                <span
                  aria-hidden="true"
                  className="flex size-full items-center justify-center rounded-full bg-muted text-sm font-medium text-foreground"
                >
                  {avatarInitial}
                </span>
              )}
            </button>

            {menuOpen ? (
              <div className="absolute right-0 mt-2 grid w-44 gap-1 rounded-md border bg-popover p-1 text-popover-foreground shadow-sm">
                <Button
                  asChild
                  variant="ghost"
                  size="sm"
                  className="justify-start"
                  onClick={() => setMenuOpen(false)}
                >
                  <Link href="/archive">
                    <Archive className="size-4" />
                    Archive
                  </Link>
                </Button>
                <Button
                  asChild
                  variant="ghost"
                  size="sm"
                  className="justify-start"
                  onClick={() => setMenuOpen(false)}
                >
                  <Link href="/settings">
                    <Settings className="size-4" />
                    Settings
                  </Link>
                </Button>
                <Button
                  type="button"
                  variant="ghost"
                  size="sm"
                  className="justify-start text-destructive hover:text-destructive"
                  onClick={async () => {
                    setMenuOpen(false);
                    await authClient.signOut();
                    router.push("/login");
                    router.refresh();
                  }}
                >
                  <LogOut className="size-4" />
                  Logout
                </Button>
              </div>
            ) : null}
          </div>
        ) : null}
      </nav>
    </header>
    <nav
        data-mobile-app-nav
        aria-label="Mobile navigation"
        className="fixed inset-x-0 bottom-0 z-30 grid grid-cols-3 border-t bg-background/95 pb-[env(safe-area-inset-bottom)] shadow-[0_-8px_24px_-18px_rgba(0,0,0,0.35)] backdrop-blur sm:hidden"
      >
        {tabs.map((tab) => {
          const isActive = pathname === tab.href;
          const Icon = tab.icon;

          return (
            <Link
              key={tab.href}
              href={tab.href}
              aria-current={isActive ? "page" : undefined}
              className={cn(
                "relative flex h-16 flex-col items-center justify-center gap-1 text-[11px] font-medium text-muted-foreground transition-colors",
                isActive && "text-foreground",
              )}
            >
              <Icon
                aria-hidden="true"
                className={cn("size-5", isActive && "stroke-[2.25]")}
              />
              {tab.label}
              {isActive ? (
                <span className="absolute top-0 h-0.5 w-8 rounded-full bg-primary" />
              ) : null}
            </Link>
          );
        })}
    </nav>
    </>
  );
}
