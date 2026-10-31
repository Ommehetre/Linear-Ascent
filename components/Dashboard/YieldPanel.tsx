"use client";

import React from "react";
import type { YieldEngineOutput } from "@/types";
import { TrendingDown, Sprout, Gauge, Droplet } from "lucide-react";

interface YieldPanelProps {
  yieldOutput: YieldEngineOutput | null;
  loading?: boolean;
}

export function YieldPanel({ yieldOutput, loading }: YieldPanelProps) {
  if (loading || !yieldOutput) {
    return (
      <div className="p-5 bg-[#1a1a1a] border border-[#2a2a2a] space-y-4 rounded-none animate-pulse">
        <div className="h-4 bg-[#262626] w-1/3" />
        <div className="h-16 bg-[#262626] w-full" />
        <div className="h-4 bg-[#262626] w-2/3" />
      </div>
    );
  }

  const isSevere = yieldOutput.yieldReductionPct > 20;
  const isModerate = yieldOutput.yieldReductionPct > 10;

  return (
    <div className="bg-[#1a1a1a] border border-[#2a2a2a] p-5 font-mono space-y-4 rounded-none">
      {/* Header */}
      <div className="flex items-center justify-between pb-3 border-b border-[#262626]">
        <div className="flex items-center gap-2">
          <Sprout className="w-4 h-4 text-[#9CAF88]" />
          <span className="text-xs font-bold text-[#F4F4F4] uppercase tracking-wider">
            FAO-33 Water Yield Model
          </span>
        </div>
        <span className="text-[11px] text-[#A7A7A7]">
          Crop: <strong className="text-[#9CAF88]">{yieldOutput.crop}</strong> (Ky = {yieldOutput.ky})
        </span>
      </div>

      {/* Primary Yield Metrics */}
      <div className="grid grid-cols-2 gap-3.5">
        {/* Yield Reduction */}
        <div
          className={`p-3.5 border rounded-none flex flex-col justify-between ${
            isSevere || isModerate
              ? "bg-[#2C180E] border-[#CC5500]"
              : "bg-[#242A20] border-[#9CAF88]"
          }`}
        >
          <div className="flex items-center justify-between">
            <span className="text-[10px] text-[#A7A7A7] uppercase font-semibold">Yield Reduction</span>
            <TrendingDown
              className={`w-4 h-4 ${
                isSevere || isModerate ? "text-[#CC5500]" : "text-[#9CAF88]"
              }`}
            />
          </div>
          <div className="mt-2">
            <span
              className={`text-2xl font-black ${
                isSevere || isModerate ? "text-[#CC5500]" : "text-[#9CAF88]"
              }`}
            >
              -{yieldOutput.yieldReductionPct.toFixed(1)}%
            </span>
          </div>
          <span className="text-[10px] text-[#A7A7A7] mt-1.5">
            Deficit Ratio: {(yieldOutput.etDeficitRatio * 100).toFixed(1)}%
          </span>
        </div>

        {/* Realized Yield Estimate */}
        <div className="p-3.5 bg-[#121212] border border-[#2a2a2a] rounded-none flex flex-col justify-between">
          <div className="flex items-center justify-between">
            <span className="text-[10px] text-[#A7A7A7] uppercase font-semibold">Forecast Yield</span>
            <Gauge className="w-4 h-4 text-[#A7A7A7]" />
          </div>
          <div className="mt-2">
            <span className="text-2xl font-black text-[#F4F4F4]">
              {yieldOutput.estimatedYield_t_ha.toFixed(2)}
            </span>
            <span className="text-xs text-[#A7A7A7] ml-1">t/ha</span>
          </div>
          <span className="text-[10px] text-[#A7A7A7] mt-1.5">
            Potential Max: {yieldOutput.maxYield_t_ha} t/ha
          </span>
        </div>
      </div>

      {/* Soil Moisture Deficit Index (SMDI) & Irrigation Deficit */}
      <div className="space-y-3 pt-1 text-xs">
        {/* SMDI Bar */}
        <div className="p-3 bg-[#121212] border border-[#262626] rounded-none space-y-2">
          <div className="flex justify-between items-center text-[11px]">
            <span className="text-[#A7A7A7]">Soil Moisture Deficit Index (SMDI):</span>
            <span
              className={`font-bold ${
                yieldOutput.smdi < -0.3 ? "text-[#CC5500]" : "text-[#9CAF88]"
              }`}
            >
              {yieldOutput.smdi.toFixed(3)}
            </span>
          </div>

          {/* Visual Scale Indicator */}
          <div className="relative w-full h-1.5 bg-[#262626] rounded-none overflow-hidden">
            {(() => {
              const pct = Math.max(0, Math.min(100, ((yieldOutput.smdi + 1) / 1.5) * 100));
              return (
                <div
                  className={`h-full transition-all duration-500 ${
                    yieldOutput.smdi < -0.3 ? "bg-[#CC5500]" : "bg-[#9CAF88]"
                  }`}
                  style={{ width: `${pct}%` }}
                />
              );
            })()}
          </div>
          <div className="flex justify-between text-[9px] text-[#707070] font-mono">
            <span>-1.0 (Drought)</span>
            <span>0.0 (Field Capacity)</span>
            <span>+0.5 (Saturation)</span>
          </div>
        </div>

        {/* Deficit Volume Requirement */}
        <div className="p-3 bg-[#121212] border border-[#2a2a2a] rounded-none flex items-center justify-between">
          <div className="flex items-center gap-2.5">
            <Droplet className="w-4 h-4 text-[#9CAF88]" />
            <div>
              <p className="text-[11px] font-bold text-[#F4F4F4]">
                Deficit Irrigation Volume Required:
              </p>
              <p className="text-[10px] text-[#A7A7A7]">
                Volume to restore root-zone field capacity
              </p>
            </div>
          </div>
          <span className="text-sm font-bold text-[#9CAF88]">
            {yieldOutput.irrigationDeficit_L_ha.toLocaleString()} L/ha
          </span>
        </div>
      </div>
    </div>
  );
}
