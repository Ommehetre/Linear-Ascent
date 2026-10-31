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
    <div className="w-full bg-[#FFFFFF] border border-[#B5B0A6] p-4 lg:p-5 text-xs space-y-3.5 rounded-sm shadow-xs">
      {/* Top Bar: Farm Presets & High-Priority Trigger */}
      <div className="flex flex-wrap items-center justify-between gap-4">
        <div className="flex flex-wrap items-center gap-2">
          <span className="text-[#141414] font-sans font-bold uppercase tracking-wider text-xs flex items-center gap-1.5 mr-1">
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
                className={`px-3 py-1.5 border font-sans font-semibold text-xs tracking-wide transition-all rounded-sm flex items-center gap-1.5 cursor-pointer ${
                  isSelected
                    ? "bg-[#9CAF88] border-[#7F946A] text-[#FFFFFF] shadow-xs"
                    : "bg-[#F4F1EA] border-[#CDC9BF] text-[#3D3B38] hover:border-[#9CAF88] hover:text-[#141414]"
                }`}
              >
                <MapPin className={`w-3.5 h-3.5 ${isSelected ? "text-[#FFFFFF]" : "text-[#9CAF88]"}`} />
                <span>{preset.name}</span>
                <span className={`text-[10px] font-mono ${isSelected ? "text-[#EBF0E6]" : "text-[#6E6A63]"}`}>
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
          className="flex items-center gap-2 px-5 py-2.5 bg-[#CC5500] hover:bg-[#B84C00] disabled:opacity-50 text-[#FFFFFF] font-sans font-bold text-xs uppercase tracking-wider transition-all rounded-sm cursor-pointer shadow-xs"
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
      <div className="flex flex-wrap items-center justify-between gap-4 pt-3 border-t border-[#E2DFD7] text-[11px]">
        <form
          onSubmit={handleApplyCoordinates}
          className="flex flex-wrap items-center gap-2 text-[#403E3A]"
        >
          <span className="font-sans font-bold uppercase tracking-wider text-[11px] text-[#141414]">Manual Coordinates:</span>
          <input
            type="number"
            step="0.0001"
            value={customLat}
            onChange={(e) => setCustomLat(e.target.value)}
            className="w-24 px-2.5 py-1 bg-[#F4F1EA] border border-[#CDC9BF] text-[#141414] font-mono focus:border-[#9CAF88] focus:outline-none rounded-sm"
            placeholder="Latitude"
          />
          <span className="text-[#6E6A63] font-mono">°N</span>
          <input
            type="number"
            step="0.0001"
            value={customLon}
            onChange={(e) => setCustomLon(e.target.value)}
            className="w-24 px-2.5 py-1 bg-[#F4F1EA] border border-[#CDC9BF] text-[#141414] font-mono focus:border-[#9CAF88] focus:outline-none rounded-sm"
            placeholder="Longitude"
          />
          <span className="text-[#6E6A63] font-mono">°E</span>
          <button
            type="submit"
            className="px-3 py-1 bg-[#E2DFD7] hover:bg-[#D6D2C9] text-[#141414] font-sans font-bold uppercase tracking-wider text-[10px] border border-[#B5B0A6] transition-colors rounded-sm cursor-pointer"
          >
            Apply
          </button>
        </form>

        <div className="flex items-center gap-2.5">
          <span className="font-sans font-bold uppercase tracking-wider text-[11px] text-[#141414]">Target Crop:</span>
          <select
            value={selectedCrop}
            onChange={(e) => onCropChange(e.target.value as CropType)}
            className="px-3 py-1 bg-[#F4F1EA] border border-[#CDC9BF] text-[#3D5230] font-sans font-bold focus:border-[#9CAF88] focus:outline-none cursor-pointer rounded-sm"
          >
            {CROPS.map((c) => (
              <option key={c} value={c} className="bg-[#FFFFFF] text-[#141414]">
                {c}
              </option>
            ))}
          </select>
        </div>
      </div>
    </div>
  );
}
