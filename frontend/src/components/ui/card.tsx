import * as React from "react";
import { cn } from "../../lib/utils";

export const Card = ({ className, ...p }: React.HTMLAttributes<HTMLDivElement>) => (
  <div className={cn("paper-panel p-5", className)} {...p} />
);
export const CardHeader = ({ className, ...p }: React.HTMLAttributes<HTMLDivElement>) => (
  <div className={cn("mb-3 flex items-center justify-between", className)} {...p} />
);
export const CardTitle = ({ className, ...p }: React.HTMLAttributes<HTMLHeadingElement>) => (
  <h3 className={cn("text-base font-bold text-ink", className)} {...p} />
);

export const Badge = ({ className, ...p }: React.HTMLAttributes<HTMLSpanElement>) => (
  <span className={cn("stamp stamp-pending", className)} {...p} />
);

export const Input = React.forwardRef<HTMLInputElement, React.InputHTMLAttributes<HTMLInputElement>>(({ className, ...p }, ref) => (
  <input ref={ref} className={cn("h-10 w-full rounded-sm border border-ink/20 bg-paper/60 px-3 text-sm text-ink placeholder:text-ink/70 focus:outline-none focus:ring-2 focus:ring-margin", className)} {...p} />
));
Input.displayName = "Input";

export const Select = React.forwardRef<HTMLSelectElement, React.SelectHTMLAttributes<HTMLSelectElement>>(({ className, ...p }, ref) => (
  <select ref={ref} className={cn("h-10 rounded-sm border border-ink/20 bg-paper/60 px-3 text-sm text-ink focus:outline-none focus:ring-2 focus:ring-margin", className)} {...p} />
));
Select.displayName = "Select";
