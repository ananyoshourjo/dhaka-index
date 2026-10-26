"use client";

import { useEffect, type ReactNode } from "react";

export function JobTransitionProvider({ children }: { children: ReactNode }) {
  useEffect(() => {
    let cleanup = () => {};
    const origins = new Map<string, number>();
    const capture = (id: string, returning: boolean) => {
      cleanup();
      if (matchMedia("(prefers-reduced-motion: reduce)").matches) return;
      const sources = [...document.querySelectorAll<HTMLElement>(`[data-job-text^="job-${id}-"]`)];
      if (sources.length !== 2) return;
      if (!returning) origins.set(id, scrollY);
      const entries = sources.map((source) => {
        const element = source.firstElementChild as HTMLElement;
        const bounds = element.getBoundingClientRect();
        const style = getComputedStyle(element);
        const overlay = document.createElement("div");
        overlay.textContent = element.textContent;
        overlay.setAttribute("aria-hidden", "true");
        overlay.dataset.jobTransitionOverlay = "true";
        Object.assign(overlay.style, {
          position: "fixed", zIndex: "9999", pointerEvents: "none", margin: "0",
          left: `${bounds.left}px`, top: `${bounds.top}px`, width: `${bounds.width}px`,
          font: style.font, letterSpacing: style.letterSpacing, color: style.color,
          lineHeight: style.lineHeight, transformOrigin: "top left",
        });
        document.body.appendChild(overlay);
        const previous = element.style.opacity;
        element.style.opacity = "0";
        return { source, element, bounds, overlay, previous, target: null as HTMLElement | null, targetOpacity: "", animation: null as Animation | null };
      });
      let raf = 0;
      let timer = 0;
      let arrived = false;
      let observer: MutationObserver | undefined;
      const clear = () => {
        observer?.disconnect();
        cancelAnimationFrame(raf);
        clearTimeout(timer);
        entries.forEach((entry) => {
          entry.animation?.cancel();
          entry.overlay.remove();
          entry.element.style.opacity = entry.previous;
          if (entry.target) entry.target.style.opacity = entry.targetOpacity;
        });
      };
      cleanup = clear;
      const arrive = () => {
        if (arrived) return;
        const targets = entries.map((entry) => document.querySelector<HTMLElement>(`[data-job-text="${entry.source.dataset.jobText}"]`));
        if (targets.some((target, i) => !target || target === entries[i].source)) {
          raf = requestAnimationFrame(arrive); return;
        }
        if (returning) window.scrollTo({ top: origins.get(id) ?? 0, behavior: "instant" });
        else window.scrollTo({ top: 0, behavior: "instant" });
        arrived = true;
        observer?.disconnect();
        cancelAnimationFrame(raf);
        // Read all destination geometry before writing styles to avoid layout thrash.
        const measurements = entries.map((entry, i) => {
          const target = targets[i]!.firstElementChild as HTMLElement;
          const bounds = target.getBoundingClientRect();
          const style = getComputedStyle(target);
          return { target, bounds, font: style.font, lineHeight: style.lineHeight,
            letterSpacing: style.letterSpacing, color: style.color };
        });
        entries.forEach((entry, i) => {
          const { target, bounds, font, lineHeight, letterSpacing, color } = measurements[i];
          entry.target = target;
          entry.targetOpacity = target.style.opacity;
          target.style.opacity = "0";
          Object.assign(entry.overlay.style, {
            left: "0", top: "0", width: `${bounds.width}px`,
            font, lineHeight, letterSpacing, color,
            willChange: "transform",
          });
          const from = `translate3d(${entry.bounds.left}px, ${entry.bounds.top}px, 0) scale(${entry.bounds.width / Math.max(bounds.width, 1)}, ${entry.bounds.height / Math.max(bounds.height, 1)})`;
          const to = `translate3d(${bounds.left}px, ${bounds.top}px, 0) scale(1, 1)`;
          entry.overlay.style.transform = from;
          entry.animation = entry.overlay.animate([
            { transform: from },
            { transform: to },
          ], { duration: 440, easing: "cubic-bezier(0.2, 0, 0, 1)", fill: "forwards" });
        });
        clearTimeout(timer);
        // Restore the real text as soon as the animation finishes, without a dead frame.
        void Promise.all(entries.map((entry) => entry.animation!.finished)).then(clear, clear);
        timer = window.setTimeout(clear, 550);
      };
      timer = window.setTimeout(clear, 5000);
      // Mutation observers run before paint, preventing a flash of destination text.
      observer = new MutationObserver(arrive);
      observer.observe(document.body, { childList: true, subtree: true });
      raf = requestAnimationFrame(arrive);
    };
    const click = (event: MouseEvent) => {
      if (event.defaultPrevented || event.button || event.metaKey || event.ctrlKey || event.shiftKey || event.altKey) return;
      const link = (event.target as Element).closest<HTMLAnchorElement>("a[href]");
      if (!link || link.target === "_blank" || link.origin !== location.origin) return;
      const destination = new URL(link.href);
      const outgoing = location.pathname.match(/-(\d+)$/)?.[1];
      const incoming = destination.pathname.match(/-(\d+)$/)?.[1];
      if (incoming && incoming !== outgoing) capture(incoming, false);
      else if (outgoing && destination.pathname !== location.pathname) capture(outgoing, true);
    };
    const back = () => {
      const detail = document.querySelector<HTMLElement>("article [data-job-text]");
      const id = detail?.dataset.jobText?.match(/^job-(\d+)-/)?.[1];
      if (id) capture(id, true);
    };
    document.addEventListener("click", click, true);
    window.addEventListener("popstate", back);
    const cancel = () => cleanup();
    window.addEventListener("resize", cancel);
    return () => {
      cleanup();
      document.removeEventListener("click", click, true);
      window.removeEventListener("popstate", back);
      window.removeEventListener("resize", cancel);
    };
  }, []);
  return children;
}

export function JobTextTransition({ jobId, field, children }: {
  jobId: number;
  field: "company" | "role";
  children: ReactNode;
}) {
  return <div className="contents" data-job-text={`job-${jobId}-${field}`}>{children}</div>;
}
