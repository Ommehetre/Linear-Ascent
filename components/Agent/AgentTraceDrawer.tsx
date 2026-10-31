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
    soilForecast: "ERA5 Soil Grid",
    soilProfile: "ISRIC SoilGrids",
    monsoon: "Monsoon Reanalysis",
    mandi: "Agmarknet APMC",
  };

  return (
    <div className="w-full bg-[#1a1a1a] border border-[#2a2a2a] rounded-none overflow-hidden transition-colors">
      {/* Header Bar */}
      <div
        onClick={onToggle}
        className="flex flex-wrap items-center justify-between p-4 bg-[#1a1a1a] cursor-pointer hover:bg-[#222222] transition-colors border-b border-[#262626]"
      >
        <div className="flex items-center gap-3">
          <div className="w-8 h-8 bg-[#242A20] text-[#9CAF88] border border-[#9CAF88] flex items-center justify-center rounded-none">
            <Cpu className="w-4 h-4" />
          </div>
          <div>
            <div className="flex items-center gap-2">
              <span className="text-xs font-bold font-mono text-[#F4F4F4] tracking-wider uppercase">
                Developer Telemetry
              </span>
              <span className="text-[10px] font-mono bg-[#242A20] text-[#9CAF88] px-2 py-0.5 border border-[#9CAF88] font-bold rounded-none">
                4-Node DAG
              </span>
            </div>
            <p className="text-[11px] text-[#A7A7A7] font-mono mt-0.5">
              Pipeline telemetry, node execution timing & provenance verification
            </p>
          </div>
        </div>

        <div className="flex items-center gap-3 font-mono text-xs">
          <div className="flex items-center gap-2 bg-[#121212] px-2.5 py-1 border border-[#262626] rounded-none">
            <Activity className="w-3.5 h-3.5 text-[#9CAF88]" />
            <span className="text-[#A7A7A7]">Requests:</span>
            <span className="font-bold text-[#F4F4F4]">{totalCalls}</span>
            <span
              className={`w-2 h-2 rounded-none ${
                allSuccessful ? "bg-[#9CAF88]" : "bg-[#CC5500]"
              }`}
            />
          </div>

          <div className="flex items-center gap-2 bg-[#121212] px-2.5 py-1 border border-[#262626] rounded-none">
            <Clock className="w-3.5 h-3.5 text-[#A7A7A7]" />
            <span className="text-[#A7A7A7]">Latency:</span>
            <span className="font-bold text-[#F4F4F4]">{avgLatency} ms</span>
          </div>

          <div className="p-1.5 bg-[#121212] text-[#A7A7A7] border border-[#262626] rounded-none">
            {isOpen ? <ChevronUp className="w-4 h-4" /> : <ChevronDown className="w-4 h-4" />}
          </div>
        </div>
      </div>

      {/* Collapsible Drawer Content */}
      {isOpen && (
        <div className="p-5 space-y-4 bg-[#121212] font-mono text-xs">
          {/* Data Stream Provenance Status Strip */}
          {provenance && Object.keys(provenance).length > 0 && (
            <div className="p-3 bg-[#1a1a1a] border border-[#262626] rounded-none space-y-2">
              <div className="flex items-center justify-between text-[11px] text-[#A7A7A7] uppercase font-semibold">
                <span className="flex items-center gap-1.5">
                  <Database className="w-3.5 h-3.5 text-[#9CAF88]" />
                  Data Stream Provenance (Zero Dummy Data Guarantee)
                </span>
                <span className="text-[10px] text-[#707070]">
                  {Object.values(provenance).filter((p) => p.status === "live").length} / {Object.keys(provenance).length} Streams Live
                </span>
              </div>
              <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-5 gap-2">
                {Object.entries(provenance).map(([key, p]) => {
                  const statusClass =
                    p.status === "live"
                      ? "bg-[#242A20] text-[#9CAF88] border-[#9CAF88]"
                      : p.status === "cached"
                      ? "bg-[#222222] text-[#A7A7A7] border-[#383838]"
                      : "bg-[#2C180E] text-[#CC5500] border-[#CC5500]";

                  return (
                    <div
                      key={key}
                      className="p-2 bg-[#121212] border border-[#262626] flex items-center justify-between text-[11px] rounded-none"
                      title={p.error ? `Error: ${p.error}` : `${p.source} (Fetched: ${p.fetchedAt})`}
                    >
                      <span className="truncate text-[#E6E6E6] mr-1.5 font-medium">
                        {streamLabels[key] || p.source}
                      </span>
                      <span className={`px-1.5 py-0.2 text-[9px] font-bold border uppercase shrink-0 ${statusClass}`}>
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
                  <CheckCircle2 className="w-3.5 h-3.5 text-[#9CAF88] shrink-0" />
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
                  className={`p-3 border text-left transition-colors flex items-center justify-between rounded-none ${
                    isSelected
                      ? "bg-[#1a1a1a] border-[#9CAF88] text-[#F4F4F4]"
                      : "bg-[#161616] border-[#262626] text-[#A7A7A7] hover:border-[#383838]"
                  }`}
                >
                  <div className="overflow-hidden">
                    <p className="font-bold truncate text-[11px]">
                      {titles[nodeNum - 1]}
                    </p>
                    <p className="text-[10px] text-[#707070] truncate mt-0.5">
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
                <div className="p-6 text-center text-[#707070] bg-[#1a1a1a] border border-[#262626] rounded-none">
                  Node pipeline execution pending...
                </div>
              );
            }

            return (
              <div className="space-y-3.5 bg-[#1a1a1a] p-4 border border-[#262626] rounded-none">
                <div className="flex items-center justify-between pb-2.5 border-b border-[#262626]">
                  <span className="font-bold text-[#F4F4F4] flex items-center gap-2">
                    <Terminal className="w-3.5 h-3.5 text-[#9CAF88]" />
                    NODE {currentStep.node}: {currentStep.label}
                  </span>
                  <span
                    className={`px-2 py-0.5 text-[10px] font-bold uppercase border rounded-none ${
                      currentStep.status === "done"
                        ? "bg-[#242A20] text-[#9CAF88] border-[#9CAF88]"
                        : "bg-[#2C180E] text-[#CC5500] border-[#CC5500]"
                    }`}
                  >
                    STATUS: {currentStep.status}
                  </span>
                </div>

                {currentStep.fallbackReason && (
                  <div className="p-2.5 bg-[#2C180E] border border-[#CC5500] text-[#CC5500] text-[11px] rounded-none">
                    <strong>Note:</strong> {currentStep.fallbackReason}
                  </div>
                )}

                {/* Node Output Preview */}
                {currentStep.output && (
                  <div>
                    <p className="text-[11px] text-[#A7A7A7] font-semibold mb-1">
                      Execution Output:
                    </p>
                    <div className="p-3 bg-[#121212] border border-[#262626] max-h-36 overflow-y-auto text-[#E6E6E6] whitespace-pre-wrap text-[11px] font-mono leading-relaxed rounded-none">
                      {currentStep.output}
                    </div>
                  </div>
                )}

                {/* Expandable Network Calls Inspector */}
                <div className="pt-2 border-t border-[#262626]">
                  <button
                    type="button"
                    onClick={() => setShowNetworkCalls(!showNetworkCalls)}
                    className="flex items-center justify-between w-full text-xs font-mono text-[#A7A7A7] hover:text-[#F4F4F4] transition-colors py-1"
                  >
                    <span>HTTP Request Traces ({currentStep.apiCalls.length})</span>
                    <span className="text-[10px] text-[#9CAF88]">
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
                        <p className="text-[#707070] text-[11px] italic p-2 bg-[#121212]">
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
          <div className="pt-2 border-t border-[#262626]">
            <button
              type="button"
              onClick={() => setShowRawJson(!showRawJson)}
              className="flex items-center gap-2 text-xs font-mono text-[#A7A7A7] hover:text-[#F4F4F4] transition-colors"
            >
              <Code2 className="w-3.5 h-3.5 text-[#9CAF88]" />
              <span>{showRawJson ? "Hide Raw JSON" : "Inspect Raw Ingestion JSON Payload"}</span>
            </button>

            {showRawJson && rawPayload && (
              <pre className="mt-2.5 p-3 bg-[#121212] border border-[#262626] text-[10px] text-[#9CAF88] max-h-64 overflow-auto font-mono rounded-none">
                {JSON.stringify(rawPayload, null, 2)}
              </pre>
            )}
          </div>
        </div>
      )}
    </div>
  );
}
