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
      <div className="w-full h-80 flex flex-col items-center justify-center bg-[#FFFFFF] border border-[#B5B0A6] text-[#5A5752] font-sans text-xs space-y-3 rounded-sm shadow-xs">
        <CloudRain className="w-7 h-7 text-[#9CAF88] animate-pulse" />
        <span className="font-semibold uppercase tracking-wider text-[11px]">Synchronizing 10-year monsoon hydrological baseline...</span>
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
    <div className="space-y-4">
      {/* Top Header Metrics Row */}
      <div className="flex flex-wrap items-center justify-between gap-3 p-3.5 bg-[#F4F1EA] border border-[#CDC9BF] rounded-sm">
        <div className="flex items-center gap-2">
          <Activity className="w-4 h-4 text-[#9CAF88]" />
          <span className="font-sans text-xs text-[#141414] font-bold uppercase tracking-wider">
            Hydrology & Monsoon Dynamics
          </span>
        </div>

        <div className="flex flex-wrap items-center gap-2.5 text-xs">
          <div className="flex items-center gap-1.5 bg-[#FFFFFF] px-2.5 py-1 border border-[#CDC9BF] rounded-sm">
            <span className="font-sans text-[11px] text-[#5A5752]">10-Yr LPA:</span>
            <span className="font-mono font-bold text-[#141414]">{monsoon.lpa_mm.toFixed(1)} mm</span>
          </div>

          <div
            className={`flex items-center gap-1.5 px-2.5 py-1 border rounded-sm ${
              isDeficit
                ? "bg-[#FDF1EB] text-[#CC5500] border-[#CC5500]"
                : "bg-[#F1F6EE] text-[#3D5230] border-[#9CAF88]"
            }`}
          >
            <span className="font-sans text-[11px]">Deviation:</span>
            <span className="font-mono font-bold">
              {monsoon.lpa_deviation_pct > 0 ? "+" : ""}
              {monsoon.lpa_deviation_pct.toFixed(1)}%
            </span>
          </div>

          <div
            className={`flex items-center gap-1.5 px-2.5 py-1 border rounded-sm ${
              isDroughtSpei
                ? "bg-[#FDF1EB] text-[#CC5500] border-[#CC5500]"
                : "bg-[#FFFFFF] text-[#403E3A] border-[#CDC9BF]"
            }`}
          >
            <span className="font-sans text-[11px]">SPEI:</span>
            <span className="font-mono font-bold">{monsoon.spei.toFixed(2)}</span>
          </div>
        </div>
      </div>

      {/* Chart 1: 10-Year Historical JJAS Monsoon vs LPA Baseline */}
      <div className="w-full bg-[#FFFFFF] p-5 border border-[#B5B0A6] rounded-sm shadow-xs">
        <div className="flex justify-between items-center text-xs mb-3 px-1">
          <span className="font-sans font-bold uppercase tracking-wider text-[#141414]">
            10-Year Historical Monsoon (JJAS Total) vs LPA
          </span>
          <span className="font-mono text-[10px] text-[#6E6A63] uppercase tracking-wider font-semibold">Rainfall (mm)</span>
        </div>
        <div className="h-60 w-full">
          <ResponsiveContainer width="100%" height="100%">
            <ComposedChart
              data={historicalData}
              margin={{ top: 10, right: 15, bottom: 5, left: -10 }}
            >
              <CartesianGrid stroke="#E2DFD7" strokeDasharray="2 2" vertical={false} />
              <XAxis
                dataKey="year"
                stroke="#6E6A63"
                tick={{ fill: "#6E6A63", fontSize: 11, fontFamily: "monospace" }}
                axisLine={{ stroke: "#CDC9BF" }}
                tickLine={false}
              />
              <YAxis
                stroke="#6E6A63"
                tick={{ fill: "#6E6A63", fontSize: 10, fontFamily: "monospace" }}
                axisLine={false}
                tickLine={false}
              />
              <Tooltip
                contentStyle={{
                  backgroundColor: "#FFFFFF",
                  borderColor: "#B5B0A6",
                  borderRadius: 2,
                  fontSize: 11,
                  fontFamily: "monospace",
                  color: "#141414",
                }}
              />
              <Legend
                wrapperStyle={{ fontSize: 11, fontFamily: "sans-serif", paddingTop: 8 }}
              />
              <ReferenceLine
                y={monsoon.lpa_mm}
                stroke="#6E6A63"
                strokeDasharray="4 4"
                strokeWidth={1.5}
                label={{
                  value: `LPA ${monsoon.lpa_mm.toFixed(0)}mm`,
                  fill: "#5A5752",
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
      <div className="w-full bg-[#FFFFFF] p-5 border border-[#B5B0A6] rounded-sm shadow-xs">
        <div className="flex justify-between items-center text-xs mb-3 px-1">
          <span className="font-sans font-bold uppercase tracking-wider text-[#141414]">
            14-Day Precipitation vs Atmospheric Demand (ET₀)
          </span>
          <span className="font-mono text-[10px] text-[#6E6A63] uppercase tracking-wider font-semibold">mm / day</span>
        </div>
        <div className="h-52 w-full">
          <ResponsiveContainer width="100%" height="100%">
            <AreaChart
              data={forecastData}
              margin={{ top: 10, right: 15, bottom: 5, left: -10 }}
            >
              <CartesianGrid stroke="#E2DFD7" strokeDasharray="2 2" vertical={false} />
              <XAxis
                dataKey="date"
                stroke="#6E6A63"
                tick={{ fill: "#6E6A63", fontSize: 10, fontFamily: "monospace" }}
                axisLine={{ stroke: "#CDC9BF" }}
                tickLine={false}
              />
              <YAxis
                stroke="#6E6A63"
                tick={{ fill: "#6E6A63", fontSize: 10, fontFamily: "monospace" }}
                axisLine={false}
                tickLine={false}
              />
              <Tooltip
                contentStyle={{
                  backgroundColor: "#FFFFFF",
                  borderColor: "#B5B0A6",
                  borderRadius: 2,
                  fontSize: 11,
                  fontFamily: "monospace",
                  color: "#141414",
                }}
              />
              <Legend
                wrapperStyle={{ fontSize: 10, fontFamily: "sans-serif", paddingTop: 8 }}
              />
              <Area
                type="monotone"
                dataKey="precip_mm"
                name="Rainfall (mm)"
                stroke="#9CAF88"
                fill="#EBF0E6"
                strokeWidth={1.5}
              />
              <Area
                type="monotone"
                dataKey="et0_mm"
                name="ET₀ Water Demand (mm)"
                stroke="#CC5500"
                fill="#FDF1EB"
                strokeWidth={1.5}
              />
            </AreaChart>
          </ResponsiveContainer>
        </div>
      </div>
    </div>
  );
}
