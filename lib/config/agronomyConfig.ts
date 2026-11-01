// =============================================================================
// TerraPulse — Typed Agronomic Configuration
// Sources:
// 1. FAO Irrigation and Drainage Paper No. 56 (Allen et al., 1998)
//    - Table 12: Single crop coefficients (Kc)
//    - Table 22: Soil water depletion fraction for no stress (p)
//    - Table 11: Lengths of crop development stages
// 2. FAO Irrigation and Drainage Paper No. 33 (Doorenbos & Kassam, 1979)
//    - Table 24: Stage-specific yield response factors (Ky)
// 3. Indian Council of Agricultural Research (ICAR) Agro-Climatic Calendars
// =============================================================================

import type { CropType } from "@/types";

export type GrowthStage = "initial" | "development" | "mid" | "late";

export interface CropStageParameters {
  /** Duration of this stage in days (FAO-56 Table 11) */
  durationDays: number;
  /** FAO-56 Crop coefficient Kc for this stage */
  kc: number;
  /** FAO-33 Stage-specific yield response factor Ky (Doorenbos & Kassam, 1979) */
  stageKy: number;
  /** FAO-56 Soil water depletion fraction p (clamped [0.1, 0.8]) */
  p: number;
}

export interface CropAgronomyProfile {
  crop: CropType;
  /** Common / botanical description */
  scientificName: string;
  /** Initial rooting depth in meters (at emergence) */
  initialRootDepth_m: number;
  /** Maximum rooting depth in meters (at mid-season full canopy) */
  maxRootDepth_m: number;
  /** Whole-season reference Ky for reference only (FAO-33 Table 24) */
  wholeSeasonKy: number;
  /** Baseline maximum achievable yield in India (t/ha, ICAR national benchmark) */
  maxYield_t_ha: number;
  /** Stages breakdown */
  stages: Record<GrowthStage, CropStageParameters>;
  /** Typical Indian sowing month (1 = Jan, 6 = June, etc.) by region */
  defaultSowingMonth: {
    Maharashtra: number; // e.g. June (6) for Kharif Cotton/Soybean
    Jharkhand: number;   // e.g. June (6) for Kharif Rice
    Punjab: number;      // e.g. November (11) for Rabi Wheat
    Default: number;
  };
}

/**
 * Depth strata for Open-Meteo ERA5 / ECMWF soil telemetry layers (meters)
 */
export interface SoilLayerStratum {
  name: string;
  top_m: number;
  bottom_m: number;
  thickness_m: number;
}

export const SOIL_STRATA: readonly SoilLayerStratum[] = [
  { name: "0-7cm",   top_m: 0.00, bottom_m: 0.07, thickness_m: 0.07 },
  { name: "7-28cm",  top_m: 0.07, bottom_m: 0.28, thickness_m: 0.21 },
  { name: "28-100cm",top_m: 0.28, bottom_m: 1.00, thickness_m: 0.72 },
] as const;

