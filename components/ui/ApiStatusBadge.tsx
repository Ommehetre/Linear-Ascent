import React from "react";
import type { ApiCallRecord } from "@/types";
import { truncateUrl } from "@/lib/utils";

export function ApiStatusBadge({ call }: { call: ApiCallRecord }) {
  const is2xx = call.statusCode >= 200 && call.statusCode < 300;

  const statusBadge = is2xx
    ? "bg-[#F1F6EE] text-[#3D5230] border-[#9CAF88]"
    : "bg-[#FDF1EB] text-[#CC5500] border-[#CC5500]";

  return (
    <div className="flex items-center justify-between text-xs font-mono bg-[#FFFFFF] border border-[#D8D5D0] px-3 py-1.5 rounded-none">
      <div className="flex items-center gap-2 overflow-hidden mr-3">
        <span className="font-bold text-[#555555] shrink-0">[{call.method}]</span>
        <span
          className="text-[#1A1A1A] truncate font-mono text-[11px]"
          title={call.url}
        >
          {truncateUrl(call.url, 48)}
        </span>
      </div>
      <div className="flex items-center gap-2 shrink-0">
        <span
          className={`px-1.5 py-0.5 text-[10px] font-bold border rounded-none ${statusBadge}`}
        >
          {call.statusCode === 0 ? "TIMEOUT" : `HTTP ${call.statusCode}`}
        </span>
        <span className="text-[#707070] text-[10px] min-w-[42px] text-right">
          {call.latencyMs}ms
        </span>
      </div>
    </div>
  );
}
