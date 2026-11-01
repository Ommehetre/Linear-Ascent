// =============================================================================
// TerraPulse — Monsoon / Climate Data Ingestion
// Part A: 10-year JJAS historical archive (Open-Meteo archive API)
// Part B: 14-day precipitation forecast (Open-Meteo forecast API)
// Part C: NASA POWER agroclimatology + SPEI computation
// =============================================================================

import type { MonsoonData, AgentTraceStep } from "../../types/index.ts";
import { OpenMeteoArchiveSchema, NasaPowerSchema } from "../../lib/schemas.ts";
import { toIsoDate, toNasaDate, jjasRange, sumNonNull } from "../../lib/utils.ts";
import { computeSPEI } from "../yieldEngine.ts";
import { timedFetch } from "./fetchWithRetry.ts";
import { globalCache, SpatialTemporalCache, CACHE_TTL_MS } from "../../lib/cache.ts";

const OPEN_METEO_ARCHIVE_URL  = "https://archive-api.open-meteo.com/v1/archive";
const OPEN_METEO_FORECAST_URL = "https://api.open-meteo.com/v1/forecast";
const NASA_POWER_URL          = "https://power.larc.nasa.gov/api/temporal/daily/point";

// Historical years 2015–2024
const HISTORICAL_START_YEAR = 2015;
const HISTORICAL_END_YEAR   = 2024;

// ---------------------------------------------------------------------------
// Part A — Historical JJAS Archive
// ---------------------------------------------------------------------------

interface JjasYear {
  year: number;
  jjas_mm: number;
}

async function fetchJjasYear(
  lat: number,
  lon: number,
  year: number,
  trace: AgentTraceStep[]
): Promise<JjasYear> {
  const { start, end } = jjasRange(year);
  const params = new URLSearchParams({
    latitude:  String(lat),
    longitude: String(lon),
    start_date: start,
    end_date:   end,
    daily: "precipitation_sum,et0_fao_evapotranspiration",
  });

  const url = `${OPEN_METEO_ARCHIVE_URL}?${params.toString()}`;
  const timestamp = new Date().toISOString();

  const { response, latencyMs } = await timedFetch(url);

  if (trace[0]) {
    trace[0].apiCalls.push({
      url,
      method: "GET",
      statusCode: response.status,
      latencyMs,
      timestamp,
    });
  }

  if (!response.ok) {
    throw new Error(
      `Open-Meteo archive error ${response.status} for year ${year}`
    );
  }

  const json: unknown = await response.json();
  const parsed = OpenMeteoArchiveSchema.safeParse(json);

  if (!parsed.success) {
    throw new Error(
      `Open-Meteo archive schema error for ${year}: ${parsed.error.message}`
    );
  }

  const precipSeries = parsed.data.daily.precipitation_sum ?? [];
  const jjas_mm = sumNonNull(precipSeries);

  return { year, jjas_mm };
}

// ---------------------------------------------------------------------------
// Part B — 14-Day Forecast
// ---------------------------------------------------------------------------

interface ForecastDay {
  date: string;
  precip_mm: number;
  et0_mm: number;
}

async function fetch14DayForecast(
  lat: number,
  lon: number,
  trace: AgentTraceStep[]
): Promise<ForecastDay[]> {
  const params = new URLSearchParams({
    latitude:      String(lat),
    longitude:     String(lon),
    daily:         "precipitation_sum,et0_fao_evapotranspiration",
    forecast_days: "14",
  });

  const url = `${OPEN_METEO_FORECAST_URL}?${params.toString()}`;
  const timestamp = new Date().toISOString();

  const { response, latencyMs } = await timedFetch(url);

  if (trace[0]) {
    trace[0].apiCalls.push({
      url,
      method: "GET",
      statusCode: response.status,
      latencyMs,
      timestamp,
    });
  }

  if (!response.ok) {
    throw new Error(
      `Open-Meteo 14-day forecast error ${response.status}`
    );
  }

  const json: unknown = await response.json();
  const parsed = OpenMeteoArchiveSchema.safeParse(json);

  if (!parsed.success) {
    throw new Error(
      `Open-Meteo 14-day schema error: ${parsed.error.message}`
    );
  }

  const { time, precipitation_sum, et0_fao_evapotranspiration } =
    parsed.data.daily;

  return time.map((date, i) => ({
    date,
    precip_mm: precipitation_sum?.[i]   ?? 0,
    et0_mm:    et0_fao_evapotranspiration?.[i] ?? 0,
  }));
}

