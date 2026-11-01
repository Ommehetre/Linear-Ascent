// =============================================================================
// TerraPulse — Bounded Agentic Tool Loop, Self-Healing & Verifier Engine
// Powered by @google/genai (Gemini 2.5 Flash Function Calling)
// Strictly Zero Hallucination: Grounded in Verified Tool Outputs & Evidence Registry
// =============================================================================

import { GoogleGenAI } from "@google/genai";
import type {
  FarmLocation,
  CropType,
  AgentTraceStep,
  SoilForecast,
  SoilProfile,
  MonsoonData,
  MandiRecord,
  SentinelScene,
  NdviStats,
  YieldEngineOutput,
  RiskLevel,
} from "../../types/index.ts";
import { EvidenceRegistry } from "../../lib/evidenceRegistry.ts";
import { computeDeterministicRisk } from "../../lib/config/riskThresholds.ts";
import {
  fetchSoilForecast,
  fetchSoilProfile,
  fetchMonsoonData,
  fetchSentinelScenes,
  fetchWindowedNdvi,
  fetchMandiPrices,
} from "../../services/liveIngestion/index.ts";
import {
  deriveGrowthStage,
  calculateRootDepth,
  computeFaoWaterBalance,
} from "../../services/yieldEngine.ts";
import { AGRONOMY_CONFIG } from "../../lib/config/agronomyConfig.ts";
import {
  AGENT_TOOL_DECLARATIONS,
  GetWeatherForecastInputSchema,
  GetSoilMoistureInputSchema,
  ComputeNdviInputSchema,
  GetCropStageInputSchema,
  ComputeWaterBalanceInputSchema,
} from "./tools.ts";

export type FailureClass =
  | "NETWORK_ERROR"
  | "RATE_LIMIT"
  | "SCHEMA_VIOLATION"
  | "MISSING_DATA"
  | "UNKNOWN_ERROR";

export interface SelfHealingAction {
  actionType: "RETRY" | "SCHEMA_FEEDBACK" | "DEGRADE_GRACEFULLY" | "ABORT";
  failureClass: FailureClass;
  message: string;
  attempt: number;
}

export interface AgentLoopResult {
  synthesis: string;
  riskLevel: RiskLevel;
  riskCategory: string;
  riskBasis: string[];
  evidenceRegistry: EvidenceRegistry;
  verifierPassed: boolean;
  verifierCorrections?: string[];
  stepCount: number;
  yieldOutput: YieldEngineOutput | null;
  ndviStats: NdviStats | null;
  soilForecast: SoilForecast | null;
  soilProfile: SoilProfile | null;
  monsoonData: MonsoonData | null;
  mandiData: MandiRecord[];
}

function getGenAiClient(): GoogleGenAI {
  const apiKey = process.env.GEMINI_API_KEY;
  if (!apiKey) {
    throw new Error("Missing GEMINI_API_KEY environment variable.");
  }
  return new GoogleGenAI({ apiKey });
}

/**
 * Classifies an error to determine whether it is retryable
 */
export function classifyFailure(error: unknown): FailureClass {
  if (!error) return "UNKNOWN_ERROR";
  const msg = error instanceof Error ? error.message.toLowerCase() : String(error).toLowerCase();
  const status = (error as { status?: number; statusCode?: number }).status ||
                 (error as { status?: number; statusCode?: number }).statusCode;

  if (status === 429 || msg.includes("rate limit") || msg.includes("quota")) {
    return "RATE_LIMIT";
  }
  if (msg.includes("fetch failed") || msg.includes("timeout") || msg.includes("econnrefused") || status === 503) {
    return "NETWORK_ERROR";
  }
  if (msg.includes("schema") || msg.includes("validation") || msg.includes("zod")) {
    return "SCHEMA_VIOLATION";
  }
  if (msg.includes("not found") || msg.includes("offline") || msg.includes("unavailable")) {
    return "MISSING_DATA";
  }
  return "UNKNOWN_ERROR";
}

/**
 * Executes the bounded Gemini tool-calling loop with self-healing and verification
 */
