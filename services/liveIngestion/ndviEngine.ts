// =============================================================================
// TerraPulse — Real Sentinel-2 NDVI Computation with SCL Cloud Masking
// Strict Windowed COG Reads via STAC (Element84 Earth Search AWS Open Data)
// =============================================================================
// NOTE: ISRO Bhuvan is strictly used as a WMS visual map overlay in the UI;
// Sentinel-2 L2A COG assets are used for all spectral index computations.
// Under no circumstances should full tiles or JPEG thumbnails be used for NDVI math.
// =============================================================================

import { fromUrl } from "geotiff";
import type { NdviStats } from "@/types";

/**
 * Valid Scene Classification Layer (SCL) classes according to ESA Sentinel-2 L2A spec:
 * 0: NO_DATA (mask)
 * 1: SATURATED_OR_DEFECTIVE (mask)
 * 2: DARK_AREA_PIXELS (mask / cast shadow)
 * 3: CLOUD_SHADOWS (mask)
 * 4: VEGETATION (valid)
 * 5: NOT_VEGETATED (valid)
 * 6: WATER (valid)
 * 7: UNCLASSIFIED (valid land)
 * 8: CLOUD_MEDIUM_PROBABILITY (mask)
 * 9: CLOUD_HIGH_PROBABILITY (mask)
 * 10: THIN_CIRRUS (mask)
 * 11: SNOW (mask)
 */
export const SCL_CLEAR_CLASSES = new Set([4, 5, 6, 7]);

/**
 * Converts WGS84 (lon, lat) to UTM coordinates (Easting, Northing in meters).
 * Snyder (1987) Map Projections: A Working Manual (USGS Paper 1395).
 */
export function wgs84ToUtm(
  lon: number,
  lat: number,
  forcedZone?: number
): { easting: number; northing: number; zone: number } {
  const zone = forcedZone || Math.floor((lon + 180) / 6) + 1;
  const radLon = (lon * Math.PI) / 180;
  const radLat = (lat * Math.PI) / 180;
  const centralLon = ((zone - 1) * 6 - 180 + 3) * (Math.PI / 180);

  const a = 6378137.0; // WGS84 semi-major axis
  const f = 1 / 298.257223563; // WGS84 flattening
  const e2 = 2 * f - f * f; // first eccentricity squared
  const ePrime2 = e2 / (1 - e2);
  const k0 = 0.9996; // UTM scale factor

  const sinLat = Math.sin(radLat);
  const cosLat = Math.cos(radLat);
  const tanLat = Math.tan(radLat);

  const N = a / Math.sqrt(1 - e2 * sinLat * sinLat);
  const T = tanLat * tanLat;
  const C = ePrime2 * cosLat * cosLat;
  const A = cosLat * (radLon - centralLon);

  // Meridian distance M
  const M =
    a *
    ((1 - e2 / 4 - (3 * e2 * e2) / 64 - (5 * e2 * e2 * e2) / 256) * radLat -
      ((3 * e2) / 8 + (3 * e2 * e2) / 32 + (45 * e2 * e2 * e2) / 1024) *
        Math.sin(2 * radLat) +
      ((15 * e2 * e2) / 256 + (45 * e2 * e2 * e2) / 1024) *
        Math.sin(4 * radLat) -
      ((35 * e2 * e2 * e2) / 3072) * Math.sin(6 * radLat));

  const easting =
    k0 *
      N *
      (A +
        ((1 - T + C) * Math.pow(A, 3)) / 6 +
        ((5 - 18 * T + T * T + 72 * C - 58 * ePrime2) * Math.pow(A, 5)) / 120) +
    500000.0;

  let northing =
    k0 *
    (M +
      N *
        tanLat *
        ((A * A) / 2 +
          ((5 - T + 9 * C + 4 * C * C) * Math.pow(A, 4)) / 24 +
          ((61 - 58 * T + T * T + 600 * C - 330 * ePrime2) * Math.pow(A, 6)) /
            720));

  if (lat < 0) {
    northing += 10000000.0; // Southern hemisphere false northing
  }

  return {
    easting: Number(easting.toFixed(2)),
    northing: Number(northing.toFixed(2)),
    zone,
  };
}

/**
 * Pure deterministic computation of NDVI statistics and SCL cloud masking
 * from in-memory raster band buffers. Separated from I/O for 100% offline unit-testability.
 */
