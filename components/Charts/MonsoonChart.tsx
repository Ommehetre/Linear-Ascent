"use client";

import React from "react";
import {
  ComposedChart,
  Bar,
  XAxis,
  YAxis,
  CartesianGrid,
  Tooltip,
  Legend,
  ResponsiveContainer,
  ReferenceLine,
  AreaChart,
  Area,
} from "recharts";
import type { MonsoonData } from "@/types";
import { CloudRain, Activity } from "lucide-react";

interface MonsoonChartProps {
  monsoon: MonsoonData | null;
  loading?: boolean;
}

export function MonsoonChart({ monsoon, loading }: MonsoonChartProps) {
  if (loading || !monsoon) {
    return (
      <div className="w-full h-80 flex flex-col items-center justify-center bg-[#1a1a1a] border border-[#2a2a2a] text-[#A7A7A7] font-mono text-xs space-y-3 rounded-none">
        <CloudRain className="w-7 h-7 text-[#9CAF88] animate-pulse" />
        <span>Synchronizing 10-year monsoon hydrological baseline...</span>
      </div>
    );
  }

  // Historical JJAS bar data
  const historicalData = monsoon.historical.map((item) => ({
    year: String(item.year),
    rainfall_mm: Number(item.jjas_mm.toFixed(1)),
    lpa_baseline: Number(monsoon.lpa_mm.toFixed(1)),
  }));

  // 14-day forecast data
  const forecastData = monsoon.forecast14d.map((d) => ({
    date: d.date.slice(5), // "MM-DD"
    precip_mm: Number(d.precip_mm.toFixed(1)),
    et0_mm: Number(d.et0_mm.toFixed(1)),
  }));

  const isDeficit = monsoon.lpa_deviation_pct < 0;
  const isDroughtSpei = monsoon.spei < -1;

  return (
    <div className="space-y-5">
      {/* Top Header Metrics Row */}
      <div className="flex flex-wrap items-center justify-between gap-3 p-3.5 bg-[#121212] border border-[#262626] rounded-none">
        <div className="flex items-center gap-2">
          <Activity className="w-4 h-4 text-[#9CAF88]" />
          <span className="text-xs font-mono text-[#F4F4F4] font-semibold uppercase tracking-wider">
            Hydrology & Monsoon Dynamics
          </span>
        </div>

        <div className="flex flex-wrap items-center gap-2.5 text-xs font-mono">
          <div className="flex items-center gap-1.5 bg-[#1a1a1a] px-2.5 py-1 border border-[#2a2a2a] rounded-none">
            <span className="text-[#A7A7A7]">10-Yr LPA:</span>
            <span className="font-bold text-[#F4F4F4]">{monsoon.lpa_mm.toFixed(1)} mm</span>
          </div>

          <div
            className={`flex items-center gap-1.5 px-2.5 py-1 border font-bold rounded-none ${
              isDeficit
                ? "bg-[#2C180E] text-[#CC5500] border-[#CC5500]"
                : "bg-[#242A20] text-[#9CAF88] border-[#9CAF88]"
            }`}
          >
            <span>Deviation:</span>
            <span>
              {monsoon.lpa_deviation_pct > 0 ? "+" : ""}
              {monsoon.lpa_deviation_pct.toFixed(1)}%
            </span>
          </div>

          <div
            className={`flex items-center gap-1.5 px-2.5 py-1 border font-bold rounded-none ${
              isDroughtSpei
                ? "bg-[#2C180E] text-[#CC5500] border-[#CC5500]"
                : "bg-[#1a1a1a] text-[#A7A7A7] border-[#2a2a2a]"
            }`}
          >
            <span>SPEI:</span>
            <span>{monsoon.spei.toFixed(2)}</span>
          </div>
        </div>
      </div>

      {/* Chart 1: 10-Year Historical JJAS Monsoon vs LPA Baseline */}
      <div className="w-full bg-[#121212] p-4 border border-[#262626] rounded-none">
        <div className="flex justify-between items-center text-[11px] font-mono text-[#A7A7A7] mb-3 px-1">
          <span className="font-semibold uppercase text-[#E6E6E6]">
            10-Year Historical Monsoon (JJAS Total) vs LPA
          </span>
          <span className="text-[#707070]">Rainfall (mm)</span>
        </div>
        <div className="h-60 w-full">
          <ResponsiveContainer width="100%" height="100%">
            <ComposedChart
              data={historicalData}
              margin={{ top: 10, right: 15, bottom: 5, left: -10 }}
            >
              <CartesianGrid stroke="#262626" strokeDasharray="2 2" vertical={false} />
              <XAxis
                dataKey="year"
                stroke="#5E5E5E"
                tick={{ fill: "#A7A7A7", fontSize: 11, fontFamily: "monospace" }}
                axisLine={{ stroke: "#2e2e2e" }}
                tickLine={false}
              />
              <YAxis
                stroke="#5E5E5E"
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
                wrapperStyle={{ fontSize: 11, fontFamily: "monospace", paddingTop: 8 }}
              />
              <ReferenceLine
                y={monsoon.lpa_mm}
                stroke="#A7A7A7"
                strokeDasharray="4 4"
                strokeWidth={1.5}
                label={{
                  value: `LPA ${monsoon.lpa_mm.toFixed(0)}mm`,
                  fill: "#A7A7A7",
                  fontSize: 10,
                  position: "insideTopRight",
                }}
              />
              <Bar
                dataKey="rainfall_mm"
                name="JJAS Monsoon (mm)"
                fill="#9CAF88"
                radius={[0, 0, 0, 0]}
                barSize={20}
              />
            </ComposedChart>
          </ResponsiveContainer>
        </div>
      </div>

      {/* Chart 2: 14-Day Micro-Climate Rainfall vs Evapotranspiration */}
      <div className="w-full bg-[#121212] p-4 border border-[#262626] rounded-none">
        <div className="flex justify-between items-center text-[11px] font-mono text-[#A7A7A7] mb-3 px-1">
          <span className="font-semibold uppercase text-[#E6E6E6]">
            14-Day Precipitation vs Atmospheric Demand (ET₀)
          </span>
          <span className="text-[#707070]">mm / day</span>
        </div>
        <div className="h-52 w-full">
          <ResponsiveContainer width="100%" height="100%">
            <AreaChart
              data={forecastData}
              margin={{ top: 10, right: 15, bottom: 5, left: -10 }}
            >
              <CartesianGrid stroke="#262626" strokeDasharray="2 2" vertical={false} />
              <XAxis
                dataKey="date"
                stroke="#5E5E5E"
                tick={{ fill: "#A7A7A7", fontSize: 10, fontFamily: "monospace" }}
                axisLine={{ stroke: "#2e2e2e" }}
                tickLine={false}
              />
              <YAxis
                stroke="#5E5E5E"
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
              <Area
                type="monotone"
                dataKey="precip_mm"
                name="Rainfall (mm)"
                stroke="#9CAF88"
                fill="#242A20"
                strokeWidth={1.5}
              />
              <Area
                type="monotone"
                dataKey="et0_mm"
                name="ET₀ Water Demand (mm)"
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
