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
        name: `Coordinate (${lat.toFixed(3)}°N, ${lon.toFixed(3)}°E)`,
        lat,
        lon,
        bbox: [lon - 0.15, lat - 0.15, lon + 0.15, lat + 0.15],
        state: selectedLocation.state,
        crop: selectedCrop,
      });
    }
  };

  return (
    <div className="w-full bg-[#1a1a1a] border border-[#2a2a2a] p-5 lg:p-6 font-mono text-xs space-y-4 rounded-none">
      {/* Top Bar: Farm Presets & High-Priority Trigger */}
      <div className="flex flex-wrap items-center justify-between gap-4">
        <div className="flex flex-wrap items-center gap-2.5">
          <span className="text-[#A7A7A7] font-bold uppercase text-[11px] flex items-center gap-1.5 mr-1">
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
                    ? "bg-[#9CAF88] border-[#9CAF88] text-[#121212]"
                    : "bg-[#121212] border-[#2a2a2a] text-[#A7A7A7] hover:border-[#A7A7A7] hover:text-[#F4F4F4]"
                }`}
              >
                <MapPin className={`w-3.5 h-3.5 ${isSelected ? "text-[#121212]" : "text-[#9CAF88]"}`} />
                <span>{preset.name}</span>
                <span className={`text-[10px] ${isSelected ? "text-[#242A20]" : "text-[#707070]"}`}>
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
          className="flex items-center gap-2 px-5 py-2.5 bg-[#CC5500] hover:bg-[#B84C00] disabled:opacity-50 text-[#F4F4F4] font-bold text-xs tracking-wider transition-colors rounded-none"
        >
          {loading ? (
            <>
              <RefreshCw className="w-4 h-4 animate-spin text-[#F4F4F4]" />
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
      <div className="flex flex-wrap items-center justify-between gap-4 pt-3 border-t border-[#262626] text-[11px]">
        <form
          onSubmit={handleApplyCoordinates}
          className="flex flex-wrap items-center gap-2 text-[#A7A7A7]"
        >
          <span className="font-medium">Coordinates:</span>
          <input
            type="number"
            step="0.0001"
            value={customLat}
            onChange={(e) => setCustomLat(e.target.value)}
            className="w-24 px-2.5 py-1 bg-[#121212] border border-[#2a2a2a] text-[#F4F4F4] font-mono focus:border-[#9CAF88] focus:outline-none rounded-none"
            placeholder="Latitude"
          />
          <span className="text-[#707070]">°N</span>
          <input
            type="number"
            step="0.0001"
            value={customLon}
            onChange={(e) => setCustomLon(e.target.value)}
            className="w-24 px-2.5 py-1 bg-[#121212] border border-[#2a2a2a] text-[#F4F4F4] font-mono focus:border-[#9CAF88] focus:outline-none rounded-none"
            placeholder="Longitude"
          />
          <span className="text-[#707070]">°E</span>
          <button
            type="submit"
            className="px-3 py-1 bg-[#222222] hover:bg-[#2a2a2a] text-[#E6E6E6] font-medium border border-[#383838] transition-colors rounded-none"
          >
            Apply
          </button>
        </form>

        <div className="flex items-center gap-2.5">
          <span className="text-[#A7A7A7]">Target Crop:</span>
          <select
            value={selectedCrop}
            onChange={(e) => onCropChange(e.target.value as CropType)}
            className="px-3 py-1 bg-[#121212] border border-[#2a2a2a] text-[#9CAF88] font-bold focus:border-[#9CAF88] focus:outline-none cursor-pointer rounded-none"
          >
            {CROPS.map((c) => (
              <option key={c} value={c} className="bg-[#1a1a1a] text-[#F4F4F4]">
                {c}
              </option>
            ))}
          </select>
        </div>
      </div>
    </div>
  );
}
