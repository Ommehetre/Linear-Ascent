import React from "react";
import type { ApiCallRecord } from "@/types";
import { truncateUrl } from "@/lib/utils";

export function ApiStatusBadge({ call }: { call: ApiCallRecord }) {
  const is2xx = call.statusCode >= 200 && call.statusCode < 300;

  const statusBadge = is2xx
    ? "bg-[#242A20] text-[#9CAF88] border-[#9CAF88]"
    : "bg-[#2C180E] text-[#CC5500] border-[#CC5500]";

  return (
    <div className="flex items-center justify-between text-xs font-mono bg-[#121212] border border-[#2a2a2a] px-3 py-1.5 rounded-none">
      <div className="flex items-center gap-2 overflow-hidden mr-3">
        <span className="font-bold text-[#A7A7A7] shrink-0">[{call.method}]</span>
        <span
          className="text-[#E6E6E6] truncate font-mono text-[11px]"
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
        <span className="text-[#A7A7A7] text-[10px] min-w-[42px] text-right">
          {call.latencyMs}ms
        </span>
      </div>
    </div>
  );
}
