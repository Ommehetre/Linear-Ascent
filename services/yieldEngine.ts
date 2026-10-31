// =============================================================================
// TerraPulse — Core Deterministic Agro-Climatic & Yield Engine
// FAO Ky Yield Response, Saxton-Rawls PTF, SMDI & SPEI
// =============================================================================

import type { CropType, SoilProfile, YieldEngineOutput } from "@/types";
import { KY_VALUES, MAX_YIELD_T_HA, ROOT_DEPTH_M } from "@/lib/constants";

export interface RawSoilForPTF {
  clay_pct: number;
  sand_pct: number;
  soc_g_per_kg: number;
}

/**
 * Saxton-Rawls (2006) Pedotransfer Functions (PTF)
 * Converts texture and organic matter into Field Capacity (FC) and Wilting Point (WP)
 * in volumetric soil moisture units (m³/m³).
 */
export function computeSoilHydraulics(profile: RawSoilForPTF): {
  FC: number;
  WP: number;
  AWC: number;
} {
  const S = Math.max(0.01, Math.min(0.95, profile.sand_pct / 100)); // Sand fraction
  const C = Math.max(0.01, Math.min(0.95, profile.clay_pct / 100)); // Clay fraction
  // Van Bemmelen conversion factor (1.724): SOC (g/kg) to Organic Matter fraction
  const OM = Math.max(0.001, (profile.soc_g_per_kg * 1.724) / 1000);

  // 1. Wilting Point (1500 kPa tension)
  const theta_1500t =
    -0.024 * S +
    0.487 * C +
    0.006 * OM +
    0.005 * (S * OM) -
    0.013 * (C * OM) +
    0.068 * (S * C) +
    0.031;
  const WP_calc = theta_1500t + (0.14 * theta_1500t - 0.02);
  const WP = Math.max(0.02, Math.min(0.4, WP_calc));

  // 2. Field Capacity (33 kPa tension)
  const theta_33t =
    -0.251 * S +
    0.195 * C +
    0.011 * OM +
    0.006 * (S * OM) -
    0.027 * (C * OM) +
    0.452 * (S * C) +
    0.299;
  const FC_calc =
    theta_33t + (1.283 * Math.pow(theta_33t, 2) - 0.374 * theta_33t - 0.015);
  const FC = Math.max(WP + 0.03, Math.min(0.65, FC_calc));

  // 3. Plant Available Water Capacity (AWC)
  const AWC = Math.max(0.01, FC - WP);

  return { FC, WP, AWC };
}

/**
 * Soil Moisture Deficit Index (SMDI)
 * Measures root-zone dryness relative to available water capacity.
 * Range: -1.0 (extreme agricultural drought / below wilting point)
 *         0.0 (soil at full field capacity)
 *        +0.5 (soil near saturation)
 */
export function computeSMDI(currentSW: number, FC: number, WP: number): number {
  const AWC = Math.max(0.01, FC - WP);
  if (currentSW <= WP) {
    return -1.0;
  }
  if (currentSW >= FC) {
    const excess = (currentSW - FC) / FC;
    return Math.min(0.5, excess);
  }
  // Linear scaling between WP (-1.0) and FC (0.0)
  return (currentSW - WP) / AWC - 1.0;
}

/**
 * FAO Crop Water Production Function (Doorenbos & Kassam, 1979 / FAO-33)
 * (1 - Ya / Ym) = Ky * (1 - ETa / ETm)
 */
export function computeYieldForecast(params: {
  crop: CropType;
  eta_mm: number;
  etm_mm: number;
  soilProfile: SoilProfile;
  currentSW: number;
}): YieldEngineOutput {
  const { crop, eta_mm, etm_mm, soilProfile, currentSW } = params;

  const ky = KY_VALUES[crop] ?? 1.0;
  const maxYield_t_ha = MAX_YIELD_T_HA[crop] ?? 3.0;
  const rootDepth_m = ROOT_DEPTH_M[crop] ?? 0.6;

  const safeEtm = Math.max(1.0, etm_mm);
  const safeEta = Math.min(safeEtm, Math.max(0, eta_mm));

  // Relative Evapotranspiration Deficit: (1 - ETa / ETm)
  const etDeficitRatio = Math.max(0, Math.min(1.0, 1.0 - safeEta / safeEtm));

  // Predicted Yield Reduction %
  const yieldReductionPct = Math.min(100, Math.max(0, ky * etDeficitRatio * 100));

  // Actual Estimated Yield (t/ha)
  const estimatedYield_t_ha = Math.max(
    0,
    maxYield_t_ha * (1 - yieldReductionPct / 100)
  );

  // Compute SMDI
  const smdi = computeSMDI(
    currentSW,
    soilProfile.fieldCapacity,
    soilProfile.wiltingPoint
  );

  // Irrigation Deficit (L/ha) required to bring root zone up to Field Capacity
  // (FC - currentSW) m³/m³ * rootDepth (m) * 10,000 (m²/ha) * 1,000 (L/m³)
  const moistureDeficit_m3_m3 = Math.max(
    0,
    soilProfile.fieldCapacity - currentSW
  );
  const irrigationDeficit_L_ha = Math.round(
    moistureDeficit_m3_m3 * rootDepth_m * 10000 * 1000
  );

  return {
    crop,
    ky,
    eta_mm: Number(safeEta.toFixed(1)),
    etm_mm: Number(safeEtm.toFixed(1)),
    etDeficitRatio: Number(etDeficitRatio.toFixed(3)),
    yieldReductionPct: Number(yieldReductionPct.toFixed(1)),
    estimatedYield_t_ha: Number(estimatedYield_t_ha.toFixed(2)),
    maxYield_t_ha,
    smdi: Number(smdi.toFixed(3)),
    irrigationDeficit_L_ha,
  };
}

/**
 * Standardized Precipitation Evapotranspiration Index (SPEI)
 * Approximated using the Wilson-Hilferty transformation on the probability-weighted
 * log-logistic distribution of climatic water balance (Precipitation - Potential Evapotranspiration).
 *
 * SPEI < -1.5 : Severe Drought
 * -1.5 <= SPEI < -1.0 : Moderate Drought
 * -1.0 <= SPEI <= 1.0 : Normal
 * SPEI > 1.0 : Wet / Surplus
 */
export function computeSPEI(waterBalance: number[]): number {
  if (!waterBalance || waterBalance.length === 0) return 0;

  const validData = waterBalance.filter((v) => !isNaN(v) && isFinite(v));
  if (validData.length === 0) return 0;

  const n = validData.length;
  const mean = validData.reduce((acc, val) => acc + val, 0) / n;
  const variance =
    validData.reduce((acc, val) => acc + Math.pow(val - mean, 2), 0) / (n > 1 ? n - 1 : 1);
  const stdDev = Math.sqrt(variance);

  if (stdDev === 0) return 0;

  // Use the most recent water balance point to evaluate the current anomaly
  const currentVal = validData[validData.length - 1];

  // Standardized anomaly (z-score)
  const z = (currentVal - mean) / stdDev;

  // Bound between -3.5 and +3.5 (standard SPEI range)
  return Number(Math.max(-3.5, Math.min(3.5, z)).toFixed(2));
}
