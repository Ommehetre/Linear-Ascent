"use client";

import React from "react";
import {
  LineChart,
  Line,
  XAxis,
  YAxis,
  CartesianGrid,
  Tooltip,
  Legend,
  ResponsiveContainer,
  ReferenceLine,
} from "recharts";
import type { NdviDataPoint } from "@/types";
import { Activity, AlertTriangle, TrendingDown, TrendingUp } from "lucide-react";

interface NdviTrendChartProps {
  ndviSeries?: NdviDataPoint[];
  ndviDecline?: boolean;
  ndviAnomaly?: number;
  loading?: boolean;
}

export function NdviTrendChart({
  ndviSeries,
  ndviDecline,
  ndviAnomaly,
  loading,
}: NdviTrendChartProps) {
  if (loading) {
    return (
      <div className="w-full h-80 flex flex-col items-center justify-center bg-[#FFFFFF] border border-[#D8D5D0] text-[#666666] font-mono text-xs space-y-3 rounded-none">
        <Activity className="w-7 h-7 text-[#9CAF88] animate-pulse" />
        <span>Extracting multi-scene Sentinel-2 spectral indices...</span>
      </div>
    );
  }

  if (!ndviSeries || ndviSeries.length === 0) {
    return (
      <div className="w-full h-80 flex flex-col items-center justify-center bg-[#FFFFFF] border border-[#D8D5D0] text-[#666666] font-mono text-xs space-y-2 rounded-none p-6 text-center">
        <Activity className="w-6 h-6 text-[#707070]" />
        <span className="font-semibold text-[#1A1A1A]">Spectral Time Series Unavailable</span>
        <span className="max-w-md text-[#666666]">
          Cloud-free Sentinel-2 scenes for this bounding box did not contain sufficient optical surface reflectance. Zero synthetic data generated.
        </span>
      </div>
    );
  }

  const latest = ndviSeries[ndviSeries.length - 1];
  const oldest = ndviSeries[0];
  const anomaly = ndviAnomaly ?? (latest && oldest ? Number((latest.ndvi - oldest.ndvi).toFixed(4)) : 0);

  const chartData = ndviSeries.map((pt) => ({
    date: pt.date,
    ndvi: Number(pt.ndvi.toFixed(3)),
    ndwi: Number(pt.ndwi.toFixed(3)),
    heterogeneity: Number(pt.ndviStd.toFixed(3)),
    cloudCover: pt.cloudCover,
  }));

  return (
    <div className="space-y-4">
      {/* Top Stat Badges Bar */}
      <div className="flex flex-wrap items-center justify-between gap-3 p-3.5 bg-[#F7F5F2] border border-[#D8D5D0] rounded-none">
        <div className="flex items-center gap-2">
          <Activity className="w-4 h-4 text-[#9CAF88]" />
          <span className="text-xs font-mono text-[#1A1A1A] font-semibold uppercase tracking-wider">
            Sentinel-2 Spectral Dynamics ({ndviSeries.length} Scenes)
          </span>
        </div>

        <div className="flex flex-wrap items-center gap-2 text-xs font-mono">
          <div className="flex items-center gap-1.5 bg-[#FFFFFF] px-2.5 py-1 border border-[#D8D5D0] rounded-none">
            <span className="text-[#555555]">Latest NDVI:</span>
            <span className="font-bold text-[#3D5230]">{latest.ndvi.toFixed(3)}</span>
          </div>

          <div className="flex items-center gap-1.5 bg-[#FFFFFF] px-2.5 py-1 border border-[#D8D5D0] rounded-none">
            <span className="text-[#555555]">Latest NDWI:</span>
            <span className="font-bold text-[#555555]">{latest.ndwi.toFixed(3)}</span>
          </div>

          <div className="flex items-center gap-1.5 bg-[#FFFFFF] px-2.5 py-1 border border-[#D8D5D0] rounded-none">
            <span className="text-[#555555]">Plot Std Dev:</span>
            <span className="font-bold text-[#1A1A1A]">±{latest.ndviStd.toFixed(3)}</span>
          </div>

          <div className="flex items-center gap-1.5 bg-[#FFFFFF] px-2.5 py-1 border border-[#D8D5D0] rounded-none">
            <span className="text-[#555555]">Trend Anomaly:</span>
            <span
              className={`font-bold flex items-center gap-1 ${
                anomaly < -0.05 ? "text-[#CC5500]" : "text-[#3D5230]"
              }`}
            >
              {anomaly < -0.05 ? (
                <TrendingDown className="w-3.5 h-3.5" />
              ) : (
                <TrendingUp className="w-3.5 h-3.5" />
              )}
              {anomaly > 0 ? `+${anomaly.toFixed(3)}` : anomaly.toFixed(3)}
            </span>
          </div>
        </div>
      </div>

      {/* Critical Canopy Decline Warning Strip */}
      {ndviDecline && (
        <div className="flex items-center gap-2.5 px-3.5 py-2.5 bg-[#FDF1EB] border-l-2 border-l-[#CC5500] border-y border-r border-[#D8D5D0] text-xs font-mono text-[#CC5500]">
          <AlertTriangle className="w-4 h-4 shrink-0" />
          <span>
            VEGETATION ANOMALY: Rapid canopy decline detected (&gt;0.1 NDVI decrease across time series). Indicates acute moisture stress or senescent leaf browning.
          </span>
        </div>
      )}

      {/* Recharts Line Visualization */}
      <div className="w-full h-72 bg-[#FFFFFF] border border-[#D8D5D0] p-4 rounded-none">
        <ResponsiveContainer width="100%" height="100%">
          <LineChart data={chartData} margin={{ top: 10, right: 20, left: -10, bottom: 0 }}>
            <CartesianGrid strokeDasharray="3 3" stroke="#EFECE9" />
            <XAxis
              dataKey="date"
              stroke="#666666"
              tick={{ fill: "#666666", fontSize: 11, fontFamily: "monospace" }}
              tickLine={{ stroke: "#D8D5D0" }}
            />
            <YAxis
              domain={[-0.8, 1.0]}
              stroke="#666666"
              tick={{ fill: "#666666", fontSize: 11, fontFamily: "monospace" }}
              tickLine={{ stroke: "#D8D5D0" }}
              tickFormatter={(v: number) => v.toFixed(2)}
            />
            <Tooltip
              content={({ active, payload, label }) => {
                if (active && payload && payload.length) {
                  return (
                    <div className="bg-[#FFFFFF] border border-[#D8D5D0] p-3 text-xs font-mono space-y-1.5 rounded-none shadow-md">
                      <div className="text-[#555555] border-b border-[#EFECE9] pb-1 font-semibold">
                        Acquired: {label}
                      </div>
                      <div className="flex items-center justify-between gap-4 text-[#3D5230]">
                        <span>NDVI (Canopy Vigor):</span>
                        <span className="font-bold">{payload[0]?.value}</span>
                      </div>
                      <div className="flex items-center justify-between gap-4 text-[#555555]">
                        <span>NDWI (Surface Moisture):</span>
                        <span className="font-bold">{payload[1]?.value}</span>
                      </div>
                      {payload[0]?.payload?.heterogeneity !== undefined && (
                        <div className="flex items-center justify-between gap-4 text-[#1A1A1A]">
                          <span>Field Std Dev:</span>
                          <span className="font-bold">±{payload[0].payload.heterogeneity}</span>
                        </div>
                      )}
                      {payload[0]?.payload?.cloudCover !== undefined && (
                        <div className="flex items-center justify-between gap-4 text-[#707070]">
                          <span>Cloud Cover:</span>
                          <span>{payload[0].payload.cloudCover}%</span>
                        </div>
                      )}
                    </div>
                  );
                }
                return null;
              }}
            />
            <Legend
              wrapperStyle={{ paddingTop: "10px", fontSize: "11px", fontFamily: "monospace" }}
              formatter={(value) => (
                <span className="text-[#555555]">
                  {value === "ndvi"
                    ? "NDVI (Canopy Vigor)"
                    : value === "ndwi"
                    ? "NDWI (Moisture Index)"
                    : value}
                </span>
              )}
            />
            <ReferenceLine y={0.3} stroke="#CC5500" strokeDasharray="3 3" label={{ value: "Stress Baseline (0.30)", fill: "#CC5500", fontSize: 10, position: "insideBottomRight" }} />
            <ReferenceLine y={0.0} stroke="#D8D5D0" strokeDasharray="2 2" />

            <Line
              type="monotone"
              dataKey="ndvi"
              stroke="#9CAF88"
              strokeWidth={2}
              dot={{ r: 4, fill: "#9CAF88", stroke: "#FFFFFF", strokeWidth: 1 }}
              activeDot={{ r: 6, fill: "#3D5230" }}
              name="ndvi"
            />
            <Line
              type="monotone"
              dataKey="ndwi"
              stroke="#707070"
              strokeWidth={1.5}
              strokeDasharray="4 2"
              dot={{ r: 3, fill: "#707070", stroke: "#FFFFFF", strokeWidth: 1 }}
              activeDot={{ r: 5, fill: "#1A1A1A" }}
              name="ndwi"
            />
          </LineChart>
        </ResponsiveContainer>
      </div>
    </div>
  );
}

