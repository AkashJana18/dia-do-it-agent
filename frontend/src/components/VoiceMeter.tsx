import { useEffect, useRef } from "react";
import { cn } from "../lib/utils";

interface Props {
  active?: boolean;
  height?: number;
  bars?: number;
  className?: string;
}

/**
 * The voice strip. Idle holds a low line; while listening it draws a moving
 * one. Noise is deterministic so it never flickers at random.
 */
export default function VoiceMeter({ active = false, height = 48, bars = 44, className }: Props) {
  const ref = useRef<HTMLCanvasElement | null>(null);

  useEffect(() => {
    const canvas = ref.current;
    if (!canvas) return;
    const ctx = canvas.getContext("2d");
    if (!ctx) return;

    const reduce = window.matchMedia?.("(prefers-reduced-motion: reduce)")?.matches ?? false;
    const dpr = Math.min(2, window.devicePixelRatio || 1);
    const levels = new Array(bars).fill(0.12) as number[];
    const seed = new Array(bars).fill(0).map((_, i) => {
      const v = Math.sin((i + 1) * 12.9898) * 43758.5453;
      return v - Math.floor(v);
    });

    let w = 1;
    let h = 1;
    let t = 0;
    let raf = 0;

    const resize = () => {
      const rect = canvas.getBoundingClientRect();
      w = Math.max(1, rect.width);
      h = Math.max(1, rect.height);
      canvas.width = Math.round(w * dpr);
      canvas.height = Math.round(h * dpr);
      ctx.setTransform(dpr, 0, 0, dpr, 0, 0);
    };

    resize();
    const ro = new ResizeObserver(resize);
    ro.observe(canvas);

    const draw = () => {
      t += 1;
      ctx.clearRect(0, 0, w, h);

      ctx.fillStyle = "rgba(26,22,18,0.10)";
      ctx.fillRect(0, Math.floor(h / 2), w, 1);

      const gap = w / bars;
      const bw = Math.max(2, gap * 0.34);

      for (let i = 0; i < bars; i++) {
        const envelope = Math.max(0, Math.sin((i / bars) * Math.PI));
        const goal = active
          ? Math.min(1, 0.14 + envelope * (0.5 + 0.36 * Math.abs(Math.sin(i * 0.63 + t * 0.17))) + seed[i] * 0.08)
          : 0.07 + seed[i] * 0.04;
        levels[i] += (goal - levels[i]) * (active ? 0.28 : 0.07);
        const bh = Math.max(2, levels[i] * (h - 10));
        ctx.fillStyle = active ? "#b01e2a" : "rgba(26,22,18,0.16)";
        ctx.globalAlpha = active ? 0.55 + levels[i] * 0.45 : 0.9;
        ctx.fillRect(i * gap + (gap - bw) / 2, (h - bh) / 2, bw, bh);
      }
      ctx.globalAlpha = 1;

      if (!reduce) raf = requestAnimationFrame(draw);
    };

    draw();

    return () => {
      cancelAnimationFrame(raf);
      ro.disconnect();
    };
  }, [active, bars]);

  return (
    <canvas
      ref={ref}
      aria-hidden="true"
      className={cn("block w-full", className)}
      style={{ height }}
    />
  );
}
