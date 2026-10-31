import { NextRequest, NextResponse } from "next/server";
import { fetchCurrentSoilPoint } from "@/services/liveIngestion";



// In-memory bus for broadcasting incoming physical IoT sensor telemetry to active SSE clients
type TelemetryListener = (data: any) => void;
const listeners = new Set<TelemetryListener>();

/**
 * SSE endpoint: clients subscribe for continuous live root-zone telemetry updates
 */
export async function GET(req: NextRequest) {
  const { searchParams } = new URL(req.url);
  const lat = parseFloat(searchParams.get("lat") || "21.1458");
  const lon = parseFloat(searchParams.get("lon") || "79.0882");

  const encoder = new TextEncoder();

  const stream = new ReadableStream({
    async start(controller) {
      let isClosed = false;

      const send = (event: string, data: any) => {
        if (isClosed) return;
        try {
          controller.enqueue(
            encoder.encode(`event: ${event}\ndata: ${JSON.stringify(data)}\n\n`)
          );
        } catch (e) {
          isClosed = true;
        }
      };

      // 1. Initial connection handshake
      send("connected", {
        message: "TerraPulse Live Root-Zone Soil Telemetry Connected",
        ts: new Date().toISOString(),
      });

      // 2. Listener for live physical ESP32/MQTT telemetry pushes
      const iotListener: TelemetryListener = (data) => {
        send("soil_update", {
          ...data,
          source: "ESP32/MQTT Physical Soil Sensor",
          ts: new Date().toISOString(),
        });
      };
      listeners.add(iotListener);

      // 3. Initial poll from Open-Meteo ERA5 live assimilated stream
      try {
        const initialPoint = await fetchCurrentSoilPoint(lat, lon);
        send("soil_update", {
          payload: initialPoint,
          source: "Open-Meteo ERA5 Seamless (Live Grid)",
          ts: new Date().toISOString(),
        });
      } catch (err: any) {
        console.warn("Initial SSE soil fetch warning:", err.message);
      }

      // 4. Periodic polling interval (every 30 seconds)
      const interval = setInterval(async () => {
        if (isClosed) {
          clearInterval(interval);
          return;
        }
        try {
          const point = await fetchCurrentSoilPoint(lat, lon);
          send("soil_update", {
            payload: point,
            source: "Open-Meteo ERA5 Seamless (Live Grid)",
            ts: new Date().toISOString(),
          });
        } catch (e: any) {
          console.warn("Periodic SSE soil poll warning:", e.message);
        }
      }, 30000);

      // 5. Cleanup on disconnect
      req.signal.addEventListener("abort", () => {
        isClosed = true;
        clearInterval(interval);
        listeners.delete(iotListener);
        try {
          controller.close();
        } catch {}
      });
    },
  });

  return new Response(stream, {
    headers: {
      "Content-Type": "text/event-stream; charset=utf-8",
      "Cache-Control": "no-cache, no-transform",
      Connection: "keep-alive",
      "X-Accel-Buffering": "no",
    },
  });
}

/**
 * Webhook endpoint: accepts live HTTP POST payloads from physical ESP32/MQTT soil sensors
 */
export async function POST(req: NextRequest) {
  try {
    const payload = await req.json();

    // Broadcast to all active SSE subscribers
    listeners.forEach((listener) => {
      try {
        listener({
          payload: {
            soilMoisture_0_7: payload.moisture ?? payload.soilMoisture_0_7 ?? null,
            soilMoisture_7_28: payload.soilMoisture_7_28 ?? null,
            soilMoisture_28_100: payload.soilMoisture_28_100 ?? null,
            soilTemp_0_7: payload.temperature ?? payload.soilTemp_0_7 ?? null,
            et0_today: payload.et0 ?? null,
            nitrogen_ppm: payload.nitrogen ?? null,
            phosphorus_ppm: payload.phosphorus ?? null,
            potassium_ppm: payload.potassium ?? null,
            ph: payload.ph ?? null,
          },
        });
      } catch (e) {}
    });

    return NextResponse.json({
      success: true,
      subscribersNotified: listeners.size,
      receivedAt: new Date().toISOString(),
    });
  } catch (error: any) {
    return NextResponse.json(
      { error: "Invalid sensor payload", details: error.message },
      { status: 400 }
    );
  }
}