export const AGRONOMY_CONFIG: Record<CropType, CropAgronomyProfile> = {
  // ---------------------------------------------------------------------------
  // COTTON (Gossypium hirsutum)
  // FAO-56 Table 12: Kc_ini = 0.35, Kc_mid = 1.15-1.20, Kc_end = 0.50-0.70
  // FAO-33 Table 24: Ky vegetative = 0.20, flowering = 0.50, yield form = 0.50, ripening = 0.25
  // Total season: ~165 days in Central / Western India (Vidarbha)
  // ---------------------------------------------------------------------------
  Cotton: {
    crop: "Cotton",
    scientificName: "Gossypium hirsutum L.",
    initialRootDepth_m: 0.20,
    maxRootDepth_m: 1.00,
    wholeSeasonKy: 0.85,
    maxYield_t_ha: 2.2,
    stages: {
      initial: {
        durationDays: 30,
        kc: 0.35,
        stageKy: 0.20,
        p: 0.65,
      },
      development: {
        durationDays: 50,
        kc: 0.75,
        stageKy: 0.50, // squaring / early flowering
        p: 0.65,
      },
      mid: {
        durationDays: 55,
        kc: 1.20,
        stageKy: 0.50, // boll formation (most sensitive)
        p: 0.65,
      },
      late: {
        durationDays: 30,
        kc: 0.65,
        stageKy: 0.25, // boll opening / ripening
        p: 0.70,
      },
    },
    defaultSowingMonth: {
      Maharashtra: 6, // June (monsoon arrival)
      Jharkhand: 6,
      Punjab: 5,      // May
      Default: 6,
    },
  },

  // ---------------------------------------------------------------------------
  // SOYBEAN (Glycine max)
  // FAO-56 Table 12: Kc_ini = 0.40, Kc_mid = 1.15, Kc_end = 0.50
  // FAO-33 Table 24: Ky vegetative = 0.20, flowering = 0.80, pod fill = 1.00, ripening = 0.05
  // Total season: ~105 days in Central India (Marathwada/Vidarbha)
  // ---------------------------------------------------------------------------
  Soybean: {
    crop: "Soybean",
    scientificName: "Glycine max (L.) Merr.",
    initialRootDepth_m: 0.15,
    maxRootDepth_m: 0.65,
    wholeSeasonKy: 0.85,
    maxYield_t_ha: 3.0,
    stages: {
      initial: {
        durationDays: 20,
        kc: 0.40,
        stageKy: 0.20,
        p: 0.50,
      },
      development: {
        durationDays: 30,
        kc: 0.80,
        stageKy: 0.80, // flowering & pod set
        p: 0.50,
      },
      mid: {
        durationDays: 35,
        kc: 1.15,
        stageKy: 1.00, // pod development & seed filling (peak sensitivity)
        p: 0.50,
      },
      late: {
        durationDays: 20,
        kc: 0.50,
        stageKy: 0.05, // maturity / dry down
        p: 0.55,
      },
    },
    defaultSowingMonth: {
      Maharashtra: 6, // Late June
      Jharkhand: 6,
      Punjab: 6,
      Default: 6,
    },
  },

  // ---------------------------------------------------------------------------
  // RICE (Oryza sativa)
  // FAO-56 Table 12: Kc_ini = 1.05 (flooded/puddled), Kc_mid = 1.20, Kc_end = 0.90
  // FAO-33 Table 24: Ky vegetative = 0.20, flowering = 0.60, yield form = 0.50, ripening = 0.10
  // Total season: ~125 days in Eastern/Central India (Chota Nagpur)
  // ---------------------------------------------------------------------------
  Rice: {
    crop: "Rice",
    scientificName: "Oryza sativa L.",
    initialRootDepth_m: 0.15,
    maxRootDepth_m: 0.35,
    wholeSeasonKy: 1.09,
    maxYield_t_ha: 6.0,
    stages: {
      initial: {
        durationDays: 25,
        kc: 1.05,
        stageKy: 0.20,
        p: 0.20, // very shallow depletion allowed before stress in lowland rice
      },
      development: {
        durationDays: 30,
        kc: 1.15,
        stageKy: 0.60, // panicle initiation & booting
        p: 0.20,
      },
      mid: {
        durationDays: 45,
        kc: 1.20,
        stageKy: 0.50, // flowering & milk/dough stage
        p: 0.20,
      },
      late: {
        durationDays: 25,
        kc: 0.90,
        stageKy: 0.10, // ripening
        p: 0.25,
      },
    },
    defaultSowingMonth: {
      Maharashtra: 6,
      Jharkhand: 6,   // June-July (Aman rice)
      Punjab: 6,
      Default: 6,
    },
  },

  // ---------------------------------------------------------------------------
  // WHEAT (Triticum aestivum)
  // FAO-56 Table 12: Kc_ini = 0.30, Kc_mid = 1.15, Kc_end = 0.40
  // FAO-33 Table 24: Ky vegetative = 0.20, flowering = 0.60, yield form = 0.50, ripening = 0.10
  // Total season: ~130 days in Northern India (Punjab/Haryana)
  // ---------------------------------------------------------------------------
  Wheat: {
    crop: "Wheat",
    scientificName: "Triticum aestivum L.",
    initialRootDepth_m: 0.20,
    maxRootDepth_m: 0.95,
    wholeSeasonKy: 1.00,
    maxYield_t_ha: 4.5,
    stages: {
      initial: {
        durationDays: 20,
        kc: 0.30,
        stageKy: 0.20, // crown root initiation
        p: 0.55,
      },
      development: {
        durationDays: 35,
        kc: 0.75,
        stageKy: 0.60, // jointing & booting
        p: 0.55,
      },
      mid: {
        durationDays: 45,
        kc: 1.15,
        stageKy: 0.50, // flowering & grain fill
        p: 0.55,
      },
      late: {
        durationDays: 30,
        kc: 0.40,
        stageKy: 0.10, // maturity / harvesting
        p: 0.60,
      },
    },
    defaultSowingMonth: {
      Maharashtra: 11, // November
      Jharkhand: 11,
      Punjab: 11,      // November (Rabi)
      Default: 11,
    },
  },

  // ---------------------------------------------------------------------------
  // PULSES (Pigeonpea / Arhar / Chickpea)
  // FAO-56 Table 12: Kc_ini = 0.40, Kc_mid = 1.15, Kc_end = 0.35
  // FAO-33 Table 24: Ky vegetative = 0.20, flowering = 0.60, yield form = 0.50, ripening = 0.10
  // ---------------------------------------------------------------------------
  Pulses: {
    crop: "Pulses",
    scientificName: "Cajanus cajan / Cicer arietinum",
    initialRootDepth_m: 0.15,
    maxRootDepth_m: 0.55,
    wholeSeasonKy: 0.80,
    maxYield_t_ha: 1.5,
    stages: {
      initial: {
        durationDays: 20,
        kc: 0.40,
        stageKy: 0.20,
        p: 0.45,
      },
      development: {
        durationDays: 30,
        kc: 0.80,
        stageKy: 0.60,
        p: 0.45,
      },
      mid: {
        durationDays: 35,
        kc: 1.15,
        stageKy: 0.50, // pod development
        p: 0.45,
      },
      late: {
        durationDays: 25,
        kc: 0.35,
        stageKy: 0.10,
        p: 0.50,
      },
    },
    defaultSowingMonth: {
      Maharashtra: 6,
      Jharkhand: 6,
      Punjab: 10,
      Default: 6,
    },
  },
};
