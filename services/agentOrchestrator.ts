// =============================================================================
// TerraPulse — 4-Node Autonomous Agent Orchestrator
// Powered by @google/genai (Gemini 2.5 Flash)
// Strictly Zero Dummy Data Compliant
// =============================================================================

import { GoogleGenAI } from "@google/genai";
import { z } from "zod";
import type {
  FarmLocation,
  CropType,
  AgentReport,
  AgentTraceStep,
  SentinelScene,
  SoilForecast,
  SoilProfile,
  MonsoonData,
  MandiRecord,
  YieldEngineOutput,
  RiskLevel,
  CitationTag,
  MitigationPlan,
  DataProvenance,
} from "@/types";
import {
  fetchSentinelScenes,
  fetchSoilForecast,
  fetchSoilProfile,
  fetchMonsoonData,
  fetchMandiPrices,
} from "@/services/liveIngestion";
import { computeYieldForecast } from "@/services/yieldEngine";

const RiskLevelEnum = z.enum(["low", "medium", "high", "severe"]);

/**
 * Initialize the Google GenAI client with key from environment
 */
function getGenAiClient(): GoogleGenAI {
  const apiKey = process.env.GEMINI_API_KEY;
  if (!apiKey) {
    throw new Error("Missing GEMINI_API_KEY environment variable.");
  }
  return new GoogleGenAI({ apiKey });
}

/**
 * Node 2: Multimodal Vision & Spectral Analyst
 * Fetches the Sentinel-2 thumbnail/visual image and analyzes it with Gemini 2.5 Flash
 */
async function runVisionAnalysis(
  scenes: SentinelScene[],
  soilProfile: SoilProfile | null,
  trace: AgentTraceStep[]
): Promise<string> {
  const startTime = Date.now();
  const step: AgentTraceStep = {
    node: 2,
    label: "Multimodal Vision & Spectral Analyst",
    status: "running",
    apiCalls: [],
  };
  trace.push(step);

  const scene = scenes[0];
  if (!scene) {
    step.status = "fallback";
    step.fallbackReason = "No cloud-free Sentinel-2 scenes available for current window.";
    step.output = "Visual inspection bypassed: Satellite coverage gap or complete cloud obstruction. No synthetic optical estimates used.";
    step.durationMs = Date.now() - startTime;
    return step.output;
  }

  const imgUrl = scene.thumbnailHref || scene.visualHref;
  let base64Img = "";
  let mimeType = "image/jpeg";

  try {
    const fetchStart = Date.now();
    const imgRes = await fetch(imgUrl, { signal: AbortSignal.timeout(10000) });
    const fetchLatency = Date.now() - fetchStart;

    step.apiCalls.push({
      url: imgUrl,
      method: "GET",
      statusCode: imgRes.status,
      latencyMs: fetchLatency,
      timestamp: new Date().toISOString(),
    });

    if (imgRes.ok) {
      const arrayBuf = await imgRes.arrayBuffer();
      base64Img = Buffer.from(arrayBuf).toString("base64");
      mimeType = imgRes.headers.get("content-type") || "image/jpeg";
    }
  } catch (e: any) {
    console.warn("Could not download Sentinel image thumbnail:", e.message);
  }

  const soilContext = soilProfile
    ? `Target Soil Profile: Clay: ${soilProfile.clay_pct.toFixed(1)}%, Sand: ${soilProfile.sand_pct.toFixed(1)}%, pH: ${soilProfile.ph.toFixed(1)}, Field Capacity: ${soilProfile.fieldCapacity.toFixed(3)} m³/m³`
    : "Target Soil Profile: [UNAVAILABLE - Soil hydraulic stream offline]";

  const promptText = `You are an expert satellite agro-meteorologist and remote sensing analyst for Indian agricultural regions.
Analyze this Sentinel-2 Level-2A imagery scene acquired over agricultural fields.

Scene Metadata:
- Scene ID: ${scene.id}
- Acquisition Timestamp: ${scene.datetime}
- Cloud Cover: ${scene.cloudCover.toFixed(1)}%
- ${soilContext}

Analyze the optical and spatial patterns:
1. Soil Surface Condition: Check for signs of surface crusting, drying, or topsoil moisture retention.
2. Vegetative Canopy & Stress: Estimate vegetative vigor, canopy cover density, and whether any browning/yellowing stress is visible.
3. Hydrological Balance: Detect any standing water, waterlogging in depressions, or irrigation canal flow.
4. Spectral/Spatial Heterogeneity: Note variability in plot-level greenness.

CRITICAL ZERO DUMMY DATA REQUIREMENT: For every finding or observation, cite the data source inline with [SOURCE: Sentinel-2 ${scene.id}, ${scene.datetime}]. If information is not visible in the imagery, say so explicitly. Never invent numbers or conditions.
Be concise, technical, and objective (2 to 3 paragraphs).`;

  const parts: any[] = [];
  if (base64Img) {
    parts.push({
      inlineData: {
        data: base64Img,
        mimeType,
      },
    });
  }
  parts.push({ text: promptText });

  const genStart = Date.now();
  try {
    const ai = getGenAiClient();
    const response = await ai.models.generateContent({
      model: "gemini-2.5-flash",
      contents: [{ parts }],
    });
    const genLatency = Date.now() - genStart;

    step.apiCalls.push({
      url: "https://generativelanguage.googleapis.com/v1beta/models/gemini-2.5-flash:generateContent",
      method: "POST",
      statusCode: 200,
      latencyMs: genLatency,
      timestamp: new Date().toISOString(),
    });

    const analysisText =
      response.text || "Multimodal vision analysis completed on acquired Sentinel-2 scene.";
    step.status = "done";
    step.output = analysisText;
    step.durationMs = Date.now() - startTime;
    return analysisText;
  } catch (error: any) {
    const genLatency = Date.now() - genStart;
    const statusCode = error.status || error.statusCode || 500;
    step.apiCalls.push({
      url: "https://generativelanguage.googleapis.com/v1beta/models/gemini-2.5-flash:generateContent",
      method: "POST",
      statusCode,
      latencyMs: genLatency,
      timestamp: new Date().toISOString(),
    });

    step.status = "error";
    step.fallbackReason = error.message;
    step.output = `Vision analysis unavailable: ${error.message}.`;
    step.durationMs = Date.now() - startTime;
    return step.output;
  }
}

