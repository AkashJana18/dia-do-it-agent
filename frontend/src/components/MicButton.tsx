import { cn } from "../lib/utils";
import { Mic, Square } from "lucide-react";

interface Props {
  recording?: boolean;
  onClick: () => void;
  size?: "lg" | "md";
  disabled?: boolean;
  label: string;
}

export default function MicButton({ recording = false, onClick, size = "lg", disabled, label }: Props) {
  const big = size === "lg";
  const px = big ? "h-[132px] w-[132px]" : "h-[54px] w-[54px]";
  const icon = big ? 40 : 22;

  return (
    <div className={cn("relative inline-flex items-center justify-center", big && "p-3")}>
      {recording ? (
        <>
          <span className="pointer-events-none absolute inset-0 animate-breathe rounded-full border-2 border-brand/30" />
          <span
            className="pointer-events-none absolute inset-0 animate-breathe rounded-full border-2 border-brand/20"
            style={{ animationDelay: "-1.3s" }}
          />
        </>
      ) : null}
      <button
        type="button"
        onClick={onClick}
        disabled={disabled}
        aria-label={label}
        aria-pressed={recording}
        className={cn(
          "relative z-10 grid place-items-center rounded-full transition-transform",
          "focus-visible:outline-none focus-visible:ring-4 focus-visible:ring-brand/25 focus-visible:ring-offset-4 focus-visible:ring-offset-base",
          "disabled:pointer-events-none disabled:opacity-50",
          px,
          recording
            ? "bg-brand text-panel shadow-lift"
            : "bg-brand text-panel shadow-[0_2px_0_rgba(122,20,28,0.35),0_16px_36px_-14px_rgba(176,30,42,0.55)] hover:scale-[1.02] hover:bg-brand-deep active:scale-[0.99] active:translate-y-[1px]"
        )}
      >
        {recording ? (
          <Square size={big ? 34 : 18} strokeWidth={2.5} fill="currentColor" />
        ) : (
          <Mic size={icon} strokeWidth={2} />
        )}
      </button>
    </div>
  );
}