// ---------------------------------------------------------------------------
// Part C — NASA POWER
// ---------------------------------------------------------------------------

interface NasaPowerResult {
  T2M: Record<string, number>;
  PRECTOTCORR: Record<string, number>;
  EVPTRNS: Record<string, number>;
  WS2M: Record<string, number>;
  RH2M: Record<string, number>;
}

const NASA_FILL_VALUE = -999;

async function fetchNasaPower(
  lat: number,
  lon: number,
  trace: AgentTraceStep[]
): Promise<NasaPowerResult> {
  const startOfYear = new Date(new Date().getFullYear(), 0, 1);
  const today       = new Date();

  const params = new URLSearchParams({
    latitude:   String(lat),
    longitude:  String(lon),
    start:      toNasaDate(startOfYear),
    end:        toNasaDate(today),
    community:  "AG",
    parameters: "PRECTOTCORR,T2M,EVPTRNS,WS2M,RH2M",
    format:     "JSON",
  });

  const url = `${NASA_POWER_URL}?${params.toString()}`;
  const timestamp = new Date().toISOString();

  const { response, latencyMs } = await timedFetch(url);

  if (trace[0]) {
    trace[0].apiCalls.push({
      url,
      method: "GET",
      statusCode: response.status,
      latencyMs,
      timestamp,
    });
  }

  if (!response.ok) {
    throw new Error(`NASA POWER error ${response.status}`);
  }

  const json: unknown = await response.json();
  const parsed = NasaPowerSchema.safeParse(json);

  if (!parsed.success) {
    throw new Error(
      `NASA POWER schema error: ${parsed.error.message}`
    );
  }

  const params_data = parsed.data.properties.parameter;

  /** Filter fill values from a parameter record */
  function filterFillValues(
    rec: Record<string, number> | undefined
  ): Record<string, number> {
    if (!rec) return {};
    return Object.fromEntries(
      Object.entries(rec).filter(([, v]) => v !== NASA_FILL_VALUE)
    );
  }

  return {
    T2M:         filterFillValues(params_data["T2M"]),
    PRECTOTCORR: filterFillValues(params_data["PRECTOTCORR"]),
    EVPTRNS:     filterFillValues(params_data["EVPTRNS"]),
    WS2M:        filterFillValues(params_data["WS2M"]),
    RH2M:        filterFillValues(params_data["RH2M"]),
  };
}

// ---------------------------------------------------------------------------
// SPEI helper: Build 36-month water-balance array from daily historical data
// ---------------------------------------------------------------------------

/**
 * Groups daily values into calendar months (YYYY-MM → total).
 */
function sumByMonth(daily: { time: string; value: number }[]): Map<string, number> {
  const map = new Map<string, number>();
  for (const { time, value } of daily) {
    const key = time.slice(0, 7); // "YYYY-MM"
    map.set(key, (map.get(key) ?? 0) + value);
  }
  return map;
}

/**
 * Given 10 years of historical JJAS data plus daily archive responses,
 * compute monthly P − ET0 water balance for the last 36 months.
 *
 * We use the 10-year archive to build the historical P series, and
 * et0 from the same Open-Meteo archive responses.
 */
function buildWaterBalance(
  lat: number,
  lon: number,
  historicalPrecipByMonth: Map<string, number>,
  historicalEt0ByMonth: Map<string, number>
): number[] {
  // Collect all months that appear in both maps, sorted
  const months = Array.from(
    new Set([
      ...historicalPrecipByMonth.keys(),
      ...historicalEt0ByMonth.keys(),
    ])
  ).sort();

  // Take the last 36 months (or fewer if data is shorter)
  const window = months.slice(-36);

  return window.map((m) => {
    const p   = historicalPrecipByMonth.get(m) ?? 0;
    const et0 = historicalEt0ByMonth.get(m)    ?? 0;
    return p - et0;
  });
}

// ---------------------------------------------------------------------------
// Main export
// ---------------------------------------------------------------------------

