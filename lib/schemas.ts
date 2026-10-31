import { z } from "zod";

// ---------------------------------------------------------------------------
// STAC (Element84 Earth Search — Sentinel-2)
// ---------------------------------------------------------------------------
export const StacAssetSchema = z.object({
  href: z.string().url(),
  type: z.string().optional(),
  title: z.string().optional(),
  roles: z.array(z.string()).optional(),
});

export const StacFeatureSchema = z
  .object({
    id: z.string(),
    type: z.literal("Feature"),
    bbox: z.array(z.number()),
    properties: z
      .object({
        datetime: z.string(),
        "eo:cloud_cover": z.number(),
      })
      .passthrough(),
    assets: z.record(z.string(), StacAssetSchema),
    collection: z.string().optional(),
  })
  .passthrough();

export const StacResponseSchema = z.object({
  type: z.literal("FeatureCollection"),
  features: z.array(StacFeatureSchema),
  context: z
    .object({
      matched: z.number(),
      returned: z.number(),
    })
    .optional(),
});

// ---------------------------------------------------------------------------
// Open-Meteo Forecast (soil data — ERA5 seamless)
// ---------------------------------------------------------------------------
const nullableNumberArray = z.array(z.number().nullable());

export const OpenMeteoSoilSchema = z.object({
  latitude: z.number(),
  longitude: z.number(),
  elevation: z.number().optional(),
  hourly_units: z
    .object({
      time: z.string(),
      soil_moisture_0_to_7cm: z.string().optional(),
      soil_moisture_7_to_28cm: z.string().optional(),
      soil_moisture_28_to_100cm: z.string().optional(),
      soil_temperature_0_to_7cm: z.string().optional(),
      soil_temperature_7_to_28cm: z.string().optional(),
    })
    .passthrough()
    .optional(),
  hourly: z.object({
    time: z.array(z.string()),
    soil_moisture_0_to_7cm: nullableNumberArray.optional(),
    soil_moisture_7_to_28cm: nullableNumberArray.optional(),
    soil_moisture_28_to_100cm: nullableNumberArray.optional(),
    soil_temperature_0_to_7cm: nullableNumberArray.optional(),
    soil_temperature_7_to_28cm: nullableNumberArray.optional(),
  }),
  daily_units: z
    .object({
      time: z.string(),
      et0_fao_evapotranspiration: z.string().optional(),
    })
    .passthrough()
    .optional(),
  daily: z.object({
    time: z.array(z.string()),
    et0_fao_evapotranspiration: nullableNumberArray.optional(),
  }),
});

// ---------------------------------------------------------------------------
// Open-Meteo Historical Archive
// ---------------------------------------------------------------------------
export const OpenMeteoArchiveSchema = z.object({
  latitude: z.number(),
  longitude: z.number(),
  daily: z.object({
    time: z.array(z.string()),
    precipitation_sum: nullableNumberArray.optional(),
    et0_fao_evapotranspiration: nullableNumberArray.optional(),
  }),
  hourly: z
    .object({
      time: z.array(z.string()),
      soil_moisture_0_to_7cm: nullableNumberArray.optional(),
      soil_moisture_7_to_28cm: nullableNumberArray.optional(),
      soil_moisture_28_to_100cm: nullableNumberArray.optional(),
    })
    .optional(),
});

// ---------------------------------------------------------------------------
// NASA POWER Agroclimatology
// ---------------------------------------------------------------------------
export const NasaPowerSchema = z.object({
  type: z.literal("Feature"),
  geometry: z.object({
    type: z.literal("Point"),
    coordinates: z.array(z.number()),
  }),
  properties: z.object({
    parameter: z.record(z.string(), z.record(z.string(), z.number())),
  }),
  header: z
    .object({
      fill_value: z.number().optional(),
      start: z.string().optional(),
      end: z.string().optional(),
    })
    .passthrough()
    .optional(),
});

// ---------------------------------------------------------------------------
// ISRIC SoilGrids v2
// ---------------------------------------------------------------------------
export const SoilGridsLayerSchema = z.object({
  name: z.string(),
  unit_measure: z
    .object({
      mapped_units: z.string(),
      target_units: z.string(),
      conversion_factor: z.number().optional(),
    })
    .passthrough()
    .optional(),
  depths: z.array(
    z.object({
      label: z.string(),
      range: z
        .object({
          top_depth: z.number(),
          bottom_depth: z.number(),
        })
        .optional(),
      values: z.object({
        mean: z.number().nullable(),
        Q0_05: z.number().nullable().optional(),
        Q0_95: z.number().nullable().optional(),
      }),
    })
  ),
});

export const SoilGridsSchema = z.object({
  type: z.string().optional(),
  geometry: z
    .object({ type: z.string(), coordinates: z.array(z.number()) })
    .optional(),
  properties: z.object({
    layers: z.array(SoilGridsLayerSchema),
  }),
});

// ---------------------------------------------------------------------------
// Data.gov.in Agmarknet Mandi Prices
// ---------------------------------------------------------------------------
export const MandiRecordSchema = z.object({
  state: z.string(),
  district: z.string().optional().default(""),
  market: z.string(),
  commodity: z.string(),
  variety: z.string().optional(),
  grade: z.string().optional(),
  arrival_date: z.string(),
  min_price: z.coerce.number(),
  max_price: z.coerce.number(),
  modal_price: z.coerce.number(),
});

export const MandiResponseSchema = z.object({
  index_name: z.string().optional(),
  title: z.string().optional(),
  total: z.coerce.number().optional(),
  count: z.coerce.number().optional(),
  records: z.array(MandiRecordSchema),
});

// ---------------------------------------------------------------------------
// Export inferred types
// ---------------------------------------------------------------------------
export type StacResponse = z.infer<typeof StacResponseSchema>;
export type StacFeature = z.infer<typeof StacFeatureSchema>;
export type OpenMeteoSoil = z.infer<typeof OpenMeteoSoilSchema>;
export type OpenMeteoArchive = z.infer<typeof OpenMeteoArchiveSchema>;
export type NasaPower = z.infer<typeof NasaPowerSchema>;
export type SoilGridsData = z.infer<typeof SoilGridsSchema>;
export type MandiResponse = z.infer<typeof MandiResponseSchema>;
