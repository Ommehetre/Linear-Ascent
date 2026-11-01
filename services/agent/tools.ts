// =============================================================================
// TerraPulse — 5 Typed Agentic Tools with Zod Validation
// Strictly Zero Dummy Data: Each tool interfaces directly with live physical engines
// =============================================================================

import { z } from "zod";
import type { CropType, GrowthStage, FarmLocation, AgentTraceStep, SoilProfile, SoilForecast } from "../../types/index.ts";
import {
  fetchSoilForecast,
  fetchSoilProfile,
  fetchMonsoonData,
  fetchSentinelScenes,
  fetchWindowedNdvi,
} from "../../services/liveIngestion/index.ts";
import {
  deriveGrowthStage,
  calculateRootDepth,
  computeFaoWaterBalance,
} from "../../services/yieldEngine.ts";
import { AGRONOMY_CONFIG } from "../../lib/config/agronomyConfig.ts";
import type { EvidenceRegistry } from "../../lib/evidenceRegistry.ts";

// -----------------------------------------------------------------------------
// TOOL 1: get_weather_forecast
// -----------------------------------------------------------------------------
export const GetWeatherForecastInputSchema = z.object({
  lat: z.number().min(-90).max(90),
  lon: z.number().min(-180).max(180),
});

export const GetWeatherForecastOutputSchema = z.object({
  forecast14dTotalPrecip_mm: z.number(),
  avgDailyEt0_mm: z.number(),
  maxTemp_c: z.number().nullable(),
  daysCount: z.number(),
  historicalLpa_mm: z.number().nullable(),
  lpaDeviationPct: z.number().nullable(),
  spei: z.number().nullable(),
  fetchedAt: z.string(),
});

// -----------------------------------------------------------------------------
// TOOL 2: get_soil_moisture
// -----------------------------------------------------------------------------
export const GetSoilMoistureInputSchema = z.object({
  lat: z.number().min(-90).max(90),
  lon: z.number().min(-180).max(180),
});

export const GetSoilMoistureOutputSchema = z.object({
  topsoilMoisture_0_7: z.number().nullable(),
  subsoilMoisture_7_28: z.number().nullable(),
  deepMoisture_28_100: z.number().nullable(),
  fieldCapacity: z.number(),
  wiltingPoint: z.number(),
  availableWaterCapacity: z.number(),
  clay_pct: z.number(),
  sand_pct: z.number(),
  fetchedAt: z.string(),
});

// -----------------------------------------------------------------------------
// TOOL 3: compute_ndvi
// -----------------------------------------------------------------------------
export const ComputeNdviInputSchema = z.object({
  bbox: z.tuple([z.number(), z.number(), z.number(), z.number()]),
  state: z.string().optional(),
});

export const ComputeNdviOutputSchema = z.object({
  status: z.enum(["valid", "insufficient_clear_imagery", "offline"]),
  mean: z.number(),
  median: z.number(),
  p10: z.number(),
  p90: z.number(),
  validPixelFraction: z.number(),
  cloudCoverPct: z.number(),
  acquisitionDate: z.string(),
  ndviAnomaly: z.number().nullable().optional(),
  message: z.string().optional(),
});

// -----------------------------------------------------------------------------
// TOOL 4: get_crop_stage
// -----------------------------------------------------------------------------
export const GetCropStageInputSchema = z.object({
  crop: z.enum(["Rice", "Wheat", "Cotton", "Soybean", "Pulses"]),
  sowingDate: z.string().optional(),
  state: z.string().optional(),
});

export const GetCropStageOutputSchema = z.object({
  crop: z.string(),
  stage: z.enum(["initial", "development", "mid", "late"]),
  daysAfterSowing: z.number(),
  stageDurationDays: z.number(),
  rootDepth_m: z.number(),
  kc: z.number(),
  stageKy: z.number(),
  depletionFraction_p: z.number(),
});

// -----------------------------------------------------------------------------
// TOOL 5: compute_water_balance
// -----------------------------------------------------------------------------
export const ComputeWaterBalanceInputSchema = z.object({
  crop: z.enum(["Rice", "Wheat", "Cotton", "Soybean", "Pulses"]),
  sowingDate: z.string().optional(),
  growthStage: z.enum(["initial", "development", "mid", "late"]).optional(),
  state: z.string().optional(),
});

export const ComputeWaterBalanceOutputSchema = z.object({
  crop: z.string(),
  growthStage: z.string(),
  totalEtc_mm: z.number(),
  totalEta_mm: z.number(),
  waterStressIndex: z.number(),
  windowYieldImpactPct: z.number(),
  windowLabel: z.string(),
  smdi: z.number(),
  irrigationDeficit_L_ha: z.number(),
  estimatedYield_t_ha: z.number(),
  maxYield_t_ha: z.number(),
});

/**
 * Gemini Tool Function Declarations for function calling
 */
export const AGENT_TOOL_DECLARATIONS = [
  {
    name: "get_weather_forecast",
    description: "Fetches live 14-day ERA5 weather forecast (ET0, precipitation, max temperature) and historical monsoon LPA.",
    parameters: {
      type: "OBJECT",
      properties: {
        lat: { type: "NUMBER", description: "Latitude of target farm location" },
        lon: { type: "NUMBER", description: "Longitude of target farm location" },
      },
      required: ["lat", "lon"],
    },
  },
  {
    name: "get_soil_moisture",
    description: "Fetches multi-depth hourly soil moisture (0-7cm, 7-28cm, 28-100cm) and ISRIC SoilGrids hydraulic limits (Field Capacity, Wilting Point).",
    parameters: {
      type: "OBJECT",
      properties: {
        lat: { type: "NUMBER", description: "Latitude of target farm location" },
        lon: { type: "NUMBER", description: "Longitude of target farm location" },
      },
      required: ["lat", "lon"],
    },
  },
  {
    name: "compute_ndvi",
    description: "Executes windowed COG reads for B04/B08 Sentinel-2 bands, applies SCL cloud/shadow masking, and returns distribution statistics (mean, p10, p90, valid fraction).",
    parameters: {
      type: "OBJECT",
      properties: {
        bbox: {
          type: "ARRAY",
          items: { type: "NUMBER" },
          description: "Bounding box [minLon, minLat, maxLon, maxLat]",
        },
      },
      required: ["bbox"],
    },
  },
  {
    name: "get_crop_stage",
    description: "Derives current crop growth stage (initial, development, mid, late), root depth Zr, Kc, and stage-specific Ky from sowing date or Indian crop calendar.",
    parameters: {
      type: "OBJECT",
      properties: {
        crop: { type: "STRING", enum: ["Rice", "Wheat", "Cotton", "Soybean", "Pulses"] },
        sowingDate: { type: "STRING", description: "ISO date of sowing, e.g. '2026-06-15'" },
        state: { type: "STRING", description: "Indian state name, e.g. 'Maharashtra'" },
      },
      required: ["crop"],
    },
  },
  {
    name: "compute_water_balance",
    description: "Executes FAO-56 daily time-stepped root-zone water balance model and calculates 14-day window water stress index and relative yield impact.",
    parameters: {
      type: "OBJECT",
      properties: {
        crop: { type: "STRING", enum: ["Rice", "Wheat", "Cotton", "Soybean", "Pulses"] },
        sowingDate: { type: "STRING" },
        growthStage: { type: "STRING", enum: ["initial", "development", "mid", "late"] },
        state: { type: "STRING" },
      },
      required: ["crop"],
    },
  },
];
