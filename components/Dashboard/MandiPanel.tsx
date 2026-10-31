"use client";

import React from "react";
import type { MandiRecord } from "@/types";
import { DollarSign, MapPin } from "lucide-react";

interface MandiPanelProps {
  records: MandiRecord[];
  loading?: boolean;
  crop: string;
}

export function MandiPanel({ records, loading, crop }: MandiPanelProps) {
  if (loading) {
    return (
      <div className="p-5 bg-[#1a1a1a] border border-[#2a2a2a] space-y-4 rounded-none animate-pulse">
        <div className="h-4 bg-[#262626] w-1/3" />
        <div className="h-32 bg-[#262626] w-full" />
      </div>
    );
  }

  const topRecords = records.slice(0, 5);

  return (
    <div className="bg-[#1a1a1a] border border-[#2a2a2a] p-5 font-mono text-xs space-y-4 rounded-none">
      {/* Header */}
      <div className="flex items-center justify-between pb-3 border-b border-[#262626]">
        <div className="flex items-center gap-2">
          <DollarSign className="w-4 h-4 text-[#9CAF88]" />
          <span className="font-bold text-[#F4F4F4] uppercase tracking-wider text-[11px]">
            APMC Mandi Price Benchmarks
          </span>
        </div>
        <span className="text-[10px] text-[#A7A7A7]">
          Agmarknet Spot Feed
        </span>
      </div>

      {topRecords.length > 0 ? (
        <div className="overflow-x-auto">
          <table className="w-full text-left border-collapse">
            <thead>
              <tr className="border-b border-[#262626] text-[10px] text-[#A7A7A7] uppercase">
                <th className="py-2 px-2.5 font-semibold">Market / APMC</th>
                <th className="py-2 px-2.5 font-semibold">Variety</th>
                <th className="py-2 px-2.5 text-right font-semibold">Modal Price</th>
                <th className="py-2 px-2.5 text-right font-semibold">Range</th>
                <th className="py-2 px-2.5 text-right font-semibold">Arrival Date</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-[#222222] text-[11px]">
              {topRecords.map((m, idx) => (
                <tr
                  key={idx}
                  className="hover:bg-[#121212] transition-colors text-[#E6E6E6]"
                >
                  <td className="py-2.5 px-2.5 font-medium text-[#F4F4F4] flex items-center gap-1.5">
                    <MapPin className="w-3 h-3 text-[#A7A7A7] shrink-0" />
                    <span>{m.market}</span>
                    <span className="text-[9px] text-[#707070]">({m.state})</span>
                  </td>
                  <td className="py-2.5 px-2.5 text-[#A7A7A7]">{m.variety || "FAQ"}</td>
                  <td className="py-2.5 px-2.5 text-right font-bold text-[#9CAF88]">
                    ₹{m.modal_price.toLocaleString()}/q
                  </td>
                  <td className="py-2.5 px-2.5 text-right text-[#A7A7A7] text-[10px]">
                    ₹{m.min_price} – ₹{m.max_price}
                  </td>
                  <td className="py-2.5 px-2.5 text-right text-[#707070] text-[10px]">
                    {m.arrival_date}
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      ) : (
        <div className="p-5 bg-[#121212] border border-[#262626] text-center text-[#A7A7A7] text-xs rounded-none">
          Awaiting real-time Agmarknet records for {crop}...
        </div>
      )}
    </div>
  );
}
