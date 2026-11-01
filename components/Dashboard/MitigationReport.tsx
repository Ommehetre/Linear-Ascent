"use client";

import React, { useState } from "react";
import type { MitigationPlan, CitationTag, RiskLevel } from "@/types";
import { Badge } from "@/components/ui/Badge";
import {
  ShieldAlert,
  FileDown,
  Download,
  Calendar,
  Truck,
  CheckCircle,
  Droplet,
} from "lucide-react";

interface MitigationReportProps {
  mitigation: MitigationPlan | null;
  riskClassification: string;
  riskLevel: RiskLevel;
  citations: CitationTag[];
  confidence?: number;
  loading?: boolean;
  onExport: (format: "pdf" | "json") => void;
  exporting?: boolean;
}

export function MitigationReport({
  mitigation,
  riskClassification,
  riskLevel,
  citations,
  confidence,
  loading,
  onExport,
  exporting,
}: MitigationReportProps) {
  const [showAllCitations, setShowAllCitations] = useState(false);

  if (loading || !mitigation) {
    return (
      <div className="p-6 bg-[#FFFFFF] border border-[#B5B0A6] space-y-4 rounded-sm animate-pulse shadow-xs">
        <div className="h-6 bg-[#E2DFD7] w-1/3 rounded-sm" />
        <div className="h-20 bg-[#E2DFD7] w-full rounded-sm" />
        <div className="h-12 bg-[#E2DFD7] w-full rounded-sm" />
      </div>
    );
  }

  const normalizedRisk = riskLevel.toLowerCase();
  const isAlert = normalizedRisk === "high" || normalizedRisk === "severe";

  return (
    <div className="bg-[#FFFFFF] border border-[#B5B0A6] p-5 space-y-5 rounded-sm shadow-xs">
      {/* Risk Directive Header */}
      <div className="flex flex-wrap items-center justify-between gap-4 pb-4 border-b border-[#E2DFD7]">
        <div className="flex items-center gap-3">
          <div
            className={`w-10 h-10 border rounded-sm flex items-center justify-center shrink-0 ${
              isAlert
                ? "bg-[#FDF1EB] text-[#CC5500] border-[#CC5500]"
                : "bg-[#F1F6EE] text-[#3D5230] border-[#9CAF88]"
            }`}
          >
            <ShieldAlert className="w-5 h-5" />
          </div>
          <div>
            <div className="flex flex-wrap items-center gap-2">
              <span className="font-sans font-extrabold text-base text-[#141414] uppercase tracking-wide">
                {riskClassification}
              </span>
              <Badge variant={riskLevel}>{riskLevel.toUpperCase()}</Badge>
              {typeof confidence === "number" && (
                <span
                  className="inline-flex items-center px-2 py-0.5 text-[11px] font-mono font-medium border rounded-sm tracking-wider uppercase bg-[#F4F1EA] border-[#CDC9BF] text-[#403E3A]"
                  title={`Live Stream Provenance Confidence: ${(confidence * 100).toFixed(0)}%`}
                >
                  <span className="text-[#6E6A63] mr-1">Confidence:</span>
                  <span
                    className={
                      confidence >= 0.8
                        ? "text-[#3D5230] font-bold"
                        : confidence >= 0.5
                        ? "text-[#141414] font-bold"
                        : "text-[#CC5500] font-bold"
                    }
                  >
                    {(confidence * 100).toFixed(0)}%
                  </span>
                </span>
              )}
            </div>
            <p className="font-sans text-xs text-[#5A5752] mt-0.5 font-medium">
              Automated Agronomic Mitigation Directive
            </p>
          </div>
        </div>

        {/* Action Export Buttons */}
        <div className="flex items-center gap-2">
          <button
            type="button"
            onClick={() => onExport("pdf")}
            disabled={exporting}
            className="flex items-center gap-1.5 px-3.5 py-2 bg-[#9CAF88] hover:bg-[#889C73] disabled:opacity-50 text-[#FFFFFF] font-sans font-bold text-xs uppercase tracking-wider transition-all rounded-sm cursor-pointer shadow-xs"
          >
            <FileDown className="w-4 h-4" />
            <span>{exporting ? "Generating..." : "Export PDF Report"}</span>
          </button>

          <button
            type="button"
            onClick={() => onExport("json")}
            disabled={exporting}
            className="flex items-center gap-1.5 px-3 py-2 bg-[#F4F1EA] hover:bg-[#E2DFD7] disabled:opacity-50 text-[#141414] text-xs font-sans font-bold uppercase tracking-wider transition-colors border border-[#B5B0A6] rounded-sm cursor-pointer"
          >
            <Download className="w-3.5 h-3.5 text-[#5A5752]" />
            <span>JSON</span>
          </button>
        </div>
      </div>

      {/* 1. Agronomic Interventions & Deficit Irrigation Schedule */}
      <div className="space-y-3">
        <div className="flex items-center justify-between">
          <span className="font-sans font-bold text-[#141414] uppercase tracking-wider flex items-center gap-1.5 text-xs">
            <Droplet className="w-4 h-4 text-[#9CAF88]" />
            Agronomic Interventions
          </span>
          <span className="text-[10px] font-mono bg-[#F4F1EA] text-[#3D5230] border border-[#CDC9BF] px-2 py-0.5 font-bold rounded-sm">
            Deficit: {mitigation.irrigationDeficit_L_ha.toLocaleString()} L/ha
          </span>
        </div>

        <div className="space-y-2.5 bg-[#F4F1EA] p-4 border border-[#CDC9BF] rounded-sm">
          {mitigation.recommendations.map((rec, i) => (
            <div key={i} className="flex items-start gap-2.5 text-xs font-sans text-[#141414]">
              <CheckCircle className="w-3.5 h-3.5 text-[#9CAF88] shrink-0 mt-0.5" />
              <span className="leading-relaxed">{rec}</span>
            </div>
          ))}
        </div>
      </div>

      {/* 2. Harvest & Logistics Routing */}
      <div className="grid grid-cols-1 md:grid-cols-2 gap-3.5">
        {/* Harvest Advisory */}
        <div className="p-4 bg-[#F4F1EA] border border-[#CDC9BF] space-y-2 rounded-sm">
          <div className="flex items-center gap-1.5 text-[#CC5500] font-sans font-bold text-xs uppercase tracking-wider">
            <Calendar className="w-4 h-4" />
            <span>Harvest Timing Advisory</span>
          </div>
          <p className="font-sans text-xs text-[#403E3A] leading-relaxed">
            {mitigation.harvestAdvice}
          </p>
        </div>

        {/* Mandi Logistics Routing */}
        <div className="p-4 bg-[#F4F1EA] border border-[#CDC9BF] space-y-2 rounded-sm">
          <div className="flex items-center gap-1.5 text-[#3D5230] font-sans font-bold text-xs uppercase tracking-wider">
            <Truck className="w-4 h-4 text-[#9CAF88]" />
            <span>Mandi Logistics Routing</span>
          </div>
          <p className="font-sans text-xs text-[#403E3A] leading-relaxed">
            {mitigation.mandiRouting}
          </p>
        </div>
      </div>

      {/* Stream Provenance Citations Footer */}
      <div className="pt-2 border-t border-[#E2DFD7] space-y-2">
        <div className="flex items-center justify-between text-xs font-sans">
          <span className="text-[#5A5752] font-semibold">
            Telemetry Provenance Validation
          </span>
          <button
            type="button"
            onClick={() => setShowAllCitations(!showAllCitations)}
            className="text-[10px] font-sans font-bold uppercase tracking-wider text-[#3D5230] hover:underline cursor-pointer"
          >
            {showAllCitations ? "Collapse" : `Details (${citations.length})`}
          </button>
        </div>

        <div className="flex flex-wrap gap-2">
          {(showAllCitations ? citations : citations.slice(0, 3)).map((c, i) => (
            <span
              key={i}
              className="text-[10px] font-mono px-2 py-0.5 bg-[#F4F1EA] border border-[#CDC9BF] text-[#403E3A] flex items-center gap-1 rounded-sm"
            >
              <span className="text-[#3D5230] font-semibold">[{c.source}]</span>
              <span className="text-[#6E6A63]">{c.timestamp.slice(11, 19)} UTC</span>
            </span>
          ))}
        </div>
      </div>
    </div>
  );
}
