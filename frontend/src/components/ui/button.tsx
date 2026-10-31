import * as React from "react";
import { cn } from "../../lib/utils";

export interface ButtonProps extends React.ButtonHTMLAttributes<HTMLButtonElement> {
  variant?: "primary" | "secondary" | "ghost" | "stamp";
  size?: "sm" | "md" | "lg";
}
export const Button = React.forwardRef<HTMLButtonElement, ButtonProps>(
  ({ className, variant = "primary", size = "md", ...props }, ref) => {
    const v = {
      primary: "bg-margin text-paper hover:bg-margin/90",
      secondary: "bg-paper-2 text-ink hover:bg-paper",
      ghost: "bg-transparent text-paper hover:bg-white/5",
      stamp: "bg-transparent border-2 border-margin text-margin hover:bg-margin hover:text-paper",
    }[variant];
    const s = { sm: "h-8 px-3 text-xs", md: "h-10 px-4 text-sm", lg: "h-12 px-6 text-base" }[size];
    return <button ref={ref} className={cn("inline-flex items-center justify-center gap-2 rounded-sm font-semibold tracking-wide transition focus:outline-none focus:ring-2 focus:ring-margin disabled:opacity-50 disabled:pointer-events-none", v, s, className)} {...props} />;
  }
);
Button.displayName = "Button";
