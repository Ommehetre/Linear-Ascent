"use client";

import React, { useState } from "react";
import type { FarmLocation, CropType } from "@/types";
import { FARM_PRESETS } from "@/lib/constants";
import { MapPin, Play, RefreshCw, Compass } from "lucide-react";

interface LocationSelectorProps {
  selectedLocation: FarmLocation;
  onLocationChange: (loc: FarmLocation) => void;
  selectedCrop: CropType;
  onCropChange: (crop: CropType) => void;
  onRunEngine: () => void;
  loading?: boolean;
}

const CROPS: CropType[] = ["Cotton", "Soybean", "Rice", "Wheat", "Pulses"];

export function LocationSelector({
  selectedLocation,
  onLocationChange,
  selectedCrop,
  onCropChange,
  onRunEngine,
  loading,
}: LocationSelectorProps) {
  const [customLat, setCustomLat] = useState(String(selectedLocation.lat));
  const [customLon, setCustomLon] = useState(String(selectedLocation.lon));

  // Sync inputs when location changes via map click
  React.useEffect(() => {
    setCustomLat(String(selectedLocation.lat));
    setCustomLon(String(selectedLocation.lon));
  }, [selectedLocation.lat, selectedLocation.lon]);

  const handleApplyCoordinates = (e: React.FormEvent) => {
    e.preventDefault();
    const lat = parseFloat(customLat);
    const lon = parseFloat(customLon);
    if (!isNaN(lat) && !isNaN(lon)) {
      onLocationChange({
        name: `Custom (${lat.toFixed(3)}°N, ${lon.toFixed(3)}°E)`,
        lat,
        lon,
        bbox: [lon - 0.15, lat - 0.15, lon + 0.15, lat + 0.15],
        state: selectedLocation.state,
        crop: selectedCrop,
      });
    }
  };

  return (
    <div className="w-full bg-[#FFFFFF] border border-[#D8D5D0] p-4 lg:p-5 font-mono text-xs space-y-3.5 rounded-none shadow-xs">
      {/* Top Bar: Farm Presets & High-Priority Trigger */}
      <div className="flex flex-wrap items-center justify-between gap-4">
        <div className="flex flex-wrap items-center gap-2">
          <span className="text-[#555555] font-bold uppercase text-[11px] flex items-center gap-1.5 mr-1">
            <Compass className="w-4 h-4 text-[#9CAF88]" />
            Target Region Presets:
          </span>

          {FARM_PRESETS.map((preset) => {
            const isSelected =
              Math.abs(preset.lat - selectedLocation.lat) < 0.01 &&
              Math.abs(preset.lon - selectedLocation.lon) < 0.01;

            return (
              <button
                key={preset.name}
                type="button"
                onClick={() => {
                  onLocationChange(preset);
                  onCropChange(preset.crop);
                }}
                className={`px-3 py-1.5 border font-semibold text-xs transition-colors rounded-none flex items-center gap-1.5 ${
                  isSelected
                    ? "bg-[#9CAF88] border-[#9CAF88] text-[#FFFFFF]"
                    : "bg-[#F5F3F0] border-[#D8D5D0] text-[#555555] hover:border-[#9CAF88] hover:text-[#1A1A1A]"
                }`}
              >
                <MapPin className={`w-3.5 h-3.5 ${isSelected ? "text-[#FFFFFF]" : "text-[#9CAF88]"}`} />
                <span>{preset.name}</span>
                <span className={`text-[10px] ${isSelected ? "text-[#EBF0E6]" : "text-[#707070]"}`}>
                  ({preset.crop})
                </span>
              </button>
            );
          })}
        </div>

        {/* High-Priority Action Button: Burnt Amber (#CC5500) */}
        <button
          type="button"
          onClick={onRunEngine}
          disabled={loading}
          className="flex items-center gap-2 px-5 py-2.5 bg-[#CC5500] hover:bg-[#B84C00] disabled:opacity-50 text-[#FFFFFF] font-bold text-xs tracking-wider transition-colors rounded-none cursor-pointer"
        >
          {loading ? (
            <>
              <RefreshCw className="w-4 h-4 animate-spin text-[#FFFFFF]" />
              <span>ORCHESTRATING PIPELINE...</span>
            </>
          ) : (
            <>
              <Play className="w-4 h-4 fill-current" />
              <span>RUN MULTIMODAL ENGINE</span>
            </>
          )}
        </button>
      </div>

      {/* Bottom Sub-bar: Coordinate Manual Inputs & Crop Dropdown */}
      <div className="flex flex-wrap items-center justify-between gap-4 pt-3 border-t border-[#EFECE9] text-[11px]">
        <form
          onSubmit={handleApplyCoordinates}
          className="flex flex-wrap items-center gap-2 text-[#555555]"
        >
          <span className="font-semibold text-[#1A1A1A]">Manual Coordinates:</span>
          <input
            type="number"
            step="0.0001"
            value={customLat}
            onChange={(e) => setCustomLat(e.target.value)}
            className="w-24 px-2.5 py-1 bg-[#F7F5F2] border border-[#D8D5D0] text-[#1A1A1A] font-mono focus:border-[#9CAF88] focus:outline-none rounded-none"
            placeholder="Latitude"
          />
          <span className="text-[#707070]">°N</span>
          <input
            type="number"
            step="0.0001"
            value={customLon}
            onChange={(e) => setCustomLon(e.target.value)}
            className="w-24 px-2.5 py-1 bg-[#F7F5F2] border border-[#D8D5D0] text-[#1A1A1A] font-mono focus:border-[#9CAF88] focus:outline-none rounded-none"
            placeholder="Longitude"
          />
          <span className="text-[#707070]">°E</span>
          <button
            type="submit"
            className="px-3 py-1 bg-[#EFECE9] hover:bg-[#E4E3DF] text-[#1A1A1A] font-medium border border-[#D8D5D0] transition-colors rounded-none cursor-pointer"
          >
            Apply
          </button>
        </form>

        <div className="flex items-center gap-2.5">
          <span className="text-[#555555] font-semibold">Target Crop:</span>
          <select
            value={selectedCrop}
            onChange={(e) => onCropChange(e.target.value as CropType)}
            className="px-3 py-1 bg-[#F7F5F2] border border-[#D8D5D0] text-[#4E653E] font-bold focus:border-[#9CAF88] focus:outline-none cursor-pointer rounded-none"
          >
            {CROPS.map((c) => (
              <option key={c} value={c} className="bg-[#FFFFFF] text-[#1A1A1A]">
                {c}
              </option>
            ))}
          </select>
        </div>
      </div>
    </div>
  );
}