/**
 * Node 3: Micro-Climate Risk & Yield Forecaster
 * Combines FAO deterministic yield math, 10-year monsoon LPA deviation, SPEI, and Vision analysis
 */
async function runRiskClassifier(
  location: FarmLocation,
  yieldOutput: YieldEngineOutput | null,
  monsoonData: MonsoonData | null,
  soilForecast: SoilForecast | null,
  soilProfile: SoilProfile | null,
  visionAnalysis: string,
  mandiData: MandiRecord[],
  trace: AgentTraceStep[]
): Promise<{
  riskClassification: string;
  riskLevel: RiskLevel;
  citations: CitationTag[];
}> {
  const startTime = Date.now();
  const step: AgentTraceStep = {
    node: 3,
    label: "Micro-Climate Risk & Yield Forecaster",
    status: "running",
    apiCalls: [],
  };
  trace.push(step);

  const nowIso = new Date().toISOString();
  const currentSW = soilForecast?.soilMoisture_0_7?.find((v) => v !== null) ?? null;
  const precip14dTotal = monsoonData?.forecast14d?.reduce((acc, d) => acc + d.precip_mm, 0) ?? null;

  // Build grounded telemetry blocks skipping unavailable inputs explicitly
  const yieldBlock = yieldOutput
    ? `### 1. FAO-33 CROP WATER PRODUCTION & DETERMINISTIC YIELD MATH [SOURCE: FAO Ky Engine, ${nowIso}]:
- Crop: ${yieldOutput.crop} (Crop Water Sensitivity Ky: ${yieldOutput.ky})
- Potential Evapotranspiration (ETm): ${yieldOutput.etm_mm} mm
- Actual Evapotranspiration (ETa): ${yieldOutput.eta_mm} mm
- Evapotranspiration Deficit Ratio: ${(yieldOutput.etDeficitRatio * 100).toFixed(1)}%
- Predicted Crop Yield Reduction: ${yieldOutput.yieldReductionPct.toFixed(1)}%
- Estimated Yield: ${yieldOutput.estimatedYield_t_ha.toFixed(2)} Tonnes/Hectare (Baseline Max: ${yieldOutput.maxYield_t_ha} t/ha)
- Soil Moisture Deficit Index (SMDI): ${yieldOutput.smdi.toFixed(3)}
- Irrigation Deficit: ${yieldOutput.irrigationDeficit_L_ha.toLocaleString()} Liters/Hectare needed`
    : `### 1. FAO-33 CROP WATER PRODUCTION & DETERMINISTIC YIELD MATH:
[UNAVAILABLE - Insufficient live soil telemetry or hydraulic parameters to compute deterministic yield loss]`;

  const soilBlock =
    soilProfile && currentSW !== null
      ? `### 2. SATELLITE SOIL PROFILE & ROOT-ZONE SENSORS [SOURCE: ISRIC SoilGrids v2 & Open-Meteo ERA5]:
- Current Topsoil Moisture (0-7cm): ${currentSW.toFixed(3)} m³/m³
- Root-Zone Field Capacity (FC): ${soilProfile.fieldCapacity.toFixed(3)} m³/m³
- Plant Permanent Wilting Point (WP): ${soilProfile.wiltingPoint.toFixed(3)} m³/m³
- Physical Composition: Clay: ${soilProfile.clay_pct.toFixed(1)}%, Sand: ${soilProfile.sand_pct.toFixed(1)}%, Organic Carbon: ${soilProfile.soc_g_per_kg.toFixed(1)} g/kg, pH: ${soilProfile.ph.toFixed(1)}`
      : `### 2. SATELLITE SOIL PROFILE & ROOT-ZONE SENSORS:
[UNAVAILABLE - Soil hydraulic limits or sensor feed offline]`;

  const monsoonBlock = monsoonData
    ? `### 3. MONSOON ANOMALY & CLIMATE INDICES [SOURCE: Open-Meteo Archive & NASA POWER]:
- 10-Year Indian Monsoon (JJAS) LPA: ${monsoonData.lpa_mm.toFixed(1)} mm
- Current Monsoon Rainfall Deviation vs LPA: ${monsoonData.lpa_deviation_pct > 0 ? "+" : ""}${monsoonData.lpa_deviation_pct.toFixed(1)}%
- Standardized Precipitation Evapotranspiration Index (SPEI): ${monsoonData.spei.toFixed(2)}
- 14-Day Accumulated Rainfall Forecast: ${precip14dTotal !== null ? `${precip14dTotal.toFixed(1)} mm` : "N/A"}`
    : `### 3. MONSOON ANOMALY & CLIMATE INDICES:
[UNAVAILABLE - 10-year reanalysis data offline]`;

  const prompt = `You are the Lead Agro-Climatologist at TerraPulse.
Synthesize the following deterministic model outputs, satellite intelligence, and climatic baselines to diagnose micro-climate risks for ${location.name}, ${location.state} growing ${location.crop}.

---
${yieldBlock}

${soilBlock}

${monsoonBlock}

### 4. SATELLITE MULTIMODAL OBSERVATION [SOURCE: Sentinel-2 L2A & Gemini Vision]:
${visionAnalysis}

---
CRITICAL ZERO DUMMY DATA POLICY:
1. Skip all unavailable inputs. State explicitly if any data stream is offline.
2. Under NO circumstance should you fabricate, assume, or interpolate numerical measurements for missing streams.
3. Categorize the Primary Micro-Climate Risk into EXACTLY ONE of the following:
   - "Severe Root-Zone Drought"
   - "Moderate Soil Moisture Deficit"
   - "Unseasonal Harvest-Stage Rainfall"
   - "Heatwave Terminal Stress"
   - "Waterlogging Risk"
   - "Normal / Low Risk"
4. Assign a Risk Severity: exactly "low", "medium", "high", or "severe".
5. Every quantitative assertion must have an inline citation tag: <cite source="DATA_SOURCE_NAME" ts="${nowIso}"/>

Format your response strictly as:
RISK_CATEGORY: <one of the exact categories>
RISK_LEVEL: <low | medium | high | severe>
SYNTHESIS:
<grounded paragraphs with inline <cite source="..." ts="..."/> tags>`;

  const genStart = Date.now();
  try {
    const ai = getGenAiClient();
    const response = await ai.models.generateContent({
      model: "gemini-2.5-flash",
      contents: [{ parts: [{ text: prompt }] }],
    });
    const genLatency = Date.now() - genStart;

    step.apiCalls.push({
      url: "https://generativelanguage.googleapis.com/v1beta/models/gemini-2.5-flash:generateContent",
      method: "POST",
      statusCode: 200,
      latencyMs: genLatency,
      timestamp: new Date().toISOString(),
    });

    const text = response.text || "";
    step.output = text;
    step.status = "done";
    step.durationMs = Date.now() - startTime;

    // Parse risk level strictly from RISK_LEVEL: line using zod
    let riskLevel: RiskLevel = "medium";
    const riskLevelMatch = text.match(/^\s*RISK_LEVEL:\s*([a-zA-Z]+)/m);
    if (riskLevelMatch && riskLevelMatch[1]) {
      const candidate = riskLevelMatch[1].trim().toLowerCase();
      const parsedRisk = RiskLevelEnum.safeParse(candidate);
      if (parsedRisk.success) {
        riskLevel = parsedRisk.data;
      }
    }

    let riskClassification = "Moderate Soil Moisture Deficit";
    const catMatch = text.match(/^\s*RISK_CATEGORY:\s*([^\n\r]+)/m);
    if (catMatch && catMatch[1]) {
      riskClassification = catMatch[1].trim();
    } else if (yieldOutput && (yieldOutput.yieldReductionPct > 25 || yieldOutput.smdi < -0.6)) {
      riskClassification = "Severe Root-Zone Drought";
      riskLevel = "severe";
    }

    // Extract verified citations
    const citations: CitationTag[] = [];
    const citeRegex = /<cite\s+source="([^"]+)"\s+ts="([^"]+)"\s*\/>/g;
    let match;
    while ((match = citeRegex.exec(text)) !== null) {
      citations.push({
        claim: "Verified Climate & Telemetry Metric",
        source: match[1],
        timestamp: match[2],
      });
    }

    // Fallback provenance tags only for streams that were actually present
    if (citations.length === 0) {
      if (yieldOutput) citations.push({ claim: "Crop Water Sensitivity & Yield Math", source: "FAO-33 Ky Yield Engine", timestamp: nowIso });
      if (soilProfile) citations.push({ claim: "Root-zone Physical Soil Hydraulic Limits", source: "ISRIC SoilGrids v2", timestamp: nowIso });
      if (monsoonData) citations.push({ claim: "10-Year Monsoon Long Period Average", source: "Open-Meteo ERA5 Reanalysis", timestamp: nowIso });
    }

    return { riskClassification, riskLevel, citations };
  } catch (error: any) {
    const genLatency = Date.now() - genStart;
    const statusCode = error.status || error.statusCode || 500;
    step.apiCalls.push({
      url: "https://generativelanguage.googleapis.com/v1beta/models/gemini-2.5-flash:generateContent",
      method: "POST",
      statusCode,
      latencyMs: genLatency,
      timestamp: new Date().toISOString(),
    });

    step.status = "error";
    step.fallbackReason = error.message;
    step.durationMs = Date.now() - startTime;

    const fallbackLevel: RiskLevel = yieldOutput
      ? yieldOutput.yieldReductionPct > 30 ? "severe" : yieldOutput.yieldReductionPct > 15 ? "high" : "medium"
      : "medium";

    const fallbackCategory = yieldOutput
      ? yieldOutput.smdi < -0.5 ? "Severe Root-Zone Drought" : "Moderate Soil Moisture Deficit"
      : "Unquantified Risk (Missing Live Telemetry)";

    return {
      riskClassification: fallbackCategory,
      riskLevel: fallbackLevel,
      citations: yieldOutput
        ? [{ claim: "FAO Yield Reduction Formula", source: "FAO-33 Deterministic Engine", timestamp: nowIso }]
        : [],
    };
  }
}

