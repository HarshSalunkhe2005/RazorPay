"use client";

import { useId } from "react";
import { cn } from "@/lib/utils";

interface RadialGaugeProps {
  value: number; // 0-100
  size?: number;
  strokeWidth?: number;
  className?: string;
  trackColor?: string;
  gradientFrom?: string;
  gradientTo?: string;
  children?: React.ReactNode;
}

/** SVG ring gauge for a 0-100 score, styled to match the app's brand gradient by default. */
export function RadialGauge({
  value,
  size = 96,
  strokeWidth = 8,
  className,
  trackColor = "color-mix(in oklch, var(--foreground) 8%, transparent)",
  gradientFrom = "var(--primary)",
  gradientTo = "var(--accent)",
  children,
}: RadialGaugeProps) {
  const gradientId = `gauge-grad-${useId()}`;
  const clamped = Math.max(0, Math.min(100, value));
  const radius = (size - strokeWidth) / 2;
  const circumference = 2 * Math.PI * radius;
  const offset = circumference * (1 - clamped / 100);
  const center = size / 2;

  return (
    <div
      className={cn("relative inline-flex shrink-0 items-center justify-center", className)}
      style={{ width: size, height: size }}
    >
      <svg width={size} height={size} className="-rotate-90">
        <defs>
          <linearGradient id={gradientId} x1="0%" y1="0%" x2="100%" y2="100%">
            <stop offset="0%" stopColor={gradientFrom} />
            <stop offset="100%" stopColor={gradientTo} />
          </linearGradient>
        </defs>
        <circle
          cx={center}
          cy={center}
          r={radius}
          fill="none"
          strokeWidth={strokeWidth}
          style={{ stroke: trackColor }}
        />
        <circle
          cx={center}
          cy={center}
          r={radius}
          fill="none"
          strokeWidth={strokeWidth}
          strokeLinecap="round"
          strokeDasharray={circumference}
          strokeDashoffset={offset}
          style={{ stroke: `url(#${gradientId})`, transition: "stroke-dashoffset 0.6s ease-out" }}
        />
      </svg>
      <div className="absolute inset-0 flex items-center justify-center">{children}</div>
    </div>
  );
}
