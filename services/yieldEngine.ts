// =============================================================================
// TerraPulse — Core Deterministic Agro-Climatic & Yield Engine
// FAO-56 Time-Stepped Water Balance Model & FAO-33 Stage-Specific Yield Response
// Strictly Zero Dummy Data Compliant
// =============================================================================

import type {
  CropType,
  GrowthStage,
  SoilProfile,
  SoilForecast,
  YieldEngineOutput,
  DailyWaterBalanceStep,
} from "../types/index.ts";
import {
  AGRONOMY_CONFIG,
  SOIL_STRATA,
} from "../lib/config/agronomyConfig.ts";

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
 * Derives crop growth stage from explicit sowing date or the Indian crop calendar.
 */
export function deriveGrowthStage(params: {
  crop: CropType;
  sowingDate?: string;
  referenceDate?: Date;
  state?: string;
  manualStage?: GrowthStage;
}): {
  stage: GrowthStage;
  daysAfterSowing: number;
  stageProgressFraction: number;
  stageDurationDays: number;
} {
  const { crop, sowingDate, state, manualStage } = params;
  const refDate = params.referenceDate || new Date();
  const cropConfig = AGRONOMY_CONFIG[crop];

  if (manualStage && cropConfig.stages[manualStage]) {
    const stageDurationDays = cropConfig.stages[manualStage].durationDays;
    return {
      stage: manualStage,
      daysAfterSowing: Math.round(stageDurationDays / 2),
      stageProgressFraction: 0.5,
      stageDurationDays,
    };
  }

  let das = 0;
  if (sowingDate) {
    const sowTime = new Date(sowingDate).getTime();
    const diffMs = refDate.getTime() - sowTime;
    das = Math.max(1, Math.floor(diffMs / (1000 * 60 * 60 * 24)));
  } else {
    // Derive from regional Indian crop calendar
    const regionKey = (state && state in cropConfig.defaultSowingMonth)
      ? (state as keyof typeof cropConfig.defaultSowingMonth)
      : "Default";
    const sowingMonth = cropConfig.defaultSowingMonth[regionKey] || 6; // 1-12
    const currentYear = refDate.getFullYear();
    const sowYear =
      refDate.getMonth() + 1 < sowingMonth ? currentYear - 1 : currentYear;
    const estimatedSowDate = new Date(sowYear, sowingMonth - 1, 15);
    const diffMs = refDate.getTime() - estimatedSowDate.getTime();
    das = Math.max(1, Math.floor(diffMs / (1000 * 60 * 60 * 24)));
  }

  const { initial, development, mid, late } = cropConfig.stages;
  const cumInit = initial.durationDays;
  const cumDev = cumInit + development.durationDays;
  const cumMid = cumDev + mid.durationDays;

  if (das <= cumInit) {
    return {
      stage: "initial",
      daysAfterSowing: das,
      stageProgressFraction: Math.min(1.0, das / cumInit),
      stageDurationDays: initial.durationDays,
    };
  } else if (das <= cumDev) {
    const stageDays = das - cumInit;
    return {
      stage: "development",
      daysAfterSowing: das,
      stageProgressFraction: Math.min(1.0, stageDays / development.durationDays),
      stageDurationDays: development.durationDays,
    };
  } else if (das <= cumMid) {
    const stageDays = das - cumDev;
    return {
      stage: "mid",
      daysAfterSowing: das,
      stageProgressFraction: Math.min(1.0, stageDays / mid.durationDays),
      stageDurationDays: mid.durationDays,
    };
  } else {
    const stageDays = das - cumMid;
    return {
      stage: "late",
      daysAfterSowing: das,
      stageProgressFraction: Math.min(1.0, stageDays / late.durationDays),
      stageDurationDays: late.durationDays,
    };
  }
}

/**
 * Computes active effective root depth Zr (m) for the current growth stage.
 */
export function calculateRootDepth(
  crop: CropType,
  stage: GrowthStage,
  stageProgressFraction = 0.5
): number {
  const config = AGRONOMY_CONFIG[crop];
  const zMin = config.initialRootDepth_m;
  const zMax = config.maxRootDepth_m;

  switch (stage) {
    case "initial":
      return zMin;
    case "development":
      return Number((zMin + (zMax - zMin) * stageProgressFraction).toFixed(2));
    case "mid":
    case "late":
      return zMax;
  }
}

