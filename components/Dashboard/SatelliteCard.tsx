"use client";

import React from "react";
import type { SentinelScene } from "@/types";
import { Satellite, ExternalLink } from "lucide-react";

interface SatelliteCardProps {
  scene: SentinelScene | null;
  loading?: boolean;
}

export function SatelliteCard({ scene, loading }: SatelliteCardProps) {
  if (loading || !scene) {
    return (
      <div className="p-5 bg-[#FFFFFF] border border-[#B5B0A6] space-y-4 rounded-sm animate-pulse shadow-xs">
        <div className="h-4 bg-[#E2DFD7] w-1/2 rounded-sm" />
        <div className="h-48 bg-[#E2DFD7] w-full rounded-sm" />
        <div className="h-3 bg-[#E2DFD7] w-2/3 rounded-sm" />
      </div>
    );
  }

  const isCloudy = scene.cloudCover > 40;
  const previewSrc = scene.croppedPng || scene.thumbnailHref;

  return (
    <div className="bg-[#FFFFFF] border border-[#B5B0A6] p-5 text-xs space-y-4 rounded-sm flex flex-col justify-between shadow-xs">
      {/* Header */}
      <div className="flex items-center justify-between pb-3 border-b border-[#E2DFD7]">
        <div className="flex items-center gap-2">
          <Satellite className="w-4 h-4 text-[#9CAF88]" />
          <span className="font-sans font-bold text-[#141414] uppercase tracking-wider text-xs">
            Sentinel-2 Optical Telemetry
          </span>
        </div>
        <div className="flex items-center gap-2">
          {scene.croppedPng && (
            <span className="px-2 py-0.5 text-[9px] font-mono font-bold bg-[#F1F6EE] text-[#3D5230] border border-[#9CAF88] rounded-sm">
              BBOX CROP
            </span>
          )}
          <span
            className={`px-2 py-0.5 text-[10px] font-mono font-bold border rounded-sm ${
              isCloudy
                ? "bg-[#FDF1EB] text-[#CC5500] border-[#CC5500]"
                : "bg-[#F1F6EE] text-[#3D5230] border-[#9CAF88]"
            }`}
          >
            Cloud: {scene.cloudCover.toFixed(1)}%
          </span>
        </div>
      </div>

      {/* Optical Preview Image */}
      <div className="relative overflow-hidden border border-[#B5B0A6] bg-[#F4F1EA] h-48 group rounded-sm">
        {previewSrc ? (
          <img
            src={previewSrc}
            alt="Copernicus Sentinel-2 True Color Crop"
            className="w-full h-full object-cover transition-transform duration-300 group-hover:scale-105"
          />
        ) : (
          <div className="w-full h-full flex items-center justify-center text-[#6E6A63] font-sans">
            Optical asset unavailable
          </div>
        )}

        {/* Clean solid overlay metadata */}
        <div className="absolute bottom-0 inset-x-0 bg-[#FFFFFF] border-t border-[#B5B0A6] px-3 py-1.5 text-[10px] text-[#403E3A] font-mono">
          <div className="flex justify-between items-center">
            <span>Acquired: {scene.datetime.replace("T", " ").slice(0, 19)} UTC</span>
            <span className="text-[#3D5230] font-bold">10m GSD</span>
          </div>
        </div>
      </div>

      {/* Windowed Spectral Indices Badges */}
      {(scene.ndvi !== undefined || scene.ndwi !== undefined) && (
        <div className="grid grid-cols-3 gap-2 p-3 bg-[#F4F1EA] border border-[#CDC9BF] rounded-sm">
          <div className="flex flex-col">
            <span className="font-sans text-[10px] text-[#5A5752] uppercase font-bold tracking-wider">Mean NDVI</span>
            <span className="font-mono font-bold text-[#3D5230] text-sm mt-0.5">
              {scene.ndvi !== undefined ? scene.ndvi.toFixed(3) : "—"}
            </span>
          </div>
          <div className="flex flex-col">
            <span className="font-sans text-[10px] text-[#5A5752] uppercase font-bold tracking-wider">Mean NDWI</span>
            <span className="font-mono font-bold text-[#403E3A] text-sm mt-0.5">
              {scene.ndwi !== undefined ? scene.ndwi.toFixed(3) : "—"}
            </span>
          </div>
          <div className="flex flex-col">
            <span className="font-sans text-[10px] text-[#5A5752] uppercase font-bold tracking-wider">Field Std Dev</span>
            <span className="font-mono font-bold text-[#141414] text-sm mt-0.5">
              {scene.ndviStd !== undefined ? `±${scene.ndviStd.toFixed(3)}` : "—"}
            </span>
          </div>
        </div>
      )}

      {/* Scene Metadata & Spectral Band Links */}
      <div className="space-y-2 text-[11px] pt-1">
        <p className="truncate text-[#5A5752] font-sans" title={scene.id}>
          <span className="text-[#141414] font-bold uppercase text-[10px] tracking-wider">Scene ID:</span>{" "}
          <span className="font-mono">{scene.id}</span>
        </p>

        <div className="flex flex-wrap gap-2 pt-2 border-t border-[#E2DFD7]">
          <a
            href={scene.visualHref}
            target="_blank"
            rel="noopener noreferrer"
            className="flex items-center gap-1.5 px-3 py-1 bg-[#F4F1EA] border border-[#CDC9BF] hover:border-[#9CAF88] text-[#141414] text-[10px] font-sans font-bold uppercase tracking-wider transition-colors rounded-sm cursor-pointer"
          >
            <span>Visual RGB</span>
            <ExternalLink className="w-3 h-3 text-[#9CAF88]" />
          </a>

          <a
            href={scene.b04Href}
            target="_blank"
            rel="noopener noreferrer"
            className="flex items-center gap-1.5 px-3 py-1 bg-[#F4F1EA] border border-[#CDC9BF] hover:border-[#CC5500] text-[#CC5500] text-[10px] font-sans font-bold uppercase tracking-wider transition-colors rounded-sm cursor-pointer"
          >
            <span>Band 4 (Red)</span>
            <ExternalLink className="w-3 h-3" />
          </a>

          <a
            href={scene.b08Href}
            target="_blank"
            rel="noopener noreferrer"
            className="flex items-center gap-1.5 px-3 py-1 bg-[#F4F1EA] border border-[#CDC9BF] hover:border-[#5A5752] text-[#403E3A] text-[10px] font-sans font-bold uppercase tracking-wider transition-colors rounded-sm cursor-pointer"
          >
            <span>Band 8 (NIR)</span>
            <ExternalLink className="w-3 h-3" />
          </a>
        </div>
      </div>
    </div>
  );
}
