import * as React from "react";
import { cn } from "../../lib/utils";

export interface ButtonProps extends React.ButtonHTMLAttributes<HTMLButtonElement> {
  variant?: "primary" | "secondary" | "ghost";
  size?: "sm" | "md" | "lg";
}
export const Button = React.forwardRef<HTMLButtonElement, ButtonProps>(
  ({ className, variant = "primary", size = "md", ...props }, ref) => {
    const v = {
      primary: "bg-neon text-base hover:bg-neon/90 shadow-[0_0_16px_rgba(34,211,238,0.25)]",
      secondary: "bg-surface-2 text-ink border border-line hover:border-line-bright",
      ghost: "text-ink-soft hover:text-ink hover:bg-surface-2",
    }[variant];
    const s = { sm: "h-8 px-3 text-xs", md: "h-10 px-4 text-sm", lg: "h-12 px-6 text-base" }[size];
    return <button ref={ref} className={cn("inline-flex items-center justify-center gap-2 rounded-md font-medium transition focus:outline-none focus:ring-2 focus:ring-neon/40 disabled:opacity-50 disabled:pointer-events-none", v, s, className)} {...props} />;
  }
);
Button.displayName = "Button";
