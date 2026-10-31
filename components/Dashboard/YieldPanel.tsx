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
      <div className="p-5 bg-[#FFFFFF] border border-[#B5B0A6] space-y-4 rounded-sm animate-pulse shadow-xs">
        <div className="h-4 bg-[#E2DFD7] w-1/3 rounded-sm" />
        <div className="h-16 bg-[#E2DFD7] w-full rounded-sm" />
        <div className="h-4 bg-[#E2DFD7] w-2/3 rounded-sm" />
      </div>
    );
  }

  if (!yieldOutput) {
    return (
      <div className="bg-[#FFFFFF] border border-[#B5B0A6] p-5 text-xs space-y-3 rounded-sm shadow-xs">
        <div className="flex items-center gap-2 pb-2 border-b border-[#E2DFD7]">
          <Sprout className="w-4 h-4 text-[#6E6A63]" />
          <span className="font-sans font-bold text-[#141414] uppercase tracking-wider text-xs">
            FAO-33 Water Yield Model
          </span>
        </div>
        <p className="text-[#5A5752] font-sans text-xs leading-relaxed">
          Deterministic yield modeling is unavailable because required soil hydraulic thresholds or evapotranspiration telemetry could not be verified.
        </p>
      </div>
    );
  }

  const isSevere = yieldOutput.yieldReductionPct > 20;
  const isModerate = yieldOutput.yieldReductionPct > 10;

  return (
    <div className="bg-[#FFFFFF] border border-[#B5B0A6] p-5 space-y-4 rounded-sm shadow-xs">
      {/* Header */}
      <div className="flex items-center justify-between pb-3 border-b border-[#E2DFD7]">
        <div className="flex items-center gap-2">
          <Sprout className="w-4 h-4 text-[#9CAF88]" />
          <span className="font-sans font-bold text-[#141414] uppercase tracking-wider text-xs">
            FAO-33 Water Yield Model
          </span>
        </div>
        <span className="font-sans text-xs text-[#5A5752]">
          Crop: <strong className="text-[#3D5230] font-bold">{yieldOutput.crop}</strong> (Ky = {yieldOutput.ky})
        </span>
      </div>

      {/* Primary Yield Metrics */}
      <div className="grid grid-cols-2 gap-3.5">
        {/* Yield Reduction */}
        <div
          className={`p-3.5 border rounded-sm flex flex-col justify-between ${
            isSevere || isModerate
              ? "bg-[#FDF1EB] border-[#CC5500]"
              : "bg-[#F1F6EE] border-[#9CAF88]"
          }`}
        >
          <div className="flex items-center justify-between">
            <span className="font-sans font-bold uppercase tracking-wider text-[10px] text-[#5A5752]">Yield Reduction</span>
            <TrendingDown
              className={`w-4 h-4 ${
                isSevere || isModerate ? "text-[#CC5500]" : "text-[#3D5230]"
              }`}
            />
          </div>
          <div className="mt-2">
            <span
              className={`font-mono text-2xl font-black ${
                isSevere || isModerate ? "text-[#CC5500]" : "text-[#3D5230]"
              }`}
            >
              -{yieldOutput.yieldReductionPct.toFixed(1)}%
            </span>
          </div>
          <span className="font-mono text-[10px] text-[#6E6A63] mt-1.5">
            Deficit Ratio: {(yieldOutput.etDeficitRatio * 100).toFixed(1)}%
          </span>
        </div>

        {/* Realized Yield Estimate */}
        <div className="p-3.5 bg-[#F4F1EA] border border-[#CDC9BF] rounded-sm flex flex-col justify-between">
          <div className="flex items-center justify-between">
            <span className="font-sans font-bold uppercase tracking-wider text-[10px] text-[#5A5752]">Forecast Yield</span>
            <Gauge className="w-4 h-4 text-[#6E6A63]" />
          </div>
          <div className="mt-2">
            <span className="font-mono text-2xl font-black text-[#141414]">
              {yieldOutput.estimatedYield_t_ha.toFixed(2)}
            </span>
            <span className="font-sans text-xs text-[#5A5752] ml-1 font-semibold">t/ha</span>
          </div>
          <span className="font-mono text-[10px] text-[#6E6A63] mt-1.5">
            Baseline: {yieldOutput.maxYield_t_ha.toFixed(1)} t/ha
          </span>
        </div>
      </div>

      {/* Evapotranspiration Dynamics */}
      <div className="space-y-2 pt-1 text-xs">
        <div className="flex justify-between font-sans text-[#5A5752]">
          <span>Actual Evapotranspiration (ETa):</span>
          <span className="font-mono font-bold text-[#141414]">{yieldOutput.eta_mm} mm</span>
        </div>
        <div className="flex justify-between font-sans text-[#5A5752]">
          <span>Potential Evapotranspiration (ETm):</span>
          <span className="font-mono font-bold text-[#141414]">{yieldOutput.etm_mm} mm</span>
        </div>
        <div className="flex justify-between font-sans text-[#5A5752]">
          <span>Soil Moisture Deficit Index (SMDI):</span>
          <span
            className={`font-mono font-bold ${
              yieldOutput.smdi < -0.4 ? "text-[#CC5500]" : "text-[#3D5230]"
            }`}
          >
            {yieldOutput.smdi.toFixed(3)}
          </span>
        </div>
      </div>

      {/* Irrigation Deficit Warning Banner */}
      <div className="p-3 bg-[#FDF1EB] border-l-4 border-l-[#CC5500] border-y border-r border-[#CDC9BF] flex items-center justify-between rounded-sm">
        <div className="flex items-center gap-2">
          <Droplet className="w-4 h-4 text-[#CC5500]" />
          <span className="font-sans text-xs font-bold text-[#141414]">Irrigation Deficit:</span>
        </div>
        <span className="font-mono text-xs font-bold text-[#CC5500]">
          {yieldOutput.irrigationDeficit_L_ha.toLocaleString()} L/ha
        </span>
      </div>
    </div>
  );
}
