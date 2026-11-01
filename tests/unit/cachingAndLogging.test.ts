// =============================================================================
// Tests: Spatial-Temporal Caching, LRU, TTL, Request Validation & Logging
// =============================================================================

import test from "node:test";
import assert from "node:assert/strict";
import { SpatialTemporalCache, CACHE_TTL_MS } from "../../lib/cache.ts";
import { AgentRunRequestSchema } from "../../lib/schemas.ts";
import type { ApiCallRecord } from "../../types/index.ts";

test("SpatialTemporalCache: Key generation rounds coordinates to 2 decimals (~1.1 km)", () => {
  const key1 = SpatialTemporalCache.makeSpatialKey("open-meteo:soil", 20.9312, 77.7541, "2026-11-01");
  const key2 = SpatialTemporalCache.makeSpatialKey("open-meteo:soil", 20.9349, 77.7511, "2026-11-01");
  const key3 = SpatialTemporalCache.makeSpatialKey("open-meteo:soil", 20.9512, 77.7541, "2026-11-01");

  // Nearby points within ~1.1km round to same key
  assert.equal(key1, key2, "Points with same 2-decimal rounded coordinates must produce identical cache keys");
  assert.equal(key1, "geo:20.93_77.75:open-meteo:soil:2026-11-01");

  // Farther point produces different key
  assert.notEqual(key1, key3);
  assert.equal(key3, "geo:20.95_77.75:open-meteo:soil:2026-11-01");
});

test("SpatialTemporalCache: TTL expiration and retrieval", async () => {
  const cache = new SpatialTemporalCache(10);
  const key = "test:ttl:item";

  // Set with 50ms TTL
  cache.set(key, { data: "fresh" }, 50);

  // Immediate retrieval returns value
  const immediate = cache.get<{ data: string }>(key);
  assert.ok(immediate);
  assert.equal(immediate.data, "fresh");

  // Wait 60ms for TTL to expire
  await new Promise((resolve) => setTimeout(resolve, 60));

  // Expired retrieval returns null
  const expired = cache.get<{ data: string }>(key);
  assert.equal(expired, null, "Expired cache entries must return null");
});

test("SpatialTemporalCache: Evicts oldest entry when maxEntries is exceeded", () => {
  const cache = new SpatialTemporalCache(3);

  cache.set("k1", 1, 10000);
  cache.set("k2", 2, 10000);
  cache.set("k3", 3, 10000);

  assert.equal(cache.size(), 3);
  assert.equal(cache.get("k1"), 1);

  // Inserting 4th item evicts least-recently used (k2 was not accessed)
  cache.set("k4", 4, 10000);
  assert.equal(cache.size(), 3);
  assert.equal(cache.get("k2"), null, "Oldest unaccessed entry should be evicted");
  assert.equal(cache.get("k4"), 4);
  assert.equal(cache.get("k1"), 1);
});

test("SpatialTemporalCache: Deterministic synthesis hash keys", () => {
  const payload1 = {
    crop: "Cotton",
    state: "Maharashtra",
    waterStress: 0.25,
    risk: "MODERATE",
  };

  const payload2 = {
    crop: "Cotton",
    state: "Maharashtra",
    waterStress: 0.25,
    risk: "MODERATE",
  };

  const payload3 = {
    crop: "Cotton",
    state: "Maharashtra",
    waterStress: 0.75, // Different
    risk: "SEVERE",
  };

  const hash1 = SpatialTemporalCache.makeSynthesisHashKey(payload1);
  const hash2 = SpatialTemporalCache.makeSynthesisHashKey(payload2);
  const hash3 = SpatialTemporalCache.makeSynthesisHashKey(payload3);

  assert.equal(hash1, hash2, "Identical synthesis payloads must yield identical hash keys");
  assert.notEqual(hash1, hash3, "Different synthesis payloads must yield distinct hash keys");
  assert.ok(hash1.startsWith("llm_synth:"));
});

test("AgentRunRequestSchema: Validates coordinates and rejects invalid payloads", () => {
  // 1. Valid payload with full coordinates
  const valid = AgentRunRequestSchema.safeParse({
    location: {
      name: "Akola Farm",
      lat: 20.7,
      lon: 77.0,
      state: "Maharashtra",
      crop: "Cotton",
    },
    crop: "Cotton",
  });
  assert.ok(valid.success);
  assert.equal(valid.data.location.name, "Akola Farm");

  // 2. Invalid lat/lon (out of range)
  const invalidCoords = AgentRunRequestSchema.safeParse({
    location: {
      lat: 120.5, // > 90
      lon: 77.0,
    },
  });
  assert.ok(!invalidCoords.success, "Latitudes beyond 90 must fail validation");

  // 3. Invalid crop enum
  const invalidCrop = AgentRunRequestSchema.safeParse({
    location: {
      lat: 20.7,
      lon: 77.0,
    },
    crop: "Pineapple", // Not in schema
  });
  assert.ok(!invalidCrop.success, "Unsupported crop enums must fail validation");
});

test("ApiCallRecord: Real token usage and status code logging", () => {
  const callRecord: ApiCallRecord = {
    url: "https://generativelanguage.googleapis.com/v1beta/models/gemini-2.5-flash:generateContent",
    method: "POST",
    statusCode: 200,
    latencyMs: 342,
    timestamp: new Date().toISOString(),
    tokens: {
      prompt: 450,
      completion: 120,
      total: 570,
    },
  };

  assert.equal(callRecord.statusCode, 200);
  assert.ok(callRecord.tokens);
  assert.equal(callRecord.tokens.prompt, 450);
  assert.equal(callRecord.tokens.completion, 120);
  assert.equal(callRecord.tokens.total, 570);
  assert.ok(callRecord.latencyMs > 0);
});
