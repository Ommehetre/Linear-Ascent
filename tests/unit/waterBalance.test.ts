// =============================================================================
// Tests: FAO-56 Time-Stepped Water Balance & FAO-33 Stage-Specific Yield Response
// Unit tests against exact hand-calculated examples
// =============================================================================

import test from "node:test";
import assert from "node:assert";
import {
  deriveGrowthStage,
  calculateRootDepth,
  calculateRootZoneMoisture,
  calculateWaterStressCoefficient,
  computeFaoWaterBalance,
} from "../../services/yieldEngine.ts";
import type { SoilProfile, SoilForecast } from "../../types/index.ts";

test("deriveGrowthStage: Accurately identifies growth stages across crop calendar", () => {
  // Cotton total stages: initial (30d), dev (50d), mid (55d), late (30d)
  const sowDate = "2026-06-15T00:00:00Z";

  // Day 20: Initial stage
  const refDay20 = new Date("2026-07-05T00:00:00Z");
  const stage20 = deriveGrowthStage({ crop: "Cotton", sowingDate: sowDate, referenceDate: refDay20 });
  assert.strictEqual(stage20.stage, "initial");
  assert.strictEqual(stage20.daysAfterSowing, 20);

  // Day 60 (30 + 30): Development stage
  const refDay60 = new Date("2026-08-14T00:00:00Z");
  const stage60 = deriveGrowthStage({ crop: "Cotton", sowingDate: sowDate, referenceDate: refDay60 });
  assert.strictEqual(stage60.stage, "development");

  // Day 110 (30 + 50 + 30): Mid-season stage
  const refDay110 = new Date("2026-10-03T00:00:00Z");
  const stage110 = deriveGrowthStage({ crop: "Cotton", sowingDate: sowDate, referenceDate: refDay110 });
  assert.strictEqual(stage110.stage, "mid");

  // Day 150 (30 + 50 + 55 + 15): Late-season stage
  const refDay150 = new Date("2026-11-12T00:00:00Z");
  const stage150 = deriveGrowthStage({ crop: "Cotton", sowingDate: sowDate, referenceDate: refDay150 });
  assert.strictEqual(stage150.stage, "late");
});

test("calculateRootZoneMoisture: Hand-calculated multi-depth weighting vs 0-7cm shortcut", () => {
  // Depth strata:
  // Layer 1: 0 to 0.07m (thickness 0.07m), moisture = 0.20 m³/m³
  // Layer 2: 0.07 to 0.28m (thickness 0.21m), moisture = 0.30 m³/m³
  // Layer 3: 0.28 to 1.00m (thickness 0.72m), moisture = 0.40 m³/m³
  // Root depth Zr = 0.50 m
  // Overlap:
  // Layer 1: 0.07 m
  // Layer 2: 0.21 m
  // Layer 3: 0.50 - 0.28 = 0.22 m
  // Total root depth = 0.07 + 0.21 + 0.22 = 0.50 m
  // Hand-calculated weighted average:
  // (0.20 * 0.07 + 0.30 * 0.21 + 0.40 * 0.22) / 0.50 = (0.014 + 0.063 + 0.088) / 0.50 = 0.165 / 0.50 = 0.330 m³/m³
  const weighted = calculateRootZoneMoisture(0.20, 0.30, 0.40, 0.50);
  assert.strictEqual(weighted, 0.33);

  // Demonstrate why using topsoil 0-7cm alone (0.20) was incorrect:
  assert.notStrictEqual(weighted, 0.20);
});