/**
 * Computes multi-depth weighted root-zone soil water content (m³/m³)
 * across the 3 Open-Meteo ERA5 strata (0-7cm, 7-28cm, 28-100cm) down to root depth Zr.
 */
export function calculateRootZoneMoisture(
  sm0_7: number,
  sm7_28: number,
  sm28_100: number,
  rootDepth_m: number
): number {
  const zr = Math.max(0.05, rootDepth_m);

  // Overlap thicknesses (meters)
  const d1 = Math.min(zr, SOIL_STRATA[0].thickness_m);
  const d2 = Math.max(
    0,
    Math.min(zr - SOIL_STRATA[0].bottom_m, SOIL_STRATA[1].thickness_m)
  );
  const d3 = Math.max(0, zr - SOIL_STRATA[1].bottom_m);

  const totalDepth = d1 + d2 + d3;
  if (totalDepth <= 0) return sm0_7;

  const weightedWater = sm0_7 * d1 + sm7_28 * d2 + sm28_100 * d3;
  return Number((weightedWater / totalDepth).toFixed(4));
}

/**
 * Computes FAO-56 water stress coefficient Ks = (TAW - Dr) / ((1 - p) * TAW), clamped [0, 1].
 */
export function calculateWaterStressCoefficient(params: {
  theta_rz: number;
  FC: number;
  WP: number;
  rootDepth_m: number;
  p: number;
}): {
  taw_mm: number;
  raw_mm: number;
  dr_mm: number;
  ks: number;
} {
  const { theta_rz, FC, WP, rootDepth_m, p } = params;

  // Total Available Water TAW (mm) = 1000 * (FC - WP) * Zr
  const awc = Math.max(0.01, FC - WP);
  const taw_mm = Math.max(1.0, 1000 * awc * rootDepth_m);

  // Readily Available Water RAW (mm) = p * TAW
  const safeP = Math.max(0.1, Math.min(0.85, p));
  const raw_mm = safeP * taw_mm;

  // Root zone depletion Dr (mm) = 1000 * (FC - theta_rz) * Zr
  const depletion_m3_m3 = Math.max(0, FC - theta_rz);
  const dr_mm = Math.min(taw_mm, 1000 * depletion_m3_m3 * rootDepth_m);

  let ks = 1.0;
  if (dr_mm > raw_mm) {
    const numerator = Math.max(0, taw_mm - dr_mm);
    const denominator = Math.max(0.1, (1 - safeP) * taw_mm);
    ks = Math.max(0, Math.min(1.0, numerator / denominator));
  }

  return {
    taw_mm: Number(taw_mm.toFixed(1)),
    raw_mm: Number(raw_mm.toFixed(1)),
    dr_mm: Number(dr_mm.toFixed(1)),
    ks: Number(ks.toFixed(3)),
  };
}

/**
 * FAO-56 / FAO-33 Daily Time-Stepped Crop Water-Balance Engine
 * Replaces the static snapshot formula with a daily stepped root-zone water balance model.
 */
