import * as React from "react"
import { cn } from "./button"

export interface BadgeProps extends React.HTMLAttributes<HTMLDivElement> {
  severity?: "default" | "critical" | "warning";
}

function SeverityBadge({ className, severity = "default", ...props }: BadgeProps) {
  const severities = {
    default: "text-accent border-accent/30 bg-accent/10",
    critical: "text-signal-critical border-signal-critical/30 bg-signal-critical/10",
    warning: "text-signal-warning border-signal-warning/30 bg-signal-warning/10",
  }
  
  return (
    <div className={cn("inline-flex items-center rounded-md border px-2.5 py-0.5 text-xs font-semibold font-sans uppercase tracking-wider transition-colors focus:outline-none focus:ring-2 focus:ring-dark-ruleStrong", severities[severity], className)} {...props} />
  )
}
export { SeverityBadge }

