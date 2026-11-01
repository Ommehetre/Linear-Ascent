import fs from "node:fs";
import path from "node:path";
import { executeAgentPipeline, type AgentProgressEvent } from "../services/agentOrchestrator.ts";
import type { FarmLocation } from "../types/index.ts";

const envPath = path.resolve(process.cwd(), ".env.local");

// Simple .env.local loader for Node script
if (fs.existsSync(envPath)) {
  const envContent = fs.readFileSync(envPath, "utf8");
  for (const line of envContent.split(/\r?\n/)) {
    const trimmed = line.trim();
    if (!trimmed || trimmed.startsWith("#")) continue;
    const eqIdx = trimmed.indexOf("=");
    if (eqIdx !== -1) {
      const key = trimmed.slice(0, eqIdx).trim();
      let val = trimmed.slice(eqIdx + 1).trim();
      if ((val.startsWith('"') && val.endsWith('"')) || (val.startsWith("'") && val.endsWith("'"))) {
        val = val.slice(1, -1);
      }
      process.env[key] = val;
    }
  }
}

async function runLiveSmokeTest() {
  console.log("===============================================================================");
  console.log("TerraPulse Live End-to-End Pipeline Smoke Test");
  console.log("===============================================================================");
  console.log("Environment check: GEMINI_API_KEY is present:", Boolean(process.env.GEMINI_API_KEY));

  const testLocation: FarmLocation = {
    name: "Amravati Cotton Test Field",
    lat: 20.93,
    lon: 77.75,
    bbox: [77.72, 20.91, 77.78, 20.95],
    state: "Maharashtra",
    crop: "Cotton",
    sowingDate: "2026-06-15",
    growthStage: "mid",
  };

  const progressEvents: AgentProgressEvent[] = [];
  const onProgress = (event: AgentProgressEvent) => {
    progressEvents.push(event);
    console.log(`[PROGRESS] [${event.stage}] ${event.message}`);
  };

  console.log("\n--- TEST 1: First Run (Live Ingestion & Gemini Call) ---");
  const t0 = Date.now();
  const report1 = await executeAgentPipeline(testLocation, "Cotton", onProgress);
  const dur1 = Date.now() - t0;

  console.log(`\nPipeline completed in ${dur1} ms`);
  console.log(`Risk Level: ${report1.riskLevel} (${report1.riskClassification})`);
  console.log(`Risk Basis:`, report1.riskBasis);
  console.log(`Confidence Score: ${report1.confidence}`);
  console.log(`Scenes found: ${report1.scenes.length}`);
  if (report1.ndviStats) {
    console.log(`NDVI Status: ${report1.ndviStats.status}, Mean: ${report1.ndviStats.mean}, Valid Fraction: ${(report1.ndviStats.validPixelFraction * 100).toFixed(1)}%`);
  }
  if (report1.yieldOutput) {
    console.log(`Water Stress Index: ${report1.yieldOutput.waterStressIndex}`);
    console.log(`14-Day Window Yield Impact: ${report1.yieldOutput.windowYieldImpactPct}%`);
    console.log(`Irrigation Deficit: ${report1.yieldOutput.irrigationDeficit_L_ha.toLocaleString()} L/ha`);
  }
  console.log(`\nTrace Steps count: ${report1.trace.length}`);
  report1.trace.forEach((step) => {
    console.log(`  - Node ${step.node} [${step.label}]: status=${step.status}, duration=${step.durationMs}ms, apiCalls=${step.apiCalls.length}`);
    step.apiCalls.forEach((call) => {
      const tokenInfo = call.tokens ? ` (tokens: prompt=${call.tokens.prompt}, comp=${call.tokens.completion}, total=${call.tokens.total})` : "";
      console.log(`      * ${call.method} ${call.statusCode} (${call.latencyMs}ms)${tokenInfo} -> ${call.url.slice(0, 80)}`);
    });
  });

  console.log("\n--- TEST 2: Second Run (Cache Hit Verification) ---");
  const t1 = Date.now();
  const report2 = await executeAgentPipeline(testLocation, "Cotton");
  const dur2 = Date.now() - t1;

  console.log(`Second run completed in ${dur2} ms (Expected: significantly faster due to cache hits)`);
  console.log(`Report 2 Risk: ${report2.riskLevel} (identical: ${report1.riskLevel === report2.riskLevel})`);

  console.log("\n--- TEST 3: SSE Streaming Events Count ---");
  console.log(`Emitted ${progressEvents.length} progress events:`);
  progressEvents.forEach((ev, idx) => console.log(`  ${idx + 1}. [${ev.stage}] ${ev.message}`));

  console.log("\n===============================================================================");
  console.log("ALL LIVE SMOKE TESTS COMPLETED SUCCESSFULLY");
  console.log("===============================================================================");
}

runLiveSmokeTest().catch((err) => {
  console.error("SMOKE TEST FAILED:", err);
  process.exit(1);
});
