"use client";

import React, { useState } from "react";
import type { AgentTraceStep, DataProvenance } from "@/types";
import { ApiStatusBadge } from "@/components/ui/ApiStatusBadge";
import {
  ChevronDown,
  ChevronUp,
  Cpu,
  CheckCircle2,
  AlertTriangle,
  XCircle,
  Clock,
  Terminal,
  Activity,
  Code2,
  Database,
} from "lucide-react";

interface AgentTraceDrawerProps {
  trace: AgentTraceStep[];
  isOpen: boolean;
  onToggle: () => void;
  rawPayload?: any;
  provenance?: Record<string, DataProvenance>;
}

export function AgentTraceDrawer({
  trace,
  isOpen,
  onToggle,
  rawPayload,
  provenance,
}: AgentTraceDrawerProps) {
  const [activeNode, setActiveNode] = useState<number>(1);
  const [showNetworkCalls, setShowNetworkCalls] = useState(false);
  const [showRawJson, setShowRawJson] = useState(false);

  // Compute total API calls and total latency across all steps
  const allApiCalls = trace.flatMap((t) => t.apiCalls);
  const totalCalls = allApiCalls.length;
  const avgLatency =
    totalCalls > 0
      ? Math.round(allApiCalls.reduce((acc, c) => acc + c.latencyMs, 0) / totalCalls)
      : 0;
  const allSuccessful = allApiCalls.every(
    (c) => c.statusCode >= 200 && c.statusCode < 300
  );

  const streamLabels: Record<string, string> = {
    sentinel2: "Sentinel-2 STAC",
    bhuvanLulc: "ISRO Bhuvan LULC",
    soilForecast: "ERA5 Soil Grid",
    soilProfile: "ISRIC SoilGrids",
    monsoon: "Monsoon Reanalysis",
    mandi: "Agmarknet APMC",
  };

  return (
    <div className="w-full bg-[#FFFFFF] border border-[#B5B0A6] rounded-sm overflow-hidden transition-colors shadow-xs">
      {/* Header Bar */}
      <div
        onClick={onToggle}
        className="flex flex-wrap items-center justify-between p-4 bg-[#FFFFFF] cursor-pointer hover:bg-[#F4F1EA] transition-colors border-b border-[#E2DFD7]"
      >
        <div className="flex items-center gap-3">
          <div className="w-8 h-8 bg-[#F1F6EE] text-[#3D5230] border border-[#9CAF88] flex items-center justify-center rounded-sm">
            <Cpu className="w-4 h-4" />
          </div>
          <div>
            <div className="flex items-center gap-2">
              <span className="text-xs font-bold font-sans text-[#141414] tracking-wider uppercase">
                Developer Telemetry & Agent Trace
              </span>
              <span className="text-[10px] font-mono bg-[#F1F6EE] text-[#3D5230] px-2 py-0.5 border border-[#9CAF88] font-bold rounded-sm">
                4-Node DAG
              </span>
            </div>
            <p className="text-[11px] text-[#5A5752] font-sans mt-0.5">
              Pipeline telemetry, node execution timing & provenance verification
            </p>
          </div>
        </div>

        <div className="flex items-center gap-3 font-mono text-xs">
          <div className="flex items-center gap-2 bg-[#F4F1EA] px-2.5 py-1 border border-[#CDC9BF] rounded-sm">
            <Activity className="w-3.5 h-3.5 text-[#3D5230]" />
            <span className="text-[#5A5752]">Requests:</span>
            <span className="font-bold text-[#141414]">{totalCalls}</span>
            <span
              className={`w-2 h-2 rounded-sm ${
                allSuccessful ? "bg-[#9CAF88]" : "bg-[#CC5500]"
              }`}
            />
          </div>

          <div className="flex items-center gap-2 bg-[#F4F1EA] px-2.5 py-1 border border-[#CDC9BF] rounded-sm">
            <Clock className="w-3.5 h-3.5 text-[#707070]" />
            <span className="text-[#5A5752]">Latency:</span>
            <span className="font-bold text-[#141414]">{avgLatency} ms</span>
          </div>

          <div className="p-1.5 bg-[#F4F1EA] text-[#5A5752] border border-[#CDC9BF] rounded-sm">
            {isOpen ? <ChevronUp className="w-4 h-4" /> : <ChevronDown className="w-4 h-4" />}
          </div>
        </div>
      </div>

      {/* Collapsible Drawer Content */}
      {isOpen && (
        <div className="p-5 space-y-4 bg-[#FFFFFF] font-mono text-xs">
          {/* Data Stream Provenance Status Strip */}
          {provenance && Object.keys(provenance).length > 0 && (
            <div className="p-3.5 bg-[#F4F1EA] border border-[#CDC9BF] rounded-sm space-y-2.5">
              <div className="flex items-center justify-between text-[11px] text-[#141414] font-sans font-bold uppercase tracking-wider">
                <span className="flex items-center gap-1.5">
                  <Database className="w-3.5 h-3.5 text-[#9CAF88]" />
                  Data Stream Provenance (Zero Dummy Data Guarantee)
                </span>
                <span className="text-[10px] text-[#6E6A63] font-mono font-semibold">
                  {Object.values(provenance).filter((p) => p.status === "live").length} / {Object.keys(provenance).length} Streams Live
                </span>
              </div>
              <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-6 gap-2">
                {Object.entries(provenance).map(([key, p]) => {
                  const statusClass =
                    p.status === "live"
                      ? "bg-[#F1F6EE] text-[#3D5230] border-[#9CAF88]"
                      : p.status === "cached"
                      ? "bg-[#F4F1EA] text-[#5A5752] border-[#CDC9BF]"
                      : "bg-[#FDF1EB] text-[#CC5500] border-[#CC5500]";

                  return (
                    <div
                      key={key}
                      className="p-2 bg-[#FFFFFF] border border-[#CDC9BF] flex items-center justify-between text-[11px] rounded-sm"
                      title={p.error ? `Error: ${p.error}` : `${p.source} (Fetched: ${p.fetchedAt})`}
                    >
                      <span className="truncate text-[#141414] mr-1.5 font-medium font-sans">
                        {streamLabels[key] || p.source}
                      </span>
                      <span className={`px-1.5 py-0.5 text-[9px] font-bold border uppercase shrink-0 rounded-sm ${statusClass}`}>
                        {p.status}
                      </span>
                    </div>
                  );
                })}
              </div>
            </div>
          )}

          {/* Node Selector Stepper */}
          <div className="grid grid-cols-1 md:grid-cols-4 gap-2.5">
            {[1, 2, 3, 4].map((nodeNum) => {
              const step = trace.find((t) => t.node === nodeNum);
              const isSelected = activeNode === nodeNum;

              const titles = [
                "1. Telemetry Harvester",
                "2. Multimodal Vision",
                "3. Risk & Yield Math",
                "4. Mitigation Engine",
              ];

              const statusIcon =
                step?.status === "done" ? (
                  <CheckCircle2 className="w-3.5 h-3.5 text-[#3D5230] shrink-0" />
                ) : step?.status === "fallback" ? (
                  <AlertTriangle className="w-3.5 h-3.5 text-[#CC5500] shrink-0" />
                ) : step?.status === "error" ? (
                  <XCircle className="w-3.5 h-3.5 text-[#CC5500] shrink-0" />
                ) : (
                  <Clock className="w-3.5 h-3.5 text-[#707070] shrink-0" />
                );

              return (
                <button
                  key={nodeNum}
                  type="button"
                  onClick={() => setActiveNode(nodeNum)}
                  className={`p-3 border text-left transition-colors flex items-center justify-between rounded-sm cursor-pointer ${
                    isSelected
                      ? "bg-[#F1F6EE] border-[#9CAF88] text-[#141414]"
                      : "bg-[#F4F1EA] border-[#CDC9BF] text-[#5A5752] hover:border-[#9CAF88]"
                  }`}
                >
                  <div className="overflow-hidden">
                    <p className="font-sans font-bold uppercase tracking-wider truncate text-[11px]">
                      {titles[nodeNum - 1]}
                    </p>
                    <p className="text-[10px] font-mono text-[#6E6A63] truncate mt-0.5">
                      {step?.apiCalls.length ?? 0} calls
                      {step?.durationMs ? ` · ${step.durationMs}ms` : ""}
                    </p>
                  </div>
                  {statusIcon}
                </button>
              );
            })}
          </div>

          {/* Active Node Detail Panel */}
          {(() => {
            const currentStep = trace.find((t) => t.node === activeNode);
            if (!currentStep) {
              return (
                <div className="p-6 text-center text-[#5A5752] bg-[#F4F1EA] border border-[#CDC9BF] rounded-sm font-sans">
                  Node pipeline execution pending...
                </div>
              );
            }

            return (
              <div className="space-y-3.5 bg-[#F4F1EA] p-4 border border-[#CDC9BF] rounded-sm">
                <div className="flex items-center justify-between pb-2.5 border-b border-[#CDC9BF]">
                  <span className="font-sans font-bold uppercase tracking-wider text-xs text-[#141414] flex items-center gap-2">
                    <Terminal className="w-3.5 h-3.5 text-[#9CAF88]" />
                    NODE {currentStep.node}: {currentStep.label}
                  </span>
                  <span
                    className={`px-2 py-0.5 text-[10px] font-mono font-bold uppercase border rounded-sm ${
                      currentStep.status === "done"
                        ? "bg-[#F1F6EE] text-[#3D5230] border-[#9CAF88]"
                        : "bg-[#FDF1EB] text-[#CC5500] border-[#CC5500]"
                    }`}
                  >
                    STATUS: {currentStep.status}
                  </span>
                </div>

                {currentStep.fallbackReason && (
                  <div className="p-2.5 bg-[#FDF1EB] border border-[#CC5500] text-[#CC5500] text-[11px] rounded-sm font-sans">
                    <strong>Note:</strong> {currentStep.fallbackReason}
                  </div>
                )}

                {/* Node Output Preview */}
                {currentStep.output && (
                  <div>
                    <p className="text-[11px] text-[#5A5752] font-sans font-bold uppercase tracking-wider mb-1">
                      Execution Output:
                    </p>
                    <div className="p-3 bg-[#FFFFFF] border border-[#CDC9BF] max-h-48 overflow-y-auto text-[#141414] whitespace-pre-wrap text-[11px] font-mono leading-relaxed rounded-sm">
                      {currentStep.output}
                    </div>
                  </div>
                )}

                {/* Expandable Network Calls Inspector */}
                <div className="pt-2 border-t border-[#CDC9BF]">
                  <button
                    type="button"
                    onClick={() => setShowNetworkCalls(!showNetworkCalls)}
                    className="flex items-center justify-between w-full text-xs font-mono text-[#5A5752] hover:text-[#141414] transition-colors py-1 cursor-pointer"
                  >
                    <span>HTTP Request Traces ({currentStep.apiCalls.length})</span>
                    <span className="text-[10px] text-[#3D5230] font-bold">
                      {showNetworkCalls ? "[Hide Traces]" : "[Inspect Traces]"}
                    </span>
                  </button>

                  {showNetworkCalls && (
                    <div className="mt-2 space-y-1.5 max-h-48 overflow-y-auto pr-1">
                      {currentStep.apiCalls.length > 0 ? (
                        currentStep.apiCalls.map((call, idx) => (
                          <ApiStatusBadge key={idx} call={call} />
                        ))
                      ) : (
                        <p className="text-[#6E6A63] text-[11px] italic p-2 bg-[#FFFFFF] border border-[#CDC9BF] rounded-sm">
                          In-process computation node.
                        </p>
                      )}
                    </div>
                  )}
                </div>
              </div>
            );
          })()}

          {/* Collapsible Raw JSON Payload Viewer */}
          <div className="pt-2 border-t border-[#E2DFD7]">
            <button
              type="button"
              onClick={() => setShowRawJson(!showRawJson)}
              className="flex items-center gap-2 text-xs font-mono text-[#5A5752] hover:text-[#141414] transition-colors cursor-pointer"
            >
              <Code2 className="w-3.5 h-3.5 text-[#9CAF88]" />
              <span>{showRawJson ? "Hide Raw JSON" : "Inspect Raw Ingestion JSON Payload"}</span>
            </button>

            {showRawJson && rawPayload && (
              <pre className="mt-2.5 p-3 bg-[#F4F1EA] border border-[#CDC9BF] text-[10px] text-[#3D5230] max-h-64 overflow-auto font-mono rounded-sm">
                {JSON.stringify(rawPayload, null, 2)}
              </pre>
            )}
          </div>
        </div>
      )}
    </div>
  );
}
