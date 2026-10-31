import React from "react";
import { cn } from "@/lib/utils";

interface BadgeProps {
  children: React.ReactNode;
  variant?: "default" | "low" | "medium" | "high" | "severe" | "info" | "sage" | "amber" | "concrete";
  className?: string;
}

export function Badge({ children, variant = "default", className }: BadgeProps) {
  const variantStyles: Record<string, string> = {
    default: "bg-[#222222] text-[#A7A7A7] border-[#383838]",
    concrete: "bg-[#222222] text-[#A7A7A7] border-[#383838]",
    info: "bg-[#1E1E1E] text-[#A7A7A7] border-[#383838]",
    low: "bg-[#242A20] text-[#9CAF88] border-[#9CAF88]",
    sage: "bg-[#242A20] text-[#9CAF88] border-[#9CAF88]",
    medium: "bg-[#2C180E] text-[#CC5500] border-[#CC5500]",
    high: "bg-[#2C180E] text-[#CC5500] border-[#CC5500]",
    severe: "bg-[#2C180E] text-[#CC5500] border-[#CC5500]",
    amber: "bg-[#2C180E] text-[#CC5500] border-[#CC5500]",
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