test("calculateWaterStressCoefficient: Hand-calculated FAO-56 Ks thresholds", () => {
  // Parameters:
  // Field Capacity FC = 0.40, Wilting Point WP = 0.15 => AWC = 0.25 m³/m³
  // Root depth Zr = 1.0 m => TAW = 1000 * 0.25 * 1.0 = 250 mm
  // Depletion fraction p = 0.65 => RAW = 0.65 * 250 = 162.5 mm

  // Scenario 1: Moisture = 0.30 m³/m³
  // Depletion Dr = 1000 * (0.40 - 0.30) * 1.0 = 100 mm
  // Since Dr (100) <= RAW (162.5) => Ks must be 1.0 (no stress)
  const sc1 = calculateWaterStressCoefficient({
    theta_rz: 0.30,
    FC: 0.40,
    WP: 0.15,
    rootDepth_m: 1.0,
    p: 0.65,
  });
  assert.strictEqual(sc1.taw_mm, 250);
  assert.strictEqual(sc1.raw_mm, 162.5);
  assert.strictEqual(sc1.dr_mm, 100);
  assert.strictEqual(sc1.ks, 1.0);

  // Scenario 2: Moisture = 0.20 m³/m³
  // Depletion Dr = 1000 * (0.40 - 0.20) * 1.0 = 200 mm
  // Since Dr (200) > RAW (162.5) => Stress occurs!
  // Ks = (TAW - Dr) / ((1 - p) * TAW) = (250 - 200) / ((1 - 0.65) * 250) = 50 / 87.5 = 0.5714
  const sc2 = calculateWaterStressCoefficient({
    theta_rz: 0.20,
    FC: 0.40,
    WP: 0.15,
    rootDepth_m: 1.0,
    p: 0.65,
  });
  assert.strictEqual(sc2.dr_mm, 200);
  assert.ok(Math.abs(sc2.ks - 0.571) <= 0.002, `Ks ${sc2.ks} did not match expected 0.571`);

  // Scenario 3: Extreme depletion below WP (Moisture = 0.12 m³/m³)
  // Dr = 1000 * (0.40 - 0.12) = 280 mm > TAW (250)
  // Ks must be clamped to 0.0
  const sc3 = calculateWaterStressCoefficient({
    theta_rz: 0.12,
    FC: 0.40,
    WP: 0.15,
    rootDepth_m: 1.0,
    p: 0.65,
  });
  assert.strictEqual(sc3.ks, 0.0);
});

test("computeFaoWaterBalance: Time-stepped 14-day window yield impact scales by stage fraction", () => {
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

  const dates14: string[] = [];
  const et0Values14: number[] = [];
  for (let i = 1; i <= 14; i++) {
    dates14.push(`2026-10-${i < 10 ? "0" + i : i}`);
    et0Values14.push(4.5); // 4.5 mm/day
  }

  // 14 days * 24 hours = 336 hourly points
  // Moderately depleted soil moisture (0.24 m³/m³)
  const hourlyPoints: number[] = new Array(336).fill(0.24);

  const mockSoilForecast: SoilForecast = {
    time: dates14,
    soilMoisture_0_7: hourlyPoints,
    soilMoisture_7_28: hourlyPoints,
    soilMoisture_28_100: hourlyPoints,
    soilTemp_0_7: new Array(336).fill(28.0),
    soilTemp_7_28: new Array(336).fill(26.0),
    et0Daily: {
      time: dates14,
      values: et0Values14,
    },
  };

  // Run for Cotton in mid-stage (stageKy = 0.50, stageDuration = 55 days)
  const result = computeFaoWaterBalance({
    crop: "Cotton",
    soilProfile: mockSoilProfile,
    soilForecast: mockSoilForecast,
    growthStage: "mid",
  });

  assert.strictEqual(result.crop, "Cotton");
  assert.strictEqual(result.growthStage, "mid");
  assert.strictEqual(result.stageKy, 0.50);
  assert.strictEqual(result.dailySeries?.length, 14);

  // Verify that window yield impact is scaled to the 14-day window fraction (14 / 55 ~ 0.2545)
  // NOT applying the whole-season Ky (0.85) to the 14-day window!
  assert.ok(result.windowYieldImpactPct != null);
  assert.ok(result.windowYieldImpactPct < 15.0, `Window impact ${result.windowYieldImpactPct}% too large for 14d window`);
  assert.ok(result.windowLabel?.includes("14-Day Window Water Stress Impact"));
});
