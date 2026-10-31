"use client";

import React from "react";
import {
  AreaChart,
  Area,
  XAxis,
  YAxis,
  CartesianGrid,
  Tooltip,
  Legend,
  ResponsiveContainer,
  ReferenceLine,
} from "recharts";
import type { SoilForecast, SoilProfile } from "@/types";
import { Droplet, Layers } from "lucide-react";

interface SoilMoistureChartProps {
  soilForecast: SoilForecast | null;
  soilProfile: SoilProfile | null;
  loading?: boolean;
}

export function SoilMoistureChart({
  soilForecast,
  soilProfile,
  loading,
}: SoilMoistureChartProps) {
  if (loading || !soilForecast || !soilProfile) {
    return (
      <div className="w-full h-80 flex flex-col items-center justify-center bg-[#1a1a1a] border border-[#2a2a2a] text-[#A7A7A7] font-mono text-xs space-y-3 rounded-none">
        <Droplet className="w-7 h-7 text-[#9CAF88] animate-pulse" />
        <span>Synthesizing root-zone soil hydraulic profile...</span>
      </div>
    );
  }

  // Downsample hourly data to 6-hour intervals for clear visualization
  const chartData = [];
  const times = soilForecast.time || [];
  const m0_7 = soilForecast.soilMoisture_0_7 || [];
  const m7_28 = soilForecast.soilMoisture_7_28 || [];
  const m28_100 = soilForecast.soilMoisture_28_100 || [];
  const t0_7 = soilForecast.soilTemp_0_7 || [];

  for (let i = 0; i < times.length; i += 6) {
    chartData.push({
      time: times[i]?.slice(5, 13).replace("T", " ") || `H+${i}`,
      topsoil_0_7cm: m0_7[i] !== null ? Number(m0_7[i]!.toFixed(3)) : null,
      rootzone_7_28cm: m7_28[i] !== null ? Number(m7_28[i]!.toFixed(3)) : null,
      subsoil_28_100cm: m28_100[i] !== null ? Number(m28_100[i]!.toFixed(3)) : null,
      soil_temp_C: t0_7[i] !== null ? Number(t0_7[i]!.toFixed(1)) : null,
    });
  }

  const latestMoisture = m0_7.find((v) => v !== null) ?? 0.22;
  const isBelowWP = latestMoisture <= soilProfile.wiltingPoint;
  const isBelowFC = latestMoisture < soilProfile.fieldCapacity;

  return (
    <div className="space-y-5">
      {/* Top Soil Physics Stat Badges */}
      <div className="flex flex-wrap items-center justify-between gap-3 p-3.5 bg-[#121212] border border-[#262626] rounded-none">
        <div className="flex items-center gap-2">
          <Layers className="w-4 h-4 text-[#9CAF88]" />
          <span className="text-xs font-mono text-[#F4F4F4] font-semibold uppercase tracking-wider">
            Hydraulic Thresholds
          </span>
        </div>

        <div className="flex flex-wrap items-center gap-2 text-xs font-mono">
          <div className="flex items-center gap-1.5 bg-[#1a1a1a] px-2 py-1 border border-[#2a2a2a] rounded-none">
            <span className="text-[#A7A7A7]">Clay:</span>
            <span className="font-bold text-[#F4F4F4]">{soilProfile.clay_pct.toFixed(1)}%</span>
          </div>

          <div className="flex items-center gap-1.5 bg-[#1a1a1a] px-2 py-1 border border-[#2a2a2a] rounded-none">
            <span className="text-[#A7A7A7]">pH:</span>
            <span className="font-bold text-[#F4F4F4]">{soilProfile.ph.toFixed(1)}</span>
          </div>

          <div className="flex items-center gap-1.5 bg-[#242A20] text-[#9CAF88] px-2 py-1 border border-[#9CAF88] font-bold rounded-none">
            <span>FC:</span>
            <span>{soilProfile.fieldCapacity.toFixed(3)} m³/m³</span>
          </div>

          <div className="flex items-center gap-1.5 bg-[#2C180E] text-[#CC5500] px-2 py-1 border border-[#CC5500] font-bold rounded-none">
            <span>WP:</span>
            <span>{soilProfile.wiltingPoint.toFixed(3)} m³/m³</span>
          </div>

          <div
            className={`px-2 py-1 border font-bold rounded-none ${
              isBelowWP || isBelowFC
                ? "bg-[#2C180E] text-[#CC5500] border-[#CC5500]"
                : "bg-[#242A20] text-[#9CAF88] border-[#9CAF88]"
            }`}
          >
            {isBelowWP ? "BELOW WILTING POINT" : isBelowFC ? "MOISTURE DEFICIT" : "ADEQUATE"}
          </div>
        </div>
      </div>

      {/* Main Multi-Depth Area Chart */}
      <div className="w-full bg-[#121212] p-4 border border-[#262626] rounded-none">
        <div className="flex justify-between items-center text-[11px] font-mono text-[#A7A7A7] mb-3 px-1">
          <span className="font-semibold uppercase text-[#E6E6E6]">
            Root-Zone Moisture at 3 Strata (m³/m³)
          </span>
          <span className="text-[#707070]">Forecast Horizon</span>
        </div>
        <div className="h-72 w-full">
          <ResponsiveContainer width="100%" height="100%">
            <AreaChart
              data={chartData}
              margin={{ top: 10, right: 15, bottom: 5, left: -10 }}
            >
              <CartesianGrid stroke="#262626" strokeDasharray="2 2" vertical={false} />
              <XAxis
                dataKey="time"
                stroke="#5E5E5E"
                tick={{ fill: "#A7A7A7", fontSize: 10, fontFamily: "monospace" }}
                axisLine={{ stroke: "#2e2e2e" }}
                tickLine={false}
              />
              <YAxis
                stroke="#5E5E5E"
                domain={[0, 0.55]}
                tick={{ fill: "#A7A7A7", fontSize: 10, fontFamily: "monospace" }}
                axisLine={false}
                tickLine={false}
              />
              <Tooltip
                contentStyle={{
                  backgroundColor: "#1a1a1a",
                  borderColor: "#2e2e2e",
                  borderRadius: 0,
                  fontSize: 11,
                  fontFamily: "monospace",
                  color: "#F4F4F4",
                }}
              />
              <Legend
                wrapperStyle={{ fontSize: 10, fontFamily: "monospace", paddingTop: 8 }}
              />

              {/* Field Capacity Reference Line: Sage Green (#9CAF88) */}
              <ReferenceLine
                y={soilProfile.fieldCapacity}
                stroke="#9CAF88"
                strokeDasharray="4 4"
                strokeWidth={1.5}
                label={{
                  value: `FC ${soilProfile.fieldCapacity.toFixed(2)}`,
                  fill: "#9CAF88",
                  fontSize: 10,
                  position: "insideTopRight",
                }}
              />

              {/* Wilting Point Reference Line: Burnt Amber (#CC5500) */}
              <ReferenceLine
                y={soilProfile.wiltingPoint}
                stroke="#CC5500"
                strokeDasharray="4 4"
                strokeWidth={1.5}
                label={{
                  value: `WP ${soilProfile.wiltingPoint.toFixed(2)}`,
                  fill: "#CC5500",
                  fontSize: 10,
                  position: "insideBottomRight",
                }}
              />

              {/* Topsoil: Sage Green (#9CAF88) */}
              <Area
                type="monotone"
                dataKey="topsoil_0_7cm"
                name="Topsoil (0-7cm)"
                stroke="#9CAF88"
                fill="#242A20"
                strokeWidth={1.5}
              />

              {/* Active Root Zone: Concrete Grey (#A7A7A7) */}
              <Area
                type="monotone"
                dataKey="rootzone_7_28cm"
                name="Root Zone (7-28cm)"
                stroke="#A7A7A7"
                fill="#1F1F1F"
                strokeWidth={1.5}
              />

              {/* Deep Subsoil: Burnt Amber (#CC5500) */}
              <Area
                type="monotone"
                dataKey="subsoil_28_100cm"
                name="Deep Subsoil (28-100cm)"
                stroke="#CC5500"
                fill="#2C180E"
                strokeWidth={1.5}
              />
            </AreaChart>
          </ResponsiveContainer>
        </div>
      </div>
    </div>
  );
}
