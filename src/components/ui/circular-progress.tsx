"use client"

import * as React from "react"
import { cn } from "@/lib/utils"

interface CircularProgressProps extends React.HTMLAttributes<HTMLDivElement> {
  value: number
  size?: number
  strokeWidth?: number
  strokeColor?: string
  showValue?: boolean
}

function CircularProgress({
  value,
  size = 40,
  strokeWidth = 4,
  strokeColor,
  showValue = true,
  className,
  children,
  ...props
}: CircularProgressProps) {
  const radius = (size - strokeWidth) / 2
  const circumference = radius * 2 * Math.PI
  const strokeDashoffset = circumference - (value / 100) * circumference

  const getColor = (score: number) => {
    if (score < 40) return "rgb(239 68 68)"
    if (score < 70) return "rgb(234 179 8)"
    return "rgb(34 197 94)"
  }

  const color = strokeColor ?? getColor(value)

  return (
    <div
      className={cn("relative inline-flex items-center justify-center", className)}
      style={{ width: size, height: size }}
      {...props}
    >
      <svg
        className="transform -rotate-90"
        style={{ width: size, height: size }}
      >
        <circle
          cx={size / 2}
          cy={size / 2}
          r={radius}
          strokeWidth={strokeWidth}
          stroke="currentColor"
          fill="transparent"
          className="text-muted-foreground/20"
        />
        <circle
          cx={size / 2}
          cy={size / 2}
          r={radius}
          strokeWidth={strokeWidth}
          stroke={color}
          fill="transparent"
          style={{
            strokeDasharray: circumference,
            strokeDashoffset,
            transition: "stroke-dashoffset 0.5s ease",
          }}
        />
      </svg>
      {children ? (
        <div className="absolute inset-0 flex items-center justify-center">
          {children}
        </div>
      ) : showValue ? (
        <div
          className="absolute text-xs font-medium"
          style={{ color }}
        >
          {Math.round(value)}
        </div>
      ) : null}
    </div>
  )
}

export { CircularProgress }