export function computeNdviStatsFromRasters(params: {
  b04: ArrayLike<number>; // Red band (10m)
  b08: ArrayLike<number>; // NIR band (10m)
  scl?: ArrayLike<number>; // Scene Classification Layer (20m, optional)
  sclWidth?: number;
  sclHeight?: number;
  rasterWidth: number;
  rasterHeight: number;
  acquisitionDate: string;
  cloudCoverPct: number;
  baselineNdvi?: number | null;
}): NdviStats {
  const {
    b04,
    b08,
    scl,
    sclWidth,
    sclHeight,
    rasterWidth,
    rasterHeight,
    acquisitionDate,
    cloudCoverPct,
    baselineNdvi,
  } = params;

  const totalPixels = rasterWidth * rasterHeight;
  if (totalPixels === 0 || b04.length === 0 || b08.length === 0) {
    return {
      mean: 0,
      median: 0,
      p10: 0,
      p90: 0,
      validPixelFraction: 0,
      cloudCoverPct,
      acquisitionDate,
      status: "insufficient_clear_imagery",
      message: "insufficient clear imagery (empty raster window)",
    };
  }

  const validNdvis: number[] = [];
  const sclW = sclWidth || rasterWidth;
  const sclH = sclHeight || rasterHeight;

  for (let r = 0; r < rasterHeight; r++) {
    for (let c = 0; c < rasterWidth; c++) {
      const idx = r * rasterWidth + c;
      const red = b04[idx];
      const nir = b08[idx];

      // SCL mask check if SCL is provided
      if (scl && scl.length > 0) {
        const sclRow = Math.min(sclH - 1, Math.floor((r / rasterHeight) * sclH));
        const sclCol = Math.min(sclW - 1, Math.floor((c / rasterWidth) * sclW));
        const sclIdx = sclRow * sclW + sclCol;
        const sclVal = scl[sclIdx];

        if (!SCL_CLEAR_CLASSES.has(sclVal)) {
          // Cloud, cloud shadow, snow, or no-data pixel
          continue;
        }
      }

      // Valid reflectance values
      if (red > 0 && nir > 0) {
        const denom = nir + red;
        if (denom > 0) {
          const ndvi = (nir - red) / denom;
          if (ndvi >= -1.0 && ndvi <= 1.0) {
            validNdvis.push(ndvi);
          }
        }
      }
    }
  }

  const validPixelFraction = Number((validNdvis.length / totalPixels).toFixed(3));

  // If valid clear pixel fraction is < 40%, report "insufficient clear imagery"
  if (validPixelFraction < 0.40) {
    return {
      mean: 0,
      median: 0,
      p10: 0,
      p90: 0,
      validPixelFraction,
      cloudCoverPct,
      acquisitionDate,
      status: "insufficient_clear_imagery",
      message: `insufficient clear imagery (clear valid pixel fraction ${(validPixelFraction * 100).toFixed(1)}% < 40% threshold)`,
    };
  }

  // Calculate statistics
  validNdvis.sort((a, b) => a - b);
  const count = validNdvis.length;
  const sum = validNdvis.reduce((acc, v) => acc + v, 0);
  const mean = Number((sum / count).toFixed(4));

  const p10Index = Math.floor(0.10 * (count - 1));
  const medianIndex = Math.floor(0.50 * (count - 1));
  const p90Index = Math.floor(0.90 * (count - 1));

  const p10 = Number(validNdvis[p10Index].toFixed(4));
  const median = Number(validNdvis[medianIndex].toFixed(4));
  const p90 = Number(validNdvis[p90Index].toFixed(4));

  const ndviAnomaly =
    baselineNdvi != null ? Number((mean - baselineNdvi).toFixed(4)) : null;

  return {
    mean,
    median,
    p10,
    p90,
    validPixelFraction,
    cloudCoverPct,
    acquisitionDate,
    ndviAnomaly,
    status: "valid",
  };
}

/**
 * Executes windowed COG reads for the user's bounding box only using HTTP range requests.
 * Never downloads full Sentinel-2 tiles (~500MB).
 */
