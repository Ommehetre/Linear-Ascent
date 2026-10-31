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
      <div className="p-5 bg-[#FFFFFF] border border-[#B5B0A6] space-y-4 rounded-sm animate-pulse shadow-xs">
        <div className="h-4 bg-[#E2DFD7] w-1/3 rounded-sm" />
        <div className="h-32 bg-[#E2DFD7] w-full rounded-sm" />
      </div>
    );
  }

  const topRecords = records.slice(0, 5);

  return (
    <div className="bg-[#FFFFFF] border border-[#B5B0A6] p-5 text-xs space-y-4 rounded-sm shadow-xs">
      {/* Header */}
      <div className="flex items-center justify-between pb-3 border-b border-[#E2DFD7]">
        <div className="flex items-center gap-2">
          <DollarSign className="w-4 h-4 text-[#9CAF88]" />
          <span className="font-sans font-bold text-[#141414] uppercase tracking-wider text-xs">
            APMC Mandi Price Benchmarks
          </span>
        </div>
        <span className="font-mono text-[10px] text-[#6E6A63] uppercase tracking-wider font-semibold">
          Agmarknet Spot Feed
        </span>
      </div>

      {topRecords.length > 0 ? (
        <div className="overflow-x-auto">
          <table className="w-full text-left border-collapse">
            <thead>
              <tr className="border-b border-[#CDC9BF] text-[10px] font-sans font-bold text-[#5A5752] uppercase tracking-wider">
                <th className="py-2.5 px-3">Market / APMC</th>
                <th className="py-2.5 px-3">Variety</th>
                <th className="py-2.5 px-3 text-right">Modal Price</th>
                <th className="py-2.5 px-3 text-right">Range</th>
                <th className="py-2.5 px-3 text-right">Arrival Date</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-[#E2DFD7] text-xs">
              {topRecords.map((m, idx) => (
                <tr
                  key={idx}
                  className="hover:bg-[#F4F1EA] transition-colors"
                >
                  <td className="py-2.5 px-3 font-sans font-semibold text-[#141414] flex items-center gap-1.5">
                    <MapPin className="w-3.5 h-3.5 text-[#6E6A63] shrink-0" />
                    <span>{m.market}</span>
                    <span className="text-[10px] text-[#6E6A63] font-normal">({m.state})</span>
                  </td>
                  <td className="py-2.5 px-3 font-sans text-[#5A5752]">{m.variety || "FAQ"}</td>
                  <td className="py-2.5 px-3 text-right font-mono font-bold text-[#3D5230]">
                    ₹{m.modal_price.toLocaleString()}/q
                  </td>
                  <td className="py-2.5 px-3 text-right font-mono text-[#5A5752] text-[11px]">
                    ₹{m.min_price} – ₹{m.max_price}
                  </td>
                  <td className="py-2.5 px-3 text-right font-mono text-[#6E6A63] text-[10px]">
                    {m.arrival_date}
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      ) : (
        <div className="p-5 bg-[#F4F1EA] border border-[#CDC9BF] text-center text-[#5A5752] font-sans text-xs rounded-sm">
          Awaiting real-time Agmarknet records for {crop}...
        </div>
      )}
    </div>
  );
}
