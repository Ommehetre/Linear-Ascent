import React from "react";

export function LoadingSpinner({
  label = "Processing telemetry stream...",
  size = "md",
}: {
  label?: string;
  size?: "sm" | "md" | "lg";
}) {
  const sizeMap = { sm: "w-4 h-4", md: "w-5 h-5", lg: "w-7 h-7" };
  return (
    <div className="flex flex-col items-center justify-center p-6 space-y-3 text-[#5A5752]">
      <div
        className={`${sizeMap[size]} border-2 border-[#CDC9BF] border-t-[#9CAF88] animate-spin`}
      />
      {label && (
        <span className="text-[11px] font-mono tracking-wider text-[#6E6A63] uppercase font-semibold">
          {label}
        </span>
      )}
    </div>
  );
}
