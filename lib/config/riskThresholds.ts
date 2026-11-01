// =============================================================================
// TerraPulse — Deterministic Risk Classification Engine & Thresholds
// Strictly Zero Hallucination: Computes risk level directly from physical indicators
// =============================================================================

export type DeterministicRiskLevel = "LOW" | "MODERATE" | "HIGH" | "SEVERE" | "UNKNOWN";

export interface RiskIndicatorInputs {
  /** 14-day window relative water stress index: (1 - ETa / ETc) in [0, 1] */
  waterStressIndex?: number | null;
  /** 14-day window relative yield impact %: Ky * stress * windowFraction * 100 */
  windowYieldImpactPct?: number | null;
  /** Soil Moisture Deficit Index in [-1.0, +0.5] */
  smdi?: number | null;
  /** NDVI anomaly relative to previous scene / seasonal baseline */
  ndviAnomaly?: number | null;
  /** Maximum forecast temperature in Celsius */
  maxTemp_c?: number | null;
  /** 14-day forecast total precipitation in mm */
  forecastPrecip_mm?: number | null;
  /** Monsoon LPA rainfall deviation % */
  monsoonLpaDeviationPct?: number | null;
}

export interface DeterministicRiskResult {
  risk_level: DeterministicRiskLevel;
  risk_category: string;
  risk_basis: string[];
}

export const RISK_THRESHOLDS = {
  SEVERE: {
    minWindowYieldImpactPct: 25.0,
    minWaterStressIndex: 0.45,
    maxSmdi: -0.65,
    extremeHeatTempC: 43.0,
    extremeHeatStressIndex: 0.30,
  },
  HIGH: {
    minWindowYieldImpactPct: 12.0,
    minWaterStressIndex: 0.25,
    maxSmdi: -0.40,
    heatwaveTempC: 41.0,
    severeNdviDecline: -0.15,
  },
  MODERATE: {
    minWindowYieldImpactPct: 5.0,
    minWaterStressIndex: 0.10,
    maxSmdi: -0.20,
    moderateNdviDecline: -0.07,
    elevatedTempC: 38.0,
    monsoonDeficitPct: -25.0,
  },
} as const;

/**
 * Computes the agricultural micro-climate risk level deterministically from
 * measured numeric parameters. The LLM must NEVER invent or override this level;
 * it only explains the physical causes.
 */
