import type { FarmLocation, CropType } from "@/types";

// ---------------------------------------------------------------------------
// FAO Ky yield response factors (dimensionless)
// Doorenbos & Kassam (1979) — Water Requirements for Crop Production
// ---------------------------------------------------------------------------
export const KY_VALUES: Record<CropType, number> = {
  Rice: 1.09,
  Wheat: 1.0,
  Cotton: 0.85,
  Soybean: 0.85,
  Pulses: 0.8,
};

// ---------------------------------------------------------------------------
// Reference maximum yields for India (t/ha) — ICAR national averages
// ---------------------------------------------------------------------------
export const MAX_YIELD_T_HA: Record<CropType, number> = {
  Rice: 6.0,
  Wheat: 4.5,
  Cotton: 2.2,
  Soybean: 3.0,
  Pulses: 1.5,
};

// ---------------------------------------------------------------------------
// Typical root zone depths (m) — FAO Irrigation & Drainage Paper 56
// ---------------------------------------------------------------------------
export const ROOT_DEPTH_M: Record<CropType, number> = {
  Rice: 0.2,
  Wheat: 0.9,
  Cotton: 1.0,
  Soybean: 0.6,
  Pulses: 0.45,
};

// ---------------------------------------------------------------------------
// Quick-select farm presets
// ---------------------------------------------------------------------------
export const FARM_PRESETS: FarmLocation[] = [
  {
    name: "Vidarbha (Nagpur)",
    lat: 21.1458,
    lon: 79.0882,
    bbox: [78.9, 21.0, 79.3, 21.3],
    state: "Maharashtra",
    crop: "Cotton",
  },
  {
    name: "Marathwada (Aurangabad)",
    lat: 19.8762,
    lon: 75.3433,
    bbox: [75.2, 19.7, 75.5, 20.0],
    state: "Maharashtra",
    crop: "Soybean",
  },
  {
    name: "Chota Nagpur (Jamshedpur)",
    lat: 22.8046,
    lon: 86.2029,
    bbox: [86.0, 22.6, 86.4, 23.0],
    state: "Jharkhand",
    crop: "Rice",
  },
  {
    name: "Punjab (Ludhiana)",
    lat: 30.9009,
    lon: 75.8573,
    bbox: [75.7, 30.8, 76.0, 31.0],
    state: "Punjab",
    crop: "Wheat",
  },
];

// ---------------------------------------------------------------------------
// Agent / ingestion constants
// ---------------------------------------------------------------------------
export const CLOUD_COVER_THRESHOLD = 40; // % — agent auto-expands window if exceeded
export const STAC_MAX_SCENES = 5;
export const STAC_INITIAL_WINDOW_DAYS = 30;
export const STAC_MAX_RETRY_DAYS = 90;
export const API_TIMEOUT_MS = 12000;
export const EXPONENTIAL_BACKOFF_BASE_MS = 1000;
export const SSE_POLL_INTERVAL_MS = 30000;

// JJAS = June–September monsoon season
export const MONSOON_START_MONTH = 6; // June
export const MONSOON_END_MONTH = 9; // September
export const HISTORICAL_YEARS = 10; // 2015–2024

// SoilGrids depth labels we query
export const SOILGRIDS_DEPTHS = ["0-5cm", "5-15cm", "15-30cm"];

// ISRO Bhuvan WMS state-to-layer-code map (best-available LULC cycle)
export const BHUVAN_LULC_LAYERS: Record<string, string> = {
  Maharashtra: "lulc:MH_LULC50K_1516",
  Jharkhand: "lulc:JH_LULC50K_1516",
  Punjab: "lulc:PB_LULC50K_1516",
  "Default": "lulc:IND_LULC50K_1516",
};

// Risk-level colour palette (Tailwind class suffixes)
export const RISK_COLORS: Record<string, string> = {
  low: "emerald",
  medium: "amber",
  high: "red",
  severe: "purple",
};
