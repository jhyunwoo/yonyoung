"use client";

import { useReportWebVitals } from "next/web-vitals";
import { shouldSample } from "@/lib/observability/sampling";

const DEFAULT_SAMPLE_RATE = 0.1;

export function WebVitalsReporter() {
  useReportWebVitals((metric) => {
    if (!shouldSample(DEFAULT_SAMPLE_RATE, metric.id)) {
      return;
    }

    const payload = {
      id: metric.id,
      name: metric.name,
      value: metric.value,
      rating: metric.rating,
      delta: metric.delta,
      navigationType: metric.navigationType,
      path: window.location.pathname,
      sampledAt: Date.now(),
    };

    navigator.sendBeacon("/api/internal/web-vitals", JSON.stringify(payload));
  });

  return null;
}
