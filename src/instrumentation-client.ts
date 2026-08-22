import { initializeProductAnalytics } from "@/lib/product-analytics";

if (typeof window !== "undefined") {
  const initialize = () => void initializeProductAnalytics();
  const scheduleIdle = window.requestIdleCallback?.bind(window);

  if (scheduleIdle) {
    scheduleIdle(initialize, { timeout: 2_000 });
  } else {
    globalThis.setTimeout(initialize, 0);
  }
}