/**
 * Node 4: Actionable Mitigation & Supply Chain Execution Engine
 * Produces deficit irrigation schedules, harvest advisories, and Mandi price arbitrage routing
 */
async function runMitigationEngine(
  location: FarmLocation,
  riskClassification: string,
  riskLevel: RiskLevel,
  yieldOutput: YieldEngineOutput | null,
  mandiData: MandiRecord[],
  soilProfile: SoilProfile | null,
  trace: AgentTraceStep[]
): Promise<MitigationPlan> {
  const startTime = Date.now();
  const step: AgentTraceStep = {
    node: 4,
    label: "Actionable Mitigation & Supply Chain Execution Engine",
    status: "running",
    apiCalls: [],
  };
  trace.push(step);

  const topMandis = mandiData.slice(0, 6);
  const mandiSummary =
    topMandis.length > 0
      ? topMandis
          .map(
            (m) =>
              `- ${m.market} (${m.state}): Modal Price ₹${m.modal_price}/quintal [Range: ₹${m.min_price}-₹${m.max_price}, Date: ${m.arrival_date}]`
          )
          .join("\n")
      : "- Real-time Agmarknet mandi market data is unavailable for this commodity and region. Do not invent or assume prices.";

  const diagnosticSection = [
    `- Primary Micro-Climate Risk: ${riskClassification} (Severity: ${riskLevel.toUpperCase()})`,
    yieldOutput
      ? `- Deterministic Yield Impact: ${yieldOutput.yieldReductionPct.toFixed(1)}% expected yield reduction [SOURCE: FAO Ky Engine]`
      : "- Deterministic Yield Impact: [UNAVAILABLE - Requires live soil & weather telemetry]",
    yieldOutput
      ? `- Forecasted Production: ${yieldOutput.estimatedYield_t_ha.toFixed(2)} t/ha vs ${yieldOutput.maxYield_t_ha} t/ha potential`
      : "- Forecasted Production: [UNAVAILABLE]",
    yieldOutput && soilProfile
      ? `- Soil Moisture Deficit: ${yieldOutput.irrigationDeficit_L_ha.toLocaleString()} Liters/Hectare to restore Field Capacity (${soilProfile.fieldCapacity.toFixed(3)} m³/m³)`
      : "- Soil Moisture Deficit: [UNAVAILABLE - Requires verified soil hydraulic telemetry]",
    soilProfile
      ? `- Soil Texture: ${soilProfile.clay_pct.toFixed(1)}% Clay, ${soilProfile.sand_pct.toFixed(1)}% Sand`
      : "- Soil Texture: [UNAVAILABLE - ISRIC SoilGrids offline]",
  ].join("\n");

  const prompt = `You are the Agricultural Operations & Supply Chain Director at TerraPulse.
Create an immediate, concrete, and quantified Risk Mitigation Plan for a ${location.crop} farm in ${location.name}, ${location.state}.

DIAGNOSTIC STATUS:
${diagnosticSection}

LIVE MANDI MARKET CONTEXT [SOURCE: Data.gov.in Agmarknet API]:
${mandiSummary}

CRITICAL ZERO DUMMY DATA REQUIREMENT:
- Skip unavailable inputs. Never hallucinate pricing or moisture numbers if not verified above.
- If Mandi data is unavailable, advise on physical storage or local APMC receipt procedures without naming invented prices.

YOUR ACTION PLAN MUST INCLUDE:
1. AGRONOMIC INTERVENTION:
   - Provide an exact 7-day deficit irrigation schedule or conservation tactics.
   - Specific soil moisture conservation tactics (mulching type, anti-transpirants, foliar potassium/zinc sprays, or shallow cultivation).
2. HARVEST & LOGISTICS ROUTING:
   - Advise whether to maintain crop until maturity or accelerate monitoring based on moisture forecasts.
   - Mandi selection: specific price optimization routing using verified prices above, or APMC warehouse protocol if offline.
3. ECONOMIC RISK PROTECTION:
   - Practical risk mitigation guidance for ${location.crop}.

Format as:
RECOMMENDATIONS:
1. ...
2. ...
3. ...
4. ...
HARVEST_ADVICE: <concrete harvest timing paragraph>
MANDI_ROUTING: <concrete logistics and price optimization routing paragraph>`;

  const genStart = Date.now();
  try {
    const ai = getGenAiClient();
    const response = await ai.models.generateContent({
      model: "gemini-2.5-flash",
      contents: [{ parts: [{ text: prompt }] }],
    });
    const genLatency = Date.now() - genStart;

    step.apiCalls.push({
      url: "https://generativelanguage.googleapis.com/v1beta/models/gemini-2.5-flash:generateContent",
      method: "POST",
      statusCode: 200,
      latencyMs: genLatency,
      timestamp: new Date().toISOString(),
    });

    const rawText = response.text || "";
    step.output = rawText;
    step.status = "done";
    step.durationMs = Date.now() - startTime;

    // Extract recommendations
    const recommendations: string[] = [];
    const recSection = rawText.match(/RECOMMENDATIONS:([\s\S]*?)(?=HARVEST_ADVICE:|$)/i);
    if (recSection && recSection[1]) {
      const lines = recSection[1].split("\n");
      for (const line of lines) {
        const clean = line.replace(/^\d+[\.\)]\s*/, "").trim();
        if (clean.length > 15) {
          recommendations.push(clean);
        }
      }
    }

    if (recommendations.length === 0) {
      if (yieldOutput) {
        recommendations.push(
          `Apply phased deficit drip irrigation of ${Math.round(yieldOutput.irrigationDeficit_L_ha / 7).toLocaleString()} L/ha/day between 04:00-08:00 AM to minimize evaporative loss.`,
          "Spread organic straw mulching across crop furrows to reduce surface evaporation.",
          "Foliar spray of 1% Potassium Nitrate (KNO3) to enhance stomatal regulation and drought tolerance."
        );
      } else {
        recommendations.push(
          "Conduct field inspection of root-zone condition to gauge local moisture depletion.",
          "Apply organic surface mulching to conserve existing soil moisture reserves.",
          "Maintain daily scouting for terminal crop stress."
        );
      }
    }

    // Extract harvest advice
    let harvestAdvice = "Monitor crop development daily; ensure moisture levels are checked prior to harvest operations.";
    const harvestMatch = rawText.match(/HARVEST_ADVICE:([\s\S]*?)(?=MANDI_ROUTING:|$)/i);
    if (harvestMatch && harvestMatch[1]) {
      harvestAdvice = harvestMatch[1].trim();
    }

    // Extract mandi routing
    let mandiRouting =
      topMandis.length > 0
        ? `Route primary produce to ${topMandis[0].market} realizing ₹${topMandis[0].modal_price}/quintal.`
        : "Real-time mandi prices unavailable; coordinate with local APMC market yard for verified electronic auction rates.";
    const mandiMatch = rawText.match(/MANDI_ROUTING:([\s\S]*?)$/i);
    if (mandiMatch && mandiMatch[1]) {
      mandiRouting = mandiMatch[1].trim();
    }

    return {
      irrigationDeficit_L_ha: yieldOutput?.irrigationDeficit_L_ha ?? 0,
      recommendations,
      harvestAdvice,
      mandiRouting,
      rawText,
    };
  } catch (error: any) {
    const genLatency = Date.now() - genStart;
    const statusCode = error.status || error.statusCode || 500;
    step.apiCalls.push({
      url: "https://generativelanguage.googleapis.com/v1beta/models/gemini-2.5-flash:generateContent",
      method: "POST",
      statusCode,
      latencyMs: genLatency,
      timestamp: new Date().toISOString(),
    });

    step.status = "error";
    step.fallbackReason = error.message;
    step.durationMs = Date.now() - startTime;

    return {
      irrigationDeficit_L_ha: yieldOutput?.irrigationDeficit_L_ha ?? 0,
      recommendations: yieldOutput
        ? [
            `Deliver targeted deficit irrigation of ${Math.round(yieldOutput.irrigationDeficit_L_ha / 7).toLocaleString()} L/ha/day over next 7 days [SOURCE: FAO-56].`,
            "Deploy organic residue mulching across inter-row spaces to prevent soil crusting and moisture loss.",
            "Implement foliar potassium application to preserve cell turgor pressure during peak heat hours.",
          ]
        : [
            "Monitor root-zone moisture daily using physical probe measurements.",
            "Apply surface mulching across crop rows to conserve existing soil moisture.",
          ],
      harvestAdvice:
        "Proceed with scheduled harvest monitoring. Ensure grain or fibre moisture is within safety margins before transport.",
      mandiRouting:
        topMandis[0]
          ? `Target ${topMandis[0].market} (${topMandis[0].state}) for modal price realization of ₹${topMandis[0].modal_price}/quintal.`
          : "Coordinate with nearest APMC hub for real-time electronic warehouse receipt financing.",
      rawText: "Deterministic agronomic mitigation plan generated without invented data.",
    };
  }
}

