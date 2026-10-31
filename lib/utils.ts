import { type ClassValue, clsx } from "clsx";
import { twMerge } from "tailwind-merge";

export function cn(...inputs: ClassValue[]) {
  return twMerge(clsx(inputs));
}

// ---------------------------------------------------------------------------
// Date utilities
// ---------------------------------------------------------------------------

/** Format a Date to YYYYMMDD (NASA POWER format) */
export function toNasaDate(d: Date): string {
  const y = d.getFullYear();
  const m = String(d.getMonth() + 1).padStart(2, "0");
  const dd = String(d.getDate()).padStart(2, "0");
  return `${y}${m}${dd}`;
}

/** Format a Date to YYYY-MM-DD (ISO / Open-Meteo format) */
export function toIsoDate(d: Date): string {
  return d.toISOString().slice(0, 10);
}

/** Get a Date N days ago from today */
export function daysAgo(n: number): Date {
  const d = new Date();
  d.setDate(d.getDate() - n);
  return d;
}

/** Get a Date N days in the future */
export function daysFromNow(n: number): Date {
  const d = new Date();
  d.setDate(d.getDate() + n);
  return d;
}

/** Build a JJAS date range (June 1 – Sep 30) for a given year */
export function jjasRange(year: number): { start: string; end: string } {
  return {
    start: `${year}-06-01`,
    end: `${year}-09-30`,
  };
}

/** Sum all non-null values in an array */
export function sumNonNull(arr: (number | null)[]): number {
  return arr.reduce<number>((s, v) => s + (v ?? 0), 0);
}

/** Forward-fill nulls in an array with last known value */
export function forwardFill(arr: (number | null)[]): number[] {
  let last = 0;
  return arr.map((v) => {
    if (v !== null && v !== undefined) {
      last = v;
      return v;
    }
    return last;
  });
}

/** Compute NDVI from B04 (red) and B08 (NIR) reflectance values */
export function ndvi(red: number, nir: number): number {
  if (red + nir === 0) return 0;
  return (nir - red) / (nir + red);
}

/** Truncate URL for display (keeps host + first path segment) */
export function truncateUrl(url: string, maxLen = 60): string {
  try {
    const u = new URL(url);
    const short = u.hostname + u.pathname;
    return short.length > maxLen ? short.slice(0, maxLen) + "…" : short;
  } catch {
    return url.slice(0, maxLen);
  }
}

/** Format latency with colour hint */
export function latencyLabel(ms: number): string {
  if (ms < 500) return `${ms}ms (fast)`;
  if (ms < 2000) return `${ms}ms (moderate)`;
  return `${ms}ms (slow)`;
}

/** Convert a number to a fixed decimal string, handling NaN gracefully */
export function fmt(n: number, decimals = 2): string {
  if (isNaN(n) || !isFinite(n)) return "N/A";
  return n.toFixed(decimals);
}

/** Risk level → Tailwind colour class */
export function riskColour(level: string): string {
  switch (level) {
    case "low":
      return "text-emerald-400 bg-emerald-950 border-emerald-700";
    case "medium":
      return "text-amber-400 bg-amber-950 border-amber-700";
    case "high":
      return "text-red-400 bg-red-950 border-red-700";
    case "severe":
      return "text-purple-400 bg-purple-950 border-purple-700";
    default:
      return "text-slate-400 bg-slate-900 border-slate-700";
  }
}
