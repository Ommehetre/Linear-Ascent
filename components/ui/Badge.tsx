import React from "react";
import { cn } from "@/lib/utils";

interface BadgeProps {
  children: React.ReactNode;
  variant?: "default" | "low" | "medium" | "high" | "severe" | "info" | "sage" | "amber" | "concrete";
  className?: string;
}

export function Badge({ children, variant = "default", className }: BadgeProps) {
  const variantStyles: Record<string, string> = {
    default: "bg-[#F5F3F0] text-[#555555] border-[#D8D5D0]",
    concrete: "bg-[#F5F3F0] text-[#555555] border-[#D8D5D0]",
    info: "bg-[#F7F5F2] text-[#555555] border-[#D8D5D0]",
    low: "bg-[#F1F6EE] text-[#3D5230] border-[#9CAF88]",
    sage: "bg-[#F1F6EE] text-[#3D5230] border-[#9CAF88]",
    medium: "bg-[#FFF6F0] text-[#963E00] border-[#CC5500]",
    high: "bg-[#FDF1EB] text-[#CC5500] border-[#CC5500]",
    severe: "bg-[#FDF1EB] text-[#CC5500] border-[#CC5500]",
    amber: "bg-[#FDF1EB] text-[#CC5500] border-[#CC5500]",
  };

  return (
    <span
      className={cn(
        "inline-flex items-center px-2 py-0.5 text-[11px] font-mono font-medium border rounded-none tracking-wider uppercase",
        variantStyles[variant] || variantStyles.default,
        className
      )}
    >
      {children}
    </span>
  );
}
