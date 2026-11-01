// =============================================================================
// TerraPulse — Open-Meteo Soil Forecast Ingestion (ERA5 Seamless)
// =============================================================================

import type { SoilForecast, AgentTraceStep } from "../../types/index.ts";
import { OpenMeteoSoilSchema } from "../../lib/schemas.ts";
import { forwardFill } from "../../lib/utils.ts";
import { timedFetch } from "./fetchWithRetry.ts";
import { globalCache, SpatialTemporalCache, CACHE_TTL_MS } from "../../lib/cache.ts";

const OPEN_METEO_FORECAST_URL = "https://api.open-meteo.com/v1/forecast";

/**
 * Fetch a 14-day soil moisture & temperature forecast plus daily ET0
 * from Open-Meteo (ERA5 seamless model).
 *
 * Null values are forward-filled so downstream code always receives numbers.
 */
export async function fetchSoilForecast(
  lat: number,
  lon: number,
  trace: AgentTraceStep[]
): Promise<SoilForecast> {
  const cacheKey = SpatialTemporalCache.makeSpatialKey("open-meteo:soil", lat, lon);
  const cached = globalCache.get<SoilForecast>(cacheKey);
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
  const params = new URLSearchParams({
    latitude: String(lat),
    longitude: String(lon),
    hourly: [
      "soil_moisture_0_to_7cm",
      "soil_moisture_7_to_28cm",
      "soil_moisture_28_to_100cm",
      "soil_temperature_0_to_7cm",
      "soil_temperature_7_to_28cm",
    ].join(","),
    daily: "et0_fao_evapotranspiration",
    models: "era5_seamless",
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
    const errText = await response.text().catch(() => "");
    throw new Error(
      `Open-Meteo soil forecast error ${response.status}: ${errText}`
    );
  }

  const json: unknown = await response.json();
  const parsed = OpenMeteoSoilSchema.safeParse(json);

  if (!parsed.success) {
    throw new Error(
      `Open-Meteo soil schema validation failed: ${parsed.error.message}`
    );
  }

  const { hourly, daily } = parsed.data;

  // Forward-fill nulls in all hourly series
  const sm0_7   = forwardFill(hourly.soil_moisture_0_to_7cm   ?? []);
  const sm7_28  = forwardFill(hourly.soil_moisture_7_to_28cm  ?? []);
  const sm28_100= forwardFill(hourly.soil_moisture_28_to_100cm?? []);
  const st0_7   = forwardFill(hourly.soil_temperature_0_to_7cm ?? []);
  const st7_28  = forwardFill(hourly.soil_temperature_7_to_28cm?? []);
  const et0     = forwardFill(daily.et0_fao_evapotranspiration ?? []);

  const forecast: SoilForecast = {
    time: hourly.time,
    soilMoisture_0_7: sm0_7,
    soilMoisture_7_28: sm7_28,
    soilMoisture_28_100: sm28_100,
    soilTemp_0_7: st0_7,
    soilTemp_7_28: st7_28,
    et0Daily: {
      time: daily.time,
      values: et0,
    },
  };

  globalCache.set(cacheKey, forecast, CACHE_TTL_MS.SOIL);
  return forecast;
}

/**
 * Lightweight single-point fetch for the SSE telemetry stream.
 * Returns only the latest (index 0) hourly reading.
 */
export async function fetchCurrentSoilPoint(
  lat: number,
  lon: number
): Promise<{
  soilMoisture_0_7: number;
  soilMoisture_7_28: number;
  soilMoisture_28_100: number;
  soilTemp_0_7: number;
  et0_today: number;
}> {
  const params = new URLSearchParams({
    latitude: String(lat),
    longitude: String(lon),
    hourly: [
      "soil_moisture_0_to_7cm",
      "soil_moisture_7_to_28cm",
      "soil_moisture_28_to_100cm",
      "soil_temperature_0_to_7cm",
    ].join(","),
    daily: "et0_fao_evapotranspiration",
    models: "era5_seamless",
    forecast_days: "1",
  });

  const url = `${OPEN_METEO_FORECAST_URL}?${params.toString()}`;
  const { response } = await timedFetch(url);

  if (!response.ok) {
    throw new Error(
      `Open-Meteo current-soil error ${response.status}`
    );
  }

  const json: unknown = await response.json();
  const parsed = OpenMeteoSoilSchema.safeParse(json);

  if (!parsed.success) {
    throw new Error(
      `Open-Meteo current-soil schema error: ${parsed.error.message}`
    );
  }

  const { hourly, daily } = parsed.data;

  const ff = forwardFill;
  const sm0_7    = ff(hourly.soil_moisture_0_to_7cm    ?? [null])[0] ?? 0;
  const sm7_28   = ff(hourly.soil_moisture_7_to_28cm   ?? [null])[0] ?? 0;
  const sm28_100 = ff(hourly.soil_moisture_28_to_100cm ?? [null])[0] ?? 0;
  const st0_7    = ff(hourly.soil_temperature_0_to_7cm ?? [null])[0] ?? 0;
  const et0      = ff(daily.et0_fao_evapotranspiration  ?? [null])[0] ?? 0;

  return {
    soilMoisture_0_7: sm0_7,
    soilMoisture_7_28: sm7_28,
    soilMoisture_28_100: sm28_100,
    soilTemp_0_7: st0_7,
    et0_today: et0,
  };
}
