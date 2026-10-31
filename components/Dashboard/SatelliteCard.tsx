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
      <div className="p-5 bg-[#FFFFFF] border border-[#D8D5D0] space-y-4 rounded-none animate-pulse">
        <div className="h-4 bg-[#EFECE9] w-1/2" />
        <div className="h-48 bg-[#EFECE9] w-full" />
        <div className="h-3 bg-[#EFECE9] w-2/3" />
      </div>
    );
  }

  const isCloudy = scene.cloudCover > 40;
  const previewSrc = scene.croppedPng || scene.thumbnailHref;

  return (
    <div className="bg-[#FFFFFF] border border-[#D8D5D0] p-5 font-mono text-xs space-y-4 rounded-none flex flex-col justify-between shadow-xs">
      {/* Header */}
      <div className="flex items-center justify-between pb-3 border-b border-[#EFECE9]">
        <div className="flex items-center gap-2">
          <Satellite className="w-4 h-4 text-[#9CAF88]" />
          <span className="font-bold text-[#1A1A1A] uppercase tracking-wider text-[11px]">
            Sentinel-2 Optical Telemetry
          </span>
        </div>
        <div className="flex items-center gap-2">
          {scene.croppedPng && (
            <span className="px-2 py-0.5 text-[9px] font-bold bg-[#F1F6EE] text-[#3D5230] border border-[#9CAF88] rounded-none">
              BBOX CROP
            </span>
          )}
          <span
            className={`px-2 py-0.5 text-[10px] font-bold border rounded-none ${
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
      <div className="relative overflow-hidden border border-[#D8D5D0] bg-[#F7F5F2] h-48 group rounded-none">
        {previewSrc ? (
          <img
            src={previewSrc}
            alt="Copernicus Sentinel-2 True Color Crop"
            className="w-full h-full object-cover transition-transform duration-300 group-hover:scale-105"
          />
        ) : (
          <div className="w-full h-full flex items-center justify-center text-[#707070]">
            Optical asset unavailable
          </div>
        )}

        {/* Clean solid overlay metadata */}
        <div className="absolute bottom-0 inset-x-0 bg-[#FFFFFF] border-t border-[#D8D5D0] px-3 py-1.5 text-[10px] text-[#555555]">
          <div className="flex justify-between items-center">
            <span>Acquired: {scene.datetime.replace("T", " ").slice(0, 19)} UTC</span>
            <span className="text-[#3D5230] font-bold">10m GSD</span>
          </div>
        </div>
      </div>

      {/* Windowed Spectral Indices Badges */}
      {(scene.ndvi !== undefined || scene.ndwi !== undefined) && (
        <div className="grid grid-cols-3 gap-2 p-2.5 bg-[#F7F5F2] border border-[#D8D5D0] rounded-none">
          <div className="flex flex-col">
            <span className="text-[10px] text-[#555555]">Mean NDVI</span>
            <span className="font-bold text-[#3D5230] text-xs">
              {scene.ndvi !== undefined ? scene.ndvi.toFixed(3) : "—"}
            </span>
          </div>
          <div className="flex flex-col">
            <span className="text-[10px] text-[#555555]">Mean NDWI</span>
            <span className="font-bold text-[#555555] text-xs">
              {scene.ndwi !== undefined ? scene.ndwi.toFixed(3) : "—"}
            </span>
          </div>
          <div className="flex flex-col">
            <span className="text-[10px] text-[#555555]">Field Std Dev</span>
            <span className="font-bold text-[#1A1A1A] text-xs">
              {scene.ndviStd !== undefined ? `±${scene.ndviStd.toFixed(3)}` : "—"}
            </span>
          </div>
        </div>
      )}

      {/* Scene Metadata & Spectral Band Links */}
      <div className="space-y-2 text-[11px] pt-1">
        <p className="truncate text-[#555555]" title={scene.id}>
          <span className="text-[#1A1A1A] font-semibold">Scene ID:</span> {scene.id}
        </p>

        <div className="flex flex-wrap gap-2 pt-2 border-t border-[#EFECE9]">
          <a
            href={scene.visualHref}
            target="_blank"
            rel="noopener noreferrer"
            className="flex items-center gap-1.5 px-2.5 py-1 bg-[#F5F3F0] border border-[#D8D5D0] hover:border-[#9CAF88] text-[#1A1A1A] text-[10px] transition-colors rounded-none"
          >
            <span>Visual RGB</span>
            <ExternalLink className="w-3 h-3 text-[#9CAF88]" />
          </a>

          <a
            href={scene.b04Href}
            target="_blank"
            rel="noopener noreferrer"
            className="flex items-center gap-1.5 px-2.5 py-1 bg-[#F5F3F0] border border-[#D8D5D0] hover:border-[#CC5500] text-[#CC5500] text-[10px] transition-colors rounded-none"
          >
            <span>Band 4 (Red)</span>
            <ExternalLink className="w-3 h-3" />
          </a>

          <a
            href={scene.b08Href}
            target="_blank"
            rel="noopener noreferrer"
            className="flex items-center gap-1.5 px-2.5 py-1 bg-[#F5F3F0] border border-[#D8D5D0] hover:border-[#707070] text-[#555555] text-[10px] transition-colors rounded-none"
          >
            <span>Band 8 (NIR)</span>
            <ExternalLink className="w-3 h-3" />
          </a>
        </div>
      </div>
    </div>
  );
}
