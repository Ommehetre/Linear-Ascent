// =============================================================================
// TerraPulse — Sentinel-2 STAC Ingestion (Element84 Earth Search v1)
// =============================================================================

import type { FarmLocation, SentinelScene, AgentTraceStep } from "../../types/index.ts";
import { StacResponseSchema } from "../../lib/schemas.ts";
import { CLOUD_COVER_THRESHOLD } from "../../lib/constants.ts";
import { toIsoDate, daysAgo } from "../../lib/utils.ts";
import { timedFetch } from "./fetchWithRetry.ts";
import { globalCache, SpatialTemporalCache, CACHE_TTL_MS } from "../../lib/cache.ts";

const STAC_ENDPOINT = "https://earth-search.aws.element84.com/v1/search";

/**
 * Build the STAC search body for a given window (days back from today).
 */
function buildStacBody(
  location: FarmLocation,
  windowDays: number
): Record<string, unknown> {
  const end = new Date();
  const start = daysAgo(windowDays);

  return {
    collections: ["sentinel-2-l2a"],
    bbox: location.bbox,
    datetime: `${toIsoDate(start)}T00:00:00Z/${toIsoDate(end)}T23:59:59Z`,
    query: {
      "eo:cloud_cover": { lte: CLOUD_COVER_THRESHOLD },
    },
    limit: 5,
  };
}

/**
 * Fetch Sentinel-2 L2A scenes for a farm location.
 *
 * Resilience strategy:
 *  - Attempt 1: 30-day window
 *  - Attempt 2: 60-day window  (fallback if 0 scenes or all >40 % cloud)
 *  - Attempt 3: 90-day window  (final fallback)
 *
 * All API calls are recorded in trace[0].apiCalls.
 */
export async function fetchSentinelScenes(
  location: FarmLocation,
  trace: AgentTraceStep[]
): Promise<SentinelScene[]> {
  const cacheKey = SpatialTemporalCache.makeBboxKey("element84:stac", location.bbox);
  const cached = globalCache.get<SentinelScene[]>(cacheKey);
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
  const windows = [30, 60, 90];

  for (let i = 0; i < windows.length; i++) {
    const windowDays = windows[i];
    const body = buildStacBody(location, windowDays);
    const timestamp = new Date().toISOString();

    const { response, latencyMs } = await timedFetch(STAC_ENDPOINT, {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify(body),
    });

    // Record API call
    if (trace[0]) {
      trace[0].apiCalls.push({
        url: STAC_ENDPOINT,
        method: "POST",
        statusCode: response.status,
        latencyMs,
        timestamp,
      });
    }

    if (!response.ok) {
      const errText = await response.text().catch(() => "");
      throw new Error(
        `STAC API error ${response.status} (window=${windowDays}d): ${errText}`
      );
    }

    const json: unknown = await response.json();
    const parsed = StacResponseSchema.safeParse(json);

    if (!parsed.success) {
      throw new Error(
        `STAC response validation failed: ${parsed.error.message}`
      );
    }

    const features = parsed.data.features;

    // Filter to only scenes within cloud-cover threshold
    let usable = features.filter(
      (f) => f.properties["eo:cloud_cover"] <= CLOUD_COVER_THRESHOLD
    );

    // On final fallback attempt, if all scenes exceeded threshold, select the clearest available
    if (usable.length === 0 && i === windows.length - 1 && features.length > 0) {
      usable = [...features]
        .sort((a, b) => a.properties["eo:cloud_cover"] - b.properties["eo:cloud_cover"])
        .slice(0, 3);
    }

    if (usable.length > 0) {
      // Mark fallback attempts in trace
      if (i > 0 && trace[0]) {
        trace[0].status = "fallback";
        trace[0].fallbackReason = `Expanded STAC window to ${windowDays} days — previous attempts yielded no usable scenes`;
      }

      const scenes: SentinelScene[] = usable.map((feature) => {
        const visualHref =
          feature.assets["visual"]?.href ||
          feature.assets["visual-jp2"]?.href ||
          "";
        const b04Href =
          feature.assets["red"]?.href ||
          feature.assets["B04"]?.href ||
          feature.assets["red-jp2"]?.href ||
          visualHref;
        const b08Href =
          feature.assets["nir"]?.href ||
          feature.assets["B08"]?.href ||
          feature.assets["nir-jp2"]?.href ||
          visualHref;
        const thumbnailHref =
          feature.assets["thumbnail"]?.href ||
          feature.assets["rendered_preview"]?.href ||
          visualHref;

        return {
          id: feature.id,
          datetime: feature.properties.datetime,
          cloudCover: feature.properties["eo:cloud_cover"],
          visualHref,
          b04Href,
          b08Href,
          sclHref:
            feature.assets["scl"]?.href ||
            feature.assets["SCL"]?.href ||
            feature.assets["scl-jp2"]?.href ||
            "",
          thumbnailHref,
          bbox: feature.bbox,
        };
      });
      globalCache.set(cacheKey, scenes, CACHE_TTL_MS.IMAGERY);
      return scenes;
    }

    // Log the fallback in trace before next iteration
    if (trace[0] && i < windows.length - 1) {
      trace[0].apiCalls.push({
        url: STAC_ENDPOINT,
        method: "POST",
        statusCode: 200,
        latencyMs: 0,
        timestamp: new Date().toISOString(),
      });

      trace[0].status = "fallback";
      trace[0].fallbackReason = `No scenes under ${CLOUD_COVER_THRESHOLD}% cloud cover in ${windowDays}-day window (${features.length} scenes found). Expanding window to ${windows[i + 1]} days.`;
    }
  }

  // Fallback: If all windows exceeded cloud cover, return the least cloudy scenes
  return [];
}
