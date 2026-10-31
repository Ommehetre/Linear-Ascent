"use client";

import React from "react";
import type { YieldEngineOutput } from "@/types";
import { TrendingDown, Sprout, Gauge, Droplet } from "lucide-react";

interface YieldPanelProps {
  yieldOutput: YieldEngineOutput | null;
  loading?: boolean;
}

export function YieldPanel({ yieldOutput, loading }: YieldPanelProps) {
  if (loading) {
    return (
      <div className="p-5 bg-[#FFFFFF] border border-[#D8D5D0] space-y-4 rounded-none animate-pulse">
        <div className="h-4 bg-[#EFECE9] w-1/3" />
        <div className="h-16 bg-[#EFECE9] w-full" />
        <div className="h-4 bg-[#EFECE9] w-2/3" />
      </div>
    );
  }

  if (!yieldOutput) {
    return (
      <div className="bg-[#FFFFFF] border border-[#D8D5D0] p-5 font-mono text-xs space-y-3 rounded-none shadow-xs">
        <div className="flex items-center gap-2 pb-2 border-b border-[#EFECE9]">
          <Sprout className="w-4 h-4 text-[#707070]" />
          <span className="text-xs font-bold text-[#1A1A1A] uppercase tracking-wider">
            FAO-33 Water Yield Model
          </span>
        </div>
        <p className="text-[#666666] text-[11px] leading-relaxed">
          Deterministic yield modeling is unavailable because required soil hydraulic thresholds or evapotranspiration telemetry could not be verified.
        </p>
      </div>
    );
  }

  const isSevere = yieldOutput.yieldReductionPct > 20;
  const isModerate = yieldOutput.yieldReductionPct > 10;

  return (
    <div className="bg-[#FFFFFF] border border-[#D8D5D0] p-5 font-mono space-y-4 rounded-none shadow-xs">
      {/* Header */}
      <div className="flex items-center justify-between pb-3 border-b border-[#EFECE9]">
        <div className="flex items-center gap-2">
          <Sprout className="w-4 h-4 text-[#9CAF88]" />
          <span className="text-xs font-bold text-[#1A1A1A] uppercase tracking-wider">
            FAO-33 Water Yield Model
          </span>
        </div>
        <span className="text-[11px] text-[#555555]">
          Crop: <strong className="text-[#3D5230]">{yieldOutput.crop}</strong> (Ky = {yieldOutput.ky})
        </span>
      </div>

      {/* Primary Yield Metrics */}
      <div className="grid grid-cols-2 gap-3.5">
        {/* Yield Reduction */}
        <div
          className={`p-3.5 border rounded-none flex flex-col justify-between ${
            isSevere || isModerate
              ? "bg-[#FDF1EB] border-[#CC5500]"
              : "bg-[#F1F6EE] border-[#9CAF88]"
          }`}
        >
          <div className="flex items-center justify-between">
            <span className="text-[10px] text-[#555555] uppercase font-semibold">Yield Reduction</span>
            <TrendingDown
              className={`w-4 h-4 ${
                isSevere || isModerate ? "text-[#CC5500]" : "text-[#3D5230]"
              }`}
            />
          </div>
          <div className="mt-2">
            <span
              className={`text-2xl font-black ${
                isSevere || isModerate ? "text-[#CC5500]" : "text-[#3D5230]"
              }`}
            >
              -{yieldOutput.yieldReductionPct.toFixed(1)}%
            </span>
          </div>
          <span className="text-[10px] text-[#666666] mt-1.5">
            Deficit Ratio: {(yieldOutput.etDeficitRatio * 100).toFixed(1)}%
          </span>
        </div>

        {/* Realized Yield Estimate */}
        <div className="p-3.5 bg-[#F7F5F2] border border-[#D8D5D0] rounded-none flex flex-col justify-between">
          <div className="flex items-center justify-between">
            <span className="text-[10px] text-[#555555] uppercase font-semibold">Forecast Yield</span>
            <Gauge className="w-4 h-4 text-[#707070]" />
          </div>
          <div className="mt-2">
            <span className="text-2xl font-black text-[#1A1A1A]">
              {yieldOutput.estimatedYield_t_ha.toFixed(2)}
            </span>
            <span className="text-xs text-[#555555] ml-1">t/ha</span>
          </div>
          <span className="text-[10px] text-[#666666] mt-1.5">
            Baseline: {yieldOutput.maxYield_t_ha.toFixed(1)} t/ha
          </span>
        </div>
      </div>

      {/* Evapotranspiration Dynamics */}
      <div className="space-y-2 pt-1 text-xs">
        <div className="flex justify-between text-[#555555]">
          <span>Actual Evapotranspiration (ETa):</span>
          <span className="font-bold text-[#1A1A1A]">{yieldOutput.eta_mm} mm</span>
        </div>
        <div className="flex justify-between text-[#555555]">
          <span>Potential Evapotranspiration (ETm):</span>
          <span className="font-bold text-[#1A1A1A]">{yieldOutput.etm_mm} mm</span>
        </div>
        <div className="flex justify-between text-[#555555]">
          <span>Soil Moisture Deficit Index (SMDI):</span>
          <span
            className={`font-bold ${
              yieldOutput.smdi < -0.4 ? "text-[#CC5500]" : "text-[#3D5230]"
            }`}
          >
            {yieldOutput.smdi.toFixed(3)}
          </span>
        </div>
      </div>

      {/* Irrigation Deficit Warning Banner */}
      <div className="p-3 bg-[#FDF1EB] border-l-2 border-l-[#CC5500] border-y border-r border-[#D8D5D0] flex items-center justify-between rounded-none">
        <div className="flex items-center gap-2">
          <Droplet className="w-4 h-4 text-[#CC5500]" />
          <span className="text-[11px] font-semibold text-[#1A1A1A]">Irrigation Deficit:</span>
        </div>
        <span className="text-xs font-bold text-[#CC5500]">
          {yieldOutput.irrigationDeficit_L_ha.toLocaleString()} L/ha
        </span>
      </div>
    </div>
  );
}
