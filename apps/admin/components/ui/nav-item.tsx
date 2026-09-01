import * as React from "react"
import { cn } from "./button"

export interface NavItemProps extends React.AnchorHTMLAttributes<HTMLAnchorElement> {
  active?: boolean;
}

const NavItem = React.forwardRef<HTMLAnchorElement, NavItemProps>(
  ({ className, active, ...props }, ref) => {
    return (
      <a
        ref={ref}
        className={cn(
          "flex items-center gap-2 rounded-md px-3 py-2 text-sm font-medium transition-colors",
          active 
            ? "bg-accent-wash text-accent" 
            : "text-ink-secondary hover:bg-dark-rule hover:text-ink-primary",
          className
        )}
        {...props}
      />
    )
  }
)
NavItem.displayName = "NavItem"

export { NavItem }
