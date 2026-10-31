import React from "react";
import { cn } from "@/lib/utils";

interface CardProps {
  children: React.ReactNode;
  className?: string;
  title?: string;
  subtitle?: string;
  headerAction?: React.ReactNode;
}

export function Card({
  children,
  className,
  title,
  subtitle,
  headerAction,
}: CardProps) {
  return (
    <div
      className={cn(
        "bg-[#1a1a1a] border border-[#2a2a2a] p-5 lg:p-6 rounded-none transition-colors",
        className
      )}
    >
      {(title || subtitle || headerAction) && (
        <div className="flex flex-wrap items-center justify-between gap-3 pb-3.5 mb-4 border-b border-[#2a2a2a]">
          <div>
            {title && (
              <h3 className="text-xs font-mono font-bold text-[#F4F4F4] tracking-wider uppercase flex items-center gap-2">
                {title}
              </h3>
            )}
            {subtitle && (
              <p className="text-[11px] font-mono text-[#A7A7A7] mt-0.5">{subtitle}</p>
            )}
          </div>
          {headerAction && <div>{headerAction}</div>}
        </div>
      )}
      {children}
    </div>
  );
}
