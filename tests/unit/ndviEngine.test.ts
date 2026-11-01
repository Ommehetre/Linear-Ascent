// =============================================================================
// Tests: Real NDVI Computation with SCL Cloud Masking
// Verifies windowed raster math, SCL masking, and < 40% clear fraction cutoff
// =============================================================================

import test from "node:test";
import assert from "node:assert";
import {
  computeNdviStatsFromRasters,
  wgs84ToUtm,
  SCL_CLEAR_CLASSES,
} from "../../services/liveIngestion/ndviEngine.ts";

test("wgs84ToUtm: Projects Nagpur WGS84 coordinates to UTM Zone 44", () => {
  // Nagpur, India: lon 79.0882, lat 21.1458
  const { easting, northing, zone } = wgs84ToUtm(79.0882, 21.1458);

  assert.strictEqual(zone, 44);
  // Verify reasonable UTM bounding bounds for Central India
  assert.ok(easting > 200000 && easting < 400000, `Easting ${easting} out of expected range`);
  assert.ok(northing > 2000000 && northing < 2500000, `Northing ${northing} out of expected range`);
});

test("computeNdviStatsFromRasters: Computes accurate NDVI per pixel: (B08 - B04)/(B08 + B04)", () => {
  // 4 pixels:
  // Pixel 0: B04 = 500, B08 = 2500 -> NDVI = (2500 - 500)/(3000) = 2000/3000 = 0.6667 (dense canopy)
  // Pixel 1: B04 = 800, B08 = 1600 -> NDVI = (1600 - 800)/(2400) = 800/2400 = 0.3333 (moderate canopy)
  // Pixel 2: B04 = 1000, B08 = 1200 -> NDVI = (1200 - 1000)/(2200) = 200/2200 = 0.0909 (soil/dry)
  // Pixel 3: B04 = 600, B08 = 2400 -> NDVI = (2400 - 600)/(3000) = 1800/3000 = 0.6000
  const b04 = [500, 800, 1000, 600];
  const b08 = [2500, 1600, 1200, 2400];
  const scl = [4, 4, 5, 4]; // All valid vegetation/soil classes

  const stats = computeNdviStatsFromRasters({
    b04,
    b08,
    scl,
    rasterWidth: 2,
    rasterHeight: 2,
    acquisitionDate: "2026-10-15T05:30:00Z",
    cloudCoverPct: 5.0,
    baselineNdvi: 0.40,
  });

  assert.strictEqual(stats.status, "valid");
  assert.strictEqual(stats.validPixelFraction, 1.0); // 4/4 valid
  // Mean = (0.6667 + 0.3333 + 0.0909 + 0.6000)/4 = 1.6909 / 4 = 0.4227
  assert.ok(Math.abs(stats.mean - 0.4227) < 0.002, `Mean ${stats.mean} did not match expected`);
  assert.ok(stats.p10 <= stats.median && stats.median <= stats.p90, "Percentile ordering failed");
  assert.ok(stats.ndviAnomaly != null);
  assert.ok(Math.abs(stats.ndviAnomaly - (stats.mean - 0.40)) < 0.001);
});

test("computeNdviStatsFromRasters: Correctly masks clouds, cloud shadows, and snow using SCL band", () => {
  // 10 pixels total:
  // 4 clear pixels (SCL 4 or 5)
  // 6 masked pixels: SCL 8 (medium cloud), SCL 9 (high cloud), SCL 3 (cloud shadow), SCL 11 (snow), SCL 0 (no data), SCL 1 (defective)
  const b04 = [500, 500, 500, 500, 3000, 3000, 400, 4000, 0, 500];
  const b08 = [2000, 2000, 2000, 2000, 3500, 3500, 500, 4200, 0, 500];
  const scl = [4, 4, 5, 4, 8, 9, 3, 11, 0, 1]; // Only first 4 are clear

  const stats = computeNdviStatsFromRasters({
    b04,
    b08,
    scl,
    rasterWidth: 5,
    rasterHeight: 2,
    acquisitionDate: "2026-10-20T05:30:00Z",
    cloudCoverPct: 60.0,
  });

  // 4 clear pixels out of 10 = 0.40 (40%), which meets the 40% cutoff
  assert.strictEqual(stats.validPixelFraction, 0.40);
  assert.strictEqual(stats.status, "valid");
  // NDVI of first 4 pixels is: (2000 - 500) / 2500 = 1500 / 2500 = 0.60
  assert.ok(Math.abs(stats.mean - 0.60) < 0.001);
});

test("computeNdviStatsFromRasters: Returns 'insufficient clear imagery' when valid pixels < 40%", () => {
  // 10 pixels total, but only 3 are clear (30% < 40%)
  const b04 = [500, 500, 500, 500, 3000, 3000, 400, 4000, 0, 500];
  const b08 = [2000, 2000, 2000, 2000, 3500, 3500, 500, 4200, 0, 500];
  const scl = [4, 4, 5, 8, 8, 9, 3, 11, 0, 1]; // 3 clear, 7 cloudy/shadowed

  const stats = computeNdviStatsFromRasters({
    b04,
    b08,
    scl,
    rasterWidth: 5,
    rasterHeight: 2,
    acquisitionDate: "2026-10-22T05:30:00Z",
    cloudCoverPct: 70.0,
  });

  assert.strictEqual(stats.status, "insufficient_clear_imagery");
  assert.strictEqual(stats.validPixelFraction, 0.30);
  assert.ok(stats.message?.includes("insufficient clear imagery"));
  assert.strictEqual(stats.mean, 0); // No fabricated number reported
});
