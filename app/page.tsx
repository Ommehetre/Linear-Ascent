"use client";

import React, { useState, useEffect, useCallback } from "react";
import dynamic from "next/dynamic";
import type { FarmLocation, CropType, AgentReport } from "@/types";
import { FARM_PRESETS } from "@/lib/constants";
import { LocationSelector } from "@/components/Dashboard/LocationSelector";
import { SatelliteCard } from "@/components/Dashboard/SatelliteCard";
import { YieldPanel } from "@/components/Dashboard/YieldPanel";
import { MandiPanel } from "@/components/Dashboard/MandiPanel";
import { MitigationReport } from "@/components/Dashboard/MitigationReport";
import { MonsoonChart } from "@/components/Charts/MonsoonChart";
import { SoilMoistureChart } from "@/components/Charts/SoilMoistureChart";
import { AgentTraceDrawer } from "@/components/Agent/AgentTraceDrawer";
import { LiveSoilFeed } from "@/components/Dashboard/LiveSoilFeed";
import { LoadingSpinner } from "@/components/ui/LoadingSpinner";
import { Globe2 } from "lucide-react";

// Dynamically import MapLibre GL Map with ssr: false
const TerraPulseMap = dynamic(
  () => import("@/components/Map/TerraPulseMap"),
  {
    ssr: false,
    loading: () => (
      <div className="w-full h-[520px] bg-[#121212] border border-[#2a2a2a] flex flex-col items-center justify-center text-[#A7A7A7] font-mono text-xs rounded-none">
        <LoadingSpinner label="Initializing Map Canvas..." />
      </div>
    ),
  }
);

