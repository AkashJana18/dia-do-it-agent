import * as React from "react";
import { cn } from "../../lib/utils";

export interface ButtonProps extends React.ButtonHTMLAttributes<HTMLButtonElement> {
  variant?: "primary" | "attention" | "secondary" | "ghost" | "quiet";
  size?: "sm" | "md" | "lg";
}

const VARIANTS: Record<NonNullable<ButtonProps["variant"]>, string> = {
  primary:
    "bg-brand text-panel shadow-[0_1px_0_rgba(0,0,0,0.12)] hover:bg-brand-deep active:translate-y-[1px]",
  attention:
    "bg-warn text-panel shadow-[0_1px_0_rgba(0,0,0,0.12)] hover:opacity-90 active:translate-y-[1px]",
  secondary:
    "border border-linehot bg-panel text-ink hover:border-ink/40 hover:bg-panel2",
  ghost: "text-soft hover:bg-panel2 hover:text-ink",
  quiet: "text-dim hover:text-ink",
};

const SIZES: Record<NonNullable<ButtonProps["size"]>, string> = {
  sm: "h-9 px-3 text-[14px]",
  md: "h-11 px-4 text-[15px]",
  lg: "h-12 px-6 text-[16px]",
};

export const Button = React.forwardRef<HTMLButtonElement, ButtonProps>(
  ({ className, variant = "primary", size = "md", ...props }, ref) => (
    <button
      ref={ref}
      className={cn(
        "inline-flex shrink-0 items-center justify-center gap-2 rounded-md font-bold transition-colors",
        "focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-brand focus-visible:ring-offset-2 focus-visible:ring-offset-base",
        "disabled:pointer-events-none disabled:opacity-40",
        VARIANTS[variant],
        SIZES[size],
        className
      )}
      {...props}
    />
  )
);
Button.displayName = "Button";