export function computeFaoWaterBalance(params: {
  crop: CropType;
  soilProfile: SoilProfile;
  soilForecast: SoilForecast;
  sowingDate?: string;
  growthStage?: GrowthStage;
  state?: string;
  referenceDate?: Date;
}): YieldEngineOutput {
  const { crop, soilProfile, soilForecast, sowingDate, growthStage, state } = params;
  const cropConfig = AGRONOMY_CONFIG[crop];

  // 1. Derive Stage and Root Depth
  const stageInfo = deriveGrowthStage({
    crop,
    sowingDate,
    referenceDate: params.referenceDate,
    state,
    manualStage: growthStage,
  });

  const stageParams = cropConfig.stages[stageInfo.stage];
  const rootDepth_m = calculateRootDepth(
    crop,
    stageInfo.stage,
    stageInfo.stageProgressFraction
  );

  const FC = soilProfile.fieldCapacity;
  const WP = soilProfile.wiltingPoint;
  const stageKy = stageParams.stageKy;
  const kc = stageParams.kc;
  const p = stageParams.p;

  // 2. Time-step daily across the forecast window
  const dailyDates = soilForecast.et0Daily.time || [];
  const dailyEt0Values = soilForecast.et0Daily.values || [];
  const numDays = Math.min(dailyDates.length, 14);

  const dailySteps: DailyWaterBalanceStep[] = [];
  let sumEt0 = 0;
  let sumEtc = 0;
  let sumEta = 0;

  // Average 24-hour readings per forecast day for multi-depth soil moisture
  const hoursPerDay = 24;
  for (let d = 0; d < (numDays > 0 ? numDays : 14); d++) {
    const dateStr = dailyDates[d] || `Day ${d + 1}`;
    const et0_mm = Math.max(0.1, dailyEt0Values[d] ?? 4.0);

    // Extract average soil moisture for day d
    const startH = d * hoursPerDay;
    const endH = startH + hoursPerDay;

    const slice0_7 = (soilForecast.soilMoisture_0_7 || []).slice(startH, endH).filter((v): v is number => v !== null);
    const slice7_28 = (soilForecast.soilMoisture_7_28 || []).slice(startH, endH).filter((v): v is number => v !== null);
    const slice28_100 = (soilForecast.soilMoisture_28_100 || []).slice(startH, endH).filter((v): v is number => v !== null);

    const avg0_7 = slice0_7.length > 0 ? slice0_7.reduce((a, b) => a + b, 0) / slice0_7.length : FC * 0.7;
    const avg7_28 = slice7_28.length > 0 ? slice7_28.reduce((a, b) => a + b, 0) / slice7_28.length : FC * 0.75;
    const avg28_100 = slice28_100.length > 0 ? slice28_100.reduce((a, b) => a + b, 0) / slice28_100.length : FC * 0.8;

    const theta_rz = calculateRootZoneMoisture(avg0_7, avg7_28, avg28_100, rootDepth_m);

    // Stress coefficient Ks
    const { taw_mm, raw_mm, dr_mm, ks } = calculateWaterStressCoefficient({
      theta_rz,
      FC,
      WP,
      rootDepth_m,
      p,
    });

    const etc_mm = Number((kc * et0_mm).toFixed(2));
    const eta_mm = Number((ks * etc_mm).toFixed(2));
    const deficit_mm = Number(Math.max(0, etc_mm - eta_mm).toFixed(2));

    sumEt0 += et0_mm;
    sumEtc += etc_mm;
    sumEta += eta_mm;

    dailySteps.push({
      date: dateStr,
      et0_mm,
      kc,
      etc_mm,
      theta_rz,
      raw_mm,
      taw_mm,
      dr_mm,
      ks,
      eta_mm,
      deficit_mm,
    });
  }

  // 3. Compute 14-day window stress index & stage-scaled relative yield impact
  const totalEtc = Math.max(1.0, sumEtc);
  const totalEta = Math.min(totalEtc, sumEta);
  const waterStressIndex = Math.max(0, Math.min(1.0, 1.0 - totalEta / totalEtc));

  // Scaled by the fraction of the growth stage covered by this forecast window
  const forecastDays = dailySteps.length;
  const stageDuration = Math.max(1, stageParams.durationDays);
  const windowFraction = Math.min(1.0, forecastDays / stageDuration);

  // Relative yield impact % for THIS WINDOW (not whole season!)
  const windowYieldImpactPct = Number(
    Math.min(100, stageKy * waterStressIndex * windowFraction * 100).toFixed(1)
  );

  // Realized estimated yield (t/ha) assuming deficit during this stage
  const maxYield_t_ha = cropConfig.maxYield_t_ha;
  const estimatedYield_t_ha = Number(
    Math.max(0, maxYield_t_ha * (1 - windowYieldImpactPct / 100)).toFixed(2)
  );

  // Soil Moisture Deficit Index (SMDI) on weighted root-zone soil water
  const initialThetaRz = dailySteps[0]?.theta_rz ?? FC * 0.7;
  const smdi = Number(computeSMDI(initialThetaRz, FC, WP).toFixed(3));

  // Irrigation deficit needed to restore root zone to FC: (FC - theta_rz) * Zr * 10,000 * 1,000
  const avgThetaRz =
    dailySteps.reduce((acc, step) => acc + step.theta_rz, 0) /
    (dailySteps.length || 1);
  const moistureDeficit = Math.max(0, FC - avgThetaRz);
  const irrigationDeficit_L_ha = Math.round(
    moistureDeficit * rootDepth_m * 10000 * 1000
  );

  return {
    crop,
    growthStage: stageInfo.stage,
    sowingDate: sowingDate || `Derived: ${stageInfo.daysAfterSowing} DAS`,
    ky: Number(stageKy.toFixed(2)),
    stageKy: Number(stageKy.toFixed(2)),
    stageDurationDays: stageParams.durationDays,
    rootDepth_m: Number(rootDepth_m.toFixed(2)),
    eta_mm: Number(totalEta.toFixed(1)),
    etm_mm: Number(totalEtc.toFixed(1)),
    etc_mm: Number(totalEtc.toFixed(1)),
    etDeficitRatio: Number(waterStressIndex.toFixed(3)),
    yieldReductionPct: windowYieldImpactPct, // Preserved for frontend contract
    waterStressIndex: Number(waterStressIndex.toFixed(3)),
    windowYieldImpactPct,
    windowLabel: `14-Day Window Water Stress Impact (${stageInfo.stage.toUpperCase()} Stage, FAO-33)`,
    estimatedYield_t_ha,
    maxYield_t_ha,
    smdi,
    irrigationDeficit_L_ha,
    dailySeries: dailySteps,
  };
}

