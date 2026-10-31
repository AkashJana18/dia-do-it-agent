import * as React from "react";
import { cn } from "../../lib/utils";

export const Card = ({ className, ...p }: React.HTMLAttributes<HTMLDivElement>) => (
  <div className={cn("paper", className)} {...p} />
);

export const CardHeader = ({ className, ...p }: React.HTMLAttributes<HTMLDivElement>) => (
  <div
    className={cn("flex min-h-[52px] items-center justify-between gap-3 border-b border-line px-5 py-2.5", className)}
    {...p}
  />
);

export const CardTitle = ({ className, ...p }: React.HTMLAttributes<HTMLHeadingElement>) => (
  <h3 className={cn("text-[16px] font-bold leading-tight text-ink", className)} {...p} />
);

export const Label = ({ className, ...p }: React.HTMLAttributes<HTMLSpanElement>) => (
  <span className={cn("label", className)} {...p} />
);

export const Badge = ({
  className,
  tone = "live",
  ...p
}: React.HTMLAttributes<HTMLSpanElement> & { tone?: "live" | "attn" | "danger" | "dim" }) => {
  const tones = {
    live: "border-ok/40 bg-ok/5 text-ok",
    attn: "border-warn/40 bg-warn/5 text-warn",
    danger: "border-danger/40 bg-danger/5 text-danger",
    dim: "border-linehot bg-panel2 text-dim",
  }[tone];
  return (
    <span
      className={cn(
        "inline-flex h-6 items-center gap-1.5 rounded-sm border px-2 text-[11px] font-bold uppercase tracking-[0.1em]",
        tones,
        className
      )}
      {...p}
    />
  );
};

export const Input = React.forwardRef<HTMLInputElement, React.InputHTMLAttributes<HTMLInputElement>>(
  ({ className, ...p }, ref) => <input ref={ref} className={cn("input", className)} {...p} />
);
Input.displayName = "Input";

export const Select = React.forwardRef<HTMLSelectElement, React.SelectHTMLAttributes<HTMLSelectElement>>(
  ({ className, ...p }, ref) => <select ref={ref} className={cn("input", className)} {...p} />
);
Select.displayName = "Select";
