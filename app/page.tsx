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
import { NdviTrendChart } from "@/components/Charts/NdviTrendChart";
import { AgentTraceDrawer } from "@/components/Agent/AgentTraceDrawer";
import { LiveSoilFeed } from "@/components/Dashboard/LiveSoilFeed";
import { LoadingSpinner } from "@/components/ui/LoadingSpinner";
import {
  Globe2,
  MapPin,
  Sprout,
  CloudRain,
  Layers,
  Terminal,
  AlertTriangle,
  RefreshCw,
  Cpu,
} from "lucide-react";

// Dynamically import MapLibre GL Map with ssr: false
const TerraPulseMap = dynamic(
  () => import("@/components/Map/TerraPulseMap"),
  {
    ssr: false,
    loading: () => (
      <div className="w-full h-[520px] bg-[#FFFFFF] border border-[#B5B0A6] flex flex-col items-center justify-center text-[#5A5752] font-mono text-xs rounded-sm shadow-xs">
        <LoadingSpinner label="Initializing Map Canvas..." />
      </div>
    ),
  }
);

type DashboardTab = "spatial" | "yield" | "monsoon" | "soil_mandi" | "trace";

export default function TerraPulseDashboard() {
  const [selectedLocation, setSelectedLocation] = useState<FarmLocation>(
    FARM_PRESETS[0] // Vidarbha (Nagpur)
  );
  const [selectedCrop, setSelectedCrop] = useState<CropType>(FARM_PRESETS[0].crop);
  const [showBhuvanLayer, setShowBhuvanLayer] = useState(false);
  const [activeTab, setActiveTab] = useState<DashboardTab>("spatial");

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

  const tabs: { id: DashboardTab; label: string; icon: React.ComponentType<{ className?: string }> }[] = [
    { id: "spatial", label: "[1] Spatial & Map Monitoring", icon: MapPin },
    { id: "yield", label: "[2] Yield & Water Model", icon: Sprout },
    { id: "monsoon", label: "[3] Monsoon & Hydrology", icon: CloudRain },
    { id: "soil_mandi", label: "[4] Soil & Mandi Telemetry", icon: Layers },
    { id: "trace", label: "[5] Autonomous Agent Trace", icon: Terminal },
  ];

  return (
    <div className="min-h-screen bg-[#E2DFD7] text-[#141414] flex flex-col font-sans selection:bg-[#9CAF88] selection:text-[#FFFFFF]">
      {/* Top Application Header - Solid Clean Light Concrete Surface with Sage Framing Accent */}
      <header className="sticky top-0 z-40 bg-[#FFFFFF] border-b border-[#B5B0A6] border-t-2 border-t-[#9CAF88] px-4 lg:px-8 py-3 flex items-center justify-between shadow-xs">
        <div className="flex items-center gap-3">
          <div className="w-9 h-9 bg-[#F1F6EE] border border-[#9CAF88] flex items-center justify-center rounded-sm text-[#3D5230]">
            <Globe2 className="w-5 h-5" />
          </div>
          <div>
            <div className="flex items-center gap-2">
              <h1 className="text-base font-sans font-extrabold tracking-widest text-[#141414] uppercase">
                TERRAPULSE
              </h1>
              <span className="text-[10px] font-mono px-2 py-0.5 bg-[#F1F6EE] text-[#3D5230] border border-[#9CAF88] font-bold tracking-wider rounded-sm">
                AGRO-INTELLIGENCE
              </span>
            </div>
            <p className="text-[11px] font-sans text-[#5A5752] mt-0.5 font-medium">
              Micro-Climate Risk Analysis & Predictive Yield Modeling
            </p>
          </div>
        </div>

        {/* Minimal System Status */}
        <div className="hidden sm:flex items-center gap-3 font-mono text-xs">
          <div className="flex items-center gap-2 px-3 py-1.5 bg-[#F4F1EA] border border-[#B5B0A6] rounded-sm">
            <span className="w-2 h-2 bg-[#9CAF88] rounded-sm" />
            <span className="text-[#5A5752] font-sans font-medium">System:</span>
            <span className="text-[#3D5230] font-mono font-bold">Active</span>
          </div>

          <div className="flex items-center gap-2 px-3 py-1.5 bg-[#F4F1EA] border border-[#B5B0A6] rounded-sm">
            <span className="text-[#5A5752] font-sans font-medium">Region:</span>
            <span className="text-[#141414] font-mono font-bold">{selectedLocation.name.split(" ")[0]}</span>
          </div>

          {typeof report?.confidence === "number" && (
            <div className="flex items-center gap-2 px-3 py-1.5 bg-[#F4F1EA] border border-[#B5B0A6] rounded-sm">
              <span className="text-[#5A5752] font-sans font-medium">Confidence:</span>
              <span className="text-[#3D5230] font-mono font-bold">{(report.confidence * 100).toFixed(0)}%</span>
            </div>
          )}
        </div>
      </header>

      {/* Farm Location Selector Controls (Available Across All Tabs) */}
      <div className="max-w-[1600px] w-full mx-auto px-4 lg:px-8 pt-4">
        <LocationSelector
          selectedLocation={selectedLocation}
          onLocationChange={handleLocationChange}
          selectedCrop={selectedCrop}
          onCropChange={handleCropChange}
          onRunEngine={() => runAgentPipeline(selectedLocation, selectedCrop)}
          loading={loading}
        />
      </div>

      {/* Tabbed Navigation Bar - Centered Command-Center Layout */}
      <div className="sticky top-[61px] z-30 bg-[#E2DFD7] border-b border-[#B5B0A6] px-4 lg:px-8 pt-3 pb-0">
        <div className="max-w-[1600px] mx-auto flex flex-wrap justify-center items-center gap-2">
          {tabs.map((tab) => {
            const Icon = tab.icon;
            const isActive = activeTab === tab.id;

            return (
              <button
                key={tab.id}
                type="button"
                onClick={() => setActiveTab(tab.id)}
                className={`flex items-center gap-2 px-5 py-2.5 text-xs font-sans font-bold uppercase tracking-wider transition-all rounded-sm cursor-pointer -mb-[1px] border ${
                  isActive
                    ? "bg-[#FFFFFF] text-[#141414] border-t-2 border-t-[#9CAF88] border-x border-[#B5B0A6] border-b-[#FFFFFF] shadow-sm z-10"
                    : "bg-[#D8D4CC] hover:bg-[#E0DCD4] text-[#403E3A] hover:text-[#141414] border border-[#B5B0A6]"
                }`}
              >
                <Icon className={`w-3.5 h-3.5 ${isActive ? "text-[#3D5230]" : "text-[#6E6A63]"}`} />
                <span>{tab.label}</span>
              </button>
            );
          })}
        </div>
      </div>

      {/* Main Tab Content Area */}
      <main className="flex-1 max-w-[1600px] w-full mx-auto px-4 lg:px-8 py-6 space-y-6">
        {/* Error / Pipeline Retry Banner */}
        {error && (
          <div className="p-4 bg-[#FDF1EB] border-l-4 border-l-[#CC5500] border-y border-r border-[#B5B0A6] text-[#963E00] text-xs flex items-center justify-between rounded-sm shadow-xs">
            <span className="flex items-center gap-2 font-sans">
              <AlertTriangle className="w-4 h-4 shrink-0 text-[#CC5500]" />
              <span><strong className="font-bold uppercase tracking-wide text-[#CC5500]">Execution Alert:</strong> {error}</span>
            </span>
            <button
              onClick={() => runAgentPipeline(selectedLocation, selectedCrop)}
              className="font-sans font-bold uppercase tracking-wider text-xs px-3 py-1 bg-[#CC5500] hover:bg-[#B84C00] text-[#FFFFFF] transition-colors rounded-sm cursor-pointer"
            >
              Retry Pipeline
            </button>
          </div>
        )}

        {/* ISRO Bhuvan LULC Cropland Verification Warning Banner */}
        {report?.lulcWarning && (
          <div className="p-4 bg-[#FDF1EB] border-l-4 border-l-[#CC5500] border-y border-r border-[#B5B0A6] text-[#963E00] text-xs flex items-center justify-between rounded-sm shadow-xs">
            <div className="space-y-0.5">
              <span className="font-sans font-bold tracking-wider uppercase text-[#CC5500]">LULC Cropland Verification Warning:</span>
              <p className="font-sans text-[#141414] text-[11px] leading-relaxed">{report.lulcWarning}</p>
            </div>
            <span className="text-[10px] font-mono px-2 py-0.5 border border-[#CC5500] bg-[#FFFFFF] uppercase font-bold shrink-0 ml-4 rounded-sm">
              ISRO Bhuvan 1:50K
            </span>
          </div>
        )}

        {/* TAB 1: Spatial & Map Monitoring */}
        {activeTab === "spatial" && (
          <div className="space-y-6">
            <div className="grid grid-cols-1 lg:grid-cols-12 gap-6">
              {/* Map View (7 Cols) */}
              <div className="lg:col-span-7 space-y-2">
                <div className="flex items-center justify-between text-xs pb-1">
                  <span className="font-sans font-bold uppercase tracking-wider text-[#141414]">Interactive Spatial Monitoring</span>
                  <span className="font-mono text-[10px] text-[#6E6A63] uppercase tracking-wider font-semibold">Carto Positron & ISRO Bhuvan WMS</span>
                </div>
                <TerraPulseMap
                  selectedLocation={selectedLocation}
                  onLocationChange={handleLocationChange}
                  scenes={report?.scenes ?? []}
                  showBhuvanLayer={showBhuvanLayer}
                  onToggleBhuvan={setShowBhuvanLayer}
                />
              </div>

              {/* Satellite Card (5 Cols) */}
              <div className="lg:col-span-5 space-y-2">
                <div className="flex items-center justify-between text-xs pb-1">
                  <span className="font-sans font-bold uppercase tracking-wider text-[#141414]">Optical Surface Inspection</span>
                  <span className="font-mono text-[10px] text-[#6E6A63] uppercase tracking-wider font-semibold">10m Spatial Resolution</span>
                </div>
                <SatelliteCard
                  scene={report?.scenes[0] ?? null}
                  loading={loading}
                />
              </div>
            </div>

            {/* Time-Series Spectral Canopy Dynamics */}
            <div className="space-y-2">
              <div className="flex items-center justify-between text-xs pb-1">
                <span className="font-sans font-bold uppercase tracking-wider text-[#141414]">Multi-Scene Spectral Dynamics</span>
                <span className="font-mono text-[10px] text-[#6E6A63] uppercase tracking-wider font-semibold">Sentinel-2 L2A Windowed Surface Reflectance</span>
              </div>
              <div className="bg-[#FFFFFF] border border-[#B5B0A6] p-5 lg:p-6 rounded-sm shadow-xs">
                <NdviTrendChart
                  ndviSeries={report?.ndviSeries}
                  ndviDecline={report?.ndviDecline}
                  ndviAnomaly={report?.ndviAnomaly}
                  loading={loading}
                />
              </div>
            </div>
          </div>
        )}

        {/* TAB 2: Yield & Water Model */}
        {activeTab === "yield" && (
          <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
            <div className="space-y-2">
              <div className="flex items-center justify-between text-xs pb-1">
                <span className="font-sans font-bold uppercase tracking-wider text-[#141414]">FAO-33 Water Production Function</span>
                <span className="font-mono text-[10px] text-[#6E6A63] uppercase tracking-wider font-semibold">Deterministic Math</span>
              </div>
              <YieldPanel
                yieldOutput={report?.yieldOutput ?? null}
                loading={loading}
              />
            </div>

            <div className="space-y-2">
              <div className="flex items-center justify-between text-xs pb-1">
                <span className="font-sans font-bold uppercase tracking-wider text-[#141414]">Autonomous Mitigation Directive</span>
                <span className="font-mono text-[10px] text-[#6E6A63] uppercase tracking-wider font-semibold">Prescriptive Advisory</span>
              </div>
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
        )}

        {/* TAB 3: Monsoon & Hydrology */}
        {activeTab === "monsoon" && (
          <div className="space-y-6">
            <div className="space-y-2">
              <div className="flex items-center justify-between text-xs pb-1">
                <span className="font-sans font-bold uppercase tracking-wider text-[#141414]">Hydrological & Monsoon Analysis</span>
                <span className="font-mono text-[10px] text-[#6E6A63] uppercase tracking-wider font-semibold">ERA5 10-Year JJAS Reanalysis & 14-Day Forecast</span>
              </div>
              <div className="bg-[#FFFFFF] border border-[#B5B0A6] p-5 lg:p-6 rounded-sm shadow-xs">
                <MonsoonChart
                  monsoon={report?.monsoonData ?? null}
                  loading={loading}
                />
              </div>
            </div>
          </div>
        )}

        {/* TAB 4: Soil & Mandi Telemetry */}
        {activeTab === "soil_mandi" && (
          <div className="space-y-6">
            <div className="grid grid-cols-1 lg:grid-cols-12 gap-6">
              {/* Soil Moisture Chart (7 Cols) */}
              <div className="lg:col-span-7 space-y-2">
                <div className="flex items-center justify-between text-xs pb-1">
                  <span className="font-sans font-bold uppercase tracking-wider text-[#141414]">Root-Zone Hydraulic Strata</span>
                  <span className="font-mono text-[10px] text-[#6E6A63] uppercase tracking-wider font-semibold">ISRIC SoilGrids & ERA5 Ingestion</span>
                </div>
                <div className="bg-[#FFFFFF] border border-[#B5B0A6] p-5 lg:p-6 rounded-sm shadow-xs">
                  <SoilMoistureChart
                    soilForecast={report?.soilForecast ?? null}
                    soilProfile={report?.soilProfile ?? null}
                    loading={loading}
                  />
                </div>
              </div>

              {/* Real-time SSE Soil Telemetry Feed (5 Cols) */}
              <div className="lg:col-span-5 space-y-2">
                <div className="flex items-center justify-between text-xs pb-1">
                  <span className="font-sans font-bold uppercase tracking-wider text-[#141414]">Real-Time Sensor Telemetry</span>
                  <span className="font-mono text-[10px] text-[#6E6A63] uppercase tracking-wider font-semibold">Continuous Stream</span>
                </div>
                <LiveSoilFeed
                  lat={selectedLocation.lat}
                  lon={selectedLocation.lon}
                />
              </div>
            </div>

            {/* Mandi Panel */}
            <div className="space-y-2">
              <div className="flex items-center justify-between text-xs pb-1">
                <span className="font-sans font-bold uppercase tracking-wider text-[#141414]">Commodity Market Arbitrage</span>
                <span className="font-mono text-[10px] text-[#6E6A63] uppercase tracking-wider font-semibold">Data.gov.in Agmarknet Wholesale Records</span>
              </div>
              <MandiPanel
                records={report?.mandiData ?? []}
                loading={loading}
                crop={selectedCrop}
              />
            </div>
          </div>
        )}

        {/* TAB 5: Autonomous Agent Trace */}
        {activeTab === "trace" && (
          <div className="space-y-2">
            <div className="flex items-center justify-between text-xs pb-1">
              <span className="font-sans font-bold uppercase tracking-wider text-[#141414]">Autonomous Agent Telemetry</span>
              <span className="font-mono text-[10px] text-[#6E6A63] uppercase tracking-wider font-semibold">4-Node Multi-Agent DAG Logs</span>
            </div>
            <AgentTraceDrawer
              trace={report?.trace ?? []}
              isOpen={true}
              onToggle={() => {}}
              rawPayload={report}
              provenance={report?.provenance}
            />
          </div>
        )}
      </main>

      {/* Footer */}
      <footer className="mt-auto border-t border-[#B5B0A6] bg-[#FFFFFF] px-6 py-4 text-center font-mono text-[11px] text-[#5A5752]">
        TerraPulse — Autonomous Micro-Climate & Crop Yield Intelligence Engine · Strictly Zero Dummy Data
      </footer>
    </div>
  );
}