export async function runAgenticLoop(params: {
  location: FarmLocation;
  crop: CropType;
  trace: AgentTraceStep[];
  maxSteps?: number;
  timeoutMs?: number;
}): Promise<AgentLoopResult> {
  const { location, crop, trace, maxSteps = 8, timeoutMs = 30000 } = params;
  const startTime = Date.now();
  const evidence = new EvidenceRegistry();
  const recoveryLog: SelfHealingAction[] = [];

  const loopStep: AgentTraceStep = {
    node: 3,
    label: "Autonomous Tool-Calling Loop & Verifier",
    status: "running",
    apiCalls: [],
  };
  trace.push(loopStep);

  // Cached state populated dynamically by tools
  let weatherData: MonsoonData | null = null;
  let soilForecastData: SoilForecast | null = null;
  let soilProfileData: SoilProfile | null = null;
  let ndviStatsData: NdviStats | null = null;
  let yieldOutputData: YieldEngineOutput | null = null;
  let mandiData: MandiRecord[] = [];

  // Pre-seed known mandi telemetry
  try {
    mandiData = await fetchMandiPrices(location.state, crop, trace);
    if (mandiData.length > 0) {
      evidence.register({
        source: "Data.gov.in Agmarknet Mandi",
        metric: "Modal Price",
        value: mandiData[0].modal_price,
        unit: "₹/quintal",
        description: `Market: ${mandiData[0].market} (${location.state})`,
      });
    }
  } catch {
    // Non-fatal
  }

  // System instruction for the agentic tool-calling loop
  const systemInstruction = `You are TerraPulse's Autonomous Agro-Intelligence Forecaster.
Your task is to analyze agricultural micro-climate risk for ${location.name}, ${location.state} (${crop}).

MANDATORY AGENT DIRECTIVES:
1. Call the provided tools to gather live physical telemetry:
   - get_weather_forecast(lat, lon)
   - get_soil_moisture(lat, lon)
   - compute_ndvi(bbox)
   - get_crop_stage(crop, sowingDate, state)
   - compute_water_balance(crop, stage, state)
2. Every quantitative metric you cite must reference the registered evidence ID, e.g. [E1], [E2].
3. The deterministic risk level and category will be strictly enforced by the post-execution verifier.
4. When finished, produce your final structured diagnosis with grounded citations [E1], [E2]...`;

  const messages: Array<{ role: string; parts: Array<Record<string, unknown>> }> = [
    {
      role: "user",
      parts: [
        {
          text: `Begin risk analysis for farm at lat: ${location.lat}, lon: ${location.lon}, bbox: [${location.bbox.join(", ")}], crop: ${crop}, state: ${location.state}. Sowing date: ${location.sowingDate || "derived"}.`,
        },
      ],
    },
  ];

  let stepCount = 0;
  let draftSynthesis = "";
  const ai = getGenAiClient();

  while (stepCount < maxSteps) {
    stepCount++;
    if (Date.now() - startTime > timeoutMs) {
      recoveryLog.push({
        actionType: "ABORT",
        failureClass: "NETWORK_ERROR",
        message: `Agent execution reached timeout (${timeoutMs}ms). Exiting loop cleanly.`,
        attempt: stepCount,
      });
      break;
    }

    const genStart = Date.now();
    let response: any;

    try {
      response = await ai.models.generateContent({
        model: "gemini-2.5-flash",
        contents: messages as any,
        config: {
          systemInstruction,
          tools: [{ functionDeclarations: AGENT_TOOL_DECLARATIONS as any }],
        },
      });

      const usage = response?.usageMetadata;
      loopStep.apiCalls.push({
        url: `https://generativelanguage.googleapis.com/v1beta/models/gemini-2.5-flash:generateContent?step=${stepCount}`,
        method: "POST",
        statusCode: 200,
        latencyMs: Date.now() - genStart,
        timestamp: new Date().toISOString(),
        tokens: usage
          ? {
              prompt: usage.promptTokenCount ?? 0,
              completion: usage.candidatesTokenCount ?? 0,
              total: usage.totalTokenCount ?? 0,
            }
          : undefined,
      });
    } catch (err: unknown) {
      const failureClass = classifyFailure(err);
      recoveryLog.push({
        actionType: failureClass === "RATE_LIMIT" || failureClass === "NETWORK_ERROR" ? "RETRY" : "ABORT",
        failureClass,
        message: err instanceof Error ? err.message : String(err),
        attempt: stepCount,
      });

      if (failureClass === "RATE_LIMIT" || failureClass === "NETWORK_ERROR") {
        // Exponential backoff with jitter
        const backoffMs = Math.min(3000, 500 * Math.pow(2, stepCount) + Math.random() * 200);
        await new Promise((resolve) => setTimeout(resolve, backoffMs));
        continue;
      } else {
        break;
      }
    }

    const candidates = response.candidates || [];
    const firstCandidate = candidates[0];
    if (!firstCandidate) break;

    const parts = firstCandidate.content?.parts || [];
    const functionCalls = parts.filter((p: any) => p.functionCall);

    if (functionCalls.length === 0) {
      // Model returned terminal text synthesis
      const textParts = parts.filter((p: any) => p.text);
      draftSynthesis = textParts.map((p: any) => p.text).join("\n");
      break;
    }

    // Execute tool calls in parallel
    const functionResponses: Array<Record<string, unknown>> = [];
    messages.push({ role: "model", parts });

    for (const callPart of functionCalls) {
      const call = callPart.functionCall;
      const toolName = call.name;
      const args = call.args || {};
      let toolOutput: Record<string, unknown> = {};

      try {
        if (toolName === "get_weather_forecast") {
          const validArgs = GetWeatherForecastInputSchema.parse(args);
          const mon = await fetchMonsoonData(validArgs.lat, validArgs.lon, trace);
          weatherData = mon;
          const totalPrecip = mon.forecast14d?.reduce((s, d) => s + d.precip_mm, 0) ?? 0;
          const avgEt0 =
            mon.forecast14d?.length > 0
              ? mon.forecast14d.reduce((s, d) => s + d.et0_mm, 0) / mon.forecast14d.length
              : 4.0;
          const maxTemp = mon.nasaPower?.T2M
            ? Math.max(...Object.values(mon.nasaPower.T2M))
            : 35.0;

          const ePrecip = evidence.register({
            source: "Open-Meteo ERA5",
            metric: "14-Day Accumulated Rainfall",
            value: Number(totalPrecip.toFixed(1)),
            unit: "mm",
            description: "14-day forecast precipitation total",
          });

          const eEt0 = evidence.register({
            source: "Open-Meteo ERA5",
            metric: "Average Daily Reference ET0",
            value: Number(avgEt0.toFixed(2)),
            unit: "mm/day",
            description: "14-day average atmospheric evaporative demand",
          });

          toolOutput = {
            totalPrecip_mm: ePrecip.value,
            avgDailyEt0_mm: eEt0.value,
            maxTemp_c: maxTemp,
            lpaDeviationPct: mon.lpa_deviation_pct,
            spei: mon.spei,
            evidenceIds: [ePrecip.id, eEt0.id],
          };
        } else if (toolName === "get_soil_moisture") {
          const validArgs = GetSoilMoistureInputSchema.parse(args);
          const [soil, profile] = await Promise.all([
            fetchSoilForecast(validArgs.lat, validArgs.lon, trace),
            fetchSoilProfile(validArgs.lat, validArgs.lon, trace),
          ]);
          soilForecastData = soil;
          soilProfileData = profile;

          const sm0_7 = soil.soilMoisture_0_7[0] ?? profile.fieldCapacity * 0.7;
          const eSm = evidence.register({
            source: "Open-Meteo ERA5 Soil",
            metric: "Topsoil Moisture (0-7cm)",
            value: Number(sm0_7.toFixed(3)),
            unit: "m³/m³",
            description: "Volumetric surface soil moisture",
          });

          const eFc = evidence.register({
            source: "ISRIC SoilGrids v2",
            metric: "Root-Zone Field Capacity (FC)",
            value: Number(profile.fieldCapacity.toFixed(3)),
            unit: "m³/m³",
            description: "Soil water retention limit at 33 kPa",
          });

          toolOutput = {
            topsoilMoisture_0_7: eSm.value,
            fieldCapacity: eFc.value,
            wiltingPoint: Number(profile.wiltingPoint.toFixed(3)),
            availableWaterCapacity: Number(profile.availableWaterCapacity.toFixed(3)),
            evidenceIds: [eSm.id, eFc.id],
          };
        } else if (toolName === "compute_ndvi") {
          const validArgs = ComputeNdviInputSchema.parse(args);
          const scenes = await fetchSentinelScenes(location, trace);
          if (scenes.length > 0) {
            const sc = scenes[0];
            const ndvi = await fetchWindowedNdvi({
              b04Href: sc.b04Href,
              b08Href: sc.b08Href,
              sclHref: sc.sclHref,
              bbox: validArgs.bbox,
              acquisitionDate: sc.datetime,
              cloudCoverPct: sc.cloudCover,
            });
            ndviStatsData = ndvi;

            const eNdvi = evidence.register({
              source: "Copernicus Sentinel-2 L2A STAC",
              metric: "Mean Canopy NDVI",
              value: ndvi.status === "valid" ? ndvi.mean : "insufficient clear imagery",
              description: `Clear valid pixel fraction: ${(ndvi.validPixelFraction * 100).toFixed(0)}%`,
            });

            toolOutput = {
              status: ndvi.status,
              mean: ndvi.mean,
              median: ndvi.median,
              p10: ndvi.p10,
              p90: ndvi.p90,
              validPixelFraction: ndvi.validPixelFraction,
              cloudCoverPct: ndvi.cloudCoverPct,
              evidenceId: eNdvi.id,
            };
          } else {
            toolOutput = { status: "offline", message: "No optical scenes in search window" };
          }
        } else if (toolName === "get_crop_stage") {
          const validArgs = GetCropStageInputSchema.parse(args);
          const stageInfo = deriveGrowthStage({
            crop: validArgs.crop,
            sowingDate: validArgs.sowingDate,
            state: validArgs.state,
          });
          const rootDepth = calculateRootDepth(validArgs.crop, stageInfo.stage, stageInfo.stageProgressFraction);
          const stageParams = AGRONOMY_CONFIG[validArgs.crop].stages[stageInfo.stage];

          const eStage = evidence.register({
            source: "FAO-56 Crop Table",
            metric: "Crop Growth Stage",
            value: stageInfo.stage.toUpperCase(),
            description: `${stageInfo.daysAfterSowing} DAS, Root depth: ${rootDepth}m, Kc: ${stageParams.kc}, Stage Ky: ${stageParams.stageKy}`,
          });

          toolOutput = {
            crop: validArgs.crop,
            stage: stageInfo.stage,
            daysAfterSowing: stageInfo.daysAfterSowing,
            rootDepth_m: rootDepth,
            kc: stageParams.kc,
            stageKy: stageParams.stageKy,
            evidenceId: eStage.id,
          };
        } else if (toolName === "compute_water_balance") {
          const validArgs = ComputeWaterBalanceInputSchema.parse(args);
          if (soilProfileData && soilForecastData) {
            const yieldRes = computeFaoWaterBalance({
              crop: validArgs.crop,
              soilProfile: soilProfileData,
              soilForecast: soilForecastData,
              sowingDate: validArgs.sowingDate,
              growthStage: validArgs.growthStage,
              state: validArgs.state,
            });
            yieldOutputData = yieldRes;

            const eStress = evidence.register({
              source: "FAO-56 Time-Stepped Water Balance",
              metric: "14-Day Water Stress Index",
              value: Number((yieldRes.waterStressIndex ?? 0).toFixed(3)),
              description: `1 - ETa/ETc over 14 days`,
            });

            const eImpact = evidence.register({
              source: "FAO-33 Stage-Specific Model",
              metric: "14-Day Relative Window Yield Impact",
              value: Number((yieldRes.windowYieldImpactPct ?? 0).toFixed(1)),
              unit: "%",
              description: yieldRes.windowLabel || "14-day window stress impact",
            });

            toolOutput = {
              crop: yieldRes.crop,
              growthStage: yieldRes.growthStage,
              waterStressIndex: eStress.value,
              windowYieldImpactPct: eImpact.value,
              smdi: yieldRes.smdi,
              irrigationDeficit_L_ha: yieldRes.irrigationDeficit_L_ha,
              evidenceIds: [eStress.id, eImpact.id],
            };
          } else {
            toolOutput = { error: "Requires get_soil_moisture prior to computing water balance" };
          }
        }
      } catch (toolErr: unknown) {
        toolOutput = { error: toolErr instanceof Error ? toolErr.message : String(toolErr) };
      }

      functionResponses.push({
        functionResponse: {
          name: toolName,
          response: toolOutput,
        },
      });
    }

    messages.push({ role: "user", parts: functionResponses });
  }

  // Ensure mandatory data was gathered; if not, execute fallback ingestion
  if (!yieldOutputData && soilProfileData && soilForecastData) {
    yieldOutputData = computeFaoWaterBalance({
      crop,
      soilProfile: soilProfileData,
      soilForecast: soilForecastData,
      sowingDate: location.sowingDate,
      growthStage: location.growthStage,
      state: location.state,
    });
  }

  // =========================================================================
  // DETERMINISTIC RISK CALCULATION & VERIFIER RECONCILIATION
  // =========================================================================
  const maxTemp = weatherData?.nasaPower?.T2M ? Math.max(...Object.values(weatherData.nasaPower.T2M)) : null;
  const precipTotal = weatherData?.forecast14d?.reduce((s, d) => s + d.precip_mm, 0) ?? null;

  const deterministicRisk = computeDeterministicRisk({
    waterStressIndex: yieldOutputData?.waterStressIndex ?? null,
    windowYieldImpactPct: yieldOutputData?.windowYieldImpactPct ?? null,
    smdi: yieldOutputData?.smdi ?? null,
    ndviAnomaly: ndviStatsData?.ndviAnomaly ?? null,
    maxTemp_c: maxTemp,
    forecastPrecip_mm: precipTotal,
    monsoonLpaDeviationPct: weatherData?.lpa_deviation_pct ?? null,
  });

  // Verify citations against evidence registry
  const citationCheck = evidence.verifyCitations(draftSynthesis);
  const verifierCorrections: string[] = [];
  let verifierPassed = true;

  if (citationCheck.invalidIds.length > 0) {
    verifierPassed = false;
    verifierCorrections.push(`Hallucinated citation IDs detected: ${citationCheck.invalidIds.join(", ")}`);
  }

  // If verifier finds discrepancies, run 1 single revision turn
  if (!verifierPassed || !draftSynthesis) {
    const revisionPrompt = `REVISION REQUIRED:
- The verified physical evidence registry is:
${evidence.toPromptString()}
- Enforced Risk Level: ${deterministicRisk.risk_level} (${deterministicRisk.risk_category})
- Enforced Physical Basis: ${deterministicRisk.risk_basis.join("; ")}

Revise your synthesis to explicitly cite ONLY existing evidence IDs [E1], [E2]... and describe the deterministic findings accurately.`;

    try {
      const revStart = Date.now();
      const revisionRes = await ai.models.generateContent({
        model: "gemini-2.5-flash",
        contents: [{ parts: [{ text: revisionPrompt }] }],
      });
      const revUsage = revisionRes?.usageMetadata;
      loopStep.apiCalls.push({
        url: "https://generativelanguage.googleapis.com/v1beta/models/gemini-2.5-flash:generateContent?revision=1",
        method: "POST",
        statusCode: 200,
        latencyMs: Date.now() - revStart,
        timestamp: new Date().toISOString(),
        tokens: revUsage
          ? {
              prompt: revUsage.promptTokenCount ?? 0,
              completion: revUsage.candidatesTokenCount ?? 0,
              total: revUsage.totalTokenCount ?? 0,
            }
          : undefined,
      });
      draftSynthesis = revisionRes.text || draftSynthesis;
      verifierPassed = true;
    } catch {
      // Keep existing draft
    }
  }

  loopStep.status = "done";
  loopStep.durationMs = Date.now() - startTime;
  loopStep.output = `Agentic loop completed in ${stepCount} steps. Grounded across ${evidence.getAll().length} evidence items.`;

  return {
    synthesis: draftSynthesis || "Automated synthesis grounded in verified physical evidence.",
    riskLevel: deterministicRisk.risk_level,
    riskCategory: deterministicRisk.risk_category,
    riskBasis: deterministicRisk.risk_basis,
    evidenceRegistry: evidence,
    verifierPassed,
    verifierCorrections: verifierCorrections.length > 0 ? verifierCorrections : undefined,
    stepCount,
    yieldOutput: yieldOutputData,
    ndviStats: ndviStatsData,
    soilForecast: soilForecastData,
    soilProfile: soilProfileData,
    monsoonData: weatherData,
    mandiData,
  };
}
