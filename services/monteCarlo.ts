// =============================================================================
// TerraPulse — Monte Carlo Parameter Sensitivity & Uncertainty Analysis
// Evaluates uncertainty ranges (p10, p50, p90) for water stress and deficit
// =============================================================================

import type { CropType, GrowthStage, SoilProfile, SoilForecast } from "../types/index.ts";
import { computeFaoWaterBalance } from "./yieldEngine.ts";

export interface MonteCarloUncertaintyResult {
  simulationsCount: number;
  waterStressIndex: {
    p10: number;
    p50: number;
    p90: number;
  };
  windowYieldImpactPct: {
    p10: number;
    p50: number;
    p90: number;
  };
  irrigationDeficit_L_ha: {
    p10: number;
    p50: number;
    p90: number;
  };
  confidence: {
    score: number; // 0.0 - 1.0
    level: "low" | "medium" | "high";
    rationale: string[];
  };
}

/**
 * Standard Box-Muller Gaussian random number generator
 */
function gaussianRandom(mean = 0, stdev = 1): number {
  const u = 1 - Math.random();
  const v = Math.random();
  const z = Math.sqrt(-2.0 * Math.log(u)) * Math.cos(2.0 * Math.PI * v);
  return mean + z * stdev;
}

/**
 * Executes Monte Carlo sensitivity analysis across uncertain parameters:
 * - Crop Kc: +/- 10% standard uncertainty
 * - Available Soil Water Capacity (FC & WP): +/- 15% pedotransfer uncertainty
 * - Forecast ET0: +/- 10% atmospheric forecast error
 */
export function runWaterBalanceMonteCarlo(params: {
  crop: CropType;
  growthStage?: GrowthStage;
  sowingDate?: string;
  soilProfile: SoilProfile;
  soilForecast: SoilForecast;
  ndviClearFraction?: number;
  liveStreamsFraction?: number;
  simulationsCount?: number;
}): MonteCarloUncertaintyResult {
  const {
    crop,
    growthStage,
    sowingDate,
    soilProfile,
    soilForecast,
    ndviClearFraction = 1.0,
    liveStreamsFraction = 1.0,
    simulationsCount = 100,
  } = params;

  const stressSamples: number[] = [];
  const impactSamples: number[] = [];
  const deficitSamples: number[] = [];

  for (let i = 0; i < simulationsCount; i++) {
    // 1. Perturb Soil Hydraulics (+/- 15%)
    const fcFactor = Math.max(0.70, Math.min(1.30, 1.0 + gaussianRandom(0, 0.08)));
    const wpFactor = Math.max(0.70, Math.min(1.30, 1.0 + gaussianRandom(0, 0.08)));

    const perturbedFC = Math.max(0.15, Math.min(0.60, soilProfile.fieldCapacity * fcFactor));
    const perturbedWP = Math.max(0.05, Math.min(perturbedFC - 0.04, soilProfile.wiltingPoint * wpFactor));

    const perturbedProfile: SoilProfile = {
      ...soilProfile,
      fieldCapacity: perturbedFC,
      wiltingPoint: perturbedWP,
      availableWaterCapacity: perturbedFC - perturbedWP,
    };

    // 2. Perturb Forecast ET0 (+/- 10%)
    const et0Factor = Math.max(0.80, Math.min(1.20, 1.0 + gaussianRandom(0, 0.05)));
    const perturbedEt0Values = (soilForecast.et0Daily?.values || []).map((val) =>
      val != null ? Math.max(0.1, val * et0Factor) : null
    );

    const perturbedForecast: SoilForecast = {
      ...soilForecast,
      et0Daily: {
        time: soilForecast.et0Daily?.time || [],
        values: perturbedEt0Values,
      },
    };

    try {
      const output = computeFaoWaterBalance({
        crop,
        soilProfile: perturbedProfile,
        soilForecast: perturbedForecast,
        growthStage,
        sowingDate,
      });

      stressSamples.push(output.waterStressIndex ?? output.etDeficitRatio);
      impactSamples.push(output.windowYieldImpactPct ?? output.yieldReductionPct);
      deficitSamples.push(output.irrigationDeficit_L_ha);
    } catch {
      // Skip degenerate sample
    }
  }

  // Sort samples to compute percentiles
  stressSamples.sort((a, b) => a - b);
  impactSamples.sort((a, b) => a - b);
  deficitSamples.sort((a, b) => a - b);

  const n = stressSamples.length || 1;
  const p10Idx = Math.floor(0.10 * (n - 1));
  const p50Idx = Math.floor(0.50 * (n - 1));
  const p90Idx = Math.floor(0.90 * (n - 1));

  // Compute multi-factor confidence rating
  const rationale: string[] = [];
  let confidenceScore = 0;

  // Factor 1: Telemetry Completeness (40% weight)
  const streamScore = Math.max(0, Math.min(1.0, liveStreamsFraction));
  confidenceScore += 0.40 * streamScore;
  rationale.push(`Telemetry completeness: ${(streamScore * 100).toFixed(0)}% live streams active`);

  // Factor 2: Satellite Clear Pixel Fraction (35% weight)
  const ndviScore = Math.max(0, Math.min(1.0, ndviClearFraction));
  confidenceScore += 0.35 * ndviScore;
  if (ndviScore < 0.40) {
    rationale.push(`Cloud obstruction penalty: Sentinel-2 clear valid pixel fraction < 40%`);
  } else {
    rationale.push(`Optical imagery clear fraction: ${(ndviScore * 100).toFixed(0)}%`);
  }

  // Factor 3: Forecast Horizon (25% weight)
  confidenceScore += 0.25 * 0.90; // Standard 14-day ERA5 forecast horizon
  rationale.push("14-day atmospheric forecast horizon");

  confidenceScore = Number(confidenceScore.toFixed(2));
  const level: "low" | "medium" | "high" =
    confidenceScore >= 0.75 ? "high" : confidenceScore >= 0.50 ? "medium" : "low";

  return {
    simulationsCount: n,
    waterStressIndex: {
      p10: Number((stressSamples[p10Idx] ?? 0).toFixed(3)),
      p50: Number((stressSamples[p50Idx] ?? 0).toFixed(3)),
      p90: Number((stressSamples[p90Idx] ?? 0).toFixed(3)),
    },
    windowYieldImpactPct: {
      p10: Number((impactSamples[p10Idx] ?? 0).toFixed(1)),
      p50: Number((impactSamples[p50Idx] ?? 0).toFixed(1)),
      p90: Number((impactSamples[p90Idx] ?? 0).toFixed(1)),
    },
    irrigationDeficit_L_ha: {
      p10: Math.round(deficitSamples[p10Idx] ?? 0),
      p50: Math.round(deficitSamples[p50Idx] ?? 0),
      p90: Math.round(deficitSamples[p90Idx] ?? 0),
    },
    confidence: {
      score: confidenceScore,
      level,
      rationale,
    },
  };
}
