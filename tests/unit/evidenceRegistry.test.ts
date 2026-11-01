// =============================================================================
// Tests: Evidence Registry & Citation Verification Engine
// =============================================================================

import test from "node:test";
import assert from "node:assert";
import { EvidenceRegistry } from "../../lib/evidenceRegistry.ts";

test("EvidenceRegistry: Assigns sequential IDs and stores metrics with real timestamps", () => {
  const registry = new EvidenceRegistry();
  const ts = "2026-11-01T08:30:00.000Z";

  const item1 = registry.register({
    source: "Open-Meteo ERA5",
    metric: "14-Day Forecast Rainfall",
    value: 18.5,
    unit: "mm",
    fetchedAt: ts,
    description: "Total rainfall over 14 days",
  });

  const item2 = registry.register({
    source: "ISRIC SoilGrids v2",
    metric: "Field Capacity",
    value: 0.385,
    unit: "m³/m³",
    fetchedAt: ts,
    description: "Upper limit of plant available water",
  });

  assert.strictEqual(item1.id, "E1");
  assert.strictEqual(item2.id, "E2");
  assert.strictEqual(registry.getAll().length, 2);
  assert.strictEqual(registry.get("E1")?.value, 18.5);
});

test("EvidenceRegistry: Verifies valid citations and rejects hallucinated citation IDs", () => {
  const registry = new EvidenceRegistry();
  registry.register({
    source: "Open-Meteo ERA5",
    metric: "Rainfall",
    value: 20,
    unit: "mm",
    description: "Rain",
  }); // E1

  registry.register({
    source: "FAO-56 Engine",
    metric: "Water Stress Index",
    value: 0.28,
    description: "Stress",
  }); // E2

  // Text citing valid E1 and E2
  const validText = "The farm forecast shows 20 mm rainfall [E1] with water stress index of 0.28 [E2].";
  const validRes = registry.verifyCitations(validText);
  assert.strictEqual(validRes.isFullyGrounded, true);
  assert.strictEqual(validRes.validCitations.length, 2);
  assert.strictEqual(validRes.invalidIds.length, 0);

  // Text citing hallucinated E99 and E40
  const invalidText = "Transpiration is severely reduced [E99] with yield decline of 45% [E40].";
  const invalidRes = registry.verifyCitations(invalidText);
  assert.strictEqual(invalidRes.isFullyGrounded, false);
  assert.strictEqual(invalidRes.invalidIds.length, 2);
  assert.ok(invalidRes.invalidIds.includes("E99"));
  assert.ok(invalidRes.invalidIds.includes("E40"));
});
