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
      <div className="w-full h-80 flex flex-col items-center justify-center bg-[#FFFFFF] border border-[#D8D5D0] text-[#666666] font-mono text-xs space-y-3 rounded-none">
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
    <div className="space-y-4">
      {/* Top Header Metrics Row */}
      <div className="flex flex-wrap items-center justify-between gap-3 p-3.5 bg-[#F7F5F2] border border-[#D8D5D0] rounded-none">
        <div className="flex items-center gap-2">
          <Activity className="w-4 h-4 text-[#9CAF88]" />
          <span className="text-xs font-mono text-[#1A1A1A] font-semibold uppercase tracking-wider">
            Hydrology & Monsoon Dynamics
          </span>
        </div>

        <div className="flex flex-wrap items-center gap-2.5 text-xs font-mono">
          <div className="flex items-center gap-1.5 bg-[#FFFFFF] px-2.5 py-1 border border-[#D8D5D0] rounded-none">
            <span className="text-[#555555]">10-Yr LPA:</span>
            <span className="font-bold text-[#1A1A1A]">{monsoon.lpa_mm.toFixed(1)} mm</span>
          </div>

          <div
            className={`flex items-center gap-1.5 px-2.5 py-1 border font-bold rounded-none ${
              isDeficit
                ? "bg-[#FDF1EB] text-[#CC5500] border-[#CC5500]"
                : "bg-[#F1F6EE] text-[#3D5230] border-[#9CAF88]"
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
                ? "bg-[#FDF1EB] text-[#CC5500] border-[#CC5500]"
                : "bg-[#FFFFFF] text-[#555555] border-[#D8D5D0]"
            }`}
          >
            <span>SPEI:</span>
            <span>{monsoon.spei.toFixed(2)}</span>
          </div>
        </div>
      </div>

      {/* Chart 1: 10-Year Historical JJAS Monsoon vs LPA Baseline */}
      <div className="w-full bg-[#FFFFFF] p-4 border border-[#D8D5D0] rounded-none">
        <div className="flex justify-between items-center text-[11px] font-mono text-[#555555] mb-3 px-1">
          <span className="font-semibold uppercase text-[#1A1A1A]">
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
              <CartesianGrid stroke="#EFECE9" strokeDasharray="2 2" vertical={false} />
              <XAxis
                dataKey="year"
                stroke="#666666"
                tick={{ fill: "#666666", fontSize: 11, fontFamily: "monospace" }}
                axisLine={{ stroke: "#D8D5D0" }}
                tickLine={false}
              />
              <YAxis
                stroke="#666666"
                tick={{ fill: "#666666", fontSize: 10, fontFamily: "monospace" }}
                axisLine={false}
                tickLine={false}
              />
              <Tooltip
                contentStyle={{
                  backgroundColor: "#FFFFFF",
                  borderColor: "#D8D5D0",
                  borderRadius: 0,
                  fontSize: 11,
                  fontFamily: "monospace",
                  color: "#1A1A1A",
                }}
              />
              <Legend
                wrapperStyle={{ fontSize: 11, fontFamily: "monospace", paddingTop: 8 }}
              />
              <ReferenceLine
                y={monsoon.lpa_mm}
                stroke="#666666"
                strokeDasharray="4 4"
                strokeWidth={1.5}
                label={{
                  value: `LPA ${monsoon.lpa_mm.toFixed(0)}mm`,
                  fill: "#666666",
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
      <div className="w-full bg-[#FFFFFF] p-4 border border-[#D8D5D0] rounded-none">
        <div className="flex justify-between items-center text-[11px] font-mono text-[#555555] mb-3 px-1">
          <span className="font-semibold uppercase text-[#1A1A1A]">
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
              <CartesianGrid stroke="#EFECE9" strokeDasharray="2 2" vertical={false} />
              <XAxis
                dataKey="date"
                stroke="#666666"
                tick={{ fill: "#666666", fontSize: 10, fontFamily: "monospace" }}
                axisLine={{ stroke: "#D8D5D0" }}
                tickLine={false}
              />
              <YAxis
                stroke="#666666"
                tick={{ fill: "#666666", fontSize: 10, fontFamily: "monospace" }}
                axisLine={false}
                tickLine={false}
              />
              <Tooltip
                contentStyle={{
                  backgroundColor: "#FFFFFF",
                  borderColor: "#D8D5D0",
                  borderRadius: 0,
                  fontSize: 11,
                  fontFamily: "monospace",
                  color: "#1A1A1A",
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
