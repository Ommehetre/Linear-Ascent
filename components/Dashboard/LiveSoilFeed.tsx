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
    <div className="bg-[#FFFFFF] border border-[#D8D5D0] p-5 font-mono text-xs space-y-4 rounded-none flex flex-col justify-between shadow-xs">
      {/* Header */}
      <div className="flex items-center justify-between pb-3 border-b border-[#EFECE9]">
        <div className="flex items-center gap-2">
          <Radio className="w-4 h-4 text-[#9CAF88]" />
          <span className="font-bold text-[#1A1A1A] uppercase tracking-wider text-[11px]">
            Root-Zone Telemetry Feed
          </span>
        </div>
        <div className="flex items-center gap-2">
          <span
            className={`w-2 h-2 ${
              connected ? "bg-[#9CAF88]" : "bg-[#CC5500]"
            }`}
          />
          <span className="text-[10px] text-[#555555] uppercase">
            {connected ? "Stream Active" : "Connecting"}
          </span>
        </div>
      </div>

      {latest ? (
        <div className="space-y-3">
          <div className="grid grid-cols-2 gap-3 text-[11px]">
            <div className="p-3 bg-[#F7F5F2] border border-[#D8D5D0] rounded-none">
              <span className="text-[#555555] text-[10px] block uppercase font-medium">
                Topsoil Moisture (0-7cm)
              </span>
              <div className="mt-1">
                {latest.soilMoisture_0_7 !== null ? (
                  <>
                    <span className="text-[#3D5230] font-bold text-lg">
                      {latest.soilMoisture_0_7.toFixed(3)}
                    </span>
                    <span className="text-[10px] text-[#666666] ml-1">m³/m³</span>
                  </>
                ) : (
                  <span className="text-[#707070] text-sm italic">Unavailable</span>
                )}
              </div>
            </div>

            <div className="p-3 bg-[#F7F5F2] border border-[#D8D5D0] rounded-none">
              <span className="text-[#555555] text-[10px] block uppercase font-medium">
                Soil Temperature
              </span>
              <div className="mt-1">
                {latest.soilTemp_0_7 !== null ? (
                  <span className="text-[#1A1A1A] font-bold text-lg">
                    {latest.soilTemp_0_7.toFixed(1)}°C
                  </span>
                ) : (
                  <span className="text-[#707070] text-sm italic">Unavailable</span>
                )}
              </div>
            </div>
          </div>

          <div className="grid grid-cols-2 gap-3 text-[11px]">
            <div className="p-2.5 bg-[#F7F5F2] border border-[#D8D5D0] rounded-none">
              <span className="text-[#666666] text-[10px] block uppercase">
                Subsoil (7-28cm)
              </span>
              <span className="text-[#1A1A1A] font-semibold text-sm">
                {latest.soilMoisture_7_28 !== null
                  ? `${latest.soilMoisture_7_28.toFixed(3)} m³/m³`
                  : "Unavailable"}
              </span>
            </div>

            <div className="p-2.5 bg-[#F7F5F2] border border-[#D8D5D0] rounded-none">
              <span className="text-[#666666] text-[10px] block uppercase">
                Daily Evapotranspiration
              </span>
              <span className="text-[#1A1A1A] font-semibold text-sm">
                {latest.et0_today !== null
                  ? `${latest.et0_today.toFixed(1)} mm/day`
                  : "Unavailable"}
              </span>
            </div>
          </div>

          <div className="text-[10px] text-[#555555] flex items-center justify-between pt-1 border-t border-[#EFECE9]">
            <span>Feed: Root-Zone SSE Telemetry</span>
            <span className="text-[#707070]">{latest.ts.slice(11, 19)} UTC</span>
          </div>
        </div>
      ) : (
        <div className="p-6 text-center text-[#666666] text-xs flex flex-col items-center justify-center gap-2">
          <RefreshCw className="w-4 h-4 animate-spin text-[#9CAF88]" />
          <span>Synchronizing telemetry stream...</span>
        </div>
      )}
    </div>
  );
}
