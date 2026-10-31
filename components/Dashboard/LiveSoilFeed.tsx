"use client";

import React, { useEffect, useState } from "react";
import { Radio, RefreshCw } from "lucide-react";

interface TelemetryPoint {
  soilMoisture_0_7: number | null;
  soilMoisture_7_28: number | null;
  soilMoisture_28_100: number | null;
  soilTemp_0_7: number | null;
  et0_today: number | null;
  source: string;
  ts: string;
}

export function LiveSoilFeed({ lat, lon }: { lat: number; lon: number }) {
  const [readings, setReadings] = useState<TelemetryPoint[]>([]);
  const [connected, setConnected] = useState(false);

  useEffect(() => {
    let eventSource: EventSource | null = null;

    try {
      eventSource = new EventSource(
        `/api/soil-telemetry/stream?lat=${lat}&lon=${lon}`
      );

      eventSource.addEventListener("connected", () => {
        setConnected(true);
      });

      eventSource.addEventListener("soil_update", (e) => {
        try {
          const data = JSON.parse(e.data);
          const point: TelemetryPoint = {
            soilMoisture_0_7: typeof data.payload?.soilMoisture_0_7 === "number" ? data.payload.soilMoisture_0_7 : null,
            soilMoisture_7_28: typeof data.payload?.soilMoisture_7_28 === "number" ? data.payload.soilMoisture_7_28 : null,
            soilMoisture_28_100: typeof data.payload?.soilMoisture_28_100 === "number" ? data.payload.soilMoisture_28_100 : null,
            soilTemp_0_7: typeof data.payload?.soilTemp_0_7 === "number" ? data.payload.soilTemp_0_7 : null,
            et0_today: typeof data.payload?.et0_today === "number" ? data.payload.et0_today : null,
            source: data.source || "Open-Meteo ERA5",
            ts: data.ts || new Date().toISOString(),
          };

          setReadings((prev) => [point, ...prev.slice(0, 5)]);
          setConnected(true);
        } catch (err) {}
      });

      eventSource.onerror = () => {
        setConnected(false);
      };
    } catch (e) {
      setConnected(false);
    }

    return () => {
      if (eventSource) {
        eventSource.close();
      }
    };
  }, [lat, lon]);

  const latest = readings[0];

  return (
    <div className="bg-[#FFFFFF] border border-[#B5B0A6] p-5 text-xs space-y-4 rounded-sm flex flex-col justify-between shadow-xs">
      {/* Header */}
      <div className="flex items-center justify-between pb-3 border-b border-[#E2DFD7]">
        <div className="flex items-center gap-2">
          <Radio className="w-4 h-4 text-[#9CAF88]" />
          <span className="font-sans font-bold text-[#141414] uppercase tracking-wider text-xs">
            Root-Zone Telemetry Feed
          </span>
        </div>
        <div className="flex items-center gap-2">
          <span
            className={`w-2 h-2 ${
              connected ? "bg-[#9CAF88]" : "bg-[#CC5500]"
            }`}
          />
          <span className="text-[10px] font-sans font-bold text-[#403E3A] uppercase tracking-wider">
            {connected ? "Stream Active" : "Connecting"}
          </span>
        </div>
      </div>

      {latest ? (
        <div className="space-y-3">
          <div className="grid grid-cols-2 gap-3 text-xs">
            <div className="p-3 bg-[#F4F1EA] border border-[#CDC9BF] rounded-sm">
              <span className="font-sans font-bold text-[10px] text-[#5A5752] block uppercase tracking-wider">
                Topsoil Moisture (0-7cm)
              </span>
              <div className="mt-1">
                {latest.soilMoisture_0_7 !== null ? (
                  <>
                    <span className="font-mono text-[#3D5230] font-bold text-lg">
                      {latest.soilMoisture_0_7.toFixed(3)}
                    </span>
                    <span className="font-mono text-[10px] text-[#6E6A63] ml-1">m³/m³</span>
                  </>
                ) : (
                  <span className="font-sans text-[#6E6A63] text-sm italic">Unavailable</span>
                )}
              </div>
            </div>

            <div className="p-3 bg-[#F4F1EA] border border-[#CDC9BF] rounded-sm">
              <span className="font-sans font-bold text-[10px] text-[#5A5752] block uppercase tracking-wider">
                Soil Temperature
              </span>
              <div className="mt-1">
                {latest.soilTemp_0_7 !== null ? (
                  <span className="font-mono text-[#141414] font-bold text-lg">
                    {latest.soilTemp_0_7.toFixed(1)}°C
                  </span>
                ) : (
                  <span className="font-sans text-[#6E6A63] text-sm italic">Unavailable</span>
                )}
              </div>
            </div>
          </div>

          <div className="grid grid-cols-2 gap-3 text-xs">
            <div className="p-2.5 bg-[#F4F1EA] border border-[#CDC9BF] rounded-sm">
              <span className="font-sans font-bold text-[10px] text-[#5A5752] block uppercase tracking-wider">
                Subsoil (7-28cm)
              </span>
              <span className="font-mono text-[#141414] font-bold text-sm block mt-0.5">
                {latest.soilMoisture_7_28 !== null
                  ? `${latest.soilMoisture_7_28.toFixed(3)} m³/m³`
                  : "Unavailable"}
              </span>
            </div>

            <div className="p-2.5 bg-[#F4F1EA] border border-[#CDC9BF] rounded-sm">
              <span className="font-sans font-bold text-[10px] text-[#5A5752] block uppercase tracking-wider">
                Daily Evapotranspiration
              </span>
              <span className="font-mono text-[#141414] font-bold text-sm block mt-0.5">
                {latest.et0_today !== null
                  ? `${latest.et0_today.toFixed(1)} mm/day`
                  : "Unavailable"}
              </span>
            </div>
          </div>

          <div className="text-[10px] text-[#5A5752] flex items-center justify-between pt-1 border-t border-[#E2DFD7] font-mono">
            <span>Feed: Root-Zone SSE Telemetry</span>
            <span className="text-[#6E6A63]">{latest.ts.slice(11, 19)} UTC</span>
          </div>
        </div>
      ) : (
        <div className="p-6 text-center text-[#5A5752] text-xs flex flex-col items-center justify-center gap-2 font-sans">
          <RefreshCw className="w-4 h-4 animate-spin text-[#9CAF88]" />
          <span className="font-semibold">Synchronizing telemetry stream...</span>
        </div>
      )}
    </div>
  );
}
