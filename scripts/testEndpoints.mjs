// Comprehensive Automated End-to-End Test Suite for TerraPulse
import { spawn } from "child_process";

async function wait(ms) {
  return new Promise((resolve) => setTimeout(resolve, ms));
}

async function run() {
  console.log("Starting Next.js production server on 127.0.0.1:3000...");
  const server = spawn("node", ["node_modules/next/dist/bin/next", "start", "-H", "127.0.0.1", "-p", "3000"], {
    stdio: "inherit",
    shell: true,
  });

  await wait(4000);

  let allPassed = true;

  try {
    // 1. Main Page
    console.log("\n[TEST 1] GET / (Main Dashboard)");
    const pageRes = await fetch("http://127.0.0.1:3000/");
    console.log("Status:", pageRes.status, "Content-Type:", pageRes.headers.get("content-type"));
    if (pageRes.status !== 200) allPassed = false;

    // 2. Satellite STAC
    console.log("\n[TEST 2] GET /api/satellite (Copernicus Sentinel-2)");
    const satRes = await fetch("http://127.0.0.1:3000/api/satellite?lat=21.1458&lon=79.0882&bbox=78.9,21.0,79.3,21.3");
    const satData = await satRes.json();
    console.log("Status:", satRes.status, "Scenes:", satData.scenes?.length);
    if (satData.scenes?.[0]) {
      console.log("  First Scene:", satData.scenes[0].id, "| Cloud:", satData.scenes[0].cloudCover + "%");
      console.log("  Visual COG:", satData.scenes[0].visualHref);
    }
    if (satRes.status !== 200) allPassed = false;

    // 3. Soil Forecast
    console.log("\n[TEST 3] GET /api/soil (Open-Meteo ERA5 Seamless)");
    const soilRes = await fetch("http://127.0.0.1:3000/api/soil?lat=21.1458&lon=79.0882");
    const soilData = await soilRes.json();
    console.log("Status:", soilRes.status, "Hourly Points:", soilData.soilForecast?.soilMoisture_0_7?.length);
    if (soilRes.status !== 200) allPassed = false;

    // 4. Soil Profile & Saxton-Rawls
    console.log("\n[TEST 4] GET /api/soilgrids (ISRIC SoilGrids & Saxton-Rawls PTF)");
    const sgRes = await fetch("http://127.0.0.1:3000/api/soilgrids?lat=21.1458&lon=79.0882");
    const sgData = await sgRes.json();
    console.log("Status:", sgRes.status);
    console.log("  Clay:", sgData.profile?.clay_pct + "% | Sand:", sgData.profile?.sand_pct + "% | pH:", sgData.profile?.ph);
    console.log("  Field Capacity (FC):", sgData.profile?.fieldCapacity, "m³/m³ | Wilting Point (WP):", sgData.profile?.wiltingPoint, "m³/m³");
    if (sgRes.status !== 200) allPassed = false;

    // 5. Monsoon & NASA POWER
    console.log("\n[TEST 5] GET /api/monsoon (10-Yr JJAS Archive & NASA POWER)");
    const monRes = await fetch("http://127.0.0.1:3000/api/monsoon?lat=21.1458&lon=79.0882");
    const monData = await monRes.json();
    console.log("Status:", monRes.status);
    console.log("  10-Yr LPA:", monData.monsoon?.lpa_mm, "mm | Deviation:", monData.monsoon?.lpa_deviation_pct + "% | SPEI:", monData.monsoon?.spei);
    if (monRes.status !== 200) allPassed = false;

    // 6. ISRO Bhuvan Proxy
    console.log("\n[TEST 6] GET /api/proxy/bhuvan (ISRO Bhuvan WMS Proxy)");
    const bhuRes = await fetch("http://127.0.0.1:3000/api/proxy/bhuvan?LAYERS=lulc:MH_LULC50K_1516&BBOX=78,21,79,22");
    console.log("Status:", bhuRes.status, "Content-Type:", bhuRes.headers.get("content-type"));
    if (bhuRes.status !== 200) allPassed = false;

    // 7. Data.gov.in Agmarknet Mandi
    console.log("\n[TEST 7] GET /api/mandi (Data.gov.in Agmarknet)");
    const manRes = await fetch("http://127.0.0.1:3000/api/mandi?state=Maharashtra&commodity=Cotton");
    const manData = await manRes.json();
    console.log("Status:", manRes.status, "Records:", manData.records?.length ?? 0);
    if (manRes.status !== 200) allPassed = false;

    // 8. 4-Node Agent DAG Pipeline
    console.log("\n[TEST 8] POST /api/agent/run (Autonomous 4-Node DAG Pipeline)");
    const agentStart = Date.now();
    const agentRes = await fetch("http://127.0.0.1:3000/api/agent/run", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({
        location: {
          name: "Vidarbha (Nagpur)",
          lat: 21.1458,
          lon: 79.0882,
          bbox: [78.9, 21.0, 79.3, 21.3],
          state: "Maharashtra",
          crop: "Cotton",
        },
        crop: "Cotton",
      }),
    });
    const agentData = await agentRes.json();
    const agentDuration = Date.now() - agentStart;
    console.log("Status:", agentRes.status, `(Took ${(agentDuration / 1000).toFixed(1)}s)`);
    console.log("  Risk Classification:", agentData.riskClassification);
    console.log("  Risk Severity Level:", agentData.riskLevel);
    console.log("  FAO Predicted Yield Reduction:", agentData.yieldOutput?.yieldReductionPct + "%");
    console.log("  Estimated Realized Yield:", agentData.yieldOutput?.estimatedYield_t_ha, "t/ha");
    console.log("  Deficit Irrigation Needed:", agentData.yieldOutput?.irrigationDeficit_L_ha?.toLocaleString(), "L/ha");
    console.log("  DAG Nodes Executed:", agentData.trace?.length);
    console.log("  Mitigation Directives:", agentData.mitigation?.recommendations?.length);
    console.log("  Verified Data Citations:", agentData.citations?.length);
    if (agentRes.status !== 200) allPassed = false;

    // 9. PDF Export
    console.log("\n[TEST 9] POST /api/report/export?format=pdf (PDF Generation)");
    const pdfRes = await fetch("http://127.0.0.1:3000/api/report/export?format=pdf", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify(agentData),
    });
    const pdfBuffer = await pdfRes.arrayBuffer();
    console.log("Status:", pdfRes.status, "Content-Type:", pdfRes.headers.get("content-type"), "Bytes:", pdfBuffer.byteLength);
    if (pdfRes.status !== 200 || pdfBuffer.byteLength < 1000) allPassed = false;

  } catch (err) {
    console.error("Test execution error:", err);
    allPassed = false;
  } finally {
    console.log("\nShutting down test server...");
    server.kill("SIGTERM");
  }

  if (allPassed) {
    console.log("\n=======================================================");
    console.log("🎉 ALL 9 TEST SUITES PASSED WITH 100% SUCCESS!");
    console.log("=======================================================");
    process.exit(0);
  } else {
    console.error("\n❌ Some tests failed.");
    process.exit(1);
  }
}

run();
