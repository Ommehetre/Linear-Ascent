// =============================================================================
// Tests: Deterministic Risk Engine & Structured Schema Parser
// Verifies misleading prose handling, threshold triggers, and schema validation
// =============================================================================

import test from "node:test";
import assert from "node:assert";
import { computeDeterministicRisk, RISK_THRESHOLDS } from "../../lib/config/riskThresholds.ts";
import { GeminiRiskSynthesisSchema } from "../../lib/schemas.ts";

test("Deterministic Risk Engine: Correctly classifies SEVERE from physical water stress", () => {
  const severeResult = computeDeterministicRisk({
    waterStressIndex: 0.50, // > 0.45 threshold
    windowYieldImpactPct: 28.0, // > 25.0% threshold
    smdi: -0.70, // <= -0.65 threshold
    maxTemp_c: 36.0,
  });

  assert.strictEqual(severeResult.risk_level, "SEVERE");
  assert.strictEqual(severeResult.risk_category, "Severe Root-Zone Drought");
  assert.ok(severeResult.risk_basis.length >= 3);
  assert.ok(severeResult.risk_basis.some((b) => b.includes("exceeds severe threshold")));
});

test("Deterministic Risk Engine: Correctly classifies HIGH from heatwave and transpiration stress", () => {
  const highResult = computeDeterministicRisk({
    waterStressIndex: 0.28, // > 0.25 threshold
    windowYieldImpactPct: 14.5, // > 12.0% threshold
    smdi: -0.45,
    maxTemp_c: 41.5, // >= 41.0°C heatwave threshold
  });

  assert.strictEqual(highResult.risk_level, "HIGH");
  assert.strictEqual(highResult.risk_category, "Heatwave Terminal Stress");
  assert.ok(highResult.risk_basis.some((b) => b.includes("heat stress threshold")));
});

test("Deterministic Risk Engine: Correctly classifies MODERATE from mild deficit & negative NDVI anomaly", () => {
  const modResult = computeDeterministicRisk({
    waterStressIndex: 0.14, // > 0.10 threshold
    windowYieldImpactPct: 6.5, // > 5.0% threshold
    smdi: -0.25,
    ndviAnomaly: -0.09, // <= -0.07 threshold
  });

  assert.strictEqual(modResult.risk_level, "MODERATE");
  assert.strictEqual(modResult.risk_category, "Moderate Soil Moisture Deficit");
  assert.ok(modResult.risk_basis.some((b) => b.includes("NDVI spectral anomaly")));
});

test("Deterministic Risk Engine: Correctly classifies LOW when all metrics are within safe bounds", () => {
  const lowResult = computeDeterministicRisk({
    waterStressIndex: 0.02,
    windowYieldImpactPct: 1.0,
    smdi: 0.10,
    ndviAnomaly: 0.04,
    maxTemp_c: 32.0,
    monsoonLpaDeviationPct: 5.0,
  });

  assert.strictEqual(lowResult.risk_level, "LOW");
  assert.strictEqual(lowResult.risk_category, "Normal / Low Risk");
  assert.ok(lowResult.risk_basis[0].includes("within safe agronomic limits"));
});

test("Deterministic Risk Engine: Returns UNKNOWN when no telemetry metrics are provided", () => {
  const unknownResult = computeDeterministicRisk({});
  assert.strictEqual(unknownResult.risk_level, "UNKNOWN");
  assert.strictEqual(unknownResult.risk_category, "Insufficient Live Telemetry");
});

test("Misleading Prose Tests: Verify parser does not get tricked by misleading words in prose", () => {
  // Case A: Prose contains "severe" in a historical/counterfactual context, but actual level is LOW
  const misleadingProseA = {
    risk_level: "LOW",
    risk_category: "Normal / Low Risk",
    risk_basis: ["Soil moisture at field capacity"],
    synthesis:
      "We previously monitored severe drought risks in 2024, but current root-zone moisture is optimal and high yields are anticipated. Even if severe heat occurs later, risk today is low.",
  };

  const parsedA = GeminiRiskSynthesisSchema.safeParse(misleadingProseA);
  assert.ok(parsedA.success);
  assert.strictEqual(parsedA.data.risk_level, "LOW");
  // Ensure we don't accidentally detect 'severe' from text
  assert.notStrictEqual(parsedA.data.risk_level, "SEVERE");

  // Case B: Prose mentions "low" multiple times, but actual level is SEVERE
  const misleadingProseB = {
    risk_level: "SEVERE",
    risk_category: "Severe Root-Zone Drought",
    risk_basis: ["Root-zone desiccation below permanent wilting point"],
    synthesis:
      "The farm has exceptionally low soil water reserves. Low rainfall over the past 40 days has pushed transpiration down to low levels, creating a severe crisis.",
  };

  const parsedB = GeminiRiskSynthesisSchema.safeParse(misleadingProseB);
  assert.ok(parsedB.success);
  assert.strictEqual(parsedB.data.risk_level, "SEVERE");
  assert.notStrictEqual(parsedB.data.risk_level, "LOW");

  // Case C: Prose contains "high" multiple times, but actual level is MODERATE
  const misleadingProseC = {
    risk_level: "MODERATE",
    risk_category: "Moderate Soil Moisture Deficit",
    risk_basis: ["Transpiration deficit ratio of 14%"],
    synthesis:
      "High solar radiation is driving high potential evapotranspiration, but the crop's deep root zone maintains moderate moisture uptake.",
  };

  const parsedC = GeminiRiskSynthesisSchema.safeParse(misleadingProseC);
  assert.ok(parsedC.success);
  assert.strictEqual(parsedC.data.risk_level, "MODERATE");
  assert.notStrictEqual(parsedC.data.risk_level, "HIGH");
});

test("Schema Validation: Rejects invalid risk level enums and malformed JSON", () => {
  const invalidPayload = {
    risk_level: "EXTREME_CATASTROPHE", // Not in enum
    risk_category: "Custom Category",
    synthesis: "Valid text describing conditions",
  };

  const parsed = GeminiRiskSynthesisSchema.safeParse(invalidPayload);
  assert.strictEqual(parsed.success, false);
});
