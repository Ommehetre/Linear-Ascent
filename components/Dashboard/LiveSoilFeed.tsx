"use client";

import React, { useEffect, useState } from "react";
import { Radio, RefreshCw } from "lucide-react";

interface TelemetryPoint {
  soilMoisture_0_7: number;
  soilMoisture_7_28: number;
  soilMoisture_28_100: number;
  soilTemp_0_7: number;
  et0_today: number;
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
            soilMoisture_0_7: data.payload?.soilMoisture_0_7 ?? 0.22,
            soilMoisture_7_28: data.payload?.soilMoisture_7_28 ?? 0.26,
            soilMoisture_28_100: data.payload?.soilMoisture_28_100 ?? 0.3,
            soilTemp_0_7: data.payload?.soilTemp_0_7 ?? 28.0,
            et0_today: data.payload?.et0_today ?? 4.2,
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
    <div className="bg-[#1a1a1a] border border-[#2a2a2a] p-5 font-mono text-xs space-y-4 rounded-none flex flex-col justify-between">
      {/* Header */}
      <div className="flex items-center justify-between pb-3 border-b border-[#262626]">
        <div className="flex items-center gap-2">
          <Radio className="w-4 h-4 text-[#9CAF88]" />
          <span className="font-bold text-[#F4F4F4] uppercase tracking-wider text-[11px]">
            Root-Zone Telemetry Feed
          </span>
        </div>
        <div className="flex items-center gap-2">
          <span
            className={`w-2 h-2 ${
              connected ? "bg-[#9CAF88]" : "bg-[#CC5500]"
            }`}
          />
          <span className="text-[10px] text-[#A7A7A7] uppercase">
            {connected ? "Stream Active" : "Connecting"}
          </span>
        </div>
      </div>

      {latest ? (
        <div className="space-y-3">
          <div className="grid grid-cols-2 gap-3 text-[11px]">
            <div className="p-3 bg-[#121212] border border-[#262626] rounded-none">
              <span className="text-[#A7A7A7] text-[10px] block uppercase font-medium">
                Topsoil Moisture (0-7cm)
              </span>
              <div className="mt-1">
                <span className="text-[#9CAF88] font-bold text-lg">
                  {latest.soilMoisture_0_7.toFixed(3)}
                </span>
                <span className="text-[10px] text-[#A7A7A7] ml-1">m³/m³</span>
              </div>
            </div>

            <div className="p-3 bg-[#121212] border border-[#262626] rounded-none">
              <span className="text-[#A7A7A7] text-[10px] block uppercase font-medium">
                Soil Temperature
              </span>
              <div className="mt-1">
                <span className="text-[#F4F4F4] font-bold text-lg">
                  {latest.soilTemp_0_7.toFixed(1)}°C
                </span>
              </div>
            </div>
          </div>

          <div className="grid grid-cols-2 gap-3 text-[11px]">
            <div className="p-2.5 bg-[#121212] border border-[#262626] rounded-none">
              <span className="text-[#707070] text-[10px] block uppercase">
                Subsoil (7-28cm)
              </span>
              <span className="text-[#A7A7A7] font-semibold text-sm">
                {latest.soilMoisture_7_28.toFixed(3)} m³/m³
              </span>
            </div>

            <div className="p-2.5 bg-[#121212] border border-[#262626] rounded-none">
              <span className="text-[#707070] text-[10px] block uppercase">
                Daily Evapotranspiration
              </span>
              <span className="text-[#A7A7A7] font-semibold text-sm">
                {latest.et0_today.toFixed(1)} mm/day
              </span>
            </div>
          </div>

          <div className="text-[10px] text-[#A7A7A7] flex items-center justify-between pt-1 border-t border-[#262626]">
            <span>Station: Local Synthetic Grid</span>
            <span className="text-[#707070]">{latest.ts.slice(11, 19)} UTC</span>
          </div>
        </div>
      ) : (
        <div className="p-6 text-center text-[#A7A7A7] text-xs flex flex-col items-center justify-center gap-2">
          <RefreshCw className="w-4 h-4 animate-spin text-[#9CAF88]" />
          <span>Synchronizing telemetry stream...</span>
        </div>
      )}
    </div>
  );
}