export function computeDeterministicRisk(
  inputs: RiskIndicatorInputs
): DeterministicRiskResult {
  const basis: string[] = [];
  const {
    waterStressIndex,
    windowYieldImpactPct,
    smdi,
    ndviAnomaly,
    maxTemp_c,
    monsoonLpaDeviationPct,
  } = inputs;

  const hasData =
    waterStressIndex != null ||
    windowYieldImpactPct != null ||
    smdi != null ||
    ndviAnomaly != null ||
    maxTemp_c != null;

  if (!hasData) {
    return {
      risk_level: "UNKNOWN",
      risk_category: "Insufficient Live Telemetry",
      risk_basis: ["No live numerical indicators available to evaluate physical risk threshold."],
    };
  }

  // 1. Check SEVERE conditions
  let isSevere = false;
  if (
    windowYieldImpactPct != null &&
    windowYieldImpactPct >= RISK_THRESHOLDS.SEVERE.minWindowYieldImpactPct
  ) {
    isSevere = true;
    basis.push(
      `14-day window relative yield impact (${windowYieldImpactPct.toFixed(1)}%) exceeds severe threshold (${RISK_THRESHOLDS.SEVERE.minWindowYieldImpactPct}%)`
    );
  }
  if (
    waterStressIndex != null &&
    waterStressIndex >= RISK_THRESHOLDS.SEVERE.minWaterStressIndex
  ) {
    isSevere = true;
    basis.push(
      `Water stress index (${waterStressIndex.toFixed(2)}) indicates severe crop transpiration deficit (>= ${RISK_THRESHOLDS.SEVERE.minWaterStressIndex})`
    );
  }
  if (smdi != null && smdi <= RISK_THRESHOLDS.SEVERE.maxSmdi) {
    isSevere = true;
    basis.push(
      `Root-zone SMDI (${smdi.toFixed(2)}) indicates severe root-zone desiccation (<= ${RISK_THRESHOLDS.SEVERE.maxSmdi})`
    );
  }
  if (
    maxTemp_c != null &&
    maxTemp_c >= RISK_THRESHOLDS.SEVERE.extremeHeatTempC &&
    waterStressIndex != null &&
    waterStressIndex >= RISK_THRESHOLDS.SEVERE.extremeHeatStressIndex
  ) {
    isSevere = true;
    basis.push(
      `Compound extreme heat (${maxTemp_c.toFixed(1)}°C) combined with water stress (${waterStressIndex.toFixed(2)})`
    );
  }

  if (isSevere) {
    const category =
      maxTemp_c != null && maxTemp_c >= RISK_THRESHOLDS.SEVERE.extremeHeatTempC
        ? "Heatwave Terminal Stress"
        : "Severe Root-Zone Drought";
    return {
      risk_level: "SEVERE",
      risk_category: category,
      risk_basis: basis,
    };
  }

  // 2. Check HIGH conditions
  let isHigh = false;
  if (
    windowYieldImpactPct != null &&
    windowYieldImpactPct >= RISK_THRESHOLDS.HIGH.minWindowYieldImpactPct
  ) {
    isHigh = true;
    basis.push(
      `14-day window relative yield impact (${windowYieldImpactPct.toFixed(1)}%) exceeds high threshold (${RISK_THRESHOLDS.HIGH.minWindowYieldImpactPct}%)`
    );
  }
  if (
    waterStressIndex != null &&
    waterStressIndex >= RISK_THRESHOLDS.HIGH.minWaterStressIndex
  ) {
    isHigh = true;
    basis.push(
      `Transpiration stress index (${waterStressIndex.toFixed(2)}) exceeds high threshold (>= ${RISK_THRESHOLDS.HIGH.minWaterStressIndex})`
    );
  }
  if (smdi != null && smdi <= RISK_THRESHOLDS.HIGH.maxSmdi) {
    isHigh = true;
    basis.push(
      `Soil moisture deficit index (${smdi.toFixed(2)}) indicates significant root-zone depletion (<= ${RISK_THRESHOLDS.HIGH.maxSmdi})`
    );
  }
  if (maxTemp_c != null && maxTemp_c >= RISK_THRESHOLDS.HIGH.heatwaveTempC) {
    isHigh = true;
    basis.push(
      `Forecast peak temperature (${maxTemp_c.toFixed(1)}°C) exceeds heat stress threshold (>= ${RISK_THRESHOLDS.HIGH.heatwaveTempC}°C)`
    );
  }
  if (
    ndviAnomaly != null &&
    ndviAnomaly <= RISK_THRESHOLDS.HIGH.severeNdviDecline
  ) {
    isHigh = true;
    basis.push(
      `Sentinel-2 NDVI anomaly (${ndviAnomaly.toFixed(3)}) indicates sharp vegetative vigor decline (<= ${RISK_THRESHOLDS.HIGH.severeNdviDecline})`
    );
  }

  if (isHigh) {
    const category =
      maxTemp_c != null && maxTemp_c >= RISK_THRESHOLDS.HIGH.heatwaveTempC
        ? "Heatwave Terminal Stress"
        : "Moderate Soil Moisture Deficit";
    return {
      risk_level: "HIGH",
      risk_category: category,
      risk_basis: basis,
    };
  }

  // 3. Check MODERATE conditions
  let isModerate = false;
  if (
    windowYieldImpactPct != null &&
    windowYieldImpactPct >= RISK_THRESHOLDS.MODERATE.minWindowYieldImpactPct
  ) {
    isModerate = true;
    basis.push(
      `14-day window relative yield impact (${windowYieldImpactPct.toFixed(1)}%) in moderate range`
    );
  }
  if (
    waterStressIndex != null &&
    waterStressIndex >= RISK_THRESHOLDS.MODERATE.minWaterStressIndex
  ) {
    isModerate = true;
    basis.push(
      `Mild transpiration deficit (stress index = ${waterStressIndex.toFixed(2)})`
    );
  }
  if (smdi != null && smdi <= RISK_THRESHOLDS.MODERATE.maxSmdi) {
    isModerate = true;
    basis.push(
      `Root-zone soil moisture below optimal field capacity (SMDI = ${smdi.toFixed(2)})`
    );
  }
  if (
    ndviAnomaly != null &&
    ndviAnomaly <= RISK_THRESHOLDS.MODERATE.moderateNdviDecline
  ) {
    isModerate = true;
    basis.push(
      `Mild negative NDVI spectral anomaly (${ndviAnomaly.toFixed(3)})`
    );
  }
  if (
    monsoonLpaDeviationPct != null &&
    monsoonLpaDeviationPct <= RISK_THRESHOLDS.MODERATE.monsoonDeficitPct
  ) {
    isModerate = true;
    basis.push(
      `Historical 10-year monsoon LPA rainfall deficit of ${Math.abs(monsoonLpaDeviationPct).toFixed(1)}%`
    );
  }

  if (isModerate) {
    return {
      risk_level: "MODERATE",
      risk_category: "Moderate Soil Moisture Deficit",
      risk_basis: basis,
    };
  }

  // 4. LOW Risk
  return {
    risk_level: "LOW",
    risk_category: "Normal / Low Risk",
    risk_basis: [
      "All physical indicators (water balance, soil moisture, NDVI, temperature) within safe agronomic limits.",
    ],
  };
}