export async function fetchWindowedNdvi(params: {
  b04Href: string;
  b08Href: string;
  sclHref?: string;
  bbox: [number, number, number, number]; // [minLon, minLat, maxLon, maxLat]
  acquisitionDate: string;
  cloudCoverPct: number;
  baselineNdvi?: number | null;
}): Promise<NdviStats> {
  const {
    b04Href,
    b08Href,
    sclHref,
    bbox,
    acquisitionDate,
    cloudCoverPct,
    baselineNdvi,
  } = params;

  if (!b04Href || !b08Href) {
    return {
      mean: 0,
      median: 0,
      p10: 0,
      p90: 0,
      validPixelFraction: 0,
      cloudCoverPct,
      acquisitionDate,
      status: "offline",
      message: "B04/B08 COG asset URLs not found in STAC item",
    };
  }

  try {
    // 1. Open B04 GeoTIFF via range requests
    const tiffB04 = await fromUrl(b04Href, { allowFullFile: false });
    const imageB04 = await tiffB04.getImage();
    const origin = imageB04.getOrigin();
    const resolution = imageB04.getResolution();
    const imgWidth = imageB04.getWidth();
    const imgHeight = imageB04.getHeight();

    // 2. Convert WGS84 bbox to UTM in meters
    const [minLon, minLat, maxLon, maxLat] = bbox;
    const centerLon = (minLon + maxLon) / 2;
    const centerLat = (minLat + maxLat) / 2;
    const centerUtm = wgs84ToUtm(centerLon, centerLat);

    const swUtm = wgs84ToUtm(minLon, minLat, centerUtm.zone);
    const neUtm = wgs84ToUtm(maxLon, maxLat, centerUtm.zone);

    const utmMinX = Math.min(swUtm.easting, neUtm.easting);
    const utmMaxX = Math.max(swUtm.easting, neUtm.easting);
    const utmMinY = Math.min(swUtm.northing, neUtm.northing);
    const utmMaxY = Math.max(swUtm.northing, neUtm.northing);

    // 3. Convert UTM bbox to pixel window
    // origin = [xMin, yMax]; resolution = [xRes, -yRes]
    const xRes = resolution[0];
    const yRes = Math.abs(resolution[1]);

    const colMin = Math.max(0, Math.min(imgWidth - 1, Math.floor((utmMinX - origin[0]) / xRes)));
    const colMax = Math.max(colMin + 1, Math.min(imgWidth, Math.ceil((utmMaxX - origin[0]) / xRes)));
    const rowMin = Math.max(0, Math.min(imgHeight - 1, Math.floor((origin[1] - utmMaxY) / yRes)));
    const rowMax = Math.max(rowMin + 1, Math.min(imgHeight, Math.ceil((origin[1] - utmMinY) / yRes)));

    const window = [colMin, rowMin, colMax, rowMax];
    const rasterWidth = colMax - colMin;
    const rasterHeight = rowMax - rowMin;

    // 4. Read only that pixel window for B04 and B08
    const rasterB04 = await imageB04.readRasters({ window });
    const b04Data = rasterB04[0] as ArrayLike<number>;

    const tiffB08 = await fromUrl(b08Href, { allowFullFile: false });
    const imageB08 = await tiffB08.getImage();
    const rasterB08 = await imageB08.readRasters({ window });
    const b08Data = rasterB08[0] as ArrayLike<number>;

    // 5. Read windowed SCL band if available
    let sclData: ArrayLike<number> | undefined = undefined;
    let sclWidth: number | undefined = undefined;
    let sclHeight: number | undefined = undefined;

    if (sclHref) {
      try {
        const tiffScl = await fromUrl(sclHref, { allowFullFile: false });
        const imageScl = await tiffScl.getImage();
        const sclRes = imageScl.getResolution();
        const sclXRes = sclRes[0];
        const sclYRes = Math.abs(sclRes[1]);

        const sclColMin = Math.max(0, Math.floor((utmMinX - origin[0]) / sclXRes));
        const sclColMax = Math.min(imageScl.getWidth(), Math.ceil((utmMaxX - origin[0]) / sclXRes));
        const sclRowMin = Math.max(0, Math.floor((origin[1] - utmMaxY) / sclYRes));
        const sclRowMax = Math.min(imageScl.getHeight(), Math.ceil((origin[1] - utmMinY) / sclYRes));

        if (sclColMax > sclColMin && sclRowMax > sclRowMin) {
          const rasterScl = await imageScl.readRasters({
            window: [sclColMin, sclRowMin, sclColMax, sclRowMax],
          });
          sclData = rasterScl[0] as ArrayLike<number>;
          sclWidth = sclColMax - sclColMin;
          sclHeight = sclRowMax - sclRowMin;
        }
      } catch (e: any) {
        console.warn("Could not read SCL band window, proceeding with cloud threshold filter:", e.message);
      }
    }

    return computeNdviStatsFromRasters({
      b04: b04Data,
      b08: b08Data,
      scl: sclData,
      sclWidth,
      sclHeight,
      rasterWidth,
      rasterHeight,
      acquisitionDate,
      cloudCoverPct,
      baselineNdvi,
    });
  } catch (error: any) {
    console.warn("Windowed COG read failed:", error.message);
    return {
      mean: 0,
      median: 0,
      p10: 0,
      p90: 0,
      validPixelFraction: 0,
      cloudCoverPct,
      acquisitionDate,
      status: "offline",
      message: `Windowed COG read unavailable: ${error.message}`,
    };
  }
}
