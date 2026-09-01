import * as React from "react"
import { cn } from "./button"

function DataMono({ className, ...props }: React.HTMLAttributes<HTMLSpanElement>) {
  return (
    <span className={cn("font-mono text-ink-tertiary text-sm tracking-tight", className)} {...props} />
  )
}
export { DataMono }
