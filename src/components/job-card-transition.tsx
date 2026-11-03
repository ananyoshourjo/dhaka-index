"use client";

import { useEffect, type ReactNode } from "react";
import { useRouter } from "next/navigation";

export function JobTransitionProvider({ children }: { children: ReactNode }) {
  const router = useRouter();
  useEffect(() => {
    let cleanup = () => {};
    const origins = new Map<string, number>();
    const navigate = (id: string, returning: boolean, update?: () => void) => {
      cleanup();
      const source = document.querySelector<HTMLElement>(`[data-job-surface="${id}"][data-job-view="${returning ? "detail" : "card"}"]`);
      if (!source || !document.startViewTransition || matchMedia("(prefers-reduced-motion: reduce)").matches) {
        update?.();
        return;
      }
      if (!returning) origins.set(id, scrollY);
      const previousSourceName = source.style.viewTransitionName;
      source.style.viewTransitionName = "job-card";
      let target: HTMLElement | null = null;
      let previousTargetName = "";
      let observer: MutationObserver | undefined;
      let timer = 0;
      let released = false;
      let cleared = false;
      let release = () => {};
      const restore = () => {
        if (cleared) return;
        cleared = true;
        observer?.disconnect();
        clearTimeout(timer);
        release();
        source.style.viewTransitionName = previousSourceName;
        if (target) target.style.viewTransitionName = previousTargetName;
      };
      const transition = document.startViewTransition(async () => {
        // The browser retains the old page snapshot while this callback waits.
        // Intermediate Suspense skeletons never become animation destinations.
        if (cleared) return;
        update?.();
        await new Promise<void>((resolve) => {
          release = () => { released = true; resolve(); };
          const findTarget = () => {
            if (released || cleared) return;
            const candidate = document.querySelector<HTMLElement>(`[data-job-surface="${id}"][data-job-view="${returning ? "card" : "detail"}"]`);
            const loading = [...document.querySelectorAll<HTMLElement>("[data-route-skeleton]")]
              .some((element) => element.getClientRects().length > 0);
            if (!candidate || candidate === source || loading) {
              return;
            }
            window.scrollTo({ top: returning ? origins.get(id) ?? 0 : 0, behavior: "instant" });
            target = candidate;
            // Retained React trees must not have two elements with the same name.
            source.style.viewTransitionName = previousSourceName;
            previousTargetName = target.style.viewTransitionName;
            target.style.viewTransitionName = "job-card";
            clearTimeout(timer);
            observer?.disconnect();
            release();
          };
          timer = window.setTimeout(() => {
            transition.skipTransition();
            restore();
          }, 1800);
          observer = new MutationObserver(findTarget);
          observer.observe(document.body, { childList: true, subtree: true });
          findTarget();
        });
      });
      cleanup = () => { transition.skipTransition(); restore(); };
      void transition.ready.catch(() => {});
      void transition.finished.then(restore, restore);
    };
    const click = (event: MouseEvent) => {
      if (event.defaultPrevented || event.button || event.metaKey || event.ctrlKey || event.shiftKey || event.altKey) return;
      const link = (event.target as Element).closest<HTMLAnchorElement>("a[href]");
      if (!link || link.target === "_blank" || link.hasAttribute("download") || link.origin !== location.origin) return;
      const destination = new URL(link.href);
      if (destination.pathname === location.pathname) return;
      const outgoing = location.pathname.match(/-(\d+)$/)?.[1];
      const incoming = destination.pathname.match(/-(\d+)$/)?.[1];
      const returning = Boolean(outgoing && !incoming);
      const id = returning ? outgoing : incoming;
      if (!id || !document.querySelector(`[data-job-surface="${id}"]`)) return;
      event.preventDefault();
      navigate(id, returning, () => router.push(destination.pathname + destination.search + destination.hash));
    };
    const back = () => {
      const detail = document.querySelector<HTMLElement>('[data-job-view="detail"]');
      const id = detail?.dataset.jobSurface;
      if (id && /^\d+$/.test(id)) navigate(id, true);
    };
    const cancel = () => cleanup();
    document.addEventListener("click", click, true);
    window.addEventListener("popstate", back);
    window.addEventListener("resize", cancel);
    window.addEventListener("pagehide", cancel);
    return () => {
      cleanup();
      document.removeEventListener("click", click, true);
      window.removeEventListener("popstate", back);
      window.removeEventListener("resize", cancel);
      window.removeEventListener("pagehide", cancel);
    };
  }, [router]);
  return children;
}
