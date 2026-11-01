import React from "react";
import { cn } from "@/lib/utils";

export type BadgeVariant =
  | "default"
  | "low"
  | "medium"
  | "high"
  | "severe"
  | "info"
  | "sage"
  | "amber"
  | "concrete"
  | "LOW"
  | "MODERATE"
  | "HIGH"
  | "SEVERE"
  | "UNKNOWN";

interface BadgeProps {
  children: React.ReactNode;
  variant?: BadgeVariant;
  className?: string;
}

export function Badge({ children, variant = "default", className }: BadgeProps) {
  const variantStyles: Record<string, string> = {
    default: "bg-[#F4F1EA] text-[#403E3A] border-[#CDC9BF]",
    concrete: "bg-[#F4F1EA] text-[#403E3A] border-[#CDC9BF]",
    info: "bg-[#F4F1EA] text-[#5A5752] border-[#CDC9BF]",
    low: "bg-[#F1F6EE] text-[#3D5230] border-[#9CAF88]",
    LOW: "bg-[#F1F6EE] text-[#3D5230] border-[#9CAF88]",
    sage: "bg-[#F1F6EE] text-[#3D5230] border-[#9CAF88]",
    medium: "bg-[#FFF6F0] text-[#963E00] border-[#CC5500]",
    MODERATE: "bg-[#FFF6F0] text-[#963E00] border-[#CC5500]",
    high: "bg-[#FDF1EB] text-[#CC5500] border-[#CC5500]",
    HIGH: "bg-[#FDF1EB] text-[#CC5500] border-[#CC5500]",
    severe: "bg-[#FDF1EB] text-[#CC5500] border-[#CC5500]",
    SEVERE: "bg-[#FDF1EB] text-[#CC5500] border-[#CC5500]",
    amber: "bg-[#FDF1EB] text-[#CC5500] border-[#CC5500]",
    UNKNOWN: "bg-[#F4F1EA] text-[#5A5752] border-[#CDC9BF]",
  };

  const selectedStyle = variantStyles[variant] || variantStyles[variant.toLowerCase()] || variantStyles.default;

  return (
    <span
      className={cn(
        "inline-flex items-center px-2 py-0.5 text-[11px] font-mono font-medium border rounded-sm tracking-wider uppercase",
        selectedStyle,
        className
      )}
    >
      {children}
    </span>
  );
}