export default function TerraPulseDashboard() {
  const [selectedLocation, setSelectedLocation] = useState<FarmLocation>(
    FARM_PRESETS[0] // Vidarbha (Nagpur)
  );
  const [selectedCrop, setSelectedCrop] = useState<CropType>(FARM_PRESETS[0].crop);
  const [showBhuvanLayer, setShowBhuvanLayer] = useState(false);
  const [isTraceOpen, setIsTraceOpen] = useState(false);

  // Agent Report State
  const [report, setReport] = useState<AgentReport | null>(null);
  const [loading, setLoading] = useState(false);
  const [exporting, setExporting] = useState(false);
  const [error, setError] = useState<string | null>(null);

  // Trigger Autonomous Multi-Agent Pipeline
  const runAgentPipeline = useCallback(
    async (loc: FarmLocation, crop: CropType) => {
      setLoading(true);
      setError(null);
      try {
        const res = await fetch("/api/agent/run", {
          method: "POST",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify({ location: loc, crop }),
        });

        if (!res.ok) {
          throw new Error(`Engine returned HTTP ${res.status}`);
        }

        const data: AgentReport = await res.json();
        setReport(data);
      } catch (err: any) {
        console.error("Dashboard run error:", err);
        setError(err.message || "Pipeline execution failed");
      } finally {
        setLoading(false);
      }
    },
    []
  );

  // Initial mount: run pipeline for Vidarbha
  useEffect(() => {
    runAgentPipeline(selectedLocation, selectedCrop);
  }, []);

  // When location changes from selector or map click
  const handleLocationChange = (loc: FarmLocation) => {
    setSelectedLocation(loc);
    runAgentPipeline(loc, selectedCrop);
  };

  const handleCropChange = (crop: CropType) => {
    setSelectedCrop(crop);
    runAgentPipeline(selectedLocation, crop);
  };

  // Export report as PDF or JSON
  const handleExport = async (format: "pdf" | "json") => {
    if (!report) return;
    setExporting(true);
    try {
      const res = await fetch(`/api/report/export?format=${format}`, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify(report),
      });

      if (!res.ok) throw new Error("Export failed");

      const blob = await res.blob();
      const url = window.URL.createObjectURL(blob);
      const a = document.createElement("a");
      a.href = url;
      a.download = `terrapulse-advisory-${new Date().toISOString().slice(0, 10)}.${format}`;
      document.body.appendChild(a);
      a.click();
      window.URL.revokeObjectURL(url);
      document.body.removeChild(a);
    } catch (err: any) {
      alert(`Export error: ${err.message}`);
    } finally {
      setExporting(false);
    }
  };

  return (
    <div className="min-h-screen bg-[#121212] text-[#F4F4F4] flex flex-col font-sans selection:bg-[#9CAF88] selection:text-[#121212]">
      {/* Top Application Header - Solid Dark Opaque Surface */}
      <header className="sticky top-0 z-40 bg-[#121212] border-b border-[#262626] px-4 lg:px-8 py-3.5 flex items-center justify-between">
        <div className="flex items-center gap-3.5">
          <div className="w-9 h-9 bg-[#242A20] border border-[#9CAF88] flex items-center justify-center rounded-none">
            <Globe2 className="w-5 h-5 text-[#9CAF88]" />
          </div>
          <div>
            <div className="flex items-center gap-2.5">
              <h1 className="text-base font-bold font-mono tracking-widest text-[#F4F4F4] uppercase">
                TERRAPULSE
              </h1>
              <span className="text-[10px] font-mono px-2 py-0.5 bg-[#242A20] text-[#9CAF88] border border-[#9CAF88] font-bold tracking-wider rounded-none">
                AGRO-INTELLIGENCE
              </span>
            </div>
            <p className="text-[11px] font-mono text-[#A7A7A7] mt-0.5">
              Micro-Climate Risk Analysis & Predictive Yield Modeling
            </p>
          </div>
        </div>

        {/* Minimal System Status */}
        <div className="hidden sm:flex items-center gap-4 font-mono text-xs">
          <div className="flex items-center gap-2 px-3 py-1 bg-[#1a1a1a] border border-[#2a2a2a] rounded-none">
            <span className="w-2 h-2 bg-[#9CAF88] rounded-none" />
            <span className="text-[#A7A7A7]">System Status:</span>
            <span className="text-[#9CAF88] font-semibold">Active</span>
          </div>

          <div className="flex items-center gap-2 px-3 py-1 bg-[#1a1a1a] border border-[#2a2a2a] rounded-none">
            <span className="text-[#A7A7A7]">Region:</span>
            <span className="text-[#F4F4F4] font-semibold">{selectedLocation.name.split(" ")[0]}</span>
          </div>
        </div>
      </header>

      {/* Main Dashboard Workspace */}
      <main className="flex-1 max-w-[1600px] w-full mx-auto px-4 lg:px-8 py-6 lg:py-8 space-y-8">
        {/* Farm Location Selector */}
        <LocationSelector
          selectedLocation={selectedLocation}
          onLocationChange={handleLocationChange}
          selectedCrop={selectedCrop}
          onCropChange={handleCropChange}
          onRunEngine={() => runAgentPipeline(selectedLocation, selectedCrop)}
          loading={loading}
        />

        {error && (
          <div className="p-4 bg-[#2C180E] border border-[#CC5500] text-[#CC5500] font-mono text-xs flex items-center justify-between rounded-none">
            <span>
              <strong>Alert:</strong> {error}
            </span>
            <button
              onClick={() => runAgentPipeline(selectedLocation, selectedCrop)}
              className="underline font-bold hover:text-[#F4F4F4] transition-colors"
            >
              Retry Pipeline
            </button>
          </div>
        )}

        {/* Section 1: Spatial Telemetry (Left) + Intelligence & Mitigation (Right) */}
        <div className="grid grid-cols-1 lg:grid-cols-12 gap-8">
          {/* Left Column: Interactive Map & Live Satellite Card (7 Cols) */}
          <div className="lg:col-span-7 space-y-6">
            <div className="space-y-2">
              <div className="flex items-center justify-between text-xs font-mono text-[#A7A7A7] uppercase tracking-wider pb-1">
                <span className="font-bold text-[#F4F4F4]">Spatial Monitoring</span>
                <span>Carto GL & WMS Layers</span>
              </div>
              <TerraPulseMap
                selectedLocation={selectedLocation}
                onLocationChange={handleLocationChange}
                scenes={report?.scenes ?? []}
                showBhuvanLayer={showBhuvanLayer}
                onToggleBhuvan={setShowBhuvanLayer}
              />
            </div>

            {/* Satellite Card & Live Soil Feed Side-by-Side */}
            <div className="grid grid-cols-1 sm:grid-cols-2 gap-6">
              <SatelliteCard
                scene={report?.scenes[0] ?? null}
                loading={loading}
              />
              <LiveSoilFeed
                lat={selectedLocation.lat}
                lon={selectedLocation.lon}
              />
            </div>
          </div>

          {/* Right Column: FAO Yield Engine, Mandi Prices & Mitigation Action Plan (5 Cols) */}
          <div className="lg:col-span-5 space-y-6">
            {/* Deterministic FAO-33 Yield Panel */}
            <YieldPanel
              yieldOutput={report?.yieldOutput ?? null}
              loading={loading}
            />

            {/* Live Agmarknet Mandi Panel */}
            <MandiPanel
              records={report?.mandiData ?? []}
              loading={loading}
              crop={selectedCrop}
            />

            {/* Actionable Mitigation & Logistics Plan */}
            <MitigationReport
              mitigation={report?.mitigation ?? null}
              riskClassification={
                report?.riskClassification ?? "Computing Risk Matrix..."
              }
              riskLevel={report?.riskLevel ?? "medium"}
              citations={report?.citations ?? []}
              confidence={report?.confidence}
              loading={loading}
              onExport={handleExport}
              exporting={exporting}
            />
          </div>
        </div>

        {/* Section 2: Dual Analytical Charts (Monsoon Reanalysis + Multi-Depth Soil Moisture) */}
        <div className="space-y-2 pt-2">
          <div className="flex items-center justify-between text-xs font-mono text-[#A7A7A7] uppercase tracking-wider pb-1">
            <span className="font-bold text-[#F4F4F4]">Hydrological & Soil Analytics</span>
            <span>ERA5 & ISRIC SoilGrids Integration</span>
          </div>

          <div className="grid grid-cols-1 lg:grid-cols-2 gap-8">
            {/* Chart 1: 10-Year Monsoon JJAS vs Current Forecast */}
            <div className="bg-[#1a1a1a] border border-[#2a2a2a] p-5 lg:p-6 rounded-none">
              <MonsoonChart
                monsoon={report?.monsoonData ?? null}
                loading={loading}
              />
            </div>

            {/* Chart 2: Multi-Depth Root-Zone Soil Moisture vs ISRIC Hydraulic Limits */}
            <div className="bg-[#1a1a1a] border border-[#2a2a2a] p-5 lg:p-6 rounded-none">
              <SoilMoistureChart
                soilForecast={report?.soilForecast ?? null}
                soilProfile={report?.soilProfile ?? null}
                loading={loading}
              />
            </div>
          </div>
        </div>

        {/* Section 3: Developer Telemetry Drawer (Collapsed by Default) */}
        <div className="pt-2">
          <AgentTraceDrawer
            trace={report?.trace ?? []}
            isOpen={isTraceOpen}
            onToggle={() => setIsTraceOpen(!isTraceOpen)}
            rawPayload={report}
            provenance={report?.provenance}
          />
        </div>
      </main>

      {/* Footer */}
      <footer className="mt-auto border-t border-[#262626] bg-[#121212] px-6 py-4 text-center font-mono text-[11px] text-[#707070]">
        TerraPulse — Autonomous Micro-Climate & Crop Yield Intelligence Engine
      </footer>
    </div>
  );
}