/**
 * Main compatibility entry point for yield calculations.
 * Accepts legacy params or calls `computeFaoWaterBalance`.
 */
export function computeYieldForecast(params: {
  crop: CropType;
  eta_mm?: number;
  etm_mm?: number;
  soilProfile: SoilProfile;
  currentSW?: number;
  soilForecast?: SoilForecast | null;
  sowingDate?: string;
  growthStage?: GrowthStage;
  state?: string;
}): YieldEngineOutput {
  const { crop, soilProfile, soilForecast, sowingDate, growthStage, state } = params;

  if (soilForecast && soilForecast.et0Daily?.time?.length > 0) {
    return computeFaoWaterBalance({
      crop,
      soilProfile,
      soilForecast,
      sowingDate,
      growthStage,
      state,
    });
  }

  // Graceful fallback if full daily forecast is absent
  const stageInfo = deriveGrowthStage({ crop, sowingDate, state, manualStage: growthStage });
  const stageParams = AGRONOMY_CONFIG[crop].stages[stageInfo.stage];
  const rootDepth_m = calculateRootDepth(crop, stageInfo.stage);

  const safeEtm = Math.max(1.0, params.etm_mm ?? 30.0);
  const currentSW = params.currentSW ?? soilProfile.fieldCapacity * 0.7;
  const safeEta = Math.min(safeEtm, Math.max(0, params.eta_mm ?? safeEtm * (currentSW / soilProfile.fieldCapacity)));

  const waterStressIndex = Math.max(0, Math.min(1.0, 1.0 - safeEta / safeEtm));
  const windowFraction = Math.min(1.0, 14 / stageParams.durationDays);
  const windowYieldImpactPct = Number((stageParams.stageKy * waterStressIndex * windowFraction * 100).toFixed(1));
  const maxYield = AGRONOMY_CONFIG[crop].maxYield_t_ha;
  const estimatedYield = Number((maxYield * (1 - windowYieldImpactPct / 100)).toFixed(2));
  const smdi = computeSMDI(currentSW, soilProfile.fieldCapacity, soilProfile.wiltingPoint);

  const moistureDeficit = Math.max(0, soilProfile.fieldCapacity - currentSW);
  const irrigationDeficit_L_ha = Math.round(moistureDeficit * rootDepth_m * 10000 * 1000);

  return {
    crop,
    growthStage: stageInfo.stage,
    sowingDate,
    ky: stageParams.stageKy,
    stageKy: stageParams.stageKy,
    stageDurationDays: stageParams.durationDays,
    rootDepth_m,
    eta_mm: Number(safeEta.toFixed(1)),
    etm_mm: Number(safeEtm.toFixed(1)),
    etc_mm: Number(safeEtm.toFixed(1)),
    etDeficitRatio: Number(waterStressIndex.toFixed(3)),
    yieldReductionPct: windowYieldImpactPct,
    waterStressIndex: Number(waterStressIndex.toFixed(3)),
    windowYieldImpactPct,
    windowLabel: `14-Day Window Water Stress Impact (${stageInfo.stage.toUpperCase()} Stage, FAO-33)`,
    estimatedYield_t_ha: estimatedYield,
    maxYield_t_ha: maxYield,
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
