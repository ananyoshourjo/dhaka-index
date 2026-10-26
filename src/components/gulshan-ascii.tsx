"use client";

import { useEffect, useRef } from "react";

import intersection from "@/lib/art/gulshan-intersection.json";

// The reference is sampled into characters at build time. The browser renders
// only this text: no source image, canvas, or image request is needed.
export function GulshanAscii() {
  const containerRef = useRef<HTMLDivElement>(null);
  const textRef = useRef<HTMLPreElement>(null);

  useEffect(() => {
    const container = containerRef.current;
    const pre = textRef.current;
    const surface = container?.parentElement;
    if (!container || !pre || !surface) return;

    const reducedMotion = window.matchMedia("(prefers-reduced-motion: reduce)");
    const finePointer = window.matchMedia("(hover: hover) and (pointer: fine)");
    const originals = intersection.split("\n");
    // Fixed-width rows keep the character coordinates stable during scrambling.
    const columns = Math.max(...originals.map((row) => row.length));
    const rows = originals.map((row) => row.padEnd(columns, " "));
    const symbols = "01/\\|[]{}<>:;+=*x%#@~!?";
    const lifetime = 650;
    const radius = 46;
    let pointer: { x: number; y: number } | null = null;
    let trail: { x: number; y: number; time: number }[] = [];
    let frame = 0;
    let lastPaint = 0;

    const paint = (time: number) => {
      frame = 0;
      if (reducedMotion.matches || !finePointer.matches) {
        pre.textContent = intersection;
        trail = [];
        return;
      }
      if (time - lastPaint >= 65) {
        lastPaint = time;
        trail = trail.filter((point) => time - point.time < lifetime);
        if (pointer) trail.push({ ...pointer, time });
        if (!trail.length) {
          pre.textContent = intersection;
          return;
        }
        const bounds = pre.getBoundingClientRect();
        const cellWidth = bounds.width / columns;
        const cellHeight = bounds.height / rows.length;
        const output = rows.map((row) => row.split(""));
        for (const point of trail) {
          const strength = 1 - (time - point.time) / lifetime;
          const reach = radius * (0.45 + strength * 0.55);
          const cx = (point.x - bounds.left) / cellWidth;
          const cy = (point.y - bounds.top) / cellHeight;
          const rx = reach / cellWidth;
          const ry = reach / cellHeight;
          for (let y = Math.max(0, Math.floor(cy - ry)); y <= Math.min(rows.length - 1, Math.ceil(cy + ry)); y++) {
            for (let x = Math.max(0, Math.floor(cx - rx)); x <= Math.min(columns - 1, Math.ceil(cx + rx)); x++) {
              const distance = Math.hypot((x - cx) * cellWidth, (y - cy) * cellHeight);
              if (distance > reach || rows[y][x] === " ") continue;
              if (Math.random() < strength * (1 - distance / reach)) {
                output[y][x] = symbols[Math.floor(Math.random() * symbols.length)];
              }
            }
          }
        }
        pre.textContent = output.map((row) => row.join("")).join("\n");
      }
      frame = requestAnimationFrame(paint);
    };
    const start = () => {
      if (!frame) frame = requestAnimationFrame(paint);
    };
    const move = (event: PointerEvent) => {
      if (event.pointerType === "touch" || reducedMotion.matches || !finePointer.matches) return;
      const next = { x: event.clientX, y: event.clientY };
      // Interpolate fast moves so the trail remains continuous.
      if (pointer) {
        const steps = Math.min(12, Math.ceil(Math.hypot(next.x - pointer.x, next.y - pointer.y) / 18));
        for (let i = 1; i < steps; i++) trail.push({
          x: pointer.x + (next.x - pointer.x) * i / steps,
          y: pointer.y + (next.y - pointer.y) * i / steps,
          time: performance.now(),
        });
      }
      trail = trail.slice(-70);
      pointer = next;
      start();
    };
    const leave = () => { pointer = null; };
    const reset = () => {
      pointer = null;
      trail = [];
      cancelAnimationFrame(frame);
      frame = 0;
      pre.textContent = intersection;
    };
    surface.addEventListener("pointermove", move);
    surface.addEventListener("pointerleave", leave);
    window.addEventListener("blur", reset);
    window.addEventListener("resize", reset);
    reducedMotion.addEventListener("change", reset);
    return () => {
      reset();
      surface.removeEventListener("pointermove", move);
      surface.removeEventListener("pointerleave", leave);
      window.removeEventListener("blur", reset);
      window.removeEventListener("resize", reset);
      reducedMotion.removeEventListener("change", reset);
    };
  }, []);

  return (
    <div ref={containerRef} className="gulshan-ascii" aria-hidden="true">
      <pre ref={textRef}>{intersection}</pre>
    </div>
  );
}
