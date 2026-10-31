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
        "bg-[#FFFFFF] border border-[#B5B0A6] p-5 lg:p-6 rounded-sm shadow-xs transition-colors",
        className
      )}
    >
      {(title || subtitle || headerAction) && (
        <div className="flex flex-wrap items-center justify-between gap-3 pb-3.5 mb-4 border-b border-[#CDC9BF]">
          <div>
            {title && (
              <h3 className="text-xs font-sans font-bold text-[#141414] tracking-wider uppercase flex items-center gap-2">
                {title}
              </h3>
            )}
            {subtitle && (
              <p className="text-[11px] font-sans text-[#5A5752] mt-0.5">{subtitle}</p>
            )}
          </div>
          {headerAction && <div>{headerAction}</div>}
        </div>
      )}
      {children}
    </div>
  );
}
