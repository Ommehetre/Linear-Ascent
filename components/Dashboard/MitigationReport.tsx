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
      <div className="p-6 bg-[#FFFFFF] border border-[#D8D5D0] space-y-4 rounded-none animate-pulse">
        <div className="h-6 bg-[#EFECE9] w-1/3" />
        <div className="h-20 bg-[#EFECE9] w-full" />
        <div className="h-12 bg-[#EFECE9] w-full" />
      </div>
    );
  }

  const isAlert = riskLevel === "high" || riskLevel === "severe";

  return (
    <div className="bg-[#FFFFFF] border border-[#D8D5D0] p-5 font-mono text-xs space-y-5 rounded-none shadow-xs">
      {/* Risk Directive Header */}
      <div className="flex flex-wrap items-center justify-between gap-4 pb-4 border-b border-[#EFECE9]">
        <div className="flex items-center gap-3">
          <div
            className={`w-9 h-9 border rounded-none flex items-center justify-center shrink-0 ${
              isAlert
                ? "bg-[#FDF1EB] text-[#CC5500] border-[#CC5500]"
                : "bg-[#F1F6EE] text-[#3D5230] border-[#9CAF88]"
            }`}
          >
            <ShieldAlert className="w-5 h-5" />
          </div>
          <div>
            <div className="flex flex-wrap items-center gap-2">
              <span className="text-sm font-bold text-[#1A1A1A] uppercase tracking-wide">
                {riskClassification}
              </span>
              <Badge variant={riskLevel}>{riskLevel.toUpperCase()}</Badge>
              {typeof confidence === "number" && (
                <span
                  className="inline-flex items-center px-2 py-0.5 text-[11px] font-mono font-medium border rounded-none tracking-wider uppercase bg-[#F7F5F2] border-[#D8D5D0] text-[#555555]"
                  title={`Live Stream Provenance Confidence: ${(confidence * 100).toFixed(0)}%`}
                >
                  <span className="text-[#707070] mr-1">Confidence:</span>
                  <span
                    className={
                      confidence >= 0.8
                        ? "text-[#3D5230] font-bold"
                        : confidence >= 0.5
                        ? "text-[#1A1A1A] font-bold"
                        : "text-[#CC5500] font-bold"
                    }
                  >
                    {(confidence * 100).toFixed(0)}%
                  </span>
                </span>
              )}
            </div>
            <p className="text-[11px] text-[#666666] mt-0.5">
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
            className="flex items-center gap-1.5 px-3.5 py-1.5 bg-[#9CAF88] hover:bg-[#889C73] disabled:opacity-50 text-[#FFFFFF] font-bold text-xs transition-colors rounded-none cursor-pointer"
          >
            <FileDown className="w-4 h-4" />
            <span>{exporting ? "Generating..." : "Export PDF Report"}</span>
          </button>

          <button
            type="button"
            onClick={() => onExport("json")}
            disabled={exporting}
            className="flex items-center gap-1.5 px-3 py-1.5 bg-[#F5F3F0] hover:bg-[#EFECE9] disabled:opacity-50 text-[#1A1A1A] text-xs transition-colors border border-[#D8D5D0] rounded-none cursor-pointer"
          >
            <Download className="w-3.5 h-3.5 text-[#555555]" />
            <span>JSON</span>
          </button>
        </div>
      </div>

      {/* 1. Agronomic Interventions & Deficit Irrigation Schedule */}
      <div className="space-y-3">
        <div className="flex items-center justify-between">
          <span className="font-bold text-[#1A1A1A] uppercase tracking-wide flex items-center gap-1.5 text-xs">
            <Droplet className="w-4 h-4 text-[#9CAF88]" />
            Agronomic Interventions
          </span>
          <span className="text-[10px] bg-[#F7F5F2] text-[#3D5230] border border-[#D8D5D0] px-2 py-0.5 font-bold rounded-none">
            Deficit: {mitigation.irrigationDeficit_L_ha.toLocaleString()} L/ha
          </span>
        </div>

        <div className="space-y-2.5 bg-[#F7F5F2] p-4 border border-[#D8D5D0] rounded-none">
          {mitigation.recommendations.map((rec, i) => (
            <div key={i} className="flex items-start gap-2.5 text-[11px] text-[#1A1A1A]">
              <CheckCircle className="w-3.5 h-3.5 text-[#9CAF88] shrink-0 mt-0.5" />
              <span className="leading-relaxed">{rec}</span>
            </div>
          ))}
        </div>
      </div>

      {/* 2. Harvest & Logistics Routing */}
      <div className="grid grid-cols-1 md:grid-cols-2 gap-3.5">
        {/* Harvest Advisory */}
        <div className="p-4 bg-[#F7F5F2] border border-[#D8D5D0] space-y-2 rounded-none">
          <div className="flex items-center gap-1.5 text-[#CC5500] font-bold text-xs uppercase">
            <Calendar className="w-4 h-4" />
            <span>Harvest Timing Advisory</span>
          </div>
          <p className="text-[11px] text-[#555555] leading-relaxed">
            {mitigation.harvestAdvice}
          </p>
        </div>

        {/* Mandi Logistics Routing */}
        <div className="p-4 bg-[#F7F5F2] border border-[#D8D5D0] space-y-2 rounded-none">
          <div className="flex items-center gap-1.5 text-[#3D5230] font-bold text-xs uppercase">
            <Truck className="w-4 h-4 text-[#9CAF88]" />
            <span>Mandi Logistics Routing</span>
          </div>
          <p className="text-[11px] text-[#555555] leading-relaxed">
            {mitigation.mandiRouting}
          </p>
        </div>
      </div>

      {/* Stream Provenance Citations Footer */}
      <div className="pt-2 border-t border-[#EFECE9] space-y-2">
        <div className="flex items-center justify-between text-[11px]">
          <span className="text-[#555555] font-semibold">
            Telemetry Provenance Validation
          </span>
          <button
            type="button"
            onClick={() => setShowAllCitations(!showAllCitations)}
            className="text-[10px] text-[#3D5230] hover:underline cursor-pointer"
          >
            {showAllCitations ? "Collapse" : `Details (${citations.length})`}
          </button>
        </div>

        <div className="flex flex-wrap gap-2">
          {(showAllCitations ? citations : citations.slice(0, 3)).map((c, i) => (
            <span
              key={i}
              className="text-[10px] px-2 py-0.5 bg-[#F7F5F2] border border-[#D8D5D0] text-[#555555] flex items-center gap-1 rounded-none"
            >
              <span className="text-[#3D5230] font-medium">[{c.source}]</span>
              <span className="text-[#707070]">{c.timestamp.slice(11, 19)} UTC</span>
            </span>
          ))}
        </div>
      </div>
    </div>
  );
}
