"use client";

import { useEffect, useRef } from "react";
import type { PointerEvent as ReactPointerEvent, RefObject } from "react";

type Source = { group: string; id: string };
type Destination = Source & { position: "before" | "after" };
type Options = {
  containerRef: RefObject<HTMLDivElement | null>;
  onStart: (source: Source) => void;
  onIndicator: (target: Destination | null) => void;
  onCommit: (source: Source, target: Destination) => void;
  onEnd: () => void;
};

export function useProfileReorder(options: Options) {
  const optionsRef = useRef(options);
  useEffect(() => { optionsRef.current = options; });
  const cleanupRef = useRef<(() => void) | null>(null);
  useEffect(() => () => cleanupRef.current?.(), []);

  const onPointerDown = (event: ReactPointerEvent<HTMLDivElement>) => {
    if (event.button !== 0 || !event.isPrimary) return;
    const target = event.target as Element;
    if (target.closest("input, textarea, select, button, a, [contenteditable]")) return;
    const handle = target.closest("[data-drag-handle]");
    const item = handle?.closest<HTMLElement>("[data-reorder-group]");
    const container = options.containerRef.current;
    if (!item || !container || !item.dataset.reorderGroup || !item.dataset.reorderId) return;

    event.preventDefault();
    cleanupRef.current?.();
    const pointerId = event.pointerId;
    const source = { group: item.dataset.reorderGroup, id: item.dataset.reorderId };
    const start = { x: event.clientX, y: event.clientY };
    let point = { ...start };
    let active = false;
    let ghost: HTMLElement | null = null;
    let ghostWidth = 0;
    let destination: Destination | null = null;
    let frame = 0;
    let lastTime = 0;
    const originalOpacity = item.style.opacity;
    const originalCursor = document.body.style.cursor;
    const originalUserSelect = document.body.style.userSelect;
    const candidates = () => Array.from(container.querySelectorAll<HTMLElement>("[data-reorder-group]"))
      .filter((element) => element.dataset.reorderGroup === source.group);
    const updateIndicator = (next: Destination | null) => {
      if (next?.id === destination?.id && next?.position === destination?.position) return;
      destination = next;
      optionsRef.current.onIndicator(next);
    };

    const tick = (time: number) => {
      if (!active) return;
      const seconds = lastTime ? Math.min((time - lastTime) / 1000, 0.032) : 0;
      lastTime = time;
      const viewport = window.visualViewport;
      const visibleTop = viewport?.offsetTop ?? 0;
      const visibleBottom = visibleTop + (viewport?.height ?? window.innerHeight);
      const bounds = container.getBoundingClientRect();
      const top = Math.max(bounds.top, visibleTop);
      const bottom = Math.min(bounds.bottom, visibleBottom);
      const edge = Math.min(80, Math.max(24, (bottom - top) / 4));
      const speed = point.y < top + edge
        ? -Math.min(1, Math.max(0, (top + edge - point.y) / edge))
        : Math.min(1, Math.max(0, (point.y - bottom + edge) / edge));
      const scroller = container.scrollHeight > container.clientHeight + 1
        ? container : document.scrollingElement;
      if (scroller && point.x >= bounds.left && point.x <= bounds.right) {
        scroller.scrollTop += speed * 650 * seconds;
      }
      if (ghost) {
        ghost.style.transform = `translate3d(${Math.max(8, Math.min(point.x + 14, window.innerWidth - ghostWidth - 8))}px, ${point.y + 14}px, 0)`;
      }
      // Match only siblings in the source collection; nested entries must not
      // intercept a section drag. Nearest edges also accept drops in the gaps.
      let nearest: HTMLElement | null = null;
      let distance = Infinity;
      if (point.x >= bounds.left - 16 && point.x <= bounds.right + 16 && point.y >= top - 32 && point.y <= bottom + 32) {
        for (const element of candidates()) {
          if (!element.getClientRects().length) continue;
          const rect = element.getBoundingClientRect();
          const delta = Math.max(rect.top - point.y, point.y - rect.bottom, 0);
          if (delta < distance) { nearest = element; distance = delta; }
        }
      }
      if (nearest && nearest !== item) {
        const rect = nearest.getBoundingClientRect();
        const midpoint = rect.top + rect.height / 2;
        // A small dead zone prevents the insertion marker flickering at center.
        const position = destination && destination.id === nearest.dataset.reorderId && Math.abs(point.y - midpoint) < 6
          ? destination.position : point.y < midpoint ? "before" : "after";
        updateIndicator({ group: source.group, id: nearest.dataset.reorderId!, position });
      } else {
        updateIndicator(null);
      }
      frame = requestAnimationFrame(tick);
    };

    const cleanup = () => {
      cancelAnimationFrame(frame);
      ghost?.remove();
      item.style.opacity = originalOpacity;
      document.body.style.cursor = originalCursor;
      document.body.style.userSelect = originalUserSelect;
      container.removeEventListener("pointermove", move);
      container.removeEventListener("pointerup", up);
      container.removeEventListener("pointercancel", cancel);
      container.removeEventListener("lostpointercapture", cancel);
      window.removeEventListener("keydown", keydown);
      window.removeEventListener("blur", cancel);
      if (container.hasPointerCapture(pointerId)) container.releasePointerCapture(pointerId);
      cleanupRef.current = null;
      if (active) optionsRef.current.onEnd();
    };
    const move = (pointer: PointerEvent) => {
      if (pointer.pointerId !== pointerId) return;
      point = { x: pointer.clientX, y: pointer.clientY };
      if (!active && Math.hypot(point.x - start.x, point.y - start.y) >= 6) {
        active = true;
        optionsRef.current.onStart(source);
        item.style.opacity = "0.35";
        document.body.style.cursor = "grabbing";
        document.body.style.userSelect = "none";
        ghost = document.createElement("div");
        ghost.setAttribute("aria-hidden", "true");
        ghost.className = "pointer-events-none fixed left-0 top-0 z-[100] overflow-hidden rounded-lg border bg-background p-3 text-sm font-medium text-foreground shadow-lg";
        ghostWidth = Math.min(item.getBoundingClientRect().width, 280, window.innerWidth - 16);
        ghost.style.width = `${ghostWidth}px`;
        ghost.style.transform = `translate3d(${Math.max(8, Math.min(point.x + 14, window.innerWidth - ghostWidth - 8))}px, ${point.y + 14}px, 0)`;
        const heading = item.querySelector<HTMLInputElement>("input[aria-label$=' title']");
        ghost.textContent = heading?.value || item.querySelector("h2, p, [role='textbox']")?.textContent?.trim().slice(0, 100) || "Move item";
        document.body.appendChild(ghost);
        frame = requestAnimationFrame(tick);
      }
      if (active) pointer.preventDefault();
    };
    const up = (pointer: PointerEvent) => {
      if (pointer.pointerId !== pointerId) return;
      const target = destination;
      const positions = active && target ? candidates().map((element) => ({ element, rect: element.getBoundingClientRect() })) : [];
      if (active && target) optionsRef.current.onCommit(source, target);
      cleanup();
      if (positions.length && !window.matchMedia("(prefers-reduced-motion: reduce)").matches) {
        requestAnimationFrame(() => {
          for (const { element, rect } of positions) {
            if (!element.isConnected) continue;
            const next = element.getBoundingClientRect();
            const x = rect.left - next.left;
            const y = rect.top - next.top;
            if (Math.abs(x) + Math.abs(y) < 1) continue;
            element.animate([{ transform: `translate(${x}px, ${y}px)` }, { transform: "translate(0, 0)" }], {
              duration: 180, easing: "cubic-bezier(0.2, 0, 0, 1)",
            });
          }
        });
      }
    };
    const cancel = () => cleanup();
    const keydown = (key: KeyboardEvent) => { if (key.key === "Escape") { key.preventDefault(); cleanup(); } };
    container.addEventListener("pointermove", move);
    container.addEventListener("pointerup", up);
    container.addEventListener("pointercancel", cancel);
    container.addEventListener("lostpointercapture", cancel);
    window.addEventListener("keydown", keydown);
    window.addEventListener("blur", cancel);
    cleanupRef.current = cleanup;
    container.setPointerCapture(pointerId);
  };

  return { onPointerDown };
}