export async function fetchMonsoonData(
  lat: number,
  lon: number,
  trace: AgentTraceStep[]
): Promise<MonsoonData> {
  const cacheKey = SpatialTemporalCache.makeSpatialKey("open-meteo:monsoon", lat, lon);
  const cached = globalCache.get<MonsoonData>(cacheKey);
  if (cached) {
    if (trace[0]) {
      trace[0].apiCalls.push({
        url: `cache:${cacheKey}`,
        method: "GET",
        statusCode: 304,
        latencyMs: 0,
        timestamp: new Date().toISOString(),
      });
    }
    return cached;
  }
  // ---- Part A: Historical 10-year archive in a single multi-year call ----
  const historicalPrecipByMonth = new Map<string, number>();
  const historicalEt0ByMonth = new Map<string, number>();
  const jjasByYear = new Map<number, number>();

  // Pre-initialize years
  for (let y = HISTORICAL_START_YEAR; y <= HISTORICAL_END_YEAR; y++) {
    jjasByYear.set(y, 0);
  }

  const multiYearParams = new URLSearchParams({
    latitude: String(lat),
    longitude: String(lon),
    start_date: `${HISTORICAL_START_YEAR}-01-01`,
    end_date: `${HISTORICAL_END_YEAR}-12-31`,
    daily: "precipitation_sum,et0_fao_evapotranspiration",
  });

  const archiveUrl = `${OPEN_METEO_ARCHIVE_URL}?${multiYearParams.toString()}`;
  const timestamp = new Date().toISOString();

  try {
    const { response, latencyMs } = await timedFetch(archiveUrl);

    if (trace[0]) {
      trace[0].apiCalls.push({
        url: archiveUrl,
        method: "GET",
        statusCode: response.status,
        latencyMs,
        timestamp,
      });
    }

    if (response.ok) {
      const json: unknown = await response.json();
      const parsed = OpenMeteoArchiveSchema.safeParse(json);

      if (parsed.success) {
        const { time, precipitation_sum, et0_fao_evapotranspiration } =
          parsed.data.daily;

        time.forEach((date, i) => {
          const p = precipitation_sum?.[i] ?? 0;
          const et0 = et0_fao_evapotranspiration?.[i] ?? 0;

          const year = parseInt(date.slice(0, 4), 10);
          const month = parseInt(date.slice(5, 7), 10);
          const monthKey = date.slice(0, 7);

          // Record monthly water balance
          historicalPrecipByMonth.set(
            monthKey,
            (historicalPrecipByMonth.get(monthKey) ?? 0) + p
          );
          historicalEt0ByMonth.set(
            monthKey,
            (historicalEt0ByMonth.get(monthKey) ?? 0) + et0
          );

          // Indian Monsoon JJAS is June (6), July (7), August (8), September (9)
          if (month >= 6 && month <= 9 && jjasByYear.has(year)) {
            jjasByYear.set(year, (jjasByYear.get(year) ?? 0) + p);
          }
        });
      }
    }
  } catch (e: any) {
    console.warn("Multi-year archive fetch error:", e.message);
  }

  const historical: { year: number; jjas_mm: number }[] = [];
  for (let y = HISTORICAL_START_YEAR; y <= HISTORICAL_END_YEAR; y++) {
    const total = jjasByYear.get(y) ?? 0;
    // Fallback baseline if specific year had gaps
    historical.push({ year: y, jjas_mm: total > 0 ? total : 880 });
  }

  // ---- LPA calculations ----
  const lpa_mm =
    historical.reduce((s, h) => s + h.jjas_mm, 0) / historical.length;
  const currentYear = historical[historical.length - 1]!;
  const lpa_deviation_pct =
    lpa_mm > 0 ? ((currentYear.jjas_mm - lpa_mm) / lpa_mm) * 100 : 0;

  // ---- Part B: 14-day forecast ----
  const forecast14d = await fetch14DayForecast(lat, lon, trace);

  // ---- Part C: NASA POWER ----
  const nasaPower = await fetchNasaPower(lat, lon, trace);

  // ---- SPEI ----
  const waterBalance = buildWaterBalance(
    lat,
    lon,
    historicalPrecipByMonth,
    historicalEt0ByMonth
  );
  const spei = computeSPEI(waterBalance);

  const data: MonsoonData = {
    historical,
    lpa_mm,
    lpa_deviation_pct,
    forecast14d,
    spei,
    nasaPower,
  };
  globalCache.set(cacheKey, data, CACHE_TTL_MS.WEATHER);
  return data;
}
