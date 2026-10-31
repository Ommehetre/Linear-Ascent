// =============================================================================
// TerraPulse — Data.gov.in Agmarknet Mandi Price Ingestion
// =============================================================================

import type { MandiRecord, AgentTraceStep } from "@/types";
import { MandiResponseSchema } from "@/lib/schemas";
import { timedFetch } from "./fetchWithRetry";

const AGMARKNET_RESOURCE_ID = "9ef84268-d588-465a-a308-a864a43d0070";
const AGMARKNET_BASE_URL = `https://api.data.gov.in/resource/${AGMARKNET_RESOURCE_ID}`;

/**
 * Normalise commodity names between TerraPulse crop types and Agmarknet listings
 */
function normaliseCommodity(crop: string): string {
  const map: Record<string, string> = {
    Rice: "Paddy(Dhan)(Common)",
    Wheat: "Wheat",
    Cotton: "Cotton",
    Soybean: "Soyabean",
    Pulses: "Arhar (Tur/Red Gram)",
  };
  return map[crop] ?? crop;
}

/**
 * Fetch live Mandi arrival prices from Agmarknet (Data.gov.in)
 */
export async function fetchMandiPrices(
  state: string,
  commodity: string,
  trace: AgentTraceStep[]
): Promise<MandiRecord[]> {
  const apiKey = process.env.DATA_GOV_IN_API_KEY || "";
  const queryCommodity = normaliseCommodity(commodity);

  const params = new URLSearchParams({
    "api-key": apiKey,
    format: "json",
    limit: "50",
    "filters[state]": state,
    "filters[commodity]": queryCommodity,
  });

  const url = `${AGMARKNET_BASE_URL}?${params.toString()}`;
  const safeLogUrl = `${AGMARKNET_BASE_URL}?${new URLSearchParams({
    "api-key": "***",
    format: "json",
    limit: "50",
    "filters[state]": state,
    "filters[commodity]": queryCommodity,
  }).toString()}`;

  const timestamp = new Date().toISOString();

  try {
    const { response, latencyMs } = await timedFetch(url);

    if (trace[0]) {
      trace[0].apiCalls.push({
        url: safeLogUrl,
        method: "GET",
        statusCode: response.status,
        latencyMs,
        timestamp,
      });
    }

    if (!response.ok) {
      // If filtered query fails or returns 404, attempt fallback without strict state filter
      const fallbackParams = new URLSearchParams({
        "api-key": apiKey,
        format: "json",
        limit: "50",
        "filters[commodity]": queryCommodity,
      });
      const fallbackUrl = `${AGMARKNET_BASE_URL}?${fallbackParams.toString()}`;
      const { response: fbRes, latencyMs: fbLat } = await timedFetch(fallbackUrl);

      if (trace[0]) {
        trace[0].apiCalls.push({
          url: `${AGMARKNET_BASE_URL}?api-key=***&format=json&limit=50&filters[commodity]=${queryCommodity}`,
          method: "GET",
          statusCode: fbRes.status,
          latencyMs: fbLat,
          timestamp: new Date().toISOString(),
        });
      }

      if (!fbRes.ok) {
        return [];
      }

      const fbData = await fbRes.json();
      const parsed = MandiResponseSchema.safeParse(fbData);
      return parsed.success ? parsed.data.records : [];
    }

    const rawData = await response.json();
    const parsed = MandiResponseSchema.safeParse(rawData);

    if (!parsed.success) {
      console.warn("Mandi schema validation warning:", parsed.error);
      if (Array.isArray(rawData?.records)) {
        return rawData.records.map((r: any) => ({
          state: String(r.state || state),
          district: String(r.district || ""),
          market: String(r.market || "Local Market"),
          commodity: String(r.commodity || commodity),
          variety: String(r.variety || "FAQ"),
          grade: String(r.grade || "FAQ"),
          arrival_date: String(r.arrival_date || new Date().toLocaleDateString("en-GB")),
          min_price: Number(r.min_price) || 0,
          max_price: Number(r.max_price) || 0,
          modal_price: Number(r.modal_price) || 0,
        }));
      }
      return [];
    }

    // Sort by arrival_date or modal_price descending
    return parsed.data.records.sort((a, b) => b.modal_price - a.modal_price);
  } catch (err: any) {
    if (trace[0]) {
      trace[0].apiCalls.push({
        url: safeLogUrl,
        method: "GET",
        statusCode: 500,
        latencyMs: 0,
        timestamp,
      });
    }
    console.error("fetchMandiPrices error:", err);
    return [];
  }
}
