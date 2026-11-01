// =============================================================================
// Tests: Agentic Pipeline, Tool Validation & Self-Healing Classification
// =============================================================================

import test from "node:test";
import assert from "node:assert";
import { classifyFailure } from "../../services/agent/failureClassifier.ts";
import {
  GetWeatherForecastInputSchema,
  GetSoilMoistureInputSchema,
  ComputeNdviInputSchema,
  GetCropStageInputSchema,
  ComputeWaterBalanceInputSchema,
} from "../../services/agent/tools.ts";

test("classifyFailure: Accurately categorizes errors for self-healing decision engine", () => {
  // 1. Rate limits (HTTP 429 / quota)
  assert.strictEqual(classifyFailure({ status: 429, message: "Resource exhausted" }), "RATE_LIMIT");
  assert.strictEqual(classifyFailure(new Error("Rate limit exceeded for quota group")), "RATE_LIMIT");

  // 2. Network / timeout errors
  assert.strictEqual(classifyFailure({ status: 503, message: "Service Unavailable" }), "NETWORK_ERROR");
  assert.strictEqual(classifyFailure(new Error("fetch failed: ECONNREFUSED 127.0.0.1")), "NETWORK_ERROR");
  assert.strictEqual(classifyFailure(new Error("The operation was aborted due to timeout")), "NETWORK_ERROR");

  // 3. Schema validation errors
  assert.strictEqual(classifyFailure(new Error("ZodError: Invalid enum value at 'risk_level'")), "SCHEMA_VIOLATION");
  assert.strictEqual(classifyFailure(new Error("Schema validation failure")), "SCHEMA_VIOLATION");

  // 4. Missing data / offline streams
  assert.strictEqual(classifyFailure(new Error("Sentinel-2 STAC asset offline")), "MISSING_DATA");
  assert.strictEqual(classifyFailure(new Error("Record not found in database")), "MISSING_DATA");
});

test("Agent Tools: Validates input schemas and rejects invalid coordinates and parameters", () => {
  // Weather Forecast
  assert.ok(GetWeatherForecastInputSchema.safeParse({ lat: 21.1458, lon: 79.0882 }).success);
  assert.strictEqual(GetWeatherForecastInputSchema.safeParse({ lat: 999, lon: 79.0882 }).success, false);

  // Soil Moisture
  assert.ok(GetSoilMoistureInputSchema.safeParse({ lat: 19.8762, lon: 75.3433 }).success);
  assert.strictEqual(GetSoilMoistureInputSchema.safeParse({ lat: "invalid", lon: 75.3433 }).success, false);

  // Compute NDVI Bbox
  assert.ok(ComputeNdviInputSchema.safeParse({ bbox: [78.9, 21.0, 79.3, 21.3] }).success);
  assert.strictEqual(ComputeNdviInputSchema.safeParse({ bbox: [78.9, 21.0] }).success, false);

  // Crop Stage
  assert.ok(GetCropStageInputSchema.safeParse({ crop: "Cotton", state: "Maharashtra" }).success);
  assert.strictEqual(GetCropStageInputSchema.safeParse({ crop: "Avocado" }).success, false);

  // Water Balance
  assert.ok(ComputeWaterBalanceInputSchema.safeParse({ crop: "Soybean", growthStage: "mid" }).success);
  assert.strictEqual(ComputeWaterBalanceInputSchema.safeParse({ crop: "Soybean", growthStage: "dormant" }).success, false);
});