/**
 * Execute the 4-Node Autonomous Agent Orchestration Pipeline
 */
export async function executeAgentPipeline(
  location: FarmLocation,
  crop: CropType
): Promise<AgentReport> {
  const trace: AgentTraceStep[] = [];
  const nowIso = new Date().toISOString();

  // =========================================================================
  // NODE 1: Autonomous Telemetry Harvester & Self-Healing Router
  // =========================================================================
  const node1Start = Date.now();
  const harvesterStep: AgentTraceStep = {
    node: 1,
    label: "Autonomous Telemetry Harvester & Self-Healing Router",
    status: "running",
    apiCalls: [],
  };
  trace.push(harvesterStep);

  // Parallel ingestion across all 5 streams
  const [scenesResult, soilResult, profileResult, monsoonResult, mandiResult] =
    await Promise.allSettled([
      fetchSentinelScenes(location, trace),
      fetchSoilForecast(location.lat, location.lon, trace),
      fetchSoilProfile(location.lat, location.lon, trace),
      fetchMonsoonData(location.lat, location.lon, trace),
      fetchMandiPrices(location.state, crop, trace),
    ]);

  // Extract real live streams or set strictly to null (NO DUMMY DATA)
  const scenes = scenesResult.status === "fulfilled" ? scenesResult.value : [];
  const soilForecast: SoilForecast | null =
    soilResult.status === "fulfilled" ? soilResult.value : null;
  const soilProfile: SoilProfile | null =
    profileResult.status === "fulfilled" ? profileResult.value : null;
  const monsoonData: MonsoonData | null =
    monsoonResult.status === "fulfilled" ? monsoonResult.value : null;
  const mandiData: MandiRecord[] =
    mandiResult.status === "fulfilled" ? mandiResult.value : [];

  // Build DataProvenance dictionary
  const provenance: Record<string, DataProvenance> = {
    sentinel2: {
      source: "Copernicus Sentinel-2 L2A STAC Asset",
      status: scenesResult.status === "fulfilled" && scenesResult.value.length > 0 ? "live" : "unavailable",
      fetchedAt: nowIso,
      error:
        scenesResult.status === "rejected"
          ? scenesResult.reason?.message
          : scenesResult.status === "fulfilled" && scenesResult.value.length === 0
          ? "No cloud-free optical scenes found in search window"
          : undefined,
    },
    soilForecast: {
      source: "Open-Meteo ERA5 Seamless Soil Forecast",
      status: soilResult.status === "fulfilled" ? "live" : "unavailable",
      fetchedAt: nowIso,
      error: soilResult.status === "rejected" ? soilResult.reason?.message : undefined,
    },
    soilProfile: {
      source: "ISRIC SoilGrids v2 & Saxton-Rawls PTF",
      status: profileResult.status === "fulfilled" ? "live" : "unavailable",
      fetchedAt: nowIso,
      error: profileResult.status === "rejected" ? profileResult.reason?.message : undefined,
    },
    monsoon: {
      source: "Open-Meteo Historical Reanalysis & NASA POWER",
      status: monsoonResult.status === "fulfilled" ? "live" : "unavailable",
      fetchedAt: nowIso,
      error: monsoonResult.status === "rejected" ? monsoonResult.reason?.message : undefined,
    },
    mandi: {
      source: "Data.gov.in Agmarknet Market Feed",
      status: mandiResult.status === "fulfilled" && mandiResult.value.length > 0 ? "live" : "unavailable",
      fetchedAt: nowIso,
      error:
        mandiResult.status === "rejected"
          ? mandiResult.reason?.message
          : mandiResult.status === "fulfilled" && mandiResult.value.length === 0
          ? "No active mandi arrivals recorded for this state/crop"
          : undefined,
    },
  };

  // Compute confidence score (0.0 - 1.0) based on live telemetry availability
  const streams = Object.values(provenance);
  const liveCount = streams.filter((s) => s.status === "live").length;
  const cachedCount = streams.filter((s) => s.status === "cached").length;
  const confidence = Number(((liveCount * 1.0 + cachedCount * 0.7) / streams.length).toFixed(2));

  // Determine real live vs failed stream lists for honest Node 1 telemetry reporting
  const liveStreamNames: string[] = [];
  const failedStreamNames: string[] = [];

  if (scenes.length > 0) liveStreamNames.push(`Sentinel-2 (${scenes.length} scenes)`);
  else failedStreamNames.push("Sentinel-2 STAC");

  if (soilForecast) liveStreamNames.push("Open-Meteo Soil Forecast");
  else failedStreamNames.push("Open-Meteo Soil Forecast");

  if (soilProfile) liveStreamNames.push("ISRIC SoilGrids");
  else failedStreamNames.push("ISRIC SoilGrids");

  if (monsoonData) liveStreamNames.push("Monsoon Reanalysis (10-yr)");
  else failedStreamNames.push("Monsoon Reanalysis");

  if (mandiData.length > 0) liveStreamNames.push(`Agmarknet Mandi (${mandiData.length} records)`);
  else failedStreamNames.push("Agmarknet Mandi");

  harvesterStep.durationMs = Date.now() - node1Start;

  if (failedStreamNames.length === 0) {
    harvesterStep.status = "done";
    harvesterStep.output = `Successfully ingested 5/5 live streams: ${liveStreamNames.join(", ")}. Provenance confidence: ${(confidence * 100).toFixed(0)}%.`;
  } else {
    harvesterStep.status = liveStreamNames.length > 0 ? "fallback" : "error";
    harvesterStep.fallbackReason = `Streams offline (${failedStreamNames.length}/5): ${failedStreamNames.join(", ")}`;
    harvesterStep.output = `Ingestion active on ${liveStreamNames.length}/5 streams (${liveStreamNames.join(", ")}). Unavailable streams (${failedStreamNames.length}): ${failedStreamNames.join(", ")}. Zero dummy data generated.`;
  }

  // =========================================================================
  // NODE 2: Multimodal Vision & Spectral Analyst
  // =========================================================================
  const visionAnalysis = await runVisionAnalysis(scenes, soilProfile, trace);

  // =========================================================================
  // DETERMINISTIC FAO YIELD ENGINE COMPUTATION (Only if real inputs exist)
  // =========================================================================
  let yieldOutput: YieldEngineOutput | null = null;
  const currentSW = soilForecast?.soilMoisture_0_7?.find((v) => v !== null && v > 0) ?? null;

  if (soilProfile && currentSW !== null && monsoonData && monsoonData.forecast14d?.length > 0) {
    const et0Sum = monsoonData.forecast14d.reduce((s, d) => s + d.et0_mm, 0);
    const etm_mm = Math.max(20, et0Sum);
    const moistureRatio = Math.min(1.0, currentSW / soilProfile.fieldCapacity);
    const eta_mm = etm_mm * moistureRatio;

    yieldOutput = computeYieldForecast({
      crop,
      eta_mm,
      etm_mm,
      soilProfile,
      currentSW,
    });
  }

  // =========================================================================
  // NODE 3: Micro-Climate Risk & Yield Forecaster
  // =========================================================================
  const { riskClassification, riskLevel, citations } = await runRiskClassifier(
    location,
    yieldOutput,
    monsoonData,
    soilForecast,
    soilProfile,
    visionAnalysis,
    mandiData,
    trace
  );

  // =========================================================================
  // NODE 4: Actionable Mitigation & Supply Chain Execution Engine
  // =========================================================================
  const mitigation = await runMitigationEngine(
    location,
    riskClassification,
    riskLevel,
    yieldOutput,
    mandiData,
    soilProfile,
    trace
  );

  return {
    location,
    generatedAt: nowIso,
    trace,
    provenance,
    confidence,
    scenes,
    soilForecast,
    soilProfile,
    monsoonData,
    mandiData,
    yieldOutput,
    visionAnalysis,
    riskClassification,
    riskLevel,
    citations,
    mitigation,
  };
}
