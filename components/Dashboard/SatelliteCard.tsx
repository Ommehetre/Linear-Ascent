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
      <div className="p-5 bg-[#1a1a1a] border border-[#2a2a2a] space-y-4 rounded-none animate-pulse">
        <div className="h-4 bg-[#262626] w-1/2" />
        <div className="h-44 bg-[#262626] w-full" />
        <div className="h-3 bg-[#262626] w-2/3" />
      </div>
    );
  }

  const isCloudy = scene.cloudCover > 40;

  return (
    <div className="bg-[#1a1a1a] border border-[#2a2a2a] p-5 font-mono text-xs space-y-4 rounded-none flex flex-col justify-between">
      {/* Header */}
      <div className="flex items-center justify-between pb-3 border-b border-[#262626]">
        <div className="flex items-center gap-2">
          <Satellite className="w-4 h-4 text-[#9CAF88]" />
          <span className="font-bold text-[#F4F4F4] uppercase tracking-wider text-[11px]">
            Sentinel-2 Optical Telemetry
          </span>
        </div>
        <span
          className={`px-2 py-0.5 text-[10px] font-bold border rounded-none ${
            isCloudy
              ? "bg-[#2C180E] text-[#CC5500] border-[#CC5500]"
              : "bg-[#242A20] text-[#9CAF88] border-[#9CAF88]"
          }`}
        >
          Cloud: {scene.cloudCover.toFixed(1)}%
        </span>
      </div>

      {/* Optical Preview Image */}
      <div className="relative overflow-hidden border border-[#2a2a2a] bg-[#121212] h-44 group rounded-none">
        {scene.thumbnailHref ? (
          <img
            src={scene.thumbnailHref}
            alt="Copernicus Sentinel-2 True Color"
            className="w-full h-full object-cover transition-transform duration-300 group-hover:scale-105"
          />
        ) : (
          <div className="w-full h-full flex items-center justify-center text-[#A7A7A7]">
            Optical asset unavailable
          </div>
        )}

        {/* Clean solid dark overlay metadata */}
        <div className="absolute bottom-0 inset-x-0 bg-[#121212] border-t border-[#262626] px-3 py-1.5 text-[10px] text-[#A7A7A7]">
          <div className="flex justify-between items-center">
            <span>Acquired: {scene.datetime.replace("T", " ").slice(0, 19)} UTC</span>
            <span className="text-[#9CAF88] font-bold">10m GSD</span>
          </div>
        </div>
      </div>

      {/* Scene Metadata & Spectral Band Links */}
      <div className="space-y-2 text-[11px] pt-1">
        <p className="truncate text-[#A7A7A7]" title={scene.id}>
          <span className="text-[#F4F4F4] font-medium">Scene ID:</span> {scene.id}
        </p>

        <div className="flex flex-wrap gap-2 pt-2 border-t border-[#262626]">
          <a
            href={scene.visualHref}
            target="_blank"
            rel="noopener noreferrer"
            className="flex items-center gap-1.5 px-2.5 py-1 bg-[#121212] border border-[#2a2a2a] hover:border-[#9CAF88] text-[#9CAF88] text-[10px] transition-colors rounded-none"
          >
            <span>Visual RGB</span>
            <ExternalLink className="w-3 h-3" />
          </a>

          <a
            href={scene.b04Href}
            target="_blank"
            rel="noopener noreferrer"
            className="flex items-center gap-1.5 px-2.5 py-1 bg-[#121212] border border-[#2a2a2a] hover:border-[#CC5500] text-[#CC5500] text-[10px] transition-colors rounded-none"
          >
            <span>Band 4 (Red)</span>
            <ExternalLink className="w-3 h-3" />
          </a>

          <a
            href={scene.b08Href}
            target="_blank"
            rel="noopener noreferrer"
            className="flex items-center gap-1.5 px-2.5 py-1 bg-[#121212] border border-[#2a2a2a] hover:border-[#A7A7A7] text-[#A7A7A7] text-[10px] transition-colors rounded-none"
          >
            <span>Band 8 (NIR)</span>
            <ExternalLink className="w-3 h-3" />
          </a>
        </div>
      </div>
    </div>
  );
}
