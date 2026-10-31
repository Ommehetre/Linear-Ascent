// =============================================================================
// TerraPulse — Shared TypeScript Types
// Single source of truth for all data shapes across the application.
// =============================================================================

export type CropType = "Rice" | "Wheat" | "Cotton" | "Soybean" | "Pulses";

export type RiskLevel = "low" | "medium" | "high" | "severe";

// ---------------------------------------------------------------------------
// Location
// ---------------------------------------------------------------------------
export interface FarmLocation {
  name: string;
  lat: number;
  lon: number;
  bbox: [number, number, number, number]; // [minLon, minLat, maxLon, maxLat]
  state: string;
  crop: CropType;
}

// ---------------------------------------------------------------------------
// Satellite / STAC
// ---------------------------------------------------------------------------
export interface NdviDataPoint {
  date: string;
  ndvi: number;
  ndwi: number;
  ndviStd: number;
  cloudCover: number;
}

export interface SentinelScene {
  id: string;
  datetime: string;
  cloudCover: number;
  visualHref: string;
  b04Href: string;
  b08Href: string;
  b03Href?: string;
  b11Href?: string;
  thumbnailHref: string;
  croppedPng?: string;
  ndvi?: number;
  ndwi?: number;
  ndviStd?: number;
  bbox: number[];
}

// ---------------------------------------------------------------------------
// Soil / Forecast
// ---------------------------------------------------------------------------
export interface SoilForecast {
  time: string[];
  soilMoisture_0_7: (number | null)[];
  soilMoisture_7_28: (number | null)[];
  soilMoisture_28_100: (number | null)[];
  soilTemp_0_7: (number | null)[];
  soilTemp_7_28: (number | null)[];
  et0Daily: { time: string[]; values: (number | null)[] };
}

export interface SoilProfile {
  clay_pct: number;
  sand_pct: number;
  silt_pct: number;
  ph: number;
  soc_g_per_kg: number;
  bulk_density_g_cm3: number;
  fieldCapacity: number; // derived via Saxton-Rawls (m³/m³)
  wiltingPoint: number; // derived via Saxton-Rawls (m³/m³)
  availableWaterCapacity: number;
}

// ---------------------------------------------------------------------------
// Monsoon / Climate
// ---------------------------------------------------------------------------
export interface MonsoonData {
  historical: { year: number; jjas_mm: number }[];
  lpa_mm: number;
  lpa_deviation_pct: number;
  forecast14d: { date: string; precip_mm: number; et0_mm: number }[];
  spei: number;
  nasaPower: {
    T2M: Record<string, number>;
    PRECTOTCORR: Record<string, number>;
    EVPTRNS: Record<string, number>;
    WS2M: Record<string, number>;
    RH2M: Record<string, number>;
  };
}

// ---------------------------------------------------------------------------
// Mandi / Market
// ---------------------------------------------------------------------------
export interface MandiRecord {
  commodity: string;
  market: string;
  district: string;
  state: string;
  variety?: string;
  modal_price: number;
  min_price: number;
  max_price: number;
  arrival_date: string;
}

// ---------------------------------------------------------------------------
// Yield Engine
// ---------------------------------------------------------------------------
export interface YieldEngineOutput {
  crop: CropType;
  ky: number;
  eta_mm: number; // actual ET (from Open-Meteo)
  etm_mm: number; // potential/max ET
  etDeficitRatio: number; // 1 - ETa/ETm
  yieldReductionPct: number; // Ky × (1 - ETa/ETm) × 100
  estimatedYield_t_ha: number;
  maxYield_t_ha: number;
  smdi: number; // Soil Moisture Deficit Index (-1 to +1)
  irrigationDeficit_L_ha: number; // litres per hectare needed
}

// ---------------------------------------------------------------------------
// Agent
// ---------------------------------------------------------------------------
export interface ApiCallRecord {
  url: string;
  method: string;
  statusCode: number;
  latencyMs: number;
  timestamp: string;
}

export interface AgentTraceStep {
  node: 1 | 2 | 3 | 4;
  label: string;
  status: "pending" | "running" | "done" | "fallback" | "error";
  durationMs?: number;
  apiCalls: ApiCallRecord[];
  output?: string;
  fallbackReason?: string;
}

export interface CitationTag {
  claim: string;
  source: string;
  timestamp: string;
}

export interface MitigationPlan {
  irrigationDeficit_L_ha: number;
  recommendations: string[];
  harvestAdvice: string;
  mandiRouting: string;
  rawText: string;
}

export interface DataProvenance {
  source: string;
  status: "live" | "cached" | "unavailable";
  fetchedAt: string;
  latencyMs?: number;
  error?: string;
}

export interface AgentReport {
  location: FarmLocation;
  generatedAt: string;
  trace: AgentTraceStep[];
  provenance: Record<string, DataProvenance>;
  confidence: number;
  scenes: SentinelScene[];
  ndviSeries?: NdviDataPoint[];
  ndviDecline?: boolean;
  ndviAnomaly?: number;
  isCroplandConfirmed?: boolean;
  lulcWarning?: string;
  soilForecast: SoilForecast | null;
  soilProfile: SoilProfile | null;
  monsoonData: MonsoonData | null;
  mandiData: MandiRecord[];
  yieldOutput: YieldEngineOutput | null;
  visionAnalysis: string;
  riskClassification: string;
  riskLevel: RiskLevel;
  citations: CitationTag[];
  mitigation: MitigationPlan;
}

// ---------------------------------------------------------------------------
// SSE Telemetry Stream
// ---------------------------------------------------------------------------
export interface SoilTelemetryEvent {
  type: "soil_update" | "connected" | "error";
  payload?: {
    soilMoisture_0_7: number;
    soilMoisture_7_28: number;
    soilMoisture_28_100: number;
    soilTemp_0_7: number;
    et0_today: number;
    source: string;
  };
  ts: string;
  message?: string;
}
