// =============================================================================
// Tests: Monte Carlo Parameter Sensitivity Analysis & Confidence Scoring
// =============================================================================

import test from "node:test";
import assert from "node:assert";
import { runWaterBalanceMonteCarlo } from "../../services/monteCarlo.ts";
import type { SoilProfile, SoilForecast } from "../../types/index.ts";

test("runWaterBalanceMonteCarlo: Generates ordered percentiles (p10 <= p50 <= p90)", () => {
  const mockSoilProfile: SoilProfile = {
    clay_pct: 42,
    sand_pct: 28,
    silt_pct: 30,
    ph: 7.9,
    soc_g_per_kg: 8.8,
    bulk_density_g_cm3: 1.28,
    fieldCapacity: 0.38,
    wiltingPoint: 0.18,
    availableWaterCapacity: 0.20,
  };

  const dates = Array.from({ length: 14 }, (_, i) => `2026-10-${i + 1 < 10 ? "0" + (i + 1) : i + 1}`);
  const hourly = new Array(336).fill(0.25);

  const mockSoilForecast: SoilForecast = {
    time: dates,
    soilMoisture_0_7: hourly,
    soilMoisture_7_28: hourly,
    soilMoisture_28_100: hourly,
    soilTemp_0_7: new Array(336).fill(28.0),
    soilTemp_7_28: new Array(336).fill(26.0),
    et0Daily: {
      time: dates,
      values: new Array(14).fill(4.5),
    },
  };

  const result = runWaterBalanceMonteCarlo({
    crop: "Cotton",
    growthStage: "mid",
    soilProfile: mockSoilProfile,
    soilForecast: mockSoilForecast,
    ndviClearFraction: 0.85,
    liveStreamsFraction: 1.0,
    simulationsCount: 50,
  });

  // Verify simulations completed
  assert.strictEqual(result.simulationsCount, 50);

  // Verify strict percentile ordering: p10 <= p50 <= p90
  assert.ok(
    result.waterStressIndex.p10 <= result.waterStressIndex.p50,
    `p10 (${result.waterStressIndex.p10}) > p50 (${result.waterStressIndex.p50})`
  );
  assert.ok(
    result.waterStressIndex.p50 <= result.waterStressIndex.p90,
    `p50 (${result.waterStressIndex.p50}) > p90 (${result.waterStressIndex.p90})`
  );

  assert.ok(
    result.windowYieldImpactPct.p10 <= result.windowYieldImpactPct.p50,
    `Impact p10 (${result.windowYieldImpactPct.p10}) > p50 (${result.windowYieldImpactPct.p50})`
  );
  assert.ok(
    result.windowYieldImpactPct.p50 <= result.windowYieldImpactPct.p90,
    `Impact p50 (${result.windowYieldImpactPct.p50}) > p90 (${result.windowYieldImpactPct.p90})`
  );

  // Confidence verification
  assert.strictEqual(result.confidence.level, "high"); // 100% streams + 85% clear NDVI
  assert.ok(result.confidence.score >= 0.75);
});

test("runWaterBalanceMonteCarlo: Lowers confidence when optical data is obstructed by clouds", () => {
  const mockSoilProfile: SoilProfile = {
    clay_pct: 42,
    sand_pct: 28,
    silt_pct: 30,
    ph: 7.9,
    soc_g_per_kg: 8.8,
    bulk_density_g_cm3: 1.28,
    fieldCapacity: 0.38,
    wiltingPoint: 0.18,
    availableWaterCapacity: 0.20,
  };

  const dates = Array.from({ length: 14 }, (_, i) => `2026-10-${i + 1 < 10 ? "0" + (i + 1) : i + 1}`);
  const mockSoilForecast: SoilForecast = {
    time: dates,
    soilMoisture_0_7: new Array(336).fill(0.25),
    soilMoisture_7_28: new Array(336).fill(0.25),
    soilMoisture_28_100: new Array(336).fill(0.25),
    soilTemp_0_7: new Array(336).fill(28.0),
    soilTemp_7_28: new Array(336).fill(26.0),
    et0Daily: {
      time: dates,
      values: new Array(14).fill(4.5),
    },
  };

  // NDVI clear fraction = 0.20 (< 40% threshold), 2 streams offline (0.60 live streams)
  const result = runWaterBalanceMonteCarlo({
    crop: "Soybean",
    soilProfile: mockSoilProfile,
    soilForecast: mockSoilForecast,
    ndviClearFraction: 0.20,
    liveStreamsFraction: 0.60,
    simulationsCount: 20,
  });

  assert.ok(result.confidence.score < 0.60);
  assert.ok(result.confidence.rationale.some((r) => r.includes("Cloud obstruction penalty")));
});
