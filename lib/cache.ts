// =============================================================================
// TerraPulse — Spatial-Temporal LRU Cache with TTL Expiration
// Keys rounded to 2 decimal places (~1.1 km) to avoid redundant upstream calls
// =============================================================================

import crypto from "node:crypto";

export interface CacheEntry<T> {
  value: T;
  expiresAt: number;
  insertedAt: number;
}

export const CACHE_TTL_MS = {
  WEATHER: 60 * 60 * 1000,          // 1 hour
  SOIL: 3 * 60 * 60 * 1000,          // 3 hours
  IMAGERY: 24 * 60 * 60 * 1000,      // 24 hours (per scene acquisition)
  SYNTHESIS: 6 * 60 * 60 * 1000,     // 6 hours (identical tool output hash)
} as const;

export class SpatialTemporalCache {
  private store: Map<string, CacheEntry<unknown>> = new Map();
  private maxEntries: number;

  constructor(maxEntries = 500) {
    this.maxEntries = maxEntries;
  }

  /**
   * Generates a spatial cache key by rounding coordinates to 2 decimal places (~1.1 km)
   */
  public static makeSpatialKey(
    source: string,
    lat: number,
    lon: number,
    dateStr?: string
  ): string {
    const roundedLat = lat.toFixed(2);
    const roundedLon = lon.toFixed(2);
    const date = dateStr || new Date().toISOString().slice(0, 10);
    return `geo:${roundedLat}_${roundedLon}:${source}:${date}`;
  }

  /**
   * Generates a bounding box cache key
   */
  public static makeBboxKey(
    source: string,
    bbox: [number, number, number, number],
    dateStr?: string
  ): string {
    const roundedBbox = bbox.map((n) => n.toFixed(2)).join("_");
    const date = dateStr || new Date().toISOString().slice(0, 10);
    return `bbox:${roundedBbox}:${source}:${date}`;
  }

  /**
   * Generates a deterministic hash for LLM synthesis inputs
   */
  public static makeSynthesisHashKey(inputPayload: unknown): string {
    const str = JSON.stringify(inputPayload);
    const hash = crypto.createHash("sha256").update(str).digest("hex").slice(0, 16);
    return `llm_synth:${hash}`;
  }

  public get<T>(key: string): T | null {
    const entry = this.store.get(key) as CacheEntry<T> | undefined;
    if (!entry) return null;

    if (Date.now() > entry.expiresAt) {
      this.store.delete(key);
      return null;
    }

    // Refresh position for LRU
    this.store.delete(key);
    this.store.set(key, entry as CacheEntry<unknown>);
    return entry.value;
  }

  public set<T>(key: string, value: T, ttlMs: number): void {
    if (this.store.size >= this.maxEntries) {
      // Evict oldest entry (first item in map)
      const firstKey = this.store.keys().next().value;
      if (firstKey) this.store.delete(firstKey);
    }

    this.store.set(key, {
      value,
      expiresAt: Date.now() + ttlMs,
      insertedAt: Date.now(),
    });
  }

  public clear(): void {
    this.store.clear();
  }

  public size(): number {
    return this.store.size;
  }
}

// Global in-memory cache singleton
export const globalCache = new SpatialTemporalCache(500);
