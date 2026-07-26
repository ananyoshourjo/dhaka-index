"use client";

import { LogOut } from "lucide-react";
import { useRouter } from "next/navigation";
import { useEffect, useRef, useState } from "react";

import { authClient } from "@/app/lib/auth-client";

type AdminAccountMenuProps = {
  image: string | null;
  name: string;
};

export function AdminAccountMenu({ image, name }: AdminAccountMenuProps) {
  const router = useRouter();
  const [menuOpen, setMenuOpen] = useState(false);
  const menuRef = useRef<HTMLDivElement>(null);
  const avatarImage = image || "";
  const avatarInitial = name.trim().charAt(0).toUpperCase() || "U";

  useEffect(() => {
    if (!menuOpen) {
      return;
    }

    function handlePointerDown(event: PointerEvent) {
      if (menuRef.current && !menuRef.current.contains(event.target as Node)) {
        setMenuOpen(false);
      }
    }

    document.addEventListener("pointerdown", handlePointerDown);
    return () => document.removeEventListener("pointerdown", handlePointerDown);
  }, [menuOpen]);

  return (
    <div ref={menuRef} className="relative">
      <button
        type="button"
        aria-label="Open account menu"
        aria-expanded={menuOpen}
        className="flex size-9 items-center justify-center overflow-hidden rounded-full border bg-muted text-sm font-semibold text-muted-foreground transition-colors hover:border-primary hover:text-foreground focus-visible:ring-2 focus-visible:ring-ring focus-visible:ring-offset-2 focus-visible:outline-none"
        onClick={() => setMenuOpen((open) => !open)}
      >
        {avatarImage ? (
          <span
            aria-hidden="true"
            className="size-full bg-cover bg-center"
            style={{ backgroundImage: `url("${avatarImage}")` }}
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
        <div className="absolute right-0 mt-2 grid w-40 gap-1 rounded-md border bg-popover p-1 text-popover-foreground shadow-sm">
          <button
            type="button"
            className="inline-flex h-9 items-center justify-start gap-2 whitespace-nowrap rounded-md px-3 text-sm font-medium text-destructive transition-colors hover:bg-accent hover:text-destructive disabled:pointer-events-none disabled:opacity-50"
            onClick={async () => {
              setMenuOpen(false);
              await authClient.signOut();
              router.push("/login");
              router.refresh();
            }}
          >
            <LogOut className="size-4" />
            Logout
          </button>
        </div>
      ) : null}
    </div>
  );
}
